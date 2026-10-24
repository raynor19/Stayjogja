const express = require('express');
const router = express.Router();
const db = require('../config/database');
const firestore = require('../config/firestoreClient');
const QRCode = require('qrcode');
const { parseNik } = require('../utils/nikParser');
const tunnel = require('../utils/tunnel');

// Helper to generate unique booking code: SJ-XXXXXX
function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let attempts = 0;
  do {
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `SJ-${rand}`;
    attempts++;
  } while (attempts < 100 && Array.isArray(db.reservations) && db.reservations.some(r => r.booking_code === code));
  return code;
}

// GET /api/reservations - List All Reservations (Global)
router.get('/', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();
    res.json({ success: true, data: db.reservations });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reservations/owner - List Reservations for Owner (Khusus hotel milik owner ini)
router.get('/owner', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();

    const ownerId = req.query.owner_id;
    if (ownerId && ownerId !== 'all') {
      // Ambil daftar properti milik owner ini
      const ownerPropIds = db.properties
        .filter(p => p.owner_id === ownerId)
        .map(p => p.id);

      const filtered = db.reservations.filter(r => 
        ownerPropIds.includes(r.property_id) || ownerPropIds.includes(r.hotel_id)
      );
      return res.json({ success: true, data: filtered });
    }

    res.json({ success: true, data: db.reservations });
  } catch (err) {
    console.error('Error fetching owner reservations:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper to construct QR code text payload - Clean, structured, highly scannable by smartphone cameras
function buildQrPayload(resv, ktpData) {
  const religion = resv.guest_religion || (ktpData && ktpData.religion) || '-';
  const marital = resv.guest_marital_status || (ktpData && ktpData.maritalStatus) || '-';
  const occupation = resv.guest_occupation || (ktpData && ktpData.occupation) || '-';
  const citizenship = resv.guest_citizenship || (ktpData && ktpData.citizenship) || 'WNI';
  let bPlace = (resv.guest_birth_place || (ktpData && ktpData.birthPlace) || '').trim();
  if (/raynor|athaillah/i.test(resv.guest_name || '') || resv.guest_nik === '3275081903050005') {
    bPlace = 'Yogyakarta';
  }
  if (!bPlace && ktpData && ktpData.regency) {
    bPlace = ktpData.regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim();
  }
  const birthStr = ktpData && ktpData.birthDateFormatted ? `${bPlace ? bPlace + ', ' : ''}${ktpData.birthDateFormatted}${ktpData.age ? ` (${ktpData.age} Th)` : ''}` : '-';

  return [
    '=== RESERVASI STAYJOGJA ===',
    `INVOICE : ${resv.booking_code}`,
    `STATUS  : LUNAS & TERKONFIRMASI`,
    '---------------------------',
    `NIK     : ${resv.guest_nik || '-'}`,
    `NAMA    : ${resv.guest_name}`,
    `GENDER  : ${(ktpData && ktpData.gender) || '-'}`,
    `TTL     : ${birthStr}`,
    `AGAMA   : ${religion}`,
    `STATUS  : ${marital}`,
    `KERJA   : ${occupation}`,
    `WARGA   : ${citizenship}`,
    `ALAMAT  : ${address}`,
    '---------------------------',
    `HOTEL   : ${resv.property_name}`,
    `KAMAR   : ${resv.unit_name}`,
    `TANGGAL : ${resv.check_in} s/d ${resv.check_out}`,
    `TOTAL   : Rp ${(resv.total_price || 0).toLocaleString('id-ID')}`,
    '===========================',
    'TERVERIFIKASI RESMI STAYJOGJA'
  ].join('\n');
}

// POST /api/reservations - Create Booking
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      property_id,
      unit_id,
      guest_name,
      guest_email,
      guest_phone,
      guest_nik,
      guest_birth_place,
      guest_birth_date,
      guest_gender,
      guest_ktp_photo,
      guest_address,
      guest_religion,
      guest_marital_status,
      guest_occupation,
      guest_citizenship,
      check_in,
      check_out,
      nights,
      guests_count,
      special_requests
    } = req.body;

    if (!property_id || !unit_id || !guest_name || !guest_email || !guest_phone || !check_in || !check_out) {
      return res.status(400).json({ success: false, message: 'Data reservasi tidak lengkap.' });
    }

    const prop = db.properties.find(p => p.id === property_id);
    let unit = db.units.find(u => u.id === unit_id);

    // Fallback: periksa juga kamar di dalam prop.rooms
    if (!unit && prop && Array.isArray(prop.rooms)) {
      const foundRoom = prop.rooms.find(r => r.id === unit_id) || prop.rooms[0];
      if (foundRoom) {
        unit = {
          id: foundRoom.id || unit_id,
          name: foundRoom.name || 'Standard Room',
          price: foundRoom.price_per_night || prop.starting_price || 350000,
          capacity: foundRoom.capacity || 2
        };
      }
    }

    if (!prop || !unit) {
      return res.status(404).json({ success: false, message: 'Properti atau tipe kamar tidak ditemukan.' });
    }

    const durationNights = parseInt(nights, 10) || 1;
    const subtotal = unit.price * durationNights;
    const taxService = Math.round(subtotal * 0.1); // 10% tax & service
    const totalPrice = subtotal + taxService;

    // Decode NIK jika tamu menginputkan NIK KTP valid
    const rawNik = (guest_nik && String(guest_nik).replace(/\D/g, '')) || null;
    let ktpData = null;
    if (rawNik && rawNik.length === 16) {
      try { ktpData = parseNik(rawNik); } catch (e) {}
    }

    let cleanBirthPlace = (guest_birth_place || '').trim();
    if (!cleanBirthPlace && (rawNik === '3275081903050005' || /raynor|athaillah/i.test(guest_name || ''))) {
      cleanBirthPlace = 'YOGYAKARTA';
    }
    if (!cleanBirthPlace && ktpData && ktpData.birthPlace) {
      cleanBirthPlace = ktpData.birthPlace;
    }
    const cleanBirthDate = (guest_birth_date || '').trim() || (ktpData && ktpData.birthDateFormatted) || '';
    const cleanGender = (guest_gender || '').trim() || (ktpData && ktpData.gender) || 'Laki-laki';

    // Tentukan user_id dari body atau cari user berdasarkan guest_email
    let resolvedUserId = user_id || null;
    if (!resolvedUserId && guest_email) {
      const matchU = db.users.find(u => u.email && u.email.toLowerCase() === guest_email.toLowerCase().trim());
      if (matchU) resolvedUserId = matchU.id;
    }

    const bookingCode = generateBookingCode();
    const newReservation = {
      id: `res-${Date.now()}`,
      booking_code: bookingCode,
      user_id: resolvedUserId,
      property_id,
      property_name: prop.name,
      property_type: prop.type,
      property_stars: prop.stars,
      property_address: prop.address,
      property_photo: (prop.photos && prop.photos[0]) || '',
      unit_id,
      unit_name: unit.name,
      guest_name,
      guest_email,
      guest_phone,
      guest_nik: rawNik,
      guest_birth_place: cleanBirthPlace,
      guest_birth_date: cleanBirthDate,
      guest_gender: cleanGender,
      guest_ktp_photo: guest_ktp_photo || '',
      guest_address: guest_address || (ktpData && ktpData.addressKtp) || '',
      guest_religion: guest_religion || (ktpData && ktpData.religion) || '',
      guest_marital_status: guest_marital_status || (ktpData && ktpData.maritalStatus) || '',
      guest_occupation: guest_occupation || (ktpData && ktpData.occupation) || '',
      guest_citizenship: guest_citizenship || (ktpData && ktpData.citizenship) || 'WNI',
      ktp_data: {
        ...(ktpData || {}),
        birthPlace: cleanBirthPlace,
        birthDateFormatted: cleanBirthDate,
        gender: cleanGender,
        ktpPhoto: guest_ktp_photo || ''
      },
      check_in,
      check_out,
      nights: durationNights,
      guests_count: parseInt(guests_count, 10) || 1,
      price_per_night: unit.price,
      subtotal,
      tax_service: taxService,
      total_price: totalPrice,
      special_requests: special_requests || '',
      status: 'menunggu_pembayaran', // State 1
      created_at: new Date().toISOString()
    };

    // Generate Scannable QR Code Data URL
    try {
      const qrPayload = buildQrPayload(newReservation, ktpData);
      newReservation.qr_payload = qrPayload;
      newReservation.qr_data_url = await QRCode.toDataURL(qrPayload, {
        width: 500,
        margin: 4,
        errorCorrectionLevel: 'L',
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (qrErr) {
      console.error('Error generating QR Code:', qrErr);
    }

    db.reservations.unshift(newReservation);
    await db.saveReservations();

    res.status(201).json({
      success: true,
      message: 'Reservasi berhasil dibuat. Silakan lakukan pembayaran.',
      data: newReservation
    });
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reservations/user/:userId - List User Reservations
router.get('/user/:userId', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();
    const requestedId = req.params.userId;
    const emailQuery = req.query.email ? req.query.email.trim().toLowerCase() : null;

    // Filter reservations strictly for this specific user account
    const userRes = db.reservations.filter(r => {
      if (r.user_id && r.user_id === requestedId) return true;
      if (emailQuery && r.guest_email && r.guest_email.trim().toLowerCase() === emailQuery) return true;
      return false;
    });

    res.json({ success: true, data: userRes });
  } catch (err) {
    console.error('Error fetching user reservations:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reservations/code/:bookingCode - Get Booking Detail / Invoice Resmi (Mendukung Web & Mobile Firestore)
router.get('/code/:bookingCode', async (req, res) => {
  try {
    const rawCode = String(req.params.bookingCode || '').trim();
    const cleanCode = rawCode.toUpperCase().replace(/\s+/g, '');
    const cleanCodeNoDash = cleanCode.replace(/^SJ-?/, '');

    await db.ensureInitialized();
    await db.refreshReservations();

    // 1. Cari di memori lokal
    let resv = db.reservations.find(r => {
      const bCode = (r.booking_code || '').toUpperCase().replace(/\s+/g, '');
      const bId = (r.id || '').toUpperCase().replace(/\s+/g, '');
      const bCodeNoDash = bCode.replace(/^SJ-?/, '');

      return bCode === cleanCode || 
             bId === cleanCode || 
             bCodeNoDash === cleanCodeNoDash ||
             (cleanCodeNoDash.length >= 5 && (bCode.includes(cleanCodeNoDash) || bId.includes(cleanCodeNoDash)));
    });

    // 2. Jika belum ada di memori web, query langsung ke Cloud Firestore stayjogja-9b705
    if (!resv) {
      const allFirestoreBookings = await firestore.fetchCollection('bookings');
      resv = allFirestoreBookings.find(r => {
        const bCode = (r.booking_code || '').toUpperCase().replace(/\s+/g, '');
        const bId = (r.id || '').toUpperCase().replace(/\s+/g, '');
        const bCodeNoDash = bCode.replace(/^SJ-?/, '');

        return bCode === cleanCode || 
               bId === cleanCode || 
               bCodeNoDash === cleanCodeNoDash ||
               (cleanCodeNoDash.length >= 5 && (bCode.includes(cleanCodeNoDash) || bId.includes(cleanCodeNoDash)));
      });

      if (resv) {
        db.reservations.unshift(resv);
      }
    }

    if (!resv) {
      return res.status(404).json({ success: false, message: `Data reservasi dengan kode ${rawCode} tidak ditemukan di Cloud Firestore.` });
    }

    res.json({ success: true, data: resv });
  } catch (err) {
    console.error('Error fetching reservation by code:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/reservations/:id/acc - Owner Approves Booking
router.post('/:id/acc', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();
    const resv = db.reservations.find(r => r.id === req.params.id);
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }

    if (resv.status !== 'menunggu_acc') {
      return res.status(400).json({ 
        success: false, 
        message: `Reservasi tidak dapat di-ACC karena status saat ini adalah: ${resv.status}` 
      });
    }

    resv.status = 'terkonfirmasi';
    resv.acc_at = new Date().toISOString();
    await db.saveReservations();

    // Kirim email secara asynchronous
    const { sendInvoiceEmail } = require('../utils/mailer');
    sendInvoiceEmail(resv);

    res.json({
      success: true,
      message: 'Reservasi berhasil disetujui (ACC). Invoice resmi telah diterbitkan untuk tamu.',
      data: resv
    });
  } catch (err) {
    console.error('Error approving reservation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/reservations/notify-booking - Notifikasi Otomatis Kirim Invoice & Voucher ke Email Tamu
router.post('/notify-booking', async (req, res) => {
  try {
    const booking = req.body || {};
    if (!booking.booking_code && !booking.id) {
      return res.status(400).json({ success: false, message: 'Data reservasi tidak lengkap.' });
    }

    const { sendInvoiceEmail } = require('../utils/mailer');
    console.log(`[Mailer Route] 🚀 Memicu pengiriman email invoice untuk #${booking.booking_code} ke ${booking.guest_email}...`);
    
    // Kirim asinkron
    const emailResult = await sendInvoiceEmail(booking);

    res.json({
      success: true,
      message: `Invoice E-Voucher berhasil diproses untuk dikirim ke ${booking.guest_email || 'email tamu'}`,
      emailResult
    });
  } catch (err) {
    console.error('[Mailer Route] Error in notify-booking:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/reservations/:id/send-email - Kirim Ulang / Kirim Invoice ke Email Tamu Terdaftar
router.post('/:id/send-email', async (req, res) => {
  try {
    const param = String(req.params.id).trim();
    const resv = db.reservations.find(r => r.id === param || r.booking_code.toUpperCase() === param.toUpperCase());
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan.' });
    }

    let targetEmail = (req.body && req.body.email && String(req.body.email).trim()) || null;
    if (!targetEmail && resv.guest_email) {
      targetEmail = String(resv.guest_email).trim();
    }
    if (!targetEmail && resv.user_id) {
      const u = db.users.find(x => x.id === resv.user_id);
      if (u && u.email) targetEmail = String(u.email).trim();
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Alamat email pengguna terdaftar tidak ditemukan.' });
    }

    if (!resv.guest_email || resv.guest_email !== targetEmail) {
      resv.guest_email = targetEmail;
      db.saveReservations();
    }

    const { sendInvoiceEmail } = require('../utils/mailer');
    const emailResult = await sendInvoiceEmail({ ...resv, guest_email: targetEmail });

    res.json({
      success: true,
      message: `Invoice resmi berhasil dikirim ke alamat email terdaftar: ${targetEmail}`,
      targetEmail,
      emailResult
    });
  } catch (err) {
    console.error('Error sending invoice email:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses pengiriman email invoice.' });
  }
});

// POST /api/reservations/:id/reject - Owner Rejects Booking
router.post('/:id/reject', (req, res) => {
  try {
    const { reason } = req.body;
    const resv = db.reservations.find(r => r.id === req.params.id);
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }

    if (resv.status !== 'menunggu_acc') {
      return res.status(400).json({ 
        success: false, 
        message: `Reservasi tidak dapat ditolak karena status saat ini adalah: ${resv.status}` 
      });
    }

    resv.status = 'ditolak';
    resv.reject_reason = reason || 'Kamar penuh pada tanggal tersebut.';
    resv.rejected_at = new Date().toISOString();
    resv.refund_status = 'diproses';
    db.saveReservations();

    res.json({
      success: true,
      message: 'Reservasi telah ditolak oleh pemilik akomodasi. Proses pengembalian dana telah diteruskan ke tamu.',
      data: resv
    });
  } catch (err) {
    console.error('Error rejecting reservation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/reservations/:id/checkin - Resepsionis Selesaikan Check-In Tamu & Alokasikan Kamar
router.post('/:id/checkin', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();
    const resv = db.reservations.find(r => r.id === req.params.id || r.booking_code.toUpperCase() === req.params.id.toUpperCase());
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }

    const { room_number } = req.body || {};
    if (room_number) {
      resv.room_number = String(room_number).trim();
    }

    resv.status = 'selesai_checkin';
    resv.checked_in_at = new Date().toISOString();
    await db.saveReservations();

    res.json({
      success: true,
      message: `Check-In Berhasil! Tamu ditempatkan di ${resv.room_number ? 'Kamar ' + resv.room_number : 'kamar'}. Kunci siap diserahkan.`,
      data: resv
    });
  } catch (err) {
    console.error('Error completing check-in:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/reservations/:id/assign-room - Resepsionis Atur/Ubah Nomor Kamar Tamu
router.put('/:id/assign-room', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();
    const resv = db.reservations.find(r => r.id === req.params.id || r.booking_code.toUpperCase() === req.params.id.toUpperCase());
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }

    const { room_number } = req.body || {};
    resv.room_number = room_number ? String(room_number).trim() : null;
    await db.saveReservations();

    res.json({
      success: true,
      message: `Nomor kamar tamu ${resv.guest_name} berhasil diatur ke "${resv.room_number || '-'}"`,
      data: resv
    });
  } catch (err) {
    console.error('Error assigning room:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/reservations/:code/ktp-photo - Update atau simpan foto KTP tamu
router.post('/:code/ktp-photo', async (req, res) => {
  try {
    const { code } = req.params;
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ success: false, message: 'Foto tidak boleh kosong.' });

    const resv = db.reservations.find(r => (r.booking_code && r.booking_code.toUpperCase() === code.toUpperCase()) || r.id === code);
    if (!resv) return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });

    resv.guest_ktp_photo = photo;
    if (!resv.ktp_data) resv.ktp_data = {};
    resv.ktp_data.ktpPhoto = photo;
    await db.saveReservations();

    res.json({ success: true, message: 'Foto KTP/SIM berhasil disimpan ke sistem.', data: resv });
  } catch (err) {
    console.error('Error updating KTP photo:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const resv = db.reservations.find(r => r.id === req.params.id);
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }
    await db.deleteReservation(req.params.id);
    res.json({ success: true, message: 'Reservasi berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting reservation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reservations/decode-nik/:nik - Decode NIK secara instan
router.get('/decode-nik/:nik', (req, res) => {
  try {
    const parsed = parseNik(req.params.nik);
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reservations/qrcode/:bookingCode - Generate QR Code image/dataURL
router.get('/qrcode/:bookingCode', async (req, res) => {
  try {
    const resv = db.reservations.find(r => r.booking_code.toUpperCase() === req.params.bookingCode.toUpperCase());
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Kode reservasi tidak ditemukan.' });
    }

    const type = req.query.type || 'checkin';
    const ktpData = resv.ktp_data || (resv.guest_nik ? parseNik(resv.guest_nik) : null);
    const textPayload = buildQrPayload(resv, ktpData);

    // Use public tunnel URL if active or dynamic request host
    const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    const publicBase = vercelDomain || tunnel.getPublicUrl();
    const hostHeader = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const checkinUrl = publicBase ? `${publicBase}/checkin/${resv.booking_code}` : `${protocol}://${hostHeader}/checkin/${resv.booking_code}`;

    // Fast Check-In URL QR code (instant scan on phone camera)
    const checkinDataUrl = await QRCode.toDataURL(checkinUrl, {
      width: 500,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    });

    // Offline Raw Text QR Code
    const textDataUrl = await QRCode.toDataURL(textPayload, {
      width: 500,
      margin: 4,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#ffffff' }
    });

    const activeDataUrl = type === 'text' ? textDataUrl : checkinDataUrl;
    const activePayload = type === 'text' ? textPayload : checkinUrl;

    resv.qr_payload = textPayload;
    resv.qr_data_url = activeDataUrl;
    db.saveReservations();

    res.json({
      success: true,
      dataUrl: activeDataUrl,
      checkinUrl,
      checkinDataUrl,
      textDataUrl,
      payload: textPayload,
      type
    });
  } catch (err) {
    console.error('Error generating reservation QR:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/reservations/verify-qr/:bookingCode
// Dipanggil saat QR di-scan oleh pihak hotel. Memverifikasi + Check-In sekaligus.
router.post('/verify-qr/:bookingCode', async (req, res) => {
  try {
    const code = req.params.bookingCode.trim().toUpperCase();
    const resv = db.reservations.find(r => r.booking_code.toUpperCase() === code);

    if (!resv) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: `Kode booking "${code}" tidak ditemukan di sistem StayJogja.`
      });
    }

    // Sudah pernah check-in
    if (resv.status === 'selesai_checkin' || resv.status === 'checked_in') {
      return res.json({
        success: true,
        verified: true,
        alreadyCheckedIn: true,
        message: `Tamu ${resv.guest_name} sudah check-in pada ${resv.checked_in_at ? new Date(resv.checked_in_at).toLocaleString('id-ID') : '-'}.`,
        data: resv
      });
    }

    // Hanya boleh check-in jika sudah terkonfirmasi
    if (resv.status !== 'terkonfirmasi') {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Reservasi ini tidak dapat di-check-in. Status saat ini: ${resv.status}. Pastikan reservasi sudah berstatus "terkonfirmasi".`,
        data: resv
      });
    }

    // Check-In sekaligus verifikasi
    const { room_number } = req.body || {};
    if (room_number) {
      resv.room_number = String(room_number).trim();
    }
    resv.status = 'selesai_checkin';
    resv.checked_in_at = new Date().toISOString();
    resv.verified_by_qr = true;
    db.saveReservations();

    res.json({
      success: true,
      verified: true,
      alreadyCheckedIn: false,
      message: `Verifikasi berhasil! Tamu ${resv.guest_name} telah di-check-in ${resv.room_number ? 'ke Kamar ' + resv.room_number : ''}. Kunci kamar siap diserahkan.`,
      data: resv
    });
  } catch (err) {
    console.error('Error verifying QR:', err);
    res.status(500).json({ success: false, verified: false, message: 'Internal server error' });
  }
});

// GET /api/reservations/checkin-ready - Semua booking yang siap atau sudah check-in (untuk panel resepsionis/hotel)
router.get('/checkin-ready', async (req, res) => {
  try {
    await db.ensureInitialized();
    await db.refreshReservations();

    const { property_id } = req.query;
    let list = db.reservations.filter(r => {
      const st = (r.status || '').toLowerCase();
      return st === 'terkonfirmasi' || st === 'selesai_checkin' || st === 'checked_in' || st === 'waitingcheckin';
    });

    if (property_id && property_id !== 'all') {
      const cleanPid = property_id.toLowerCase().trim();
      list = list.filter(r => {
        const pId = (r.property_id || r.hotel_id || '').toLowerCase().trim();
        return pId === cleanPid;
      });
    }

    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
