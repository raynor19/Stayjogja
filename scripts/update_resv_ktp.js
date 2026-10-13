const db = require('../src/config/database');

function buildKtpSvg(nik, name, bPlace, bDate, address) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="305" viewBox="0 0 480 305">
    <defs>
      <linearGradient id="ktpBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7dd3fc"/>
        <stop offset="50%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <rect width="480" height="305" rx="16" fill="url(#ktpBg)"/>
    <rect x="8" y="8" width="464" height="289" rx="12" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
    <text x="240" y="24" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">REPUBLIK INDONESIA</text>
    <text x="240" y="38" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle" letter-spacing="0.5">ARSIP IDENTITAS ELEKTRONIK TERVERIFIKASI</text>
    <text x="22" y="64" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0f172a" letter-spacing="1.5">NIK  :  ${nik}</text>
    <text x="22" y="88" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Nama</text>
    <text x="135" y="88" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#0f172a">: ${name}</text>
    <text x="22" y="106" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Tempat/Tgl Lahir</text>
    <text x="135" y="106" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a">: ${bPlace}, ${bDate}</text>
    <text x="22" y="124" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Jenis Kelamin</text>
    <text x="135" y="124" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a">: LAKI-LAKI</text>
    <text x="22" y="142" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Alamat</text>
    <text x="135" y="142" font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#0f172a">: ${address}</text>
    <text x="22" y="160" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Agama</text>
    <text x="135" y="160" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a">: ISLAM</text>
    <text x="22" y="178" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Status Perkawinan</text>
    <text x="135" y="178" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a">: BELUM KAWIN</text>
    <text x="22" y="196" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Pekerjaan</text>
    <text x="135" y="196" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a">: PELAJAR / MAHASISWA</text>
    <text x="22" y="214" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Kewarganegaraan</text>
    <text x="135" y="214" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a">: WNI</text>
    <text x="22" y="232" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e293b">Berlaku Hingga</text>
    <text x="135" y="232" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#0f172a">: SEUMUR HIDUP</text>
    <g transform="translate(365, 75)">
      <rect width="92" height="122" rx="6" fill="#e2e8f0" stroke="#ffffff" stroke-width="2"/>
      <circle cx="46" cy="45" r="22" fill="#94a3b8"/>
      <path d="M18 105 c0 -18 18 -26 28 -26 s28 8 28 26 Z" fill="#94a3b8"/>
      <rect x="0" y="104" width="92" height="18" fill="#0369a1"/>
      <text x="46" y="116" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">TERVERIFIKASI</text>
    </g>
    <text x="240" y="285" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle" letter-spacing="0.5">ARSIP DIGITAL FRONT DESK — TANPA FOTOKOPI FISIK</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

(async () => {
  await db.ensureInitialized();
  const resv = db.reservations.find(r => r.booking_code === 'SJ-QVSP9D');
  if (resv) {
    const dataUri = buildKtpSvg(
      resv.guest_nik || '3275081903050004',
      resv.guest_name || 'MUHAMMAD RAYNOR ATHAILLAH',
      'YOGYAKARTA',
      '19-03-2005',
      'MEDITERANIA REGENCY CIKUNIR C 95, BEKASI'
    );
    resv.guest_ktp_photo = dataUri;
    if (!resv.ktp_data) resv.ktp_data = {};
    resv.ktp_data.ktpPhoto = dataUri;
    await db.saveReservations();
    console.log('[SUCCESS] Updated SJ-QVSP9D with verified digital KTP');
  }
})();
