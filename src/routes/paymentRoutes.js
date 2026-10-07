const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/payments/simulate - Simulate Payment Success (Sandbox)
router.post('/simulate', async (req, res) => {
  try {
    const { reservation_id, method } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ success: false, message: 'Reservation ID dibutuhkan.' });
    }

    await db.ensureInitialized();
    await db.refreshReservations();

    const resv = db.reservations.find(r => r.id === reservation_id);
    if (!resv) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }

    if (resv.status !== 'menunggu_pembayaran') {
      return res.status(400).json({ 
        success: false, 
        message: `Pembayaran tidak dapat diproses karena status saat ini adalah: ${resv.status}` 
      });
    }

    // Generate simulated payment record
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      reservation_id: resv.id,
      booking_code: resv.booking_code,
      method: method || 'qris',
      amount: resv.total_price,
      status: 'success',
      transaction_id: `TRX-SBX-${Math.floor(10000000 + Math.random() * 90000000)}`,
      payment_time: new Date().toISOString()
    };

    db.payments.push(paymentRecord);

    // Transition reservation state: menunggu_pembayaran -> menunggu_acc
    resv.status = 'menunggu_acc';
    resv.payment = paymentRecord;
    resv.payment_status = 'paid';
    resv.payment_method = paymentRecord.method;
    resv.payment_transaction_id = paymentRecord.transaction_id;
    resv.paid_at = paymentRecord.payment_time;
    await db.saveReservations();

    // Kirim email invoice resmi, voucher QR Code & rute Google Maps secara OTOMATIS ke email tamu
    const { sendInvoiceEmail } = require('../utils/mailer');
    sendInvoiceEmail(resv).then(emailResult => {
      if (emailResult.success) {
        console.log(`[Payment Auto-Email] ✅ Email invoice booking #${resv.booking_code} otomatis terkirim ke: ${resv.guest_email || emailResult.targetEmail}`);
      } else {
        console.warn(`[Payment Auto-Email] ⚠️ Status kirim email otomatis untuk #${resv.booking_code}:`, emailResult.error || emailResult.message);
      }
    }).catch(emailErr => {
      console.error(`[Payment Auto-Email] ❌ Gagal kirim email otomatis untuk booking #${resv.booking_code}:`, emailErr.message);
    });

    res.json({
      success: true,
      message: 'Pembayaran sukses! Email invoice resmi & voucher QR Code telah otomatis dikirim ke alamat email Anda.',
      data: {
        reservation: resv,
        payment: paymentRecord,
        email_sent_auto: true
      }
    });
  } catch (err) {
    console.error('Error simulating payment:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/payments/:reservationId
router.get('/:reservationId', (req, res) => {
  try {
    const pay = db.payments.find(p => p.reservation_id === req.params.reservationId);
    if (!pay) {
      return res.status(404).json({ success: false, message: 'Data pembayaran belum ada.' });
    }
    res.json({ success: true, data: pay });
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
