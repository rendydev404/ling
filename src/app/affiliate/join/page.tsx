import { redirect } from "next/navigation";
import { getStorefrontBundle } from "@/lib/storefront-data";
import { isAffiliateProgramEnabled } from "@/lib/utils";
import { AffiliateJoinClient } from "@/components/affiliate/affiliate-join-client";

export const dynamic = "force-dynamic";

export default async function AffiliateJoinPage() {
  const { settings } = await getStorefrontBundle();
  if (!isAffiliateProgramEnabled(settings)) {
    redirect("/");
  }

  return <AffiliateJoinClient />;
}
