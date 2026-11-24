import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveAccessAsset } from "@/lib/order-access-data";

export const dynamic = "force-dynamic";

/** Download for buyers arriving from the access email (no login needed; token proves the purchase). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; assetId: string }> }
) {
  const { token, assetId } = await params;
  const asset = await resolveAccessAsset(token, assetId);
  if (!asset) {
    return NextResponse.json({ error: "Link akses tidak valid." }, { status: 403 });
  }

  if (asset.assetType === "external_url" && asset.externalUrl) {
    return NextResponse.redirect(asset.externalUrl);
  }
  if (!asset.storagePath) {
    return NextResponse.json({ error: "File belum diunggah oleh kreator." }, { status: 404 });
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: "Storage tidak tersedia." }, { status: 503 });
  }
  const { data: signed, error } = await serviceClient.storage
    .from("digital-assets")
    .createSignedUrl(asset.storagePath, 300, { download: true });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Gagal membuat tautan unduhan." }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
