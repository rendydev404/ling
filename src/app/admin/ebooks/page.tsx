import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/supabase/auth";
import { ADMIN_EBOOK_COLS, GRANT_COLS, type AdminEbook, type EbookGrant } from "@/lib/ebooks";
import { EbooksManager, type ProductOption } from "@/components/admin/ebooks-manager";

export const dynamic = "force-dynamic";

export default async function AdminEbooksPage() {
  let ebooks: AdminEbook[] = [];
  let products: ProductOption[] = [];
  let grants: EbookGrant[] = [];

  if (isSupabaseServerConfigured()) {
    const supabase = await getAdminSupabaseClient();
    const [ebooksRes, productsRes, grantsRes] = await Promise.all([
      supabase.from("ebooks").select(ADMIN_EBOOK_COLS).order("created_at", { ascending: false }).limit(500),
      supabase
        .from("products")
        .select("id, title, type, status")
        .in("type", ["digital", "membership"])
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("ebook_grants").select(GRANT_COLS).order("created_at", { ascending: false }).limit(1000),
    ]);
    ebooks = (ebooksRes.data as AdminEbook[] | null) ?? [];
    products = (productsRes.data as ProductOption[] | null) ?? [];
    grants = (grantsRes.data as EbookGrant[] | null) ?? [];
  }

  return (
    <EbooksManager
      initialEbooks={ebooks}
      initialGrants={grants}
      products={products}
    />
  );
}
