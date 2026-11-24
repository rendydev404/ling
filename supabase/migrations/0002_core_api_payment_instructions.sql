-- Midtrans Core API: our own payment UI needs the charge result (VA number, QR string, expiry)
alter table public.orders
  add column if not exists payment_instructions jsonb,
  add column if not exists payment_expires_at timestamptz,
  add column if not exists access_email_sent_at timestamptz;

-- Auto-detected Midtrans channel availability: { "<method>": { "active": bool, "checked_at": iso, "reason": text } }
alter table public.store_settings
  add column if not exists payment_channels jsonb not null default '{}'::jsonb;
