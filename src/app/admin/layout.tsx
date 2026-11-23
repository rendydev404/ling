import { AdminShell } from "@/components/admin/admin-shell";
import { isMidtransConfigured } from "@/lib/midtrans";
import { requireAdmin } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseServerConfigured();
  const [, { settings, isDemoMode }] = await Promise.all([
    configured ? requireAdmin() : Promise.resolve(null),
    getStoreSettings(),
  ]);

  return (
    <AdminShell
      brandName={settings.brand_name}
      isDemoMode={isDemoMode}
      isMidtransActive={isMidtransConfigured()}
    >
      {children}
    </AdminShell>
  );
}
