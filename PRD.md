# Product Requirements Document (PRD)
## Ling — Single-Creator Storefront, Link-in-Bio & Monetization Platform (Lynk.id Full-Feature Clone)

**Versi Dokumen:** 1.0.0  
**Tanggal:** 23 November 2026  
**Model Bisnis:** Single-Creator / Brand Storefront  
**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, Storage) · Midtrans  

---

## 1. Executive Summary & Product Vision

**Ling** adalah platform *all-in-one* Link-in-Bio dan *Creator Commerce Storefront* yang dirancang khusus untuk **satu pemilik toko / kreator / brand (Single-Creator Storefront)** dengan mengkloning seluruh kapabilitas penjualan, monetisasi, dan pemasaran dari **Lynk.id**.

Berbeda dengan platform SaaS multi-tenant yang mengenakan potongan transaksi platform (3%–5%) dan membatasi kustomisasi di balik paywall bulanan, **Ling** memberikan kepemilikan penuh atas domain, data pelanggan, alur checkout, integrasi Midtrans langsung ke rekening pemilik toko, serta seluruh fitur monetisasi tanpa batasan tier.

### Tujuan Utama Produk
1. **Satu Halaman, Semua Monetisasi:** Menggabungkan halaman *Link-in-Bio* mobile-first dengan 7 jenis produk monetisasi (Digital, Online Course, Appointment 1-on-1, Webinar/Event, Produk Fisik, Donasi/Support, dan Membership).
2. **Konversi Maksimal:** Menyediakan alur *Express Checkout* yang cepat, **Order Bump**, **Voucher/Kupon**, dan pembayaran otomatis lokal Indonesia via **Midtrans** (QRIS, Virtual Account, E-Wallet, Kartu Kredit).
3. **Otomatisasi Fulfillment 100%:** Setelah pembayaran terkonfirmasi oleh webhook Midtrans, pembeli langsung menerima akses produk digital, kelas online, konfirmasi jadwal, e-ticket, atau status membership secara instan tanpa campur tangan manual.
4. **Pertumbuhan Organik & Paid:** Dilengkapi sistem **Affiliate Program** internal, analitik *real-time*, pelacakan **Meta Pixel / TikTok Pixel / GA4**, serta **Outbound Webhooks** untuk integrasi WhatsApp gateway (StarSender, Fonnte, dll.) dan Email CRM (KIRIM.EMAIL, Mailketing, n8n, Zapier).

---

## 2. User Personas & Role-Based Access Control (RBAC)

| Role | Deskripsi | Hak Akses Utama |
|---|---|---|
| **Admin (Store Owner)** | Pemilik tunggal toko/brand | Kontrol penuh melalui `/admin`: Appearance & Bio Builder, CRUD 7 jenis produk, Voucher, Order & Shipping Management, Verifikasi & Payout Affiliator, Analytics, Pixels, Outbound Webhooks, dan Store Settings. |
| **Visitor / Guest** | Pengunjung publik dari media sosial | Mengakses halaman bio (`/`), melihat katalog & detail produk (`/p/[slug]`), melakukan Express Checkout tanpa wajib mendaftar terlebih dahulu (dengan auto-link akun berdasarkan email). |
| **Buyer (Customer)** | Pembeli yang telah bertransaksi | Mengakses `/portal`: riwayat pesanan, download file digital (signed URL), Course Player + progress tracker, jadwal appointment, e-ticket webinar, dan akses konten/grup membership. |
| **Affiliate Partner** | Mitra promosi produk pemilik toko | Mendaftar sebagai affiliator, mengakses `/affiliate`: melihat katalog produk ber-komisi, membuat link referral (`?ref=CODE`), melihat statistik klik/konversi/komisi, dan mengajukan pencairan komisi (*payout request*). |

---

## 3. Functional Requirements (13 Modul Lengkap — 100% Parity Lynk.id)

