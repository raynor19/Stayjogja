-- ============================================================
-- STAYJOGJA SUPABASE DATABASE MIGRATION SCRIPT
-- Jalankan skrip SQL ini di Supabase Dashboard -> SQL Editor
-- untuk menyinkronkan seluruh kolom dan tabel baru ke database Supabase
-- ============================================================

-- 1. TAMBAH KOLOM BARU PADA TABEL RESERVATIONS
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS verified_by_qr    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ktp_data          JSONB,
  ADD COLUMN IF NOT EXISTS guest_address     TEXT,
  ADD COLUMN IF NOT EXISTS guest_religion    TEXT,
  ADD COLUMN IF NOT EXISTS guest_marital_status TEXT,
  ADD COLUMN IF NOT EXISTS guest_occupation  TEXT,
  ADD COLUMN IF NOT EXISTS guest_citizenship TEXT DEFAULT 'WNI',
  ADD COLUMN IF NOT EXISTS property_type     TEXT,
  ADD COLUMN IF NOT EXISTS property_stars    INTEGER,
  ADD COLUMN IF NOT EXISTS property_address  TEXT,
  ADD COLUMN IF NOT EXISTS property_photo    TEXT,
  ADD COLUMN IF NOT EXISTS price_per_night   NUMERIC,
  ADD COLUMN IF NOT EXISTS subtotal          NUMERIC,
  ADD COLUMN IF NOT EXISTS tax_service       NUMERIC,
  ADD COLUMN IF NOT EXISTS special_requests  TEXT,
  ADD COLUMN IF NOT EXISTS acc_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_status     TEXT,
  ADD COLUMN IF NOT EXISTS reject_reason     TEXT,
  ADD COLUMN IF NOT EXISTS qr_payload        TEXT,
  ADD COLUMN IF NOT EXISTS settlement_status TEXT;

-- Index baru untuk performa verifikasi QR & pencarian
CREATE INDEX IF NOT EXISTS idx_reservations_verified_qr ON reservations(verified_by_qr);

-- 2. TAMBAH KOLOM GMAPS_URL PADA TABEL PROPERTIES
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS gmaps_url TEXT;

-- 3. TAMBAH KOLOM PROPERTY_ID PADA TABEL NOTIFICATIONS
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS property_id TEXT;

-- 4. BUAT TABEL ITINERARIES RESMI DI POSTGRESQL (OPSIONAL / SINKRON DARI STORAGE)
CREATE TABLE IF NOT EXISTS itineraries (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  days                INTEGER DEFAULT 1,
  budget_level        TEXT,
  destination_summary TEXT,
  day_plans           JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id);

-- RLS untuk tabel itineraries
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public itineraries are viewable by everyone" ON itineraries FOR SELECT USING (true);
CREATE POLICY "Service role has full access to itineraries" ON itineraries FOR ALL USING (true) WITH CHECK (true);

-- Notifikasi selesai
SELECT 'Migrasi Supabase StayJogja Berhasil Dijalankan!' AS status;
