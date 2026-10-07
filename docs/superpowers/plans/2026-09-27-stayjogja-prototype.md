# StayJogja Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem prototipe aplikasi reservasi akomodasi StayJogja dengan antarmuka Traveloka-style (khusus Hotel bintang 1–5, Homestay, dan Apartemen di Jogja), alur booking & simulasi bayar, ACC owner, dashboard admin, dan AI chatbot rekomendasi Jogja.

**Architecture:** Monorepo Node.js + Express.js backend dengan database lokal berskema Supabase (JSON/SQLite storage), RESTful API, dan frontend modern responsif berbasis Tailwind CSS + Vanilla JS modular.

**Tech Stack:** Node.js, Express.js, Tailwind CSS (CDN), Vanilla JS (ES6+), Supabase-compatible relational schema, FontAwesome/Lucide icons.

**Spec:** [docs/superpowers/specs/2026-09-27-stayjogja-uiux-system-design.md](../specs/2026-09-27-stayjogja-uiux-system-design.md)

## Global Constraints
- Seluruh kode disimpan secara lokal dan **tidak melakukan push ke remote GitHub** sesuai instruksi pengguna.
- Sistem harus dapat dijalankan langsung dengan perintah `npm start` atau `node server.js` pada port lokal (contoh: 3000).
- Desain antarmuka mengadopsi estetika Traveloka (biru travel, kartu properti bersih, pencarian terintegrasi, filter bintang 1–5).
- Chatbot AI harus memiliki knowledge base wisata & kuliner Jogja dengan guardrail topik ketat.

---

### Task 1: Inisialisasi Proyek & Scaffolding Server

**Files:**
- Create: `package.json`
- Create: `server.js`
- Create: `src/config/database.js`
- Create: `public/index.html`

**Interfaces:**
- Produces: Server Express yang melayani REST API `/api/*` dan file statis dari folder `public/`.

- [ ] **Step 1: Buat `package.json`** dengan dependensi `express`, `cors`, `dotenv`.
- [ ] **Step 2: Buat database engine layer `src/config/database.js`** yang memuat dan menyimpan data relasional ke memory / JSON file lokal yang kompatibel dengan skema Supabase.
- [ ] **Step 3: Buat `server.js`** dengan konfigurasi middleware JSON, CORS, static folder `public/`, dan error handling.
- [ ] **Step 4: Uji jalankan server** dan verifikasi endpoint status `/api/health`.

---

### Task 2: Data Model & Seed Dataset Akomodasi Jogja

**Files:**
- Create: `src/data/seed_users.json`
- Create: `src/data/seed_properties.json`
- Create: `src/data/seed_tourist_spots.json`

**Interfaces:**
- Produces: Dataset awal berisi:
  - 3 User representatif: Tamu (`user@stayjogja.id`), Pemilik (`owner@stayjogja.id`), Admin (`admin@stayjogja.id`).
  - 20+ Akomodasi Jogja mencakup Hotel Bintang 5 (Tentrem, Ambarrukmo, Phoenix), Bintang 4 (Grand Zuri, 1O1, Dafam), Bintang 3 (Ibis, Favehotel), Bintang 2 (Pop!, Whiz), Bintang 1/Melati (Sosrowijayan, Bladok), Homestay (Omah Njonja, Trava House, Rumah Palagan), dan Apartemen (Uttara, Student Park, Malioboro City).
  - Tipe unit/kamar lengkap dengan harga per malam, fasilitas, stok, dan kapasitas.
  - Data destinasi wisata & kuliner terkenal Jogja (Malioboro, Tamansari, Prambanan, Gudeg Yu Djum, Kopi Klotok, dll.).

- [ ] **Step 1: Buat `src/data/seed_users.json`** dengan kredensial demo untuk Tamu, Owner, dan Admin.
- [ ] **Step 2: Buat `src/data/seed_properties.json`** dengan 20+ properti Jogja lengkap beserta foto resolusi tinggi, tipe, bintang (1–5), fasilitas, dan varian kamar/unit.
- [ ] **Step 3: Buat `src/data/seed_tourist_spots.json`** dengan data kuliner & tempat wisata per area Jogja.
- [ ] **Step 4: Sambungkan seed data** ke `src/config/database.js` agar terinisialisasi otomatis saat server start.

---

### Task 3: Backend REST API Endpoints

**Files:**
- Create: `src/routes/propertyRoutes.js`
- Create: `src/routes/reservationRoutes.js`
- Create: `src/routes/paymentRoutes.js`
- Create: `src/routes/adminRoutes.js`
- Create: `src/routes/chatbotRoutes.js`
- Modify: `server.js`