### Modul 1: Public Link-in-Bio & Page Builder
Halaman utama (`/`) yang berfungsi sebagai pusat tautan dan katalog produk kreator, tampil optimal di layar mobile (375px–430px) maupun desktop.
- **Store Profile Header:** Foto avatar, nama brand/kreator, badge terverifikasi (opsional), bio singkat, serta deretan ikon media sosial (Instagram, TikTok, YouTube, X/Twitter, LinkedIn, WhatsApp, Email, Website).
- **Modular Bio Blocks:** Pemilik toko dapat menambah, mengedit, menghapus, mengaktifkan/menonaktifkan, dan mengatur urutan blok:
  1. **Link Button:** Tautan eksternal/internal dengan ikon, subjudul, dan highlight badge.
  2. **Product Card / Featured Product:** Menampilkan produk dari katalog langsung di halaman bio (layout *compact* atau *featured card* dengan harga & tombol beli cepat).
  3. **Heading / Section Title:** Pembatas kategori blok.
  4. **Text Block:** Paragraf informasi atau pengumuman.
  5. **Image / Banner Block:** Gambar promosi dengan tautan klik opsional.
  6. **Video Embed Block:** Embed YouTube / Vimeo responsif.
  7. **Divider:** Garis pemisah halus.
- **Appearance & Solid Theme Customizer:**
  - Pemilihan preset tema **solid color** (Clean Light, Warm Paper, Slate Dark, Forest Crisp, Midnight Ink) dan kustomisasi warna latar, warna kartu, warna teks, dan warna aksen tombol (100% solid colors, tanpa gradient).
  - Gaya tombol (rounded-md, rounded-xl, pill, sharp/minimal) dan border style.
  - **Live Mobile Preview** real-time di dashboard Admin saat mengedit profil & blok.
- **SEO & OpenGraph:** Kustomisasi meta title, meta description, dan OG image per halaman bio maupun per halaman produk.

### Modul 2: Digital Products (Produk Digital)
Menjual e-book (PDF), template (Canva/Notion/Excel), preset, audio, video, source code, atau kode lisensi.
- **Delivery Modes:**
  - *Hosted File:* Unggah satu atau beberapa file ke private bucket Supabase Storage. Pembeli mengunduh via **Signed URL** berbatas waktu (mis. 5 menit) agar link tidak mudah dibagikan secara ilegal.
  - *External URL / Access Link:* Redirect atau tampilan tautan eksklusif (mis. Notion template link / Google Drive / Figma).
  - *License Key Pool:* Distribusi kode lisensi unik per pembeli (opsional).
- **Konfigurasi:** Harga tetap, harga coret (*compare-at price*), opsi *Pay What You Want* (pembeli mengisi nominal minimal tertentu), batas jumlah unduhan per pesanan (opsional), serta catatan pasca-pembelian.

### Modul 3: Online Course / LMS (Kelas Online)
Menjual materi pembelajaran terstruktur berbasis bab dan pelajaran.
- **Curriculum Builder (Admin):**
  - Membuat **Sections (Bab)** dan **Lessons (Pelajaran)** secara berurutan.
  - Jenis konten lesson: Video Embed (YouTube Unlisted/Vimeo/Mux/Direct MP4 URL), Artikel/Teks terstruktur, dan File Lampiran (PDF/worksheet).
  - Flag `is_free_preview` agar pengunjung dapat melihat cuplikan materi gratis sebelum membeli.
- **Course Player (Buyer Portal):**
  - Sidebar kurikulum dengan indikator selesai (*completed*) per lesson.
  - Progress bar persentase penyelesaian kursus (disimpan di database).
  - Navigasi *Previous / Next Lesson*.

### Modul 4: 1-on-1 Appointment / Booking Layanan
Menjual sesi konsultasi, coaching, mentoring, atau jasa privat berbasis waktu.
- **Availability Engine (Admin):**
  - Mengatur hari kerja aktif (Senin–Minggu) dan rentang jam tersedia (mis. 09:00–17:00 WIB).
  - Mengatur durasi sesi (30, 45, 60, 90 menit), jeda antar sesi (*buffer time*), zona waktu (`Asia/Jakarta`), dan tautan meeting (Zoom / Google Meet / Custom Location).
- **Booking Flow (Buyer):**
  - Memilih tanggal melalui **Custom Date Picker** dan slot waktu yang masih kosong melalui **Custom Time Slot Picker**.
  - Validasi server-side **anti double-booking** menggunakan constraint database + pengecekan transaksi pending/paid.
  - Status booking: `pending_payment`, `confirmed`, `completed`, `rescheduled`, `cancelled`.

