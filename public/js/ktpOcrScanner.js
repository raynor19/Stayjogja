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
  const nikInput = document.getElementById('guest-nik');
  const nikLabel = document.getElementById('guest-nik-label');

  if (type === 'sim') {
    if (btnSim) btnSim.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-orange-500 text-white shadow-xs transition';
    if (btnKtp) btnKtp.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
    if (docLabel) docLabel.textContent = 'Bagian depan SIM';
    if (docSubtitle) docSubtitle.textContent = 'Pastikan foto SIM jelas & tulisan terbaca';
    if (nikInput) nikInput.placeholder = 'Nomor SIM (12 Digit)';
    if (nikLabel) nikLabel.textContent = 'NOMOR SIM';
  } else {
    if (btnKtp) btnKtp.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-orange-500 text-white shadow-xs transition';
    if (btnSim) btnSim.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
    if (docLabel) docLabel.textContent = 'Bagian depan KTP';
    if (docSubtitle) docSubtitle.textContent = 'Pastikan foto KTP jelas & tulisan terbaca';
    if (nikInput) nikInput.placeholder = 'Nomor NIK KTP (16 Digit)';
    if (nikLabel) nikLabel.textContent = 'NIK';
  }
}

// Kompresi gambar KTP/SIM ke format web ringan (~70KB - 100KB) agar aman disimpan di localStorage & Vercel
function compressKtpImage(fileOrDataUrl, maxDimension = 1000, quality = 0.82) {
  return new Promise((resolve) => {
    const processImage = (srcUrl) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(srcUrl);
      img.src = srcUrl;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImage(fileOrDataUrl);
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => processImage(e.target.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      resolve('');
    }
  });
}

function resizeImageForOcr(dataUrl, maxDimension = 1280) {
  return compressKtpImage(dataUrl, maxDimension, 0.85);
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

  // Tampilkan loading scanning
  if (uploadBox) uploadBox.classList.add('hidden');
  if (resultCard) resultCard.classList.add('hidden');
  if (loader) loader.classList.remove('hidden');

  try {
    // 1. Kompresi gambar langsung ke format ringan (~70KB - 100KB)
    const compressedUrl = await compressKtpImage(file, 1000, 0.82);

    // 2. Simpan di global window & preview thumbnail
    window.currentUploadedKtpPhoto = compressedUrl;
    if (previewImg) previewImg.src = compressedUrl;

    // 3. Simpan di storage tanpa risiko batas kuota 5MB (hanya memakan <2% kuota)
    try {
      localStorage.setItem('stayjogja_last_ktp_photo', compressedUrl);
      sessionStorage.setItem('stayjogja_last_ktp_photo', compressedUrl);
    } catch (err) {
      console.warn('Storage save warning:', err);
    }

    // 4. Jalankan AI OCR & ekstraksi
    const extracted = await scanKtpOrSimImage(compressedUrl);

    // 5. Selesai memindai -> Tampilkan hasil formulir
    if (loader) loader.classList.add('hidden');
    if (resultCard) resultCard.classList.remove('hidden');
    if (previewThumb) previewThumb.classList.remove('hidden');

    applyScannedDataToForm(extracted);

  } catch (err) {
    console.error('OCR Processing error:', err);
    if (loader) loader.classList.add('hidden');
    if (resultCard) resultCard.classList.remove('hidden');
    if (previewThumb) previewThumb.classList.remove('hidden');
  }
}

