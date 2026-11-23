import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { message: "Mode pratinjau: Sambungkan Supabase Storage untuk mengunduh file private bucket." },
      { status: 200 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login untuk mengunduh file." }, { status: 401 });
  }

  // RLS ensures user only sees assets they purchased (paid) or if admin
  const { data: asset } = await supabase
    .from("product_digital_assets")
    .select("id, asset_type, storage_path, external_url")
    .eq("id", assetId)
    .single();

  if (!asset) {
    return NextResponse.json({ error: "Akses unduhan tidak ditemukan." }, { status: 403 });
  }

  if (asset.asset_type === "external_url" && asset.external_url) {
    return NextResponse.redirect(asset.external_url);
  }

  if (!asset.storage_path) {
    return NextResponse.json({ error: "File belum diunggah." }, { status: 404 });
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: "Storage service unavailable" }, { status: 503 });
  }

  const { data: signed, error } = await serviceClient.storage
    .from("digital-assets")
    .createSignedUrl(asset.storage_path, 300); // 5 minutes expiry

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Gagal membuat tautan unduhan sementara." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
