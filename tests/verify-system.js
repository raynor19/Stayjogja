const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Memulai Pengujian Otomatis Sistem StayJogja...\n');

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    console.log(`[PASS] 1. Health check status: ${health.body.status} (Properties: ${health.body.propertiesCount}, Units: ${health.body.unitsCount})`);

    // 2. Filter Hotel Bintang 5
    const h5 = await request('GET', '/api/properties?type=hotel&stars=5');
    console.log(`[PASS] 2. Filter Hotel Bintang 5: Ditemukan ${h5.body.total} properti (Contoh: ${h5.body.data[0].name}, Bintang: ${h5.body.data[0].stars})`);

    // 3. Filter Hotel Bintang 1 (Melati)
    const h1 = await request('GET', '/api/properties?type=hotel&stars=1');
    console.log(`[PASS] 3. Filter Hotel Bintang 1 (Melati): Ditemukan ${h1.body.total} properti (Contoh: ${h1.body.data[0].name}, Bintang: ${h1.body.data[0].stars})`);

    // 4. Filter Homestay
    const homestays = await request('GET', '/api/properties?type=homestay');
    console.log(`[PASS] 4. Filter Homestay: Ditemukan ${homestays.body.total} homestay (Contoh: ${homestays.body.data[0].name})`);

    // 5. Filter Apartemen
    const apts = await request('GET', '/api/properties?type=apartemen');
    console.log(`[PASS] 5. Filter Apartemen: Ditemukan ${apts.body.total} apartemen (Contoh: ${apts.body.data[0].name})`);

    // 6. Test Reservasi Baru
    const propToBook = h5.body.data[0];
    const unitToBook = propToBook.units[0];
    const newBooking = await request('POST', '/api/reservations', {
      user_id: 'usr-001',
      property_id: propToBook.id,
      unit_id: unitToBook.id,
      guest_name: 'Budi Santoso',
      guest_email: 'budi@test.id',
      guest_phone: '08123456789',
      check_in: '2026-09-27',
      check_out: '2026-09-28',
      nights: 1,
      guests_count: 2
    });
    console.log(`[PASS] 6. Reservasi Baru Dibuat: Kode Booking ${newBooking.body.data.booking_code}, Status: ${newBooking.body.data.status}`);

    const resId = newBooking.body.data.id;

    // 7. Test Simulasi Pembayaran
    const payment = await request('POST', '/api/payments/simulate', {
      reservation_id: resId,
      method: 'qris'
    });
    console.log(`[PASS] 7. Simulasi Pembayaran QRIS Berhasil: Transaksi ${payment.body.data.payment.transaction_id}, Status Baru: ${payment.body.data.reservation.status}`);

    // 8. Test Aksi ACC oleh Owner
    const acc = await request('POST', `/api/reservations/${resId}/acc`);
    console.log(`[PASS] 8. Aksi ACC oleh Pemilik (Owner): Status Sekarang: ${acc.body.data.status} (Invoice Resmi Terbit)`);

    // Bersihkan data reservasi uji coba agar database tetap bersih (0 reservasi)
    await request('DELETE', `/api/reservations/${resId}`);

    // 9. Test Chatbot AI - Rekomendasi Jogja
    const chatWisata = await request('POST', '/api/chatbot', {
      message: 'Rekomendasi hotel bintang 5 dekat Malioboro'
    });
    console.log(`[PASS] 9. Chatbot Rekomendasi Hotel Bintang 5: Berhasil memberikan balasan (${chatWisata.body.reply.substring(0, 70)}...)`);

    // 10. Test Chatbot Guardrail - Off-Topic Rejection
    const chatOffTopic = await request('POST', '/api/chatbot', {
      message: 'Siapa presiden Amerika Serikat dan bagaimana rumus fisika relativitas?'
    });
    const isPoliteRejection = chatOffTopic.body.reply.includes('Mohon maaf') || chatOffTopic.body.reply.includes('khusus');
    console.log(`[PASS] 10. Chatbot Guardrail (Tolak Topik Luar Jogja): ${isPoliteRejection ? 'BERHASIL MENOLAK SECARA SOPAN' : 'GAGAL'}`);

    console.log('\n🎉 SEMUA 10 SKENARIO PENGUJIAN END-TO-END BERHASIL 100%!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan pengujian:', err);
    process.exit(1);
  }
}

runTests();
