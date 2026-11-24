import { after } from "next/server";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/storefront-data";
import {
  detectPaymentChannels,
  getActivePaymentMethods,
  shouldAutoDetectChannels,
} from "@/lib/payment-channels";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ product, variants, availability, orderBumpProduct, settings }, activeMethods, autoDetect] =
    await Promise.all([getProductBySlug(slug), getActivePaymentMethods(), shouldAutoDetectChannels()]);

  if (!product) {
    notFound();
  }

  // First visit after Midtrans keys are set: learn which channels are active, after the response
  if (autoDetect) {
    after(async () => {
      await detectPaymentChannels();
    });
  }

  return (
    <CheckoutClient
      product={product}
      variants={variants}
      availability={availability}
      orderBumpProduct={orderBumpProduct}
      settings={settings}
      enabledPaymentMethods={activeMethods}
    />
  );
}
