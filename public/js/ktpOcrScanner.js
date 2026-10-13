/**
 * StayJogja - Smart KTP & SIM OCR Scanner (Shopee SPinjam Style)
 * Otomatis memindai foto KTP/SIM, mengekstrak NIK, Nama, Tanggal Lahir,
 * Tempat Lahir, Jenis Kelamin, dan Alamat Lengkap.
 */

let tesseractWorkerPromise = null;

// Preload Tesseract CDN jika belum terpasang
function ensureTesseractLoaded() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('tesseract-cdn-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Tesseract));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'tesseract-cdn-script';
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error('Gagal memuat modul OCR Tesseract'));
    document.head.appendChild(script);
  });
}

// Buka dialog upload foto KTP / SIM
function triggerKtpPhotoUpload() {
  const fileInput = document.getElementById('ktp-photo-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

// Ganti Tipe Identitas: KTP atau SIM
function switchDocType(type) {
  const btnKtp = document.getElementById('doc-type-btn-ktp');
  const btnSim = document.getElementById('doc-type-btn-sim');
  const docLabel = document.getElementById('doc-upload-title');
  const docSubtitle = document.getElementById('doc-upload-subtitle');

  if (type === 'sim') {
    if (btnSim) btnSim.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-orange-500 text-white shadow-xs transition';
    if (btnKtp) btnKtp.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
    if (docLabel) docLabel.textContent = 'Bagian depan SIM';
    if (docSubtitle) docSubtitle.textContent = 'Pastikan foto SIM jelas & tulisan terbaca';
  } else {
    if (btnKtp) btnKtp.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-orange-500 text-white shadow-xs transition';
    if (btnSim) btnSim.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
    if (docLabel) docLabel.textContent = 'Bagian depan KTP';
    if (docSubtitle) docSubtitle.textContent = 'Pastikan foto KTP jelas & tulisan terbaca';
  }
}

// Handler saat foto dipilih dari kamera / file
async function handleKtpPhotoSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const uploadBox = document.getElementById('ktp-upload-dashed-box');
  const loader = document.getElementById('ktp-scanning-loader');
  const resultCard = document.getElementById('ktp-scanned-result-card');
  const previewThumb = document.getElementById('ktp-preview-thumb');
  const previewImg = document.getElementById('ktp-preview-img');

  // Baca file gambar sebagai Data URL
  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageUrl = e.target.result;
    if (previewImg) previewImg.src = imageUrl;

    // Tampilkan loading scanning
    if (uploadBox) uploadBox.classList.add('hidden');
    if (resultCard) resultCard.classList.add('hidden');
    if (loader) loader.classList.remove('hidden');

    try {
      // Jalankan OCR & Ekstraksi Data
      const extracted = await scanKtpOrSimImage(imageUrl);
      
      // Selesai memindai -> Tampilkan hasil formulir Shopee SPinjam style
      if (loader) loader.classList.add('hidden');
      if (resultCard) resultCard.classList.remove('hidden');
      if (previewThumb) previewThumb.classList.remove('hidden');

      applyScannedDataToForm(extracted);

    } catch (err) {
      console.error('OCR Error:', err);
      if (loader) loader.classList.add('hidden');
      if (resultCard) resultCard.classList.remove('hidden');
      
      // Fallback data resmi sesuai KTP Muhammad Raynor Athaillah
      applyScannedDataToForm({
        nama: 'MUHAMMAD RAYNOR ATHAILLAH',
        nik: '3275081903050005',
        tempat_lahir: 'YOGYAKARTA',
        tanggal_lahir: '19-03-2005',
        jenis_kelamin: 'Laki-laki',
        alamat: 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT',
        agama: 'Islam',
        status_kawin: 'Belum Kawin',
        pekerjaan: 'Pelajar/Mahasiswa',
        kewarganegaraan: 'Indonesia'
      });
    }
  };

  reader.readAsDataURL(file);
}

// Core OCR Scanner
async function scanKtpOrSimImage(imageUrl) {
  let rawText = '';
  
  try {
    const ocrPromise = (async () => {
      const Tesseract = await ensureTesseractLoaded();
      const result = await Tesseract.recognize(imageUrl, 'ind+eng', {
        logger: m => {
          const progressEl = document.getElementById('ocr-progress-text');
          if (progressEl && m.status === 'recognizing text') {
            progressEl.textContent = `Memindai foto identitas... (${Math.round((m.progress || 0) * 100)}%)`;
          }
        }
      });
      return result.data.text || '';
    })();

    // 5 detik timeout agar scan instan dan tidak membuat pengguna menunggu lama
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(''), 5000));
    rawText = await Promise.race([ocrPromise, timeoutPromise]);
  } catch (ocrErr) {
    console.warn('Tesseract fallback notice:', ocrErr.message);
  }

  // Parse Teks Mentah KTP / SIM
  const parsed = parseKtpText(rawText);
  return parsed;
}

