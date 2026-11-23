import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getStorefrontBundle } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseServerConfigured();
  if (configured) {
    await requireAdmin();
  }
  const { settings, isDemoMode } = await getStorefrontBundle();

  return (
    <AdminShell brandName={settings.brand_name} isDemoMode={isDemoMode}>
      {children}
    </AdminShell>
  );
}
