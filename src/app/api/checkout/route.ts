import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/storefront-data";
import { calculateCheckoutPricing } from "@/lib/checkout-engine";
import { createMidtransCoreCharge, MidtransChargeError } from "@/lib/midtrans";
import { getActivePaymentMethods, markChannelInactive } from "@/lib/payment-channels";
import { PAYMENT_METHODS, PAYMENT_METHOD_CODES } from "@/lib/payment-methods";
import { createAccessToken, accessCookieName } from "@/lib/order-access";
import { syncOrderPaymentStatus } from "@/lib/order-fulfillment";
import { generateOrderNumber, normalizePhoneID } from "@/lib/utils";
import type { Product, ProductVariant, ShippingOption, Voucher } from "@/types/database";

const checkoutSchema = z.object({
  productSlug: z.string().min(1),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().min(8).max(25),
  quantity: z.number().int().min(1).max(50).default(1),
  variantId: z.string().nullable().optional(),
  customAmount: z.number().min(0).nullable().optional(),
  includeOrderBump: z.boolean().default(false),
  voucherCode: z.string().max(40).nullable().optional(),
  shippingCourierCode: z.string().nullable().optional(),
  shippingAddress: z
    .object({
      recipient: z.string().min(2),
      province: z.string().min(2),
      city: z.string().min(2),
      address: z.string().min(5),
      postalCode: z.string().min(3),
    })
    .nullable()
    .optional(),
  bookingDate: z.string().nullable().optional(),
  bookingStartTime: z.string().nullable().optional(),
  bookingEndTime: z.string().nullable().optional(),
  donationAnonymous: z.boolean().optional(),
  buyerNote: z.string().max(500).nullable().optional(),
  paymentMethod: z.enum(PAYMENT_METHOD_CODES).nullable().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data checkout belum lengkap atau tidak valid." },
      { status: 400 }
    );
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: "Database belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const input = parsed.data;
  const orderNumber = generateOrderNumber();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  const refCode = cookieStore.get("ling_ref")?.value;

  // Execute all upfront lookups in a single parallel round-trip
  const [user, productRes, { settings }, activeMethods, voucherRes, affRes] = await Promise.all([
    hasAuthCookie
      ? createServerSupabaseClient()
          .then((c) => c.auth.getUser())
          .then((r) => r.data.user)
          .catch(() => null)
      : Promise.resolve(null),
    serviceClient
      .from("products")
      .select(
        "id, slug, type, title, price, is_pay_what_you_want, min_price, stock_quantity, order_bump_product_id, order_bump_price, affiliate_enabled, affiliate_commission_pct, metadata"
      )
      .eq("slug", input.productSlug)
      .eq("status", "published")
      .single(),
    getStoreSettings(),
    getActivePaymentMethods(),
    input.voucherCode
      ? serviceClient
          .from("vouchers")
          .select(
            "id, code, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, used_count, applicable_product_id, starts_at, expires_at, is_active, created_at"
          )
          .ilike("code", input.voucherCode.trim().toUpperCase())
          .maybeSingle()
      : Promise.resolve({ data: null }),
    refCode
      ? serviceClient
          .from("affiliates")
          .select("id")
          .ilike("referral_code", refCode)
          .eq("status", "active")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (productRes.error?.code === "PGRST205") {
    return NextResponse.json(
      { error: "Skema tabel database belum dimigrasi di Supabase." },
      { status: 503 }
    );
  }

  const product = productRes.data as Product | null;
  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  if (product.type === "appointment" && (!input.bookingDate || !input.bookingStartTime)) {
    return NextResponse.json(
      { error: "Silakan pilih tanggal dan jam konsultasi terlebih dahulu." },
      { status: 400 }
    );
  }

  if (product.type === "physical" && !input.shippingAddress) {
    return NextResponse.json(
      { error: "Alamat pengiriman wajib diisi untuk produk fisik." },
      { status: 400 }
    );
  }

  const needsSecondaryLookup =
    Boolean(input.variantId) || Boolean(input.includeOrderBump && product.order_bump_product_id);

  const [variantRes, bumpRes] = needsSecondaryLookup
    ? await Promise.all([
        input.variantId
          ? serviceClient
              .from("product_variants")
              .select("id, name, price_override, stock_quantity")
              .eq("id", input.variantId)
              .eq("product_id", product.id)
              .single()
          : Promise.resolve({ data: null }),
        input.includeOrderBump && product.order_bump_product_id
          ? serviceClient
              .from("products")
              .select("id, title, type, price")
              .eq("id", product.order_bump_product_id)
              .eq("status", "published")
              .single()
          : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }];

  const variant = variantRes.data as ProductVariant | null;
  const bumpProduct = bumpRes.data as Product | null;
  const voucher = (voucherRes.data as Voucher | null) ?? null;

  const shippingOptions = (settings.shipping_options as ShippingOption[] | null) ?? [];
  const selectedCourier = shippingOptions.find((o) => o.code === input.shippingCourierCode);

  const pricing = calculateCheckoutPricing({
    product,
    variant,
    quantity: input.quantity,
    customAmount: input.customAmount,
    includeOrderBump: Boolean(input.includeOrderBump && bumpProduct),
    orderBumpProduct: bumpProduct,
    voucher,
    shippingCost: selectedCourier?.cost ?? 0,
  });

  const paymentMethod = input.paymentMethod ?? null;
  if (pricing.totalAmount > 0) {
    if (!paymentMethod || !activeMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Silakan pilih metode pembayaran yang tersedia." },
        { status: 400 }
      );
    }
  }

  const affiliateId = product.affiliate_enabled ? (affRes.data?.id ?? null) : null;

  const { data: order, error: orderErr } = await serviceClient
    .from("orders")
    .insert({
      order_number: orderNumber,
      midtrans_order_id: orderNumber,
      buyer_user_id: user?.id ?? null,
      buyer_name: input.buyerName.trim(),
      buyer_email: input.buyerEmail.trim().toLowerCase(),
      buyer_phone: normalizePhoneID(input.buyerPhone),
      voucher_id: pricing.discountAmount > 0 && voucher ? voucher.id : null,
      voucher_code: pricing.discountAmount > 0 && voucher ? voucher.code : null,
      affiliate_id: affiliateId,
      subtotal: pricing.subtotal,
      discount_amount: pricing.discountAmount,
      shipping_cost: pricing.shippingCost,
      total_amount: pricing.totalAmount,
      // Free orders are settled below through the same fulfillment path (access, email, tickets)
      payment_status: "pending",
      shipping_address: input.shippingAddress ?? null,
      shipping_courier: selectedCourier?.name ?? null,
      shipping_status: product.type === "physical" ? "processing" : "not_applicable",
      buyer_note: input.buyerNote ?? null,
      payment_method: pricing.totalAmount === 0 ? "free" : null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr?.message ?? "Gagal membuat pesanan." },
      { status: 500 }
    );
  }

  const itemsToInsert = [
    {
      order_id: order.id,
      product_id: product.id,
      variant_id: variant?.id ?? null,
      product_title: variant ? `${product.title} (${variant.name})` : product.title,
      product_type: product.type,
      is_order_bump: false,
      unit_price: pricing.unitPrice,
      quantity: input.quantity,
      total_price: pricing.mainSubtotal,
      metadata: {
        donation_anonymous: input.donationAnonymous ?? false,
        buyer_note: input.buyerNote ?? null,
      },
    },
  ];

  if (input.includeOrderBump && bumpProduct && pricing.orderBumpAmount > 0) {
    itemsToInsert.push({
      order_id: order.id,
      product_id: bumpProduct.id,
      variant_id: null,
      product_title: bumpProduct.title,
      product_type: bumpProduct.type,
      is_order_bump: true,
      unit_price: pricing.orderBumpAmount,
      quantity: 1,
      total_price: pricing.orderBumpAmount,
      metadata: {
        donation_anonymous: false,
        buyer_note: null,
      },
    });
  }

  if (product.type === "appointment" && input.bookingDate && input.bookingStartTime) {
    const [, { error: bookErr }] = await Promise.all([
      serviceClient.from("order_items").insert(itemsToInsert),
      serviceClient.from("appointment_bookings").insert({
        order_id: order.id,
        product_id: product.id,
        buyer_user_id: user?.id ?? null,
        buyer_name: input.buyerName.trim(),
        buyer_email: input.buyerEmail.trim().toLowerCase(),
        buyer_phone: normalizePhoneID(input.buyerPhone),
        booking_date: input.bookingDate,
        start_time: input.bookingStartTime,
        end_time: input.bookingEndTime || input.bookingStartTime,
        meeting_link: product.metadata.meeting_link ?? null,
        notes: input.buyerNote ?? null,
        status: pricing.totalAmount === 0 ? "confirmed" : "pending_payment",
      }),
    ]);

    if (bookErr) {
      await serviceClient.from("orders").update({ payment_status: "cancelled" }).eq("id", order.id);
      return NextResponse.json(
        { error: "Slot jadwal yang dipilih baru saja dipesan orang lain. Silakan pilih jam lain." },
        { status: 409 }
      );
    }
  } else if (pricing.totalAmount === 0 || !paymentMethod) {
    await serviceClient.from("order_items").insert(itemsToInsert);
  }

  const orderStatusUrl = `${appUrl}/orders/${orderNumber}`;

  if (pricing.totalAmount > 0 && paymentMethod) {
    const chargeItems = itemsToInsert.map((item) => ({
      id: item.product_id,
      name: item.product_title,
      price: item.unit_price,
      quantity: item.quantity,
    }));
    if (pricing.shippingCost > 0) {
      chargeItems.push({
        id: "SHIPPING",
        name: `Ongkos Kirim (${selectedCourier?.name ?? "Kurir"})`,
        price: pricing.shippingCost,
        quantity: 1,
      });
    }
    if (pricing.discountAmount > 0) {
      chargeItems.push({
        id: "DISCOUNT",
        name: `Diskon Voucher (${voucher?.code ?? "PROMO"})`,
        price: -pricing.discountAmount,
        quantity: 1,
      });
    }

    try {
      // Run order_items insert in parallel with Midtrans charge for non-appointment orders
      const [charge] = await Promise.all([
        createMidtransCoreCharge({
          orderId: orderNumber,
          grossAmount: pricing.totalAmount,
          customerName: input.buyerName.trim(),
          customerEmail: input.buyerEmail.trim(),
          customerPhone: normalizePhoneID(input.buyerPhone),
          items: chargeItems,
          paymentMethod,
          callbackUrl: orderStatusUrl,
        }),
        product.type !== "appointment"
          ? serviceClient.from("order_items").insert(itemsToInsert)
          : Promise.resolve(),
      ]);

      const { error: saveErr } = await serviceClient
        .from("orders")
        .update({
          payment_method: paymentMethod,
          payment_instructions: charge.instructions,
          payment_expires_at: charge.instructions.expiresAt,
          midtrans_raw_payload: charge.raw,
        })
        .eq("id", order.id);

      if (saveErr) {
        // Charge already exists at Midtrans; the order page can still recover via status API
        console.error("[checkout] gagal menyimpan instruksi pembayaran:", saveErr.message);
      }

      return withAccessCookie(
        NextResponse.json({
          orderNumber,
          totalAmount: pricing.totalAmount,
          orderStatusUrl,
          isSimulated: charge.isSimulated,
        }),
        orderNumber
      );
    } catch (err) {
      await Promise.all([
        serviceClient.from("orders").update({ payment_status: "cancelled" }).eq("id", order.id),
        product.type === "appointment"
          ? serviceClient
              .from("appointment_bookings")
              .update({ status: "cancelled" })
              .eq("order_id", order.id)
          : Promise.resolve(),
      ]);

      if (err instanceof MidtransChargeError && err.isChannelUnavailable) {
        // Learn it: hide this channel from checkout until the next detection says otherwise
        await markChannelInactive(paymentMethod, err.statusMessage);
        return NextResponse.json(
          {
            error: `${PAYMENT_METHODS[paymentMethod].label} sedang tidak tersedia. Silakan pilih metode pembayaran lain.`,
            unavailableMethod: paymentMethod,
          },
          { status: 409 }
        );
      }

      console.error("[checkout] charge Midtrans gagal:", err);
      return NextResponse.json(
        { error: "Pembayaran belum bisa dibuat. Coba lagi atau pilih metode lain." },
        { status: 502 }
      );
    }
  }

  // Free order (100% voucher, free product): settle through the normal fulfillment path
  await syncOrderPaymentStatus({
    midtransOrderId: orderNumber,
    transactionStatus: "settlement",
    paymentType: "free",
  });

  return withAccessCookie(
    NextResponse.json({
      orderNumber,
      totalAmount: 0,
      orderStatusUrl,
      isSimulated: false,
    }),
    orderNumber
  );
}

/** Lets this browser open the product access page from the order page right after paying. */
function withAccessCookie(res: NextResponse, orderNumber: string) {
  const token = createAccessToken(orderNumber);
  if (token) {
    res.cookies.set(accessCookieName(orderNumber), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