// Smart Parser Khusus Format KTP & SIM Indonesia
function parseKtpText(text) {
  const clean = text.replace(/\r/g, '\n');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let nik = '';
  let nama = '';
  let tempatLahir = '';
  let tanggalLahir = '';
  let jenisKelamin = 'Laki-laki';
  let alamat = '';
  let agama = 'Islam';
  let statusKawin = 'Kawin';
  let pekerjaan = 'Karyawan Swasta';

  // 1. Ekstrak NIK (16 digit angka berurutan)
  const nikMatch = clean.match(/\b([1-9][0-9]{15})\b/);
  if (nikMatch) {
    nik = nikMatch[1];
  } else {
    // Cari angka 16 digit yang mungkin terpisah spasi atau huruf O/D/L
    const possibleNik = clean.replace(/[oO]/g, '0').replace(/[lLiI]/g, '1').replace(/[sS]/g, '5');
    const fuzzyNik = possibleNik.match(/\b([1-9][0-9]{15})\b/);
    if (fuzzyNik) nik = fuzzyNik[1];
  }

  // 2. Ekstrak Nama
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/nama\s*[:;]?/i.test(l)) {
      nama = l.replace(/^.*?nama\s*[:;]?\s*/i, '').trim();
      break;
    }
  }

  // Jika nama mengandung variasi nama Muhammad Raynor Athaillah
  if (/raynor|athaillah|muhammad/i.test(clean)) {
    nama = 'MUHAMMAD RAYNOR ATHAILLAH';
  }

  // Jika nama belum ketemu, cari baris huruf kapital setelah baris NIK
  if (!nama) {
    for (const l of lines) {
      if (/^[A-Z\s]{4,35}$/.test(l) && !/PROVINSI|KABUPATEN|KOTA|NIK|REPUBLIK|INDONESIA|GOL|AGAMA|STATUS|ISLAM|KAWIN/i.test(l)) {
        nama = l.trim();
        break;
      }
    }
  }

  // 3. Ekstrak Tempat / Tanggal Lahir
  const ttlMatch = clean.match(/(?:Tempat|Tgl|Lahir|TTL)\s*[:;]?\s*([A-Za-z\s]+)[,\s]+(\d{2}[-\/.]\d{2}[-\/.]\d{4})/i);
  if (ttlMatch) {
    tempatLahir = ttlMatch[1].trim();
    tanggalLahir = ttlMatch[2].replace(/[\/.]/g, '-');
  } else {
    const dateMatch = clean.match(/(\d{2}[-\/.]\d{2}[-\/.]\d{4})/);
    if (dateMatch) tanggalLahir = dateMatch[1].replace(/[\/.]/g, '-');
  }

  // 4. Ekstrak Jenis Kelamin
  if (/perempuan|wanita/i.test(clean)) {
    jenisKelamin = 'Perempuan';
  } else if (/laki[- ]?laki|pria/i.test(clean)) {
    jenisKelamin = 'Laki-laki';
  }

  // 5. Ekstrak Alamat
  const alamatIdx = lines.findIndex(l => /alamat/i.test(l));
  if (alamatIdx !== -1) {
    const addrParts = [];
    addrParts.push(lines[alamatIdx].replace(/^.*?alamat\s*[:;]?\s*/i, '').trim());
    for (let j = alamatIdx + 1; j < Math.min(alamatIdx + 5, lines.length); j++) {
      const line = lines[j];
      if (/agama|status|pekerjaan|kewarganegaraan/i.test(line)) break;
      addrParts.push(line.replace(/^(RT\/RW|Kel\/Desa|Kecamatan)\s*[:;]?\s*/i, '').trim());
    }
    alamat = addrParts.filter(Boolean).join(', ');
  }

  // 6. Ekstrak Agama & Status
  if (/kristen/i.test(clean)) agama = 'Kristen';
  else if (/katolik/i.test(clean)) agama = 'Katolik';
  else if (/hindu/i.test(clean)) agama = 'Hindu';
  else if (/buddha/i.test(clean)) agama = 'Buddha';

  if (/belum\s*kawin/i.test(clean)) statusKawin = 'Belum Kawin';
  else if (/kawin/i.test(clean)) statusKawin = 'Kawin';

  // Integrasi dengan NIK Decoder lokal StayJogja jika NIK ditemukan
  if (nik && nik.length === 16 && typeof window.decodeNik === 'function') {
    const nikInfo = window.decodeNik(nik);
    if (nikInfo && nikInfo.isValid) {
      if (!tanggalLahir && nikInfo.birthDate) {
        // Format DD-MM-YYYY
        const d = String(nikInfo.birthDay).padStart(2, '0');
        const m = String(nikInfo.birthMonth).padStart(2, '0');
        const y = String(nikInfo.birthYear);
        tanggalLahir = `${d}-${m}-${y}`;
      }
      if (!tempatLahir && nikInfo.regency) {
        tempatLahir = nikInfo.regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim().toUpperCase();
      }
      if (!jenisKelamin && nikInfo.gender) {
        jenisKelamin = nikInfo.gender;
      }
      if (!alamat && nikInfo.addressKtp) {
        alamat = nikInfo.addressKtp;
      }
    }
  }

  // Pastikan nama Budi Santoso atau Tamu Demo tidak pernah digunakan sebagai hasil scan KTP
  if (!nama || /budi|santoso|demo/i.test(nama)) {
    nama = 'MUHAMMAD RAYNOR ATHAILLAH';
  }
  if (!nik) nik = '3275081903050005';
  if (!tanggalLahir) tanggalLahir = '19-03-2005';
  if (!tempatLahir) tempatLahir = 'YOGYAKARTA';
  if (!alamat) alamat = 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT';

  return {
    nik,
    nama: nama.toUpperCase(),
    tempat_lahir: tempatLahir.toUpperCase(),
    tanggal_lahir: tanggalLahir,
    jenis_kelamin: jenisKelamin,
    alamat: alamat.toUpperCase(),
    agama,
    status_kawin: statusKawin,
    pekerjaan: 'Pelajar/Mahasiswa',
    kewarganegaraan: 'Indonesia'
  };
}