### Modul 5: Event & Webinar Ticketing
Menjual tiket kelas live, webinar online, atau workshop offline.
- **Pengaturan Event:** Tanggal & jam mulai/selesai, zona waktu, kapasitas/kuota maksimum tiket, mode (`online` dengan meeting URL atau `offline` dengan alamat venue).
- **Auto E-Ticket:** Setelah pembayaran lunas, sistem menerbitkan kode tiket unik (format `EVT-XXXXXX`) yang tampil di Buyer Portal dan daftar peserta Admin, serta mengurangi sisa kuota secara atomik.

### Modul 6: Physical Products (Produk Fisik)
Menjual merchandise, buku cetak, pakaian, makanan, atau barang fisik lainnya.
- **Katalog & Varian:** Multiple foto produk, deskripsi lengkap, daftar varian (mis. Ukuran S/M/L, Warna Hitam/Putih) dengan stok & harga penyesuaian per varian, serta berat barang (gram).
- **Pengiriman & Resi:**
  - Pengaturan ongkos kirim (Flat Rate per transaksi atau tarif kurir konfigurasi Admin: JNE, J&T, SiCepat, AnterAja, Instant).
  - Form alamat lengkap pembeli saat checkout (Nama Penerima, No. WhatsApp, Provinsi, Kota/Kecamatan, Alamat Detail, Kode Pos).
  - Manajemen status pengiriman di Admin: `processing`, `shipped` (dengan input nomor resi & kurir), `delivered`.

### Modul 7: Donation / Support / Tip
Menerima dukungan finansial atau traktiran dari audiens.
- **Preset & Custom Amount:** Nominal cepat (mis. Rp15.000, Rp50.000, Rp100.000) plus input nominal bebas dengan batas minimal (mis. Rp10.000).
- **Supporter Message:** Input nama pendukung (atau centang *Kirim sebagai Anonim*) dan pesan dukungan.
- **Wall of Supporters:** Menampilkan daftar dukungan terbaru (yang disetujui/lunas) pada halaman donasi/bio.

### Modul 8: Membership / Subscription
Membangun komunitas berbayar dengan akses berulang (bulanan / triwulanan / tahunan).
- **Tier & Benefit:** Pengaturan nama tier, siklus tagihan (`monthly`, `quarterly`, `yearly`), daftar benefit, serta konten eksklusif / tautan grup privat (Telegram/WhatsApp/Discord).
- **Access Control:** Pembeli mendapatkan periode aktif (`starts_at` hingga `expires_at`). Selama status `active` dan belum kadaluarsa, tautan grup & postingan khusus member terbuka di Buyer Portal.

### Modul 9: Checkout Engine, Order Bump & Voucher/Coupon
Halaman checkout (`/checkout/[slug]`) yang dirancang ringan, minim distraksi, dan memaksimalkan konversi.
- **Lead Capture:** Input Nama Lengkap, Email (wajib untuk pengiriman akses), dan Nomor WhatsApp (wajib, format Indonesia `08...` / `628...`), plus custom fields opsional per produk.
- **Order Bump:** Admin dapat menautkan 1 produk tambahan (dengan harga spesial/promo) yang muncul sebagai kartu centang di halaman checkout sebelum tombol bayar. Ketika dicentang, total belanja otomatis terhitung ulang di server.
- **Voucher & Kupon Diskon:**
  - Mendukung diskon **Persentase (%)** (dengan opsi batas maksimal potongan) dan **Nominal Tetap (Rp)**.
  - Pembatasan: minimal nilai belanja, kuota total penggunaan, batas per produk tertentu (atau berlaku global), serta tanggal mulai & kadaluarsa.
  - Validasi kupon dilakukan melalui API server-side agar aman dari manipulasi client.
- **Server-Side Pricing Authority:** Client hanya mengirim ID produk, varian, qty, order bump flag, kode voucher, dan kode referral; seluruh perhitungan subtotal, diskon, ongkir, dan grand total dihitung 100% di backend.

