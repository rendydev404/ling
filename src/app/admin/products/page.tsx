import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/supabase/auth";
import type { Product } from "@/types/database";
import { ProductsManager } from "@/components/admin/products-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  let products: Product[] = [];
  const isDemoMode = !isSupabaseServerConfigured();

  if (!isDemoMode) {
    const supabase = await getAdminSupabaseClient();
    const { data } = await supabase
      .from("products")
      .select(
        "id, slug, type, title, short_description, description, thumbnail_url, gallery_urls, price, compare_at_price, is_pay_what_you_want, min_price, status, is_featured, stock_quantity, order_bump_product_id, order_bump_price, order_bump_headline, affiliate_enabled, affiliate_commission_pct, metadata, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    products = (data as Product[] | null) ?? [];
  }

  return <ProductsManager initialProducts={products} isDemoMode={isDemoMode} />;
}
