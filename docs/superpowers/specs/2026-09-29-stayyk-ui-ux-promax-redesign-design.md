# Design Specification: StayJogja Full Application UI/UX Pro Max Redesign
**Date:** 2026-09-29  
**Status:** Approved by User  
**Scope:** Full Application Refactor (Katalog Tamu, Login Gateway, Dashboard Tamu, Dashboard Owner, Portal Pendaftaran Mitra, Panel Admin, & Global Token CSS)  
**Guideline Source:** `design-system/stayjogja/MASTER.md` & `ui-ux-pro-max`

---

## 1. Executive Vision & Differentiation

Aplikasi **StayJogja** (Akomodasi Istimewa Yogyakarta) bukan sekadar tiruan platform OTA komersial umum (seperti Traveloka), melainkan dirancang dengan identitas visual mandiri, berkelas, dan memiliki sentuhan estetika keramahan khas Yogyakarta:

### Brand & Aesthetic Identity:
- **Style Concept:** **Liquid Glass + Modern Swiss Hospitality** — Material kaca adaptif (`backdrop-blur-md`), sudut melengkung proporsional (`rounded-2xl`), kedalaman berlapis (*layered soft depth*), dan border tipis elegan (`border-slate-200/80` atau `border-white/20`).
- **Color Philosophy (Luxury Navy + Heritage Gold):**
  - **Primary (Royal Navy / Indigo):** `#0F172A` & `#1E3A8A` — Melambangkan ketenangan, keanggunan, dan wibawa budaya Yogyakarta.
  - **Secondary / Support Blue:** `#2563EB` & `#3B82F6` — Aksen navigasi dan elemen interaktif sekunder.
  - **Accent / CTA (Heritage Gold / Amber):** `#D97706` & `#B45309` — Menghadirkan kehangatan keraton Jogja, kontras tinggi WCAG AA (4.5:1+), dan memicu konversi tinggi pada tombol aksi.
  - **Surface & Backgrounds:** `#F8FAFC` (Slate 50) untuk fondasi latar, `#FFFFFF` murni untuk kartu, dan `#0F172A` pekat untuk panel manajerial (Admin & Owner highlights).
- **Typography:**
  - **Primary UI & Data:** `Plus Jakarta Sans` (400, 500, 600, 700, 800) untuk keterbacaan tinggi di semua perangkat.
  - **Editorial Heading Accents:** `Outfit` / `Playfair Display` untuk judul-judul hero dan kartu properti unggulan.

---

## 2. Global Token System (`public/css/style.css`)

Semua halaman akan mengonsumsi token dari `:root`:
```css
:root {
  /* Brand Palettes */
  --color-primary: #1e3a8a;          /* Deep Royal Navy */
  --color-primary-dark: #0f172a;     /* Deep Slate */
  --color-primary-hover: #172554;
  --color-primary-light: #eff6ff;
  --color-secondary: #2563eb;
  --color-secondary-hover: #1d4ed8;

  /* Accent / Heritage Gold CTA */
  --color-accent: #d97706;           /* Warm Amber Gold */
  --color-accent-hover: #b45309;
  --color-accent-light: #fef3c7;
  --color-accent-surface: #fffbeb;

  /* Neutrals & Surfaces */
  --color-bg-main: #f8fafc;
  --color-surface-card: #ffffff;
  --color-surface-muted: #f1f5f9;
  --color-border: #e2e8f0;
  --color-border-subtle: #f1f5f9;

  /* Typography / Text */
  --color-text-title: #0f172a;
  --color-text-body: #334155;
  --color-text-muted: #64748b;
  --color-text-subtle: #94a3b8;

  /* Status Colors */
  --status-pending: #f59e0b;
  --status-pending-bg: #fef3c7;
  --status-confirmed: #10b981;
  --status-confirmed-bg: #d1fae5;
  --status-rejected: #ef4444;
  --status-rejected-bg: #fee2e2;
  --status-info: #0284c7;
  --status-info-bg: #e0f2fe;

  /* Shadows & Elevation */
  --shadow-subtle: 0 1px 3px rgba(15, 23, 42, 0.05);
  --shadow-card: 0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
  --shadow-hover: 0 16px 32px -8px rgba(15, 23, 42, 0.12);
  --shadow-modal: 0 25px 50px -12px rgba(15, 23, 42, 0.25);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-pill: 9999px;
}
```

---

## 3. Full Application Architecture & Modules