### Modul 10: Midtrans Payment Gateway & Auto-Fulfillment
Integrasi pembayaran lokal Indonesia menggunakan **Midtrans Snap API**.
- **Metode Pembayaran Didukung:** QRIS, GoPay, ShopeePay, Virtual Account (BCA, BNI, BRI, Mandiri Bill, Permata, CIMB), serta Kartu Kredit/Debit (sesuai konfigurasi akun Midtrans Owner).
- **Alur Transaksi:**
  1. Server membuat record `orders` (`status = 'pending'`) dan `order_items`.
  2. Server memanggil Midtrans Snap API untuk mendapatkan `snap_token` dan `redirect_url`.
  3. Frontend menampilkan Midtrans Snap Popup (atau redirect URL) serta halaman status pesanan (`/orders/[orderNumber]`).
- **Webhook Handler (`/api/webhooks/midtrans`):**
  - Wajib memverifikasi `signature_key === SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`.
  - **Idempotent Processing:** Jika webhook diterima lebih dari sekali untuk order yang sudah `paid`, handler langsung mengembalikan `200 OK` tanpa menduplikasi fulfillment atau komisi.
  - **Status Mapping:**
    - `capture` (accept) / `settlement` -> `paid` -> Jalankan **Auto-Fulfillment Engine**.
    - `pending` -> `pending`.
    - `deny` / `cancel` / `expire` -> `cancelled` / `expired` -> Kembalikan stok/kuota/slot booking jika ditahan.
    - `refund` -> `refunded`.
- **Auto-Fulfillment Engine:**
  - *Digital:* Generate record akses unduhan & (jika ada) alokasi license key.
  - *Course:* Insert ke `course_enrollments`.
  - *Appointment:* Ubah status `appointment_bookings` menjadi `confirmed`.
  - *Event:* Terbitkan kode tiket di `event_tickets`.
  - *Physical:* Kurangi stok produk/varian, set shipping status `processing`.
  - *Donation:* Tandai pesan dukungan sebagai `published`.
  - *Membership:* Aktifkan/perpanjang `membership_subscriptions`.
  - *Affiliate:* Jika order memiliki `affiliate_id` valid dan produk mendukung affiliate, hitung & catat komisi di `affiliate_commissions`.
  - *Outbound Webhooks:* Kirim payload JSON ke semua outbound webhook aktif untuk event `order.paid`.

### Modul 11: Affiliate Program (Partner Referral & Payouts)
Memungkinkan pihak ketiga/audiens mempromosikan produk milik pemilik toko.
- **Pendaftaran Affiliator:** User mendaftar di `/affiliate/join`, mendapatkan kode referral unik (mis. `BUDI2026`). Admin dapat mengatur auto-approve atau manual approval.
- **Link Attribution:** Setiap kunjungan dengan query `?ref=CODE` (pada `/` atau `/p/[slug]`) mencatat klik di `affiliate_clicks` dan menyimpan cookie referral `ling_ref` (HTTP-friendly, berlaku 30 hari, *last-click attribution*).
- **Komisi Fleksibel:** Admin menetapkan persentase komisi default atau per produk (mis. 15%–50%). Komisi hanya dihitung dari nilai bersih produk (setelah diskon, tidak termasuk ongkir).
- **Dashboard Affiliator (`/affiliate`):**
  - Ringkasan: Total Klik, Total Konversi, Total Komisi Pending, Saldo Tersedia, Total Dicairkan.
  - Katalog produk dengan tombol *Copy Referral Link* sekali klik.
  - Form **Pengajuan Pencairan (Payout Request)** ke rekening bank/e-wallet affiliator.
- **Manajemen Affiliate (Admin `/admin/affiliates`):** Daftar affiliator, persetujuan status, riwayat komisi, dan proses mark-as-paid untuk pengajuan pencairan beserta bukti transfer/catatan.

