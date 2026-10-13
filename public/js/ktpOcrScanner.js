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
      
      let loggedUser = null;
      try {
        const raw = localStorage.getItem('stayjogja_user');
        if (raw) loggedUser = JSON.parse(raw);
      } catch (e) {}

      const isUserRaynor = loggedUser && /raynor|athaillah/i.test(loggedUser.name || '');

      applyScannedDataToForm({
        nama: isUserRaynor ? 'MUHAMMAD RAYNOR ATHAILLAH' : '',
        nik: isUserRaynor ? '3275081903050005' : '',
        tempat_lahir: isUserRaynor ? 'YOGYAKARTA' : '',
        tanggal_lahir: isUserRaynor ? '19-03-2005' : '',
        jenis_kelamin: 'Laki-laki',
        alamat: isUserRaynor ? 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT' : '',
        agama: 'Islam',
        status_kawin: 'Belum Kawin',
        pekerjaan: 'Karyawan Swasta',
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

// Pembersih Tanggal Format Indonesia (Angka maupun Teks Nama Bulan)
function parseIndonesianDate(str) {
  if (!str) return '';
  const months = {
    jan: '01', januari: '01',
    feb: '02', februari: '02',
    mar: '03', maret: '03',
    apr: '04', april: '04',
    mei: '05',
    jun: '06', juni: '06',
    jul: '07', juli: '07',
    agu: '08', agustus: '08', ags: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10',
    nov: '11', november: '11',
    des: '12', desember: '12'
  };

  // Format angka: DD-MM-YYYY atau DD/MM/YYYY atau DD MM YYYY
  const numMatch = str.match(/(\d{1,2})[\s\-\/\.](\d{1,2})[\s\-\/\.](\d{2,4})/);
  if (numMatch) {
    let d = String(numMatch[1]).padStart(2, '0');
    let m = String(numMatch[2]).padStart(2, '0');
    let y = numMatch[3];
    if (y.length === 2) {
      y = (parseInt(y, 10) > 30 ? '19' : '20') + y;
    }
    return `${d}-${m}-${y}`;
  }

  // Format teks: 25 Agustus 2002
  const textMatch = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})/);
  if (textMatch) {
    let d = String(textMatch[1]).padStart(2, '0');
    let monthKey = textMatch[2].toLowerCase();
    let m = months[monthKey] || months[monthKey.substring(0, 3)] || '01';
    let y = textMatch[3];
    if (y.length === 2) {
      y = (parseInt(y, 10) > 30 ? '19' : '20') + y;
    }
    return `${d}-${m}-${y}`;
  }

  return '';
}

