require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../src/config/supabaseClient');

async function migrateReservations() {
  const file = path.join(__dirname, '../src/data/reservations.json');
  if (!fs.existsSync(file)) return;

  const localRes = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Found ${localRes.length} local reservations.`);

  for (const r of localRes) {
    // map to table columns
    const row = {
      id: r.id,
      booking_code: r.booking_code,
      user_id: r.user_id,
      property_id: r.property_id,
      unit_id: r.unit_id,
      property_name: r.property_name,
      unit_name: r.unit_name,
      guest_name: r.guest_name,
      guest_email: r.guest_email,
      guest_phone: r.guest_phone,
      guest_nik: r.guest_nik || null,
      check_in: r.check_in,
      check_out: r.check_out,
      nights: r.nights || 1,
      guests_count: r.guests_count || 1,
      total_price: r.total_price || 0,
      status: r.status || 'menunggu_pembayaran',
      payment_status: r.payment?.status || (r.status === 'terkonfirmasi' || r.status === 'selesai_checkin' ? 'paid' : 'unpaid'),
      payment_method: r.payment?.method || null,
      payment_transaction_id: r.payment?.transaction_id || null,
      paid_at: r.payment?.paid_at || null,
      rejection_reason: r.rejection_reason || null,
      checked_in_at: r.checked_in_at || null,
      invoice_number: r.invoice_number || r.booking_code,
      created_at: r.created_at || new Date().toISOString()
    };

    const { error } = await supabase.from('reservations').upsert(row);
    if (error) {
      console.error(`Error migrating reservation ${r.id}:`, error.message);
    } else {
      console.log(`✅ Migrated reservation ${r.booking_code} (${r.guest_name}) to Supabase!`);
    }
  }

  const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true });
  console.log(`Total reservations in Supabase now: ${count}`);
}

migrateReservations();