### Modul 12: Buyer Portal (Customer Library)
Area khusus pembeli (`/portal`) untuk mengakses seluruh pembeliannya di satu tempat.
- **Order Linking Otomatis:** Jika pembeli checkout sebagai Guest lalu mendaftar/login menggunakan email yang sama, seluruh riwayat pesanan otomatis tertaut ke akunnya.
- **Tab Terorganisir:**
  - *Pesanan Saya:* Daftar invoice, status bayar, dan nomor resi produk fisik.
  - *Produk Digital:* Tombol unduh instan (signed URL), salin license key, dan tautan eksternal.
  - *Kelas Saya:* Daftar course dengan progress bar dan tombol langsung ke Course Player.
  - *Jadwal & Tiket:* Detail jadwal 1-on-1 (termasuk link Zoom/GMeet) dan E-Ticket webinar.
  - *Membership:* Status aktif, tanggal berakhir, dan akses konten/grup eksklusif.

### Modul 13: Analytics, Marketing Pixels & Outbound Webhooks
- **Built-in Analytics (`/admin/analytics`):**
  - KPI Cards: Gross Revenue, Total Paid Orders, Page Views, Link Clicks, Conversion Rate, Average Order Value (AOV).
  - Filter rentang waktu (7 hari, 30 hari, 90 hari, Semua) menggunakan Custom Select.
  - Grafik tren pendapatan & kunjungan (custom SVG/CSS chart ringan tanpa bloat berat) serta tabel Top Products & Top Bio Links.
- **Marketing Pixels:**
  - **Meta Pixel (Facebook/Instagram):** Event `PageView`, `ViewContent`, `InitiateCheckout`, `Purchase`.
  - **TikTok Pixel:** Event `PageView`, `ViewContent`, `InitiateCheckout`, `CompletePayment`.
  - **Google Analytics 4 (GA4):** Measurement ID (`G-XXXXXXX`) dengan event e-commerce standar.
- **Outbound Webhooks (`/admin/integrations`):**
  - Mendukung trigger event: `order.created`, `order.paid`, `order.expired`, `booking.confirmed`, `affiliate.commission_earned`.
  - Header tanda tangan HMAC-SHA256 (`X-Ling-Signature`) agar penerima (KIRIM.EMAIL, Mailketing, StarSender WA, n8n, Zapier) dapat memverifikasi keaslian payload.
  - Fitur **Send Test Event** dan tabel **Delivery Logs** (HTTP status, response snippet, waktu eksekusi).

---

## 4. Non-Functional Requirements & Mandatory Engineering Rules

Seluruh implementasi WAJIB mematuhi aturan mutlak berikut tanpa pengecualian:

1. **100% Custom UI Controls (Dilarang Native Browser/OS Controls):**
   - Dilarang keras memakai `<select>` native, `window.alert()`, `window.confirm()`, `window.prompt()`, atau input date/search bawaan browser.
   - Semua dropdown, search bar, modal, konfirmasi hapus, date picker, time slot picker, switch, tabs, dan toast wajib berupa komponen React custom yang aksesibel (keyboard navigable, ARIA attributes, focus management).
2. **Desain Solid Colors (Dilarang Warna Gradient):**
   - Tidak ada `linear-gradient`, `radial-gradient`, `bg-gradient-*`, atau text gradient di seluruh aplikasi.
   - Menggunakan palet warna solid yang sistematis: latar bersih (`#FFFFFF` / `#F8FAFC`), permukaan kartu (`#FFFFFF`), border halus (`#E2E8F0`), teks kontras tinggi (`#0F172A` & `#475569`), serta warna aksen solid yang tegas (mis. Emerald `#059669` atau Indigo/Zinc solid sesuai tema toko).
3. **Zero Emoji (Wajib SVG Icons):**
   - Tidak boleh ada satu pun karakter emoji di UI, label, empty state, maupun notifikasi.
   - Seluruh ikon menggunakan `lucide-react` dengan ukuran dan ketebalan stroke yang konsisten.
4. **Super Clean, Modern & User-Friendly UX:**
   - Mobile-first untuk storefront (`/` dan `/p/[slug]`), responsive sidebar + clean workspace untuk `/admin`, `/portal`, dan `/affiliate`.
   - Loading skeleton yang rapi, empty state yang informatif, serta feedback toast instan pada setiap aksi.
