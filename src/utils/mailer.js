const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

function getTransporter() {
  const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) return null;

  const config = {
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  };

  if (process.env.SMTP_HOST) {
    config.host = process.env.SMTP_HOST;
    delete config.service;
  }
  if (process.env.SMTP_PORT) config.port = parseInt(process.env.SMTP_PORT, 10);
  if (process.env.SMTP_SECURE) config.secure = process.env.SMTP_SECURE === 'true';

  return nodemailer.createTransport(config);
}

async function sendInvoiceEmail(reservation) {
  let targetEmail = reservation.guest_email;
  if (!targetEmail && reservation.user_id) {
    try {
      const db = require('../config/database');
      const u = db.users && db.users.find(x => x.id === reservation.user_id);
      if (u && u.email) targetEmail = u.email;
    } catch (e) {}
  }

  if (!targetEmail) {
    console.error('[Mailer] Email tujuan tidak ditemukan untuk reservasi:', reservation.booking_code);
    return { success: false, error: 'Email tujuan tidak ditemukan.' };
  }

  // Hitung kalkulasi item
  const nights = reservation.nights || 1;
  const guests = reservation.guests_count || 1;
  const unitPrice = reservation.price_per_night || Math.round((reservation.subtotal || reservation.total_price || 0) / nights);
  const subtotal = reservation.subtotal || (unitPrice * nights);
  const taxAmount = reservation.tax_service || Math.round(subtotal * 0.1);
  const totalPrice = reservation.total_price || (subtotal + taxAmount);
  const tunnel = require('./tunnel');
  const publicBase = tunnel.getPublicUrl() || process.env.APP_URL || 'http://localhost:3000';
  const checkinUrl = `${publicBase}/checkin/${reservation.booking_code}`;

  // Tentukan link Google Maps ke arah hotel
  let gmapsUrl = '';
  try {
    const db = require('../config/database');
    const prop = db.properties && db.properties.find(p => p.id === reservation.property_id);
    if (prop) {
      if (prop.gmaps_url && prop.gmaps_url.startsWith('http')) {
        gmapsUrl = prop.gmaps_url.trim();
      } else if (prop.latitude && prop.longitude) {
        gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${prop.latitude},${prop.longitude}`;
      }
    }
  } catch (e) {}

  if (!gmapsUrl) {
    const destQuery = `${reservation.property_name || 'Hotel'}, ${reservation.property_address || 'Yogyakarta'}`;
    gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destQuery)}`;
  }

  // URL QR Code publik yang 100% didukung Google Image Proxy di Gmail (tidak akan broken image)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(checkinUrl)}`;

  // Generate QR Code image buffer untuk lampiran (downloadable)
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(checkinUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (qrErr) {
    console.error('[Mailer] Gagal generate QR buffer:', qrErr.message);
  }

  const formatIdr = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

  const emailSubject = `[StayJogja] Invoice Resmi & Voucher Booking #${reservation.booking_code} - ${reservation.property_name || 'Akomodasi'}`;
  
  // Plain text fallback wajib untuk menghindari filter spam
  const emailText = [
    `STAYJOGJA - INVOICE RESMI & VOUCHER BOOKING #${reservation.booking_code}`,
    `Status: Lunas & Terkonfirmasi`,
    `--------------------------------------------------`,
    `Halo ${reservation.guest_name},`,
    `Terima kasih telah memesan melalui StayJogja. Pembayaran Anda telah kami verifikasi dan voucher akomodasi Anda telah diterbitkan secara sah.`,
    ``,
    `DETAIL AKOMODASI:`,
    `- Properti: ${reservation.property_name || 'Akomodasi StayJogja'}`,
    `- Alamat: ${reservation.property_address || 'Daerah Istimewa Yogyakarta'}`,
    `- Petunjuk Arah Google Maps: ${gmapsUrl}`,
    `- Kamar: ${reservation.unit_name || 'Kamar Standar'} (${nights} Malam, ${guests} Tamu)`,
    `- Jadwal Check-in: ${reservation.check_in} (Mulai 14:00 WIB)`,
    `- Jadwal Check-out: ${reservation.check_out} (Maksimal 12:00 WIB)`,
    ``,
    `RINCIAN PEMBAYARAN:`,
    `- Biaya Kamar: ${formatIdr(subtotal)}`,
    `- Pajak Daerah & Biaya Layanan (10%): ${formatIdr(taxAmount)}`,
    `- Total Pembayaran: ${formatIdr(totalPrice)}`,
    ``,
    `VOUCHER & CHECK-IN INSTAN:`,
    `- Kode Booking: ${reservation.booking_code}`,
    `- Link E-Voucher & QR Code: ${checkinUrl}`,
    ``,
    `Scan QR code di email atau tunjukkan kode booking saat tiba di meja resepsionis.`,
    `--------------------------------------------------`,
    `StayJogja Hospitality Platform • D.I. Yogyakarta`
  ].join('\n');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice StayJogja #${reservation.booking_code}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #334155;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
        <tr>
          <td align="center">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; text-align: left;">
              
              <!-- Header Branding -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 3px solid #d97706;">
                <tr>
                  <td style="padding: 28px 24px; text-align: center; color: #ffffff;">
                    <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #f59e0b; margin-bottom: 4px;">
                      STAY<span style="color: #ffffff;">JOGJA</span>
                    </div>
                    <div style="font-size: 13px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">Bukti Pemesanan & Invoice Resmi</div>
                  </td>
                </tr>
              </table>

              <!-- Status Banner (Email-safe table layout) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border-bottom: 1px solid #a7f3d0;">
                <tr>
                  <td style="padding: 12px 24px; font-size: 12px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">
                    ✓ Status: Lunas &amp; Terkonfirmasi
                  </td>
                  <td style="padding: 12px 24px; text-align: right; font-size: 14px; font-weight: 800; color: #047857;">
                    #${reservation.booking_code}
                  </td>
                </tr>
              </table>

              <div style="padding: 24px;">
                <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #1e293b;">
                  Halo <strong>${reservation.guest_name}</strong>,
                </p>
                <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                  Terima kasih telah memesan melalui <strong>StayJogja</strong>. Pembayaran Anda telah kami verifikasi dan voucher akomodasi Anda telah diterbitkan secara sah ke email terdaftar Anda (<strong>${targetEmail}</strong>).
                </p>

                <!-- Kartu QR Code Check-in (100% Valid & Rendered in Gmail) -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 22px 16px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
                        VOUCHER CHECK-IN &amp; FAST PASS
                      </div>
                      <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 14px; letter-spacing: 1px;">
                        ${reservation.booking_code}
                      </div>
                      
                      <!-- Gambar QR Code Inline CID (Selalu tampil di Gmail tanpa diblokir proteksi gambar eksternal) -->
                      <div style="display: inline-block; background-color: #ffffff; padding: 12px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; margin-bottom: 14px;">
                        <img src="cid:booking_qrcode" alt="QR Code ${reservation.booking_code}" width="180" height="180" style="width: 180px; height: 180px; display: block; border-radius: 6px; margin: 0 auto;" />
                      </div>

                      <p style="font-size: 12px; color: #475569; margin: 0 0 14px; line-height: 1.5;">
                        Scan QR code ini di meja resepsionis atau tunjukkan kode booking <strong>${reservation.booking_code}</strong> saat tiba.
                      </p>

                      <div>
                        <a href="${checkinUrl}" target="_blank" style="display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; box-shadow: 0 2px 8px rgba(217,119,6,0.25);">
                          Buka E-Voucher Digital ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Detail Akomodasi & Rute Google Maps -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Detail Akomodasi</div>
                  <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${reservation.property_name || 'Akomodasi StayJogja'}</div>
                  <div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">📍 ${reservation.property_address || 'Daerah Istimewa Yogyakarta'}</div>
                  
                  <!-- Tombol Google Maps Rute ke Arah Hotel -->
                  <div style="margin-bottom: 16px;">
                    <a href="${gmapsUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; box-shadow: 0 2px 6px rgba(2,132,199,0.25);">
                      🗺️ Buka Petunjuk Arah Google Maps ke Hotel ↗
                    </a>
                  </div>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                    <tr>
                      <td width="50%" valign="top">
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Check-in</div>
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${reservation.check_in}</div>
                        <div style="font-size: 11px; color: #64748b;">Mulai 14:00 WIB</div>
                      </td>
                      <td width="50%" valign="top">
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Check-out</div>
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${reservation.check_out}</div>
                        <div style="font-size: 11px; color: #64748b;">Maksimal 12:00 WIB</div>
                      </td>
                    </tr>
                  </table>

                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155;">
                    <strong>Tipe Kamar:</strong> ${reservation.unit_name || 'Kamar Standar'} (${nights} Malam, ${guests} Tamu)
                  </div>
                </div>

                <!-- Rincian Biaya / Invoice Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #cbd5e1; text-align: left; color: #64748b;">
                      <th style="padding: 10px 0; font-weight: 600;">Rincian Item</th>
                      <th style="padding: 10px 0; text-align: right; font-weight: 600;">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0;">${reservation.unit_name || 'Kamar'} (${formatIdr(unitPrice)} x ${nights} malam)</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: 600;">${formatIdr(subtotal)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0;">Pajak Daerah & Biaya Layanan (10%)</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: 600;">${formatIdr(taxAmount)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #0f172a;">
                      <td style="padding: 14px 0; font-size: 15px; font-weight: 800; color: #0f172a;">Total Pembayaran</td>
                      <td style="padding: 14px 0; text-align: right; font-size: 16px; font-weight: 800; color: #047857;">${formatIdr(totalPrice)}</td>
                    </tr>
                  </tbody>
                </table>

              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0 0 6px;">StayJogja Hospitality Platform • D.I. Yogyakarta</p>
                <p style="margin: 0;">Email ini dikirim otomatis ke alamat email pengguna terdaftar: <strong>${targetEmail}</strong></p>
              </div>

            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Attachments untuk inline QR code di Gmail / email clients
  const attachments = [];
  if (qrBuffer) {
    attachments.push({
      filename: `qrcode-${reservation.booking_code}.png`,
      content: qrBuffer,
      contentType: 'image/png',
      contentDisposition: 'inline',
      cid: 'booking_qrcode'
    });
  }

  // 1. Prioritaskan Gmail SMTP jika SMTP_USER & SMTP_PASS tersedia (pengirim resmi stayjogja43@gmail.com)
  const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const transporter = getTransporter();

  if (transporter) {
    try {
      const fromSender = process.env.SMTP_FROM || `"StayJogja" <${emailUser}>`;
      const mailOptions = {
        from: fromSender,
        to: targetEmail,
        replyTo: emailUser,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        attachments: attachments,
        headers: {
          'X-Mailer': 'StayJogja Platform',
          'X-Booking-Code': reservation.booking_code
        }
      };
      const info = await transporter.sendMail(mailOptions);
      console.log('[Mailer Gmail SMTP] ✅ Email invoice resmi terkirim ke:', targetEmail, 'MessageId:', info.messageId);
      return {
        success: true,
        simulated: false,
        provider: 'smtp',
        from: fromSender,
        targetEmail,
        messageId: info.messageId,
        hasQr: !!qrBuffer,
        gmapsUrl
      };
    } catch (err) {
      console.error('[Mailer Gmail SMTP] Gagal mengirim email via SMTP:', err.message);
      // Fallback ke Resend jika ada
    }
  }

  // 2. Opsi Kedua: Resend API jika RESEND_API_KEY tersedia
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromSender = process.env.RESEND_FROM || 'StayJogja <onboarding@resend.dev>';
      const resendAttachments = qrBuffer ? [{
        filename: `qrcode-${reservation.booking_code}.png`,
        content: qrBuffer.toString('base64')
      }] : [];

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromSender,
          to: [targetEmail],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
          attachments: resendAttachments
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        const isRestrictedToOwner = resData.message && resData.message.includes('only send testing emails to your own email address');
        const devEmail = process.env.RESEND_DEV_EMAIL || 'stayjogja43@gmail.com';

        if (isRestrictedToOwner && devEmail && targetEmail.toLowerCase() !== devEmail.toLowerCase()) {
          console.log(`[Mailer Resend] ℹ️ Mode testing Resend: Mengalihkan pengiriman dari ${targetEmail} ke email terdaftar Resend: ${devEmail}`);
          const retryRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromSender,
              to: [devEmail],
              subject: `[Uji Coba - Tamu: ${targetEmail}] ${emailSubject}`,
              html: `
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 12px 18px; border-radius: 8px; margin: 10px auto; max-width: 620px; font-family: sans-serif; font-size: 13px; color: #92400e;">
                  <strong>🔔 [Resend Test Mode]:</strong> Email ini dialihkan otomatis ke Gmail terdaftar Anda (<code>${devEmail}</code>) karena domain kustom belum diverifikasi. Di sistem produksi nyata, email ini langsung masuk ke inbox tamu: <strong>${targetEmail}</strong>.
                </div>
                ${emailHtml}
              `,
              text: emailText,
              attachments: resendAttachments
            })
          });

          const retryData = await retryRes.json();
          if (retryRes.ok) {
            console.log('[Mailer Resend] ✅ Email invoice testing berhasil masuk ke Inbox Gmail Anda:', devEmail, 'ID:', retryData.id);
            return {
              success: true,
              simulated: false,
              redirected: true,
              targetEmail: devEmail,
              intendedEmail: targetEmail,
              id: retryData.id,
              hasQr: !!qrBuffer,
              gmapsUrl
            };
          }
        }

        console.error('[Mailer Resend] Gagal kirim email via Resend:', resData.message || resData);
        return {
          success: false,
          error: resData.message || 'Gagal mengirim email via Resend API',
          resendError: resData,
          targetEmail
        };
      }

      console.log('[Mailer Resend] ✅ Email invoice resmi terkirim ke:', targetEmail, 'ID:', resData.id);
      return {
        success: true,
        simulated: false,
        provider: 'resend',
        targetEmail,
        id: resData.id,
        hasQr: !!qrBuffer,
        gmapsUrl
      };
    } catch (err) {
      console.error('[Mailer Resend] Exception saat kirim email:', err.message);
    }
  }

  // 3. Fallback Simulasi jika belum ada credential
  console.log(`[Mailer] [SIMULASI] Belum ada kredensial email di .env. Invoice booking ${reservation.booking_code} diproses untuk: ${targetEmail}`);
  return {
    success: true,
    simulated: true,
    targetEmail,
    message: `Simulasi pengiriman invoice berhasil untuk email terdaftar: ${targetEmail}.`,
    hasQr: !!qrBuffer,
    gmapsUrl
  };
}

module.exports = {
  sendInvoiceEmail
};

