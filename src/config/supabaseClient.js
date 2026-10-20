require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL || 'https://dbhvkxoooxwmssrhfwhh.supabase.co';
// Gunakan key dari env, jika kosong gunakan dummy anonymous key agar tidak crash saat inisialisasi
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: {
      transport: WebSocket
    }
  });
} catch (e) {
  console.warn('⚠️ Supabase client fallback mode:', e.message);
}

module.exports = supabase;