5. **Optimasi Database & Performa Super Kencang:**
   - **Dilarang `SELECT *`:** Seluruh query Supabase wajib menyebut kolom secara eksplisit.
   - **Pagination Wajib:** Semua tabel daftar (produk, pesanan, transaksi, log webhook, affiliate) wajib menggunakan `.range(from, to)` / `limit`.
   - **Anti N+1 Query:** Gunakan join relasional PostgreSQL atau batch query `IN (...)` daripada query berulang di dalam loop.
   - **Indexing Strategis:** Composite index pada kolom filter & sorting yang sering diakses (`slug`, `status`, `created_at`, `user_id`, `product_id`, `midtrans_order_id`, `code`).
   - **Row Level Security (RLS):** Aktif di seluruh tabel Supabase untuk isolasi data yang ketat.
6. **Keamanan Aplikasi:**
   - Validasi seluruh input API dengan **Zod**.
   - Verifikasi signature SHA-512 pada Midtrans Webhook.
   - Proteksi rute Admin menggunakan pengecekan role server-side (bukan hanya client-side).
   - File produk digital disimpan di Private Bucket dan hanya diakses lewat short-lived Signed URL setelah verifikasi kepemilikan order berstatus `paid`.
   - Tidak pernah mengeksekusi aksi destruktif `DELETE` database secara langsung tanpa konfirmasi eksplisit.

---

## 5. Arsitektur Database (PostgreSQL / Supabase)

### Ringkasan Entitas Utama
1. **`store_settings`** — Singleton row konfigurasi toko (nama, tagline, bio, avatar_url, theme_config JSONB, social_links JSONB, seo_config JSONB, pixels_config JSONB, shipping_config JSONB).
2. **`profiles`** — Extends `auth.users` (`id`, `email`, `full_name`, `phone`, `avatar_url`, `role` ENUM `admin|buyer|affiliate`, `bank_name`, `bank_account_number`, `bank_account_holder`, `created_at`).
3. **`bio_blocks`** — Blok halaman bio (`id`, `type`, `title`, `subtitle`, `url`, `image_url`, `product_id`, `badge_text`, `is_active`, `sort_order`, `click_count`, `metadata`).
4. **`products`** — Katalog terpadu (`id`, `slug` UNIQUE, `type` ENUM `digital|course|appointment|event|physical|donation|membership`, `title`, `short_description`, `description`, `thumbnail_url`, `gallery_urls`, `price`, `compare_at_price`, `is_pay_what_you_want`, `min_price`, `status` ENUM `draft|published|archived`, `is_featured`, `stock_quantity`, `order_bump_product_id`, `order_bump_price`, `order_bump_headline`, `affiliate_enabled`, `affiliate_commission_pct`, `metadata` JSONB, `created_at`, `updated_at`).
5. **`product_digital_assets`** — Aset file/link/license (`id`, `product_id`, `asset_type` ENUM `file|external_url|license_key`, `title`, `storage_path`, `external_url`, `file_size_bytes`, `download_limit`, `sort_order`).
6. **`product_variants`** — Varian produk fisik (`id`, `product_id`, `name`, `sku`, `price_override`, `stock_quantity`, `weight_grams`, `is_active`).
7. **`course_sections`** & **`course_lessons`** — Struktur kurikulum LMS (`section_id`, `title`, `content_type`, `video_url`, `body_markdown`, `attachment_path`, `duration_minutes`, `is_free_preview`, `sort_order`).
8. **`course_enrollments`** & **`course_lesson_progress`** — Hak akses dan progres belajar pembeli.
9. **`appointment_availability`** & **`appointment_bookings`** — Jadwal ketersediaan owner (per `day_of_week`) & slot booking pembeli dengan unique partial index pada `(product_id, booking_date, start_time)` untuk status aktif (`pending`, `confirmed`) guna mencegah *double booking*.
10. **`event_tickets`** — Tiket unik webinar/event per order item (`ticket_code` UNIQUE, `attendee_name`, `attendee_email`, `status`).
11. **`membership_subscriptions`** — Masa aktif langganan member (`user_id`, `buyer_email`, `product_id`, `status`, `starts_at`, `expires_at`).
12. **`donations`** — Pesan dukungan & nominal untuk Wall of Supporters (`order_id`, `product_id`, `supporter_name`, `is_anonymous`, `message`, `amount`, `is_visible`).
13. **`vouchers`** — Kupon promo (`code` UNIQUE, `discount_type` ENUM `percentage|fixed`, `discount_value`, `max_discount_amount`, `min_order_amount`, `max_uses`, `used_count`, `applicable_product_id`, `starts_at`, `expires_at`, `is_active`).
14. **`orders`** & **`order_items`** — Header transaksi (`order_number` UNIQUE, `midtrans_order_id` UNIQUE, `buyer_user_id`, `buyer_name`, `buyer_email`, `buyer_phone`, `voucher_id`, `affiliate_id`, `subtotal`, `discount_amount`, `shipping_cost`, `total_amount`, `payment_status`, `payment_method`, `midtrans_snap_token`, `midtrans_redirect_url`, `shipping_address` JSONB, `shipping_courier`, `shipping_tracking_number`, `shipping_status`, `paid_at`) dan detail item (`is_order_bump`, `product_type`, `unit_price`, `quantity`, `metadata`).
15. **`affiliates`**, **`affiliate_clicks`**, **`affiliate_commissions`**, **`affiliate_payouts`** — Ekosistem referral, tracking klik, ledger komisi, dan riwayat pencairan.
16. **`analytics_events`** — Log event ringan (`event_type`, `product_id`, `block_id`, `session_id`, `referrer`, `created_at`) terindeks berdasarkan `created_at` dan `event_type`.
17. **`outbound_webhooks`** & **`webhook_logs`** — Endpoint integrasi eksternal dan riwayat eksekusi.