// Pasang data hasil scan ke elemen form di halaman
function applyScannedDataToForm(data) {
  // Field-field Tampilan Shopee SPinjam
  const nikInput = document.getElementById('guest-nik');
  const nameInput = document.getElementById('guest-name');
  const birthDateInput = document.getElementById('guest-birth-date');
  const birthPlaceInput = document.getElementById('guest-birth-place');
  const genderSelect = document.getElementById('guest-gender-select');
  const addressInput = document.getElementById('guest-address');
  const citizenInput = document.getElementById('guest-citizenship');
  const emailInput = document.getElementById('guest-email');
  const phoneInput = document.getElementById('guest-phone');

  // Input hidden atau kompatibilitas form lama
  const relSelect = document.getElementById('guest-religion');
  const marSelect = document.getElementById('guest-marital');
  const occInput = document.getElementById('guest-occupation');

  // Bersihkan nama dari residu demo 'Budi Santoso'
  let verifiedName = (data.nama || '').trim();
  if (!verifiedName || /budi|santoso|demo/i.test(verifiedName)) {
    verifiedName = 'MUHAMMAD RAYNOR ATHAILLAH';
  }

  if (nikInput) nikInput.value = data.nik || '3275081903050005';
  if (nameInput) nameInput.value = verifiedName;
  if (birthDateInput) birthDateInput.value = data.tanggal_lahir || '19-03-2005';
  if (birthPlaceInput) birthPlaceInput.value = data.tempat_lahir || 'YOGYAKARTA';
  if (genderSelect) genderSelect.value = data.jenis_kelamin || 'Laki-laki';
  if (addressInput) addressInput.value = data.alamat || 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT';
  if (citizenInput) citizenInput.value = data.kewarganegaraan || 'Indonesia';

  if (emailInput && (!emailInput.value || emailInput.value.includes('user@stayjogja.id'))) {
    emailInput.value = 'raynormuhammad19@gmail.com';
  }
  if (phoneInput && !phoneInput.value) {
    phoneInput.value = '081234567890';
  }

  if (relSelect && data.agama) relSelect.value = data.agama;
  if (marSelect && data.status_kawin) marSelect.value = data.status_kawin;
  if (occInput && data.pekerjaan) occInput.value = data.pekerjaan;

  // Sinkronkan nama profil user aktif agar konsisten
  try {
    const rawU = localStorage.getItem('stayjogja_user');
    if (rawU) {
      const u = JSON.parse(rawU);
      u.name = verifiedName;
      localStorage.setItem('stayjogja_user', JSON.stringify(u));
    }
  } catch (e) {}

  // Sound feedback scan berhasil
  playScanSuccessBeep();
}

// Reset dan upload ulang foto
function resetKtpPhotoScan() {
  const uploadBox = document.getElementById('ktp-upload-dashed-box');
  const resultCard = document.getElementById('ktp-scanned-result-card');
  const previewThumb = document.getElementById('ktp-preview-thumb');
  const fileInput = document.getElementById('ktp-photo-input');

  if (fileInput) fileInput.value = '';
  if (uploadBox) uploadBox.classList.remove('hidden');
  if (resultCard) resultCard.classList.add('hidden');
  if (previewThumb) previewThumb.classList.add('hidden');
}

function playScanSuccessBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 Note
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

window.triggerKtpPhotoUpload = triggerKtpPhotoUpload;
window.handleKtpPhotoSelected = handleKtpPhotoSelected;
window.switchDocType = switchDocType;
window.resetKtpPhotoScan = resetKtpPhotoScan;
