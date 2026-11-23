import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { DEMO_PRODUCTS, DEMO_VARIANTS, DEFAULT_STORE_SETTINGS } from "@/lib/demo-data";
import { calculateCheckoutPricing } from "@/lib/checkout-engine";
import { createMidtransSnapTransaction, isMidtransConfigured } from "@/lib/midtrans";
import { generateOrderNumber, normalizePhoneID } from "@/lib/utils";
import type { Product, ProductVariant, ShippingOption, Voucher } from "@/types/database";

const DEMO_VOUCHERS: Record<string, Voucher> = {
  LING20: {
    id: "vch-demo-1",
    code: "LING20",
    discount_type: "percentage",
    discount_value: 20,
    max_discount_amount: 100000,
    min_order_amount: 50000,
    max_uses: 200,
    used_count: 14,
    applicable_product_id: null,
    starts_at: null,
    expires_at: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  POTONG25K: {
    id: "vch-demo-2",
    code: "POTONG25K",
    discount_type: "fixed",
    discount_value: 25000,
    max_discount_amount: null,
    min_order_amount: 100000,
    max_uses: 50,
    used_count: 8,
    applicable_product_id: null,
    starts_at: null,
    expires_at: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
};

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

  const input = parsed.data;
  const orderNumber = generateOrderNumber();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  // Local Storefront mode (when Supabase is not configured yet)
  if (!isSupabaseServerConfigured()) {
    const product = DEMO_PRODUCTS.find((p) => p.slug === input.productSlug);
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }
    const variant = input.variantId
      ? (DEMO_VARIANTS[product.id] ?? []).find((v) => v.id === input.variantId) ?? null
      : null;
    const bumpProduct = product.order_bump_product_id
      ? DEMO_PRODUCTS.find((p) => p.id === product.order_bump_product_id) ?? null
      : null;
    const demoVoucher = input.voucherCode
      ? DEMO_VOUCHERS[input.voucherCode.trim().toUpperCase()] ?? null
      : null;

    const courier = DEFAULT_STORE_SETTINGS.shipping_options.find(
      (s) => s.code === input.shippingCourierCode
    );

    const pricing = calculateCheckoutPricing({
      product,
      variant,
      quantity: input.quantity,
      customAmount: input.customAmount,
      includeOrderBump: input.includeOrderBump,
      orderBumpProduct: bumpProduct,
      voucher: demoVoucher,
      shippingCost: courier?.cost ?? 0,
    });

    const orderSummaryParams = new URLSearchParams({
      amount: String(pricing.totalAmount),
      product: product.title,
      buyer: input.buyerName.trim(),
    });

    if (pricing.totalAmount > 0 && isMidtransConfigured()) {
      const snapItems = [
        {
          id: product.id,
          name: variant ? `${product.title} (${variant.name})` : product.title,
          price: pricing.unitPrice,
          quantity: input.quantity,
        },
      ];
      if (input.includeOrderBump && bumpProduct && pricing.orderBumpAmount > 0) {
        snapItems.push({
          id: bumpProduct.id,
          name: bumpProduct.title,
          price: pricing.orderBumpAmount,
          quantity: 1,
        });
      }
      if (pricing.shippingCost > 0) {
        snapItems.push({
          id: "SHIPPING",
          name: `Ongkos Kirim (${courier?.name ?? "Kurir"})`,
          price: pricing.shippingCost,
          quantity: 1,
        });
      }
      if (pricing.discountAmount > 0) {
        snapItems.push({
          id: "DISCOUNT",
          name: `Diskon Voucher (${demoVoucher?.code ?? "PROMO"})`,
          price: -pricing.discountAmount,
          quantity: 1,
        });
      }

      const orderStatusUrl = `${appUrl}/orders/${orderNumber}?${orderSummaryParams.toString()}`;
      try {
        const snap = await createMidtransSnapTransaction({
          orderId: orderNumber,
          grossAmount: pricing.totalAmount,
          customerName: input.buyerName.trim(),
          customerEmail: input.buyerEmail.trim(),
          customerPhone: normalizePhoneID(input.buyerPhone),
          items: snapItems,
          finishRedirectUrl: orderStatusUrl,
        });

        return NextResponse.json({
          orderNumber,
          totalAmount: pricing.totalAmount,
          snapToken: snap.token,
          redirectUrl: snap.redirect_url,
          orderStatusUrl: `${orderStatusUrl}&snap=${encodeURIComponent(snap.redirect_url)}`,
          isSimulated: snap.isSimulated,
        });
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Gagal membuat transaksi Midtrans Snap.",
          },
          { status: 502 }
        );
      }
    }

    orderSummaryParams.set("demo", "1");
    return NextResponse.json({
      orderNumber,
      totalAmount: pricing.totalAmount,
      snapToken: `sandbox-demo-token-${orderNumber}`,
      redirectUrl: `${appUrl}/orders/${orderNumber}?${orderSummaryParams.toString()}`,
      orderStatusUrl: `${appUrl}/orders/${orderNumber}?${orderSummaryParams.toString()}`,
      isSimulated: true,
    });
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." },
      { status: 503 }
    );
  }

  // Get logged-in buyer if any
  const userClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  // Fetch product & store settings
  const [productRes, settingsRes] = await Promise.all([
    serviceClient
      .from("products")
      .select(
        "id, slug, type, title, price, is_pay_what_you_want, min_price, stock_quantity, order_bump_product_id, order_bump_price, affiliate_enabled, affiliate_commission_pct, metadata"
      )
      .eq("slug", input.productSlug)
      .eq("status", "published")
      .single(),
    serviceClient
      .from("store_settings")
      .select("shipping_options")
      .eq("singleton_key", "primary")
      .single(),
  ]);

  const product = productRes.data as Product | null;
  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  // Appointment validation
  if (product.type === "appointment" && (!input.bookingDate || !input.bookingStartTime)) {
    return NextResponse.json(
      { error: "Silakan pilih tanggal dan jam konsultasi terlebih dahulu." },
      { status: 400 }
    );
  }

  // Physical shipping validation
  if (product.type === "physical" && !input.shippingAddress) {
    return NextResponse.json(
      { error: "Alamat pengiriman wajib diisi untuk produk fisik." },
      { status: 400 }
    );
  }

  const [variantRes, bumpRes, voucherRes] = await Promise.all([
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
    input.voucherCode
      ? serviceClient
          .from("vouchers")
          .select(
            "id, code, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, used_count, applicable_product_id, starts_at, expires_at, is_active, created_at"
          )
          .ilike("code", input.voucherCode.trim().toUpperCase())
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const variant = variantRes.data as ProductVariant | null;
  const bumpProduct = bumpRes.data as Product | null;
  const voucher = voucherRes.data as Voucher | null;

  const shippingOptions = (settingsRes.data?.shipping_options as ShippingOption[] | null) ?? [];
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

  // Resolve affiliate referral cookie
  const cookieStore = await cookies();
  const refCode = cookieStore.get("ling_ref")?.value;
  let affiliateId: string | null = null;
  if (refCode && product.affiliate_enabled) {
    const { data: aff } = await serviceClient
      .from("affiliates")
      .select("id")
      .ilike("referral_code", refCode)
      .eq("status", "active")
      .single();
    affiliateId = aff?.id ?? null;
  }

  // Insert Order
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
      payment_status: pricing.totalAmount === 0 ? "paid" : "pending",
      shipping_address: input.shippingAddress ?? null,
      shipping_courier: selectedCourier?.name ?? null,
      shipping_status: product.type === "physical" ? "processing" : "not_applicable",
      buyer_note: input.buyerNote ?? null,
      paid_at: pricing.totalAmount === 0 ? new Date().toISOString() : null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr?.message ?? "Gagal membuat pesanan." },
      { status: 500 }
    );
  }

  // Insert Order Items
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

  await serviceClient.from("order_items").insert(itemsToInsert);

  // Reserve Appointment Slot atomically (unique partial index protects against double-booking)
  if (product.type === "appointment" && input.bookingDate && input.bookingStartTime) {
    const { error: bookErr } = await serviceClient.from("appointment_bookings").insert({
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
    });

    if (bookErr) {
      await serviceClient.from("orders").update({ payment_status: "cancelled" }).eq("id", order.id);
      return NextResponse.json(
        { error: "Slot jadwal yang dipilih baru saja dipesan orang lain. Silakan pilih jam lain." },
        { status: 409 }
      );
    }
  }

  // Create Midtrans Snap Transaction
  if (pricing.totalAmount > 0) {
    const snapItems = itemsToInsert.map((item) => ({
      id: item.product_id,
      name: item.product_title,
      price: item.unit_price,
      quantity: item.quantity,
    }));
    if (pricing.shippingCost > 0) {
      snapItems.push({
        id: "SHIPPING",
        name: `Ongkos Kirim (${selectedCourier?.name ?? "Kurir"})`,
        price: pricing.shippingCost,
        quantity: 1,
      });
    }
    if (pricing.discountAmount > 0) {
      snapItems.push({
        id: "DISCOUNT",
        name: `Diskon Voucher (${voucher?.code ?? "PROMO"})`,
        price: -pricing.discountAmount,
        quantity: 1,
      });
    }

    const orderStatusUrl = `${appUrl}/orders/${orderNumber}`;
    try {
      const snap = await createMidtransSnapTransaction({
        orderId: orderNumber,
        grossAmount: pricing.totalAmount,
        customerName: input.buyerName.trim(),
        customerEmail: input.buyerEmail.trim(),
        customerPhone: normalizePhoneID(input.buyerPhone),
        items: snapItems,
        finishRedirectUrl: orderStatusUrl,
      });

      await serviceClient
        .from("orders")
        .update({
          midtrans_snap_token: snap.token,
          midtrans_redirect_url: snap.redirect_url,
        })
        .eq("id", order.id);

      return NextResponse.json({
        orderNumber,
        totalAmount: pricing.totalAmount,
        snapToken: snap.token,
        redirectUrl: snap.redirect_url,
        orderStatusUrl,
        isSimulated: snap.isSimulated,
      });
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
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Gagal membuat transaksi Midtrans Snap.",
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    orderNumber,
    totalAmount: 0,
    snapToken: null,
    redirectUrl: `${appUrl}/orders/${orderNumber}`,
    orderStatusUrl: `${appUrl}/orders/${orderNumber}`,
    isSimulated: false,
  });
}
