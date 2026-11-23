import { getStorefrontBundle } from "@/lib/storefront-data";
import { PageBuilderClient } from "@/components/admin/page-builder-client";

export const dynamic = "force-dynamic";

export default async function AdminBuilderPage() {
  const { settings, blocks, products, isDemoMode } = await getStorefrontBundle();

  return (
    <PageBuilderClient
      initialSettings={settings}
      initialBlocks={blocks}
      products={products}
      isDemoMode={isDemoMode}
    />
  );
}