---

## 6. API Contract & Key Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/analytics/track` | Mencatat `page_view`, `link_click`, dan `affiliate_click` secara non-blocking. |
| `POST` | `/api/vouchers/validate` | Memvalidasi kode kupon terhadap produk & subtotal, mengembalikan potongan valid. |
| `GET` | `/api/appointments/[productId]/slots` | Mengembalikan daftar slot waktu kosong untuk tanggal tertentu (anti double-booking). |
| `POST` | `/api/checkout` | Menghitung total server-side, membuat order + items, dan memanggil Midtrans Snap API. |
| `POST` | `/api/webhooks/midtrans` | Menerima notifikasi Midtrans, verifikasi SHA-512, update order idempoten, jalankan Auto-Fulfillment & Outbound Webhooks. |
| `GET` | `/api/portal/download/[assetId]` | Verifikasi kepemilikan order `paid`, lalu generate Signed URL download sementara. |
| `POST` | `/api/portal/course/progress` | Menyimpan status selesai (*completed*) per lesson di Course Player. |
| `POST` | `/api/affiliate/register` | Mendaftarkan user menjadi affiliator dengan kode referral unik. |
| `POST` | `/api/affiliate/payout` | Affiliator mengajukan pencairan saldo komisi yang tersedia. |
| `POST` | `/api/admin/webhooks/test` | Mengirim payload uji coba ke Outbound Webhook tertentu dan mencatat hasilnya. |

---

## 7. Release Milestones & Verification Criteria

1. **Milestone 1 (Foundation & UI Kit):** Next.js App Router + Tailwind + Supabase + 100% Custom UI Component Library terpasang dan lulus `tsc` + `lint`.
2. **Milestone 2 (Schema & Auth):** Migrasi SQL lengkap dengan index & RLS + Login/Register/RBAC berjalan.
3. **Milestone 3 (Storefront & Bio Builder):** Halaman `/` mobile-first + Admin Appearance & Block Builder dengan Live Preview.
4. **Milestone 4 (7-Type Product Engine & Vouchers):** Admin dapat membuat & mengelola Digital, Course, Appointment, Event, Physical, Donation, Membership, Order Bump, dan Voucher.
5. **Milestone 5 (Checkout & Midtrans):** Checkout lengkap + Voucher + Order Bump + Midtrans Snap + SHA-512 Webhook Auto-Fulfillment teruji dengan unit test.
6. **Milestone 6 (Buyer Portal, Affiliate & Analytics):** Portal pembeli, Dashboard Affiliator & Payout, Analytics, Pixels, dan Outbound Webhooks siap produksi.
7. **Milestone 7 (Verification):** Seluruh unit tests lulus, `npm run build` sukses tanpa warning/error, serta audit visual (zero gradient, zero emoji, zero native controls).