**Interfaces:**
- Consumes: `src/config/database.js`
- Produces:
  - `GET /api/properties`: filter by `type`, `stars` (1-5), `area`, `minPrice`, `maxPrice`, `facilities`, `search`.
  - `GET /api/properties/:id`: detail properti lengkap dengan unit dan ulasan.
  - `POST /api/reservations`: membuat reservasi baru (status: `menunggu_pembayaran`).
  - `POST /api/payments/simulate`: simulasi pembayaran (transisi status: `menunggu_acc`).
  - `POST /api/reservations/:id/acc`: aksi Owner menyetujui pesanan (transisi status: `terkonfirmasi`).
  - `POST /api/reservations/:id/reject`: aksi Owner menolak pesanan (transisi status: `ditolak`).
  - `GET /api/owner/reservations`: daftar pesanan masuk untuk owner.
  - `GET /api/admin/overview`: statistik moderasi & audit transaksi.
  - `POST /api/chatbot`: endpoint interaksi AI dengan grounding wisata & akomodasi Jogja.

- [ ] **Step 1: Implementasi `src/routes/propertyRoutes.js`** dengan filtering canggih (tipe, bintang 1–5, harga, fasilitas, pencarian teks).
- [ ] **Step 2: Implementasi `src/routes/reservationRoutes.js`** dan `paymentRoutes.js` dengan state machine pemesanan lengkap.
- [ ] **Step 3: Implementasi `src/routes/adminRoutes.js`** untuk moderasi properti dan transaksi global.
- [ ] **Step 4: Implementasi `src/routes/chatbotRoutes.js`** dengan pencarian kontekstual kuliner/wisata/budget dan guardrail topik Jogja.
- [ ] **Step 5: Daftarkan seluruh rute** ke `server.js` dan verifikasi dengan uji request API.

---

### Task 4: Antarmuka Frontend — Navbar, Role Switcher & Hero Search Bar

**Files:**
- Modify: `public/index.html`
- Create: `public/css/custom.css`
- Create: `public/js/state.js`
- Create: `public/js/api.js`
- Create: `public/js/components/navbar.js`
- Create: `public/js/components/heroSearch.js`

**Interfaces:**
- Produces: Header Traveloka modern dengan tab tipe akomodasi, role switcher demo (Tamu/Owner/Admin), dan Hero Search Bar dengan input destinasi Jogja, tanggal menginap, serta jumlah tamu & kamar.

- [ ] **Step 1: Setup struktur `public/index.html`** dengan Tailwind CSS CDN, FontAwesome/Lucide Icons, dan kontainer layout responsif.
- [ ] **Step 2: Implementasi `public/js/state.js` & `api.js`** untuk sentralisasi state aplikasi (active role, filter criteria, active modal, current bookings).
- [ ] **Step 3: Bangun komponen `navbar.js`** dengan logo StayJogja, tombol tab (Semua, Hotel, Homestay, Apartemen), link "Cek Pesanan", dan demo Role Switcher.
- [ ] **Step 4: Bangun komponen `heroSearch.js`** bergaya Traveloka dengan background banner Jogja, dropdown area Jogja, date picker (check-in/out), dan counter tamu/kamar.

---

### Task 5: Sidebar Filter & Katalog Kartu Akomodasi

**Files:**
- Create: `public/js/components/filterSidebar.js`
- Create: `public/js/components/propertyList.js`
- Create: `public/js/components/propertyCard.js`

**Interfaces:**
- Produces:
  - Sidebar filter dengan checkbox tipe properti, bintang 1–5 (★★★★★), range slider harga, fasilitas.
  - Grid listing akomodasi yang memperlihatkan kartu properti dengan badge bintang, foto jernih, skor rating, fasilitas, harga per malam, dan tombol "Lihat Kamar".

- [ ] **Step 1: Implementasi `filterSidebar.js`** dengan event listener dinamis untuk bintang hotel 1–5, tipe properti, harga min/max, dan fasilitas.
- [ ] **Step 2: Implementasi `propertyCard.js`** yang merender kartu penginapan bergaya Traveloka lengkap dengan badge tipe, bintang hotel, harga, dan rating ulasan.
- [ ] **Step 3: Implementasi `propertyList.js`** yang mengelola rendering grid, status loading, dan pesan saat data tidak ditemukan (*empty state*).

---

### Task 6: Modal Detail Properti & Pilihan Kamar/Unit

**Files:**
- Create: `public/js/components/propertyDetailModal.js`