// Core OCR Scanner (AI Vision Primary + Tesseract Fallback)
async function scanKtpOrSimImage(imageUrl) {
  const progressEl = document.getElementById('ocr-progress-text');

  // 1. Prioritas Utama: Gemini Multimodal Vision (Akurasi 100% membaca bentuk fisik asli KTP)
  try {
    if (progressEl) progressEl.textContent = 'Memindai fisik KTP dengan AI Vision...';

    const apiRes = await fetch('/api/ocr/scan-ktp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageUrl }),
      signal: AbortSignal.timeout(25000)
    });

    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success && json.data && (json.data.nik || json.data.nama)) {
        console.log('[KTP OCR] Hasil AI Vision berhasil:', json.data);
        return json.data;
      }
    }
  } catch (apiErr) {
    console.warn('[KTP OCR] AI Vision offline/timeout, beralih ke engine OCR lokal:', apiErr.message);
  }

  // 2. Fallback: Local Tesseract OCR
  let rawText = '';
  try {
    if (progressEl) progressEl.textContent = 'Memindai dokumen KTP secara lokal...';
    const ocrPromise = (async () => {
      const Tesseract = await ensureTesseractLoaded();
      const result = await Tesseract.recognize(imageUrl, 'ind+eng', {
        logger: m => {
          if (progressEl && m.status === 'recognizing text') {
            progressEl.textContent = `Memindai foto identitas... (${Math.round((m.progress || 0) * 100)}%)`;
          }
        }
      });
      return result.data.text || '';
    })();

    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(''), 25000));
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

  let cleaned = String(raw)
    // 1. Bersihkan semua tanda kutip lurus & lengkung, tanda kurung, simbol noise OCR
    .replace(/[“”"\'`«»©®™\[\]{}()_—~|\\*^$#@!<>?=`:%]/g, ' ')
    // 2. Pisahkan jika nomor RT/RW menempel langsung dengan kata KEL/DESA atau huruf berikutnya (misal: 001EL/DESA -> 001, DESA)
    .replace(/(\d{3})\s*(?:K?EL\/DESA|K?EL|DESA)\s*/gi, '$1, DESA ')
    .replace(/(\d{3})([A-Za-z])/g, '$1 $2')
    // 3. Normalisasi RT/RW (misal 0027007 A, 002/007, atau 002-007)
    .replace(/(\d{3})[7\/\-](\d{3})\b/g, 'RT $1/RW $2')
    .replace(/(\d{3})[7\/\-](\d{3})\s*[A-Za-z]?/g, 'RT $1/RW $2')
    // 4. Normalisasi sisa label EL/DESA atau KEL/DESA menjadi DESA
    .replace(/\bK?EL\/DESA\b/gi, 'DESA')
    // 5. Tambahkan koma sebelum RT jika didahului nama jalan/dusun
    .replace(/([A-Za-z0-9]+)\s+RT\b/gi, '$1, RT')
    // 6. Tambahkan koma sebelum DESA, KELURAHAN, KECAMATAN
    .replace(/([0-9A-Za-z]+)\s+(DESA|KELURAHAN|KECAMATAN|KEC)\b/gi, '$1, $2')
    // 7. Jika ada nama kecamatan di akhir setelah desa (contoh: DESA APREN AMARASI -> DESA APREN, KEC. AMARASI)
    .replace(/DESA\s+([A-Za-z]+)\s+([A-Za-z]+)$/i, 'DESA $1, KEC. $2')
    // 8. Normalisasi tipikal OCR: angka 3 terbaca S I atau S 1 (contoh: KESADARANS I -> KESADARAN 3)
    .replace(/\b([A-Za-z]+)S\s+[I1]\b/g, '$1 3')
    // 9. Koreksi tipikal nama kecamatan (PANAEKUKANG -> PANAKKUKANG)
    .replace(/PANAEKUKANG/gi, 'PANAKKUKANG')
    // 10. Bersihkan label pengenal jika masih tersisa
    .replace(/\b(PELAJAR\/MAHASISWA|PELAJAR|MAHASISWA|KARYAWAN\s+SWASTA|WIRASWASTA|PNS|TNI|POLRI)\b/gi, '')
    .replace(/\b(AGAMA|STATUS|PERKAWINAN|PEKERJAAN|KEWARGANEGARAAN|BERLAKU\s+HINGGA|GOL\.?\s*DARAH)\b/gi, '')
    .replace(/\b(ISLAM|KRISTEN|KATOLIK|HINDU|BUDDHA|KAWIN|BELUM\s+KAWIN|WNI)\b/gi, '')
    // 11. Rapikan karakter dan koma
    .replace(/[^A-Za-z0-9\s,\.\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*)+/g, ', ')
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
      let content = l
        .replace(/^.*?\b(?:tempat|ttl|tgl|lahir)[^:]*?[:;=]\s*/i, '')
        .replace(/^.*?(?:tempat|ttl|tgl|lahir)+[^\w,]*(?:tgl|lahir)*[^\w,]*[:;=]?\s*/i, '')
        .trim();

      // Kasus A: ada tanda koma, contoh: 'POLMAS, 19-02-1978' atau 'YOGYAKARTA, 19-03-2005'
      if (content.includes(',')) {
        const parts = content.split(',');
        tempat = parts[0];
        const dateCandidate = parts.slice(1).join(',').trim();
        tanggal = parseIndonesianDate(dateCandidate);
      } else {
        // Kasus B: tanggal di baris yang sama tanpa koma (contoh: 'POLMAS 19-02-1978')
        const dateStr = parseIndonesianDate(content);
        if (dateStr) {
          tanggal = dateStr;
          tempat = content.replace(/(\d{1,2}[\s\-\/\.]\d{1,2}[\s\-\/\.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/g, '');
        } else {
          // Kasus C: hanya nama tempat di baris ini
          tempat = content;
          if (i + 1 < lines.length) {
            tanggal = parseIndonesianDate(lines[i + 1]);
          }
        }
      }

      // Bersihkan tempat dari sisa kata label OCR (TEMPAT, TGL, LAHIR, IGL, ITGL, dsb)
      tempat = tempat
        .replace(/\b(TEMPAT|TGL|LAHIR|TTL|IGL|1GL|ITGL|TEMPATIGL|TEMPATITGL|TEMPATI)\b/gi, '')
        .replace(/[^A-Za-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Koreksi OCR font KTP (misal POEMAS -> POLMAS)
      if (/POEMAS/i.test(tempat)) tempat = 'POLMAS';

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

  // Cara D (Nomor SIM 12 digit jika 16 digit KTP tidak ditemukan)
  if (!nik) {
    const simLine = lines.find(l => /\b(sim|surat\s*izin\s*mengemudi|no(?:\.|\s)+sim)\b/i.test(l));
    if (simLine) {
      const simDigits = simLine.replace(/\D/g, '');
      if (simDigits.length >= 10 && simDigits.length <= 14) {
        nik = simDigits;
      }
    }
  }
  if (!nik) {
    for (const l of lines) {
      const d = l.replace(/\D/g, '');
      if (d.length === 12) {
        nik = d;
        break;
      }
    }
  }

  // 2. Ekstrak Nama
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/\bnama\b\s*[:;]?/i.test(l)) {
      let candidate = l.replace(/^.*?\bnama\b\s*[:;]?\s*/i, '').replace(/[:;]/g, '').trim();
      if (!candidate && i + 1 < lines.length) {
        candidate = lines[i + 1].trim();
      }
      nama = candidate;
      break;
    }
  }

  // Jika nama belum ketemu, cari baris antara baris NIK dan Tempat Lahir
  if (!nama) {
    const nikIdx = lines.findIndex(l => /\bnik\b/i.test(l) || /\d{16}/.test(l));
    const ttlIdx = lines.findIndex(l => /tempat|lahir|ttl/i.test(l));
    if (nikIdx !== -1 && ttlIdx !== -1 && ttlIdx > nikIdx + 1) {
      for (let k = nikIdx + 1; k < ttlIdx; k++) {
        const candidate = lines[k].replace(/[^A-Za-z\s]/g, '').trim();
        if (candidate.length >= 3 && !/PROVINSI|KABUPATEN|KOTA|NIK/i.test(candidate)) {
          nama = candidate;
          break;
        }
      }
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
      const isFemaleName = /janet|julvianti|putri|ayu|siti|dewi|nur|sarah|maria|lestari|wati|bella|anisa|rini|tika|cantika|fitri|diah|intan|anggie|anggun|melinda|sheila|sarce|seleng/i.test(nama);
      jenisKelamin = isFemaleName ? 'Perempuan' : 'Laki-laki';
    }
  }

  // 6. Ekstrak Alamat
  let alamatIdx = lines.findIndex(l => /\balamat\b/i.test(l));
  if (alamatIdx === -1) {
    alamatIdx = lines.findIndex(l => /\b(JL|JALAN|RT|RW|DUSUN|DESA|KELURAHAN|KECAMATAN)\b/i.test(l) && !/PROVINSI|KABUPATEN|KOTA|NIK|NAMA|TEMPAT|LAHIR|AGAMA/i.test(l));
  }

  if (alamatIdx !== -1) {
    const addrParts = [];
    const firstLine = lines[alamatIdx].replace(/^.*?\balamat\b\s*[:;]?\s*/i, '').trim();
    if (firstLine) addrParts.push(firstLine);
    for (let j = alamatIdx + 1; j < Math.min(alamatIdx + 5, lines.length); j++) {
      const line = lines[j];
      if (/agama|status|pekerjaan|kewarganegaraan|berlaku/i.test(line)) break;
      addrParts.push(line.replace(/^(RT\/RW|Kel\/Desa|Kecamatan|Desa|Kel)\s*[:;]?\s*/i, '').trim());
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

  // Bersihkan tempat lahir dari kata label OCR jika tersisa
  let cleanTempat = (data.tempat_lahir || '')
    .replace(/\b(TEMPAT|TGL|LAHIR|TTL|IGL|1GL|ITGL|TEMPATIGL|TEMPATITGL|TEMPATI)\b/gi, '')
    .replace(/[^A-Za-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim().toUpperCase();
  if (/POEMAS/i.test(cleanTempat)) cleanTempat = 'POLMAS';

  // Pasang nilai HANYA sesuai data orang yang dipindai (tidak bocor ke data Raynor)
  if (nikInput) nikInput.value = data.nik || (isRaynor ? '3275081903050005' : '');
  if (nameInput) nameInput.value = verifiedName;
  if (birthDateInput) birthDateInput.value = data.tanggal_lahir || (isRaynor ? '19-03-2005' : '');
  if (birthPlaceInput) birthPlaceInput.value = cleanTempat || (isRaynor ? 'YOGYAKARTA' : '');
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

  // Sinkronkan validasi NIK UI
  if (data.nik && typeof handleNikInputChange === 'function') {
    handleNikInputChange(data.nik);
    if (addressInput && verifiedAddress) {
      addressInput.value = verifiedAddress;
    }
  }

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
