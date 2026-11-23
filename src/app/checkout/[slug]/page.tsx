import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/storefront-data";
import { getMidtransSnapScriptUrl } from "@/lib/midtrans";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product, variants, availability, orderBumpProduct, settings } =
    await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <CheckoutClient
      product={product}
      variants={variants}
      availability={availability}
      orderBumpProduct={orderBumpProduct}
      settings={settings}
      snapScriptUrl={getMidtransSnapScriptUrl()}
      midtransClientKey={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ""}
    />
  );
}