### 3.1 Modul 1: Katalog & Booking Tamu (`public/index.html` & `public/js/app.js`)
- **Header:** Sticky Liquid Glass navigation dengan logo eksklusif **StayJogja**, navigasi tipe akomodasi (Hotel, Homestay, Apartemen), dan badge pesanan aktif.
- **Hero & Search Capsule:** Tampilan panorama ikonik Jogja dengan formulir pencarian melayang (*floating search capsule*) terpadu (Area Jogja, Tanggal, Tamu & Kamar, tombol "Temukan Penginapan" aksen Gold).
- **Katalog & Filter:** Sticky sidebar filter modern (rentang harga, bintang, fasilitas Jogja) dan kartu akomodasi Bento-grid dengan tag rating emas, perkiraan jarak ke objek wisata, dan harga transparan.
- **Detail Kamar & Stepper Booking:** Modal rincian kamar bertahap, simulasi pembayaran sandbox QRIS/VA, serta penerbitan E-Voucher StayJogja resmi siap cetak (terisolasi `@media print`).
- **Floating AI Chatbot:** Tombol melayang asisten Jogja dengan saran pertanyaan seputar kuliner, hotel murah, dan wisata Jogja.

### 3.2 Modul 2: Gateway Autentikasi (`public/login.html` & `public/js/login.js`)
- **Ambiance:** Background slideshow Ken Burns landmark Jogja (Prambanan, Tugu, Sunset Merapi) berpadu kartu login Liquid Glass berkontras tinggi.
- **Form Interaktif:** Tab peralihan mulus antara *Masuk Akun* dan *Daftar Tamu Baru*.
- **Role Quick Switcher:** Panel tombol cepat untuk demo pengujian (Login sebagai Tamu Budi, Pemilik Ibu Kartika, atau Administrator Utama) yang rapi dan elegan.

### 3.3 Modul 3: Dashboard Tamu / Wisatawan (`public/user.html` & `public/js/user.js`)
- **Profil & Metrik Tamu:** Ringkasan pesanan aktif, total riwayat menginap, dan status akun.
- **Pelacakan Pesanan Real-Time:** Kartu pesanan interaktif dengan badge status (Menunggu Pembayaran, Menunggu ACC Pemilik, Terkonfirmasi, Selesai).
- **Voucher Modal:** Akses cepat unduh e-voucher langsung dari dashboard akun.

### 3.4 Modul 4: Dashboard Pemilik & Mitra (`public/owner.html` & `public/js/owner.js`)
- **Branding Mandiri:** Rebrand total dari Traveloka TERA menjadi **StayJogja Partner Hub**.
- **Ringkasan Kinerja:** Kartu metrik pendapatan, tingkat hunian, dan notifikasi persetujuan pesanan masuk.
- **Tabel & Aksi Reservasi (ACC):** Panel persetujuan (Terima / Tolak) reservasi tamu dengan konfirmasi instan.
- **Manajemen Properti & Unit:** Pengaturan harga kamar harian, kuota ketersediaan, dan fasilitas.

### 3.5 Modul 5: Portal Pendaftaran Mitra Akomodasi (`public/tera.html` & `public/js/tera.js`)
- **Formulir Onboarding Bertahap:** 4 langkah terstruktur (1. Profil Properti, 2. Lokasi & Peta Jogja, 3. Kamar & Fasilitas, 4. Verifikasi & Legalitas).
- **Liquid Glass Progress Stepper:** Indikator nomor langkah dengan transisi halus dan validasi field jelas.

### 3.6 Modul 6: Panel Kontrol Administrator (`public/admin.html` & `public/js/admin.js`)
- **Executive Control Center:** Tampilan dark slate modern (`bg-slate-900`) dengan aksen royal navy dan ungu berwibawa.
- **Moderasi Properti:** Antrean verifikasi properti baru yang didaftarkan pemilik dengan tombol *Approve* / *Reject*.
- **Audit Transaksi & Data Chatbot:** Tabel log reservasi sistem dan manajemen basis data kuliner/wisata chatbot.

---

## 4. Standar Kualitas UI/UX Pro Max
1. **No Traveloka Clones:** Hindari warna cyan `#0194f3` generik; gunakan palet Royal Navy & Amber Gold yang berkarakter.
2. **Aksesibilitas (WCAG AA):** Rasio kontras 4.5:1+ pada semua elemen teks dan tombol.
3. **Sentuhan & Interaksi:** Area sentuh minimal 44x44px, transisi halus 200–300ms, dan feedback visual seketika.
4. **Keutuhan Sistem:** 100% endpoint backend Express (`/api/*`) dan logika JavaScript tetap berjalan stabil.