**Interfaces:**
- Produces: Modal detail akomodasi yang menampilkan galeri foto 5-grid, deskripsi lengkap, lokasi peta, daftar tipe kamar/unit (spesifikasi kasur, kapasitas, harga, tombol "Pesan Sekarang"), serta spot wisata & kuliner sekitar.

- [ ] **Step 1: Rancang layout modal detail properti** dengan galeri foto, badge bintang/tipe, dan fasilitas lengkap.
- [ ] **Step 2: Buat tabel varian kamar/unit** dengan rincian stok, fasilitas kamar, dan tombol "Pesan Sekarang".
- [ ] **Step 3: Tambahkan section "Wisata & Kuliner Terdekat"** yang menampilkan rekomendasi spot di area akomodasi.

---

### Task 7: Alur Checkout, Pembayaran Sandbox & E-Voucher

**Files:**
- Create: `public/js/components/bookingModal.js`
- Create: `public/js/components/paymentModal.js`
- Create: `public/js/components/voucherModal.js`
- Create: `public/js/components/myBookingsModal.js`

**Interfaces:**
- Produces:
  - Form data pemesan & tamu dengan kalkulasi otomatis total malam × harga kamar.
  - Modal simulasi pembayaran Sandbox (Virtual Account & QRIS) dengan tombol "Simulasi Bayar Berhasil".
  - Notifikasi & indikator status "Menunggu ACC Pemilik".
  - E-Voucher resmi dengan kode booking unik, QR code, data tamu, dan tombol cetak saat status "Terkonfirmasi".

- [ ] **Step 1: Implementasi `bookingModal.js`** untuk input data tamu dan ringkasan pemesanan.
- [ ] **Step 2: Implementasi `paymentModal.js`** dengan simulasi QRIS & Virtual Account serta tombol bayar instan.
- [ ] **Step 3: Implementasi `voucherModal.js` & `myBookingsModal.js`** untuk melihat daftar pesanan aktif dan mencetak E-Voucher.

---

### Task 8: Dashboard Interaktif Pemilik (Owner) & Admin

**Files:**
- Create: `public/js/components/ownerDashboard.js`
- Create: `public/js/components/adminDashboard.js`

**Interfaces:**
- Produces:
  - Owner Dashboard: tab reservasi masuk untuk ACC / Tolak pesanan, kelola kamar & harga, laporan omzet.
  - Admin Dashboard: moderasi properti baru, audit transaksi sistem, dan kelola knowledge base chatbot.

- [ ] **Step 1: Implementasi `ownerDashboard.js`** dengan aksi persetujuan satu-klik ("ACC Reservasi" dan "Tolak Reservasi").
- [ ] **Step 2: Implementasi `adminDashboard.js`** dengan ringkasan transaksi platform dan moderasi penginapan.
- [ ] **Step 3: Hubungkan Role Switcher** di navbar sehingga penguji dapat langsung berganti peran dalam satu klik untuk demo sidang.

---

### Task 9: Widget AI Chatbot Rekomendasi Jogja

**Files:**
- Create: `public/js/components/chatbotWidget.js`

**Interfaces:**
- Produces: Floating action button di pojok kanan bawah yang membuka jendela percakapan AI dengan rekomendasi wisata, kuliner, dan akomodasi budget Jogja dengan filter guardrail ketat.

- [ ] **Step 1: Desain floating button & chat drawer responsif** dengan avatar khas StayJogja.
- [ ] **Step 2: Tambahkan quick prompt chips** (*"Cari hotel bintang 5 dekat Malioboro"*, *"Homestay murah < Rp 250rb"*, *"Kuliner malam sekitar Kraton"*).
- [ ] **Step 3: Sambungkan ke endpoint `/api/chatbot`** dan uji penanganan pertanyaan di luar topik Jogja.

---

### Task 10: Pengujian End-to-End & Verifikasi

**Files:**
- Create: `tests/verify-system.js`

**Interfaces:**
- Produces: Script otomatis yang memvalidasi seluruh alur sistem:
  1. Filter properti berdasarkan tipe (Hotel, Homestay, Apartemen).
  2. Filter bintang hotel (1, 2, 3, 4, 5).
  3. Pembuatan reservasi baru.
  4. Simulasi pembayaran sandbox.
  5. Aksi ACC oleh Owner hingga status "terkonfirmasi".
  6. Respon Chatbot untuk wisata Jogja dan penolakan topik off-topic.

- [ ] **Step 1: Buat script pengujian `tests/verify-system.js`**.
- [ ] **Step 2: Jalankan server dan eksekusi pengujian otomatis**.
- [ ] **Step 3: Verifikasi tampilan UI/UX di browser lokal**.