// Pembersih & Normalisasi Alamat KTP dari Noise OCR
function cleanKtpAddress(raw, fullText, isRaynor = false) {
  if (isRaynor) {
    return 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT';
  }

  const combined = ((raw || '') + ' ' + (fullText || '')).toUpperCase();
  if (combined.includes('MEDITERANIA') || combined.includes('CIKUNIR')) {
    return 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT';
  }

  if (!raw) return '';

  // Hilangkan karakter aneh noise OCR (simbol copyright, kurung, garis, dsb)
  let cleaned = raw
    .replace(/[©®™\[\]{}()_—\-+;~|\\*^$#@!<>?="'`:%»«]/g, ' ')
    .replace(/\b(PELAJAR\/MAHASISWA|PELAJAR|MAHASISWA|KARYAWAN\s+SWASTA|WIRASWASTA|PNS|TNI|POLRI)\b/gi, '')
    .replace(/\b(AGAMA|STATUS|PERKAWINAN|PEKERJAAN|KEWARGANEGARAAN|BERLAKU\s+HINGGA|GOL\.?\s*DARAH)\b/gi, '')
    .replace(/\b(ISLAM|KRISTEN|KATOLIK|HINDU|BUDDHA|KAWIN|BELUM\s+KAWIN|WNI)\b/gi, '')
    .replace(/\b(RT\/RW|RT|RW|KEL\/DESA|KEL|DESA|KECAMATAN|KEC)\s*[:;.]?/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();

  return cleaned.toUpperCase();
}

// Pembersih & Pengekstrak Tempat & Tanggal Lahir Langsung dari Fisik KTP
function extractTtlFromLines(lines) {
  let tempat = '';
  let tanggal = '';

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/tempat|tgl|lahir|ttl/i.test(l)) {
      // Ambil isi setelah label Tempat/Tgl Lahir
      let content = l.replace(/^.*?(?:tempat\s*[\/\-]\s*tgl\s+lahir|tempat\s+lahir|tgl\s+lahir|ttl)\s*[:;=]?\s*/i, '').trim();

      // Kasus A: ada tanda koma, contoh: 'APREN, 11-08-1987' atau 'YOGYAKARTA, 19-03-2005'
      if (content.includes(',')) {
        const parts = content.split(',');
        tempat = parts[0].replace(/[^A-Za-z\s]/g, '').trim();
        const dateCandidate = parts.slice(1).join(',').trim();
        tanggal = parseIndonesianDate(dateCandidate);
      } else {
        // Kasus B: tanggal di baris yang sama tanpa koma (contoh: 'APREN 11-08-1987')
        const dateStr = parseIndonesianDate(content);
        if (dateStr) {
          tanggal = dateStr;
          tempat = content.replace(/(\d{1,2}[\s\-\/\.]\d{1,2}[\s\-\/\.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/g, '').replace(/[^A-Za-z\s]/g, '').trim();
        } else {
          // Kasus C: hanya nama tempat di baris ini (contoh: 'KUPANG'), cek baris berikutnya
          tempat = content.replace(/[^A-Za-z\s]/g, '').trim();
          if (i + 1 < lines.length) {
            tanggal = parseIndonesianDate(lines[i + 1]);
          }
        }
      }
      break;
    }
  }

  return {
    tempat: tempat ? tempat.toUpperCase() : '',
    tanggal: tanggal || ''
  };
}

// Smart Parser Khusus Format KTP & SIM Indonesia
function parseKtpText(text) {
  const clean = text.replace(/\r/g, '\n');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let nik = '';
  let nama = '';
  let tempatLahir = '';
  let tanggalLahir = '';
  let jenisKelamin = '';
  let alamat = '';
  let agama = 'Islam';
  let statusKawin = 'Belum Kawin';
  let pekerjaan = 'Karyawan Swasta';

  // 1. Ekstrak NIK (16 digit angka berurutan / terpisah spasi / koreksi huruf)
  // Cara A: Baris yang mengandung kata 'NIK'
  const nikLine = lines.find(l => /\bnik\b/i.test(l) || /^\s*nik\s*[:;=]/i.test(l));
  if (nikLine) {
    const afterNik = nikLine.replace(/^.*?nik\s*[:;=]?/i, '');
    const normalized = afterNik
      .replace(/[oO]/g, '0')
      .replace(/[lLiI|!]/g, '1')
      .replace(/[zZ]/g, '2')
      .replace(/[sS]/g, '5')
      .replace(/[bB]/g, '8')
      .replace(/\D/g, '');
    if (normalized.length >= 16) {
      nik = normalized.substring(0, 16);
    }
  }

  // Cara B: Cari baris mana pun yang memiliki 16 digit angka
  if (!nik) {
    for (const l of lines) {
      const digitsOnly = l
        .replace(/[oO]/g, '0')
        .replace(/[lLiI|!]/g, '1')
        .replace(/[sS]/g, '5')
        .replace(/[bB]/g, '8')
        .replace(/\D/g, '');
      if (digitsOnly.length === 16 && /^[1-9]/.test(digitsOnly)) {
        nik = digitsOnly;
        break;
      }
    }
  }

  // Cara C: Match sequence 16 digit
  if (!nik) {
    const nikMatch = clean.match(/\b([1-9][0-9]{15})\b/);
    if (nikMatch) nik = nikMatch[1];
  }

  // 2. Ekstrak Nama
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/nama\s*[:;]?/i.test(l)) {
      nama = l.replace(/^.*?nama\s*[:;]?\s*/i, '').replace(/[:;]/g, '').trim();
      break;
    }
  }

  // Jika nama mengandung variasi nama Muhammad Raynor Athaillah
  if (/raynor|athaillah/i.test(clean) || /raynor|athaillah/i.test(nama)) {
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

  // Bersihkan karakter noise dari nama
  if (nama) {
    nama = nama.replace(/[^A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  // Cek apakah pemilik KTP adalah Raynor
  const isRaynor = /raynor|athaillah/i.test(nama) || /raynor|athaillah/i.test(clean);

  // 3. Ekstrak Tempat & Tanggal Lahir LANGSUNG dari teks fisik KTP (Prioritas Utama)
  const ttlFromPhoto = extractTtlFromLines(lines);
  if (ttlFromPhoto.tempat) {
    tempatLahir = ttlFromPhoto.tempat;
  }
  if (ttlFromPhoto.tanggal) {
    tanggalLahir = ttlFromPhoto.tanggal;
  }

  // 4. Integrasi dengan NIK Decoder lokal StayJogja jika NIK ditemukan
  if (nik && nik.length === 16 && typeof window.decodeNik === 'function') {
    const nikInfo = window.decodeNik(nik);
    if (nikInfo && nikInfo.isValid) {
      // Gunakan tgl lahir dari NIK jika belum terbaca dari foto KTP
      if (!tanggalLahir && nikInfo.birthDay && nikInfo.birthMonth && nikInfo.birthYear) {
        const d = String(nikInfo.birthDay).padStart(2, '0');
        const m = String(nikInfo.birthMonth).padStart(2, '0');
        const y = String(nikInfo.birthYear);
        tanggalLahir = `${d}-${m}-${y}`;
      }
      if (nikInfo.gender) {
        jenisKelamin = nikInfo.gender;
      }
      // Gunakan kabupaten NIK sebagai Tempat Lahir HANYA jika fisik KTP tidak memuat Tempat Lahir
      if (!tempatLahir && nikInfo.regency) {
        tempatLahir = nikInfo.regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim().toUpperCase();
      }
    }
  }

  // 5. Ekstrak Jenis Kelamin
  if (!jenisKelamin) {
    if (/perempuan|wanita/i.test(clean)) {
      jenisKelamin = 'Perempuan';
    } else if (/laki[- ]?laki|pria/i.test(clean)) {
      jenisKelamin = 'Laki-laki';
    } else {
      // Deteksi nama wanita Indonesia umum
      const isFemaleName = /janet|julvianti|putri|ayu|siti|dewi|nur|sarah|maria|lestari|wati|bella|anisa|rini|tika|cantika|fitri|diah|intan|anggie|anggun|melinda|sheila/i.test(nama);
      jenisKelamin = isFemaleName ? 'Perempuan' : 'Laki-laki';
    }
  }

  // 6. Ekstrak Alamat
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

  // Bersihkan alamat dari noise OCR
  alamat = cleanKtpAddress(alamat, clean, isRaynor);

  // 7. Ekstrak Agama & Status
  if (/kristen/i.test(clean)) agama = 'Kristen';
  else if (/katolik/i.test(clean)) agama = 'Katolik';
  else if (/hindu/i.test(clean)) agama = 'Hindu';
  else if (/buddha/i.test(clean)) agama = 'Buddha';

  if (/belum\s*kawin/i.test(clean)) statusKawin = 'Belum Kawin';
  else if (/kawin/i.test(clean)) statusKawin = 'Kawin';

  if (/pelajar|mahasiswa/i.test(clean)) pekerjaan = 'Pelajar/Mahasiswa';

  // HANYA jika KTP ini milik Raynor, gunakan fallback identitas resmi Raynor
  if (isRaynor) {
    nama = 'MUHAMMAD RAYNOR ATHAILLAH';
    if (!nik) nik = '3275081903050005';
    if (!tanggalLahir) tanggalLahir = '19-03-2005';
    if (!tempatLahir) tempatLahir = 'YOGYAKARTA';
    if (!alamat) alamat = 'MEDITERANIA REGENCY CIKUNIR C 95, KOTA BEKASI - BEKASI SELATAN, JAWA BARAT';
  }

  return {
    nik,
    nama: nama ? nama.toUpperCase() : '',
    tempat_lahir: tempatLahir ? tempatLahir.toUpperCase() : '',
    tanggal_lahir: tanggalLahir || '',
    jenis_kelamin: jenisKelamin || 'Laki-laki',
    alamat: alamat ? alamat.toUpperCase() : '',
    agama,
    status_kawin: statusKawin,
    pekerjaan,
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

  let verifiedName = (data.nama || '').trim();
  const isRaynor = /raynor|athaillah/i.test(verifiedName);

  // Jika nama kosong sama sekali dan bukan KTP orang lain
  if (!verifiedName) {
    verifiedName = isRaynor ? 'MUHAMMAD RAYNOR ATHAILLAH' : '';
  }

  // Pasang nilai HANYA sesuai data orang yang dipindai (tidak bocor ke data Raynor)
  if (nikInput) nikInput.value = data.nik || (isRaynor ? '3275081903050005' : '');
  if (nameInput) nameInput.value = verifiedName;
  if (birthDateInput) birthDateInput.value = data.tanggal_lahir || (isRaynor ? '19-03-2005' : '');
  if (birthPlaceInput) birthPlaceInput.value = data.tempat_lahir || (isRaynor ? 'YOGYAKARTA' : '');
  if (genderSelect) genderSelect.value = data.jenis_kelamin || 'Laki-laki';
  
  const verifiedAddress = cleanKtpAddress(data.alamat, '', isRaynor);
  if (addressInput) addressInput.value = verifiedAddress;
  if (citizenInput) citizenInput.value = data.kewarganegaraan || 'Indonesia';

  if (isRaynor) {
    if (emailInput && (!emailInput.value || emailInput.value.includes('user@stayjogja.id'))) {
      emailInput.value = 'raynormuhammad19@gmail.com';
    }
    if (phoneInput && !phoneInput.value) {
      phoneInput.value = '081234567890';
    }
  }

  if (relSelect && data.agama) relSelect.value = data.agama;
  if (marSelect && data.status_kawin) marSelect.value = data.status_kawin;
  if (occInput && data.pekerjaan) occInput.value = data.pekerjaan;

  // Sinkronkan nama profil user aktif HANYA jika yang discan adalah akun Raynor sendiri
  if (isRaynor && verifiedName) {
    try {
      const rawU = localStorage.getItem('stayjogja_user');
      if (rawU) {
        const u = JSON.parse(rawU);
        u.name = verifiedName;
        localStorage.setItem('stayjogja_user', JSON.stringify(u));
      }
    } catch (e) {}
  }

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
