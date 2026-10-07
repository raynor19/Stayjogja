require('dotenv').config();
const supabase = require('../src/config/supabaseClient');

async function checkSync() {
  console.log('🔄 Memeriksa Status Database Supabase...\n');

  const tables = ['users', 'properties', 'units', 'reservations', 'tourist_spots', 'notifications'];
  let allReady = true;

  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('id', { count: 'exact' }).limit(1);
    if (error) {
      console.log(`❌ Tabel "${table}": BELUM ADA (${error.message})`);
      allReady = false;
    } else {
      console.log(`✅ Tabel "${table}": SIAP (${count !== null ? count : data?.length || 0} baris data)`);
    }
  }

  console.log('\n----------------------------------------------------');
  if (allReady) {
    console.log('🎉 SEMUA TABEL SUPABASE SIAP & TERHUBUNG PENUH!');
    console.log('Sistem StayJogja sekarang 100% menggunakan data cloud Supabase.');
  } else {
    console.log('⚠️  Tabel belum dibuat di Supabase.');
    console.log('\n👉 LANGKAH MUDAH UNTUK MENJALANKAN:');
    console.log('1. Buka Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/dbhvkxoooxwmssrhfwhh/sql/new');
    console.log('2. Buka file "supabase_schema.sql" di root proyek.');
    console.log('3. Copy semua isinya (Ctrl+A / Cmd+A, lalu Copy).');
    console.log('4. Paste di SQL Editor Supabase, lalu klik "RUN".');
  }
  console.log('----------------------------------------------------');
}

checkSync();
