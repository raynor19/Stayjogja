const db = require('../config/database');

// In-memory cache for recommendations per property ID
const recommendationsCache = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

// Model resmi Google Gemini aktif (tanpa parameter thinkingConfig agar tidak memicu INVALID_ARGUMENT)
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest'
];

/**
 * Panggil Gemini API untuk mendapatkan rekomendasi tempat di dekat hotel
 * @param {Object} property - Objek properti (id, name, address, area, type, stars)
 * @param {Object} options - { forceRefresh: boolean }
 * @returns {Promise<Array>} Array rekomendasi tempat
 */
async function getNearbyRecommendations(property, options = {}) {
  const { forceRefresh = false } = options;
  const propId = property.id;

  // Cek cache jika tidak dipaksa refresh
  if (!forceRefresh && recommendationsCache.has(propId)) {
    const cached = recommendationsCache.get(propId);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[GeminiService] GEMINI_API_KEY tidak ditemukan, menggunakan fallback database lokal.');
    return getFallbackNearbySpots(property);
  }

  const prompt = `Anda adalah kurator pemandu wisata lokal Daerah Istimewa Yogyakarta profesional untuk platform StayJogja.
Berikan 4 tempat terdekat yang paling menarik dan relevan di sekitar akomodasi berikut:
- Nama Akomodasi: ${property.name}
- Tipe: ${property.type} ${property.stars ? `(Bintang ${property.stars})` : ''}
- Alamat Lengkap: ${property.address || '-'}
- Kawasan/Area: ${property.area || 'Yogyakarta'}

Kriteria:
1. Kombinasikan variasi: 1 destinasi wisata/sejarah ikonik, 1 kuliner legendaris/otentik khas Jogja, 1 cafe/tempat santai kekinian, dan 1 pusat oleh-oleh/pasar tradisional terdekat.
2. Jarak harus realistis dari lokasi akomodasi tersebut (dalam meter atau kilometer, contoh: "650 m", "1.2 km").
3. Berikan deskripsi yang menarik dan tips praktis untuk tamu yang menginap.

Wajib format JSON array persis:
[
  {
    "name": "Nama Tempat",
    "category": "Wisata" | "Kuliner" | "Kafe" | "Belanja",
    "distance": "± 750 m",
    "description": "Ringkasan 1-2 kalimat mengapa tamu wajib berkunjung.",
    "tips": "Tips praktis berkunjung (waktu terbaik, menu rekomendasi, atau cara menuju ke sana)."
  }
]
Hanya kembalikan JSON murni tanpa markdown pembuka/penutup agar dapat di-parse langsung.`;

  let recommendations = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        })
      });

      const resJson = await response.json();
      if (resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content) {
        const rawText = resJson.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recommendations = parsed.map(item => ({
            name: item.name || 'Tempat Menarik',
            category: item.category || 'Wisata',
            distance: item.distance || 'Dekat properti',
            description: item.description || 'Destinasi populer di Yogyakarta.',
            tips: item.tips || 'Kunjungi pada waktu operasional.',
            maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.name || '') + ' Yogyakarta')}`,
            source: 'gemini_ai'
          }));
          break;
        }
      } else {
        console.warn(`[GeminiService] Model ${model} response invalid:`, resJson.error?.message || 'Empty candidate');
      }
    } catch (err) {
      console.warn(`[GeminiService] Gagal memanggil ${model}:`, err.message);
    }
  }

  // Jika Gemini berhasil menghasilkan rekomendasi
  if (recommendations && recommendations.length > 0) {
    recommendationsCache.set(propId, {
      timestamp: Date.now(),
      data: recommendations
    });
    return recommendations;
  }

  // Fallback jika API gagal
  return getFallbackNearbySpots(property);
}

/**
 * Fallback jika Gemini API tidak merespons
 */
function getFallbackNearbySpots(property) {
  const propArea = (property.area || '').toLowerCase();
  const areaKey = propArea.split('/')[0].trim();

  let matched = db.tourist_spots.filter(s => {
    const sArea = (s.area || '').toLowerCase();
    return sArea.includes(areaKey) || areaKey.includes(sArea);
  });

  if (matched.length === 0) {
    matched = db.tourist_spots.slice(0, 4);
  }

  return matched.slice(0, 4).map(s => ({
    name: s.name,
    category: s.category === 'kuliner' ? 'Kuliner' : 'Wisata',
    distance: s.distance || '± 1 km',
    description: s.description || 'Destinasi populer Yogyakarta.',
    tips: s.category === 'kuliner' ? 'Cicipi menu khas otentik Jogja.' : 'Bagus untuk fotografi dan berwisata.',
    maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' Yogyakarta')}`,
    source: 'database'
  }));
}

/**
 * Helper untuk memastikan semua penyebutan properti katalog StayJogja menjadi link interaktif
 */
function ensureHotelLinks(text, properties) {
  if (!text || !properties) return text;
  let result = text;
  const sorted = [...properties].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    if (!result.includes(`id=${p.id}`)) {
      const escapedName = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Format ke markdown link hanya jika belum dalam tanda kurung link
      const regex = new RegExp(`(?<!\\[)\\b(${escapedName})\\b(?!\\]|\\([^)]*\\))`, 'gi');
      result = result.replace(regex, `[$1](/detail.html?id=${p.id})`);
    }
  }
  return result;
}

/**
 * Menjawab pertanyaan chatbot menggunakan Gemini AI dengan konteks data StayJogja
 */
async function answerChatbotWithGemini(message, currentProp = null, stayDuration = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Sertakan seluruh 26 properti aktif katalog StayJogja dengan ID dan link
  const catalogList = db.properties.map(p => {
    const units = db.units.filter(u => u.property_id === p.id);
    const minPrice = units.length > 0 ? Math.min(...units.map(u => u.price)) : 0;
    const typeLabel = p.type === 'hotel' 
      ? (p.stars ? `Hotel Bintang ${p.stars}` : 'Hotel') 
      : (p.type === 'homestay' ? 'Homestay' : 'Apartemen');
    return `- [ID: ${p.id}] ${p.name} | Tipe: ${typeLabel} | Kawasan: ${p.area} | Harga Mulai: Rp ${minPrice.toLocaleString('id-ID')}/malam | Link: /detail.html?id=${p.id}`;
  }).join('\n');

  const propContext = currentProp ? `Tamu saat ini sedang melihat halaman hotel: "${currentProp.name}" (ID: ${currentProp.id}, Area: ${currentProp.area}, Alamat: ${currentProp.address}). Link: /detail.html?id=${currentProp.id}` : '';
  const durationContext = stayDuration ? `Durasi menginap/liburan yang dipilih tamu di sistem adalah: ${stayDuration} hari / malam. Jika tamu meminta rekomendasi kegiatan atau rencana perjalanan, prioritaskan rekomendasi yang pas untuk durasi ${stayDuration} hari tersebut.` : '';

  const systemPrompt = `Anda adalah asisten virtual cerdas resmi untuk StayJogja (platform pemesanan hotel bintang 1–5, homestay, apartemen, serta panduan wisata dan kuliner Daerah Istimewa Yogyakarta).
Karakter: Ramah, santun khas Yogyakarta ("Sugeng rawuh!"), informatif, dan membantu tamu menemukan penginapan serta liburan terbaik.

DAFTAR LENGKAP KATALOG AKOMODASI RESMI STAYJOGJA (TOTAL ${db.properties.length} PROPERTI):
${catalogList}

${propContext}
${durationContext}

ATURAN PALING PENTING (STRICT DATABASE GROUNDING & KLIK HOTEL):
1. HANYA BOLEH MEREKOMENDASIKAN PENGINAPAN YANG ADA DALAM DAFTAR KATALOG RESMI STAYJOGJA DI ATAS!
   - DILARANG KERAS MEREKOMENDASIKAN PENGINAPAN DI LUAR KATALOG (DILARANG mengarang atau menyebut hotel/hostel fiktif/eksternal seperti Yez Yez Yez Hostels, ViaVia Guesthouse, Otu Hostel, Kampoeng Djawa House, atau nama hotel lain yang tidak ada di daftar katalog).
   - Jika pengguna mencari sesuatu (contoh: "homestay murah di bawah 300 ribu di Prawirotaman"), carilah di katalog: rekomendasi yang paling tepat adalah [Trava House Homestay](/detail.html?id=prop-home-02) (kawasan Prawirotaman / Selatan, harga mulai Rp 240.000/malam). Anda juga bisa menyebutkan opsi homestay budget lain di katalog seperti [Malioboro Garden Homestay](/detail.html?id=prop-home-04) (Rp 220.000/malam) atau [Omah Njonja Bed & Brasserie](/detail.html?id=prop-home-01) jika ingin suasana khas Prawirotaman.
2. SETIAP KALI MENYEBUT / MEREKOMENDASIKAN AKOMODASI DARI KATALOG, WAJIB MENGGUNAKAN TAUTAN KLIK MARKDOWN:
   Format: [Nama Lengkap Akomodasi](/detail.html?id=ID_PROPERTI)
   Contoh: [Trava House Homestay](/detail.html?id=prop-home-02) atau [Hotel Tentrem Yogyakarta](/detail.html?id=prop-h5-01)
   Sampaikan dengan jelas bahwa tamu bisa langsung mengklik nama akomodasi tersebut untuk masuk ke halaman detail hotel, melihat foto kamar, fasilitas, dan langsung memesan kamar.
3. Untuk rekomendasi KULINER & TEMPAT WISATA (misal Tempo Gelato, Gudeg Yu Djum, Kopi Klotok, Tamansari, Malioboro, dll), Anda bebas dan dipersilakan merekomendasikannya secara akurat sesuai lokasi di Yogyakarta.
4. Jawab langsung to-the-point, terstruktur dengan poin-poin/bullet list yang rapi dan emoji menarik. DILARANG menampilkan outline draf (seperti "Structure:*", "Introduction acknowledging...", dsb).
5. Gunakan Bahasa Indonesia yang ramah, sopan, dan jelas khas StayJogja.
6. ANDA HANYA BOLEH MENJAWAB TOPIK: penginapan Yogyakarta, wisata Jogja, kuliner Jogja, dan rencana perjalanan Jogja. DILARANG KERAS menjawab pertanyaan di luar topik tersebut (coding, matematika, sains, politik, topik umum, dll). Jika pengguna menanyakan hal di luar topik, tolak dengan sopan dan arahkan kembali ke StayJogja. Contoh penolakan: "Wah, sepertinya pertanyaan itu di luar keahlian saya 😊 Saya asisten khusus StayJogja — siap membantu rencana wisata dan penginapan di Yogyakarta. Ada yang bisa saya bantu untuk liburan Anda di Jogja?"`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            { parts: [{ text: message }] }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        // Pastikan bukan respon terpotong atau metadata draf
        if (text && !text.trim().startsWith('Structure:*')) {
          return ensureHotelLinks(text, db.properties);
        }
      }
    } catch (err) {
      console.warn(`[GeminiService] Chatbot model ${model} error:`, err.message);
    }
  }
  return null;
}

/**
 * Menyusun Rencana Perjalanan (Itinerary) Harian Cerdas berbasis Lokasi Hotel & Durasi Menginap
 */
async function generateItineraryForProperty(property, options = {}) {
  const days = Math.min(Math.max(parseInt(options.days, 10) || 2, 1), 5);
  const preference = options.preference || 'semua';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateFallbackItinerary(property, days);
  }

  const preferenceGuide = {
    kuliner: 'Fokuskan banyak destinasi kuliner legendaris, jajanan pasar khas, kafe hits, dan restoran terkenal di Jogja.',
    wisata: 'Fokuskan destinasi sejarah, keraton, candi, museum budaya, dan spot foto pemandangan ikonik.',
    santai: 'Jadwal santai dan tidak melelahkan, kafe estetik, tempat jalan sore yang teduh, dan relaksasi.',
    keluarga: 'Tempat wisata yang ramah anak dan keluarga, akses mudah, dan aman.',
    semua: 'Kombinasi seimbang antara kuliner otentik, destinasi sejarah/wisata ikonik, pasar tradisional, dan tempat nongkrong santai.'
  }[preference] || 'Kombinasi seimbang antara kuliner otentik dan destinasi wisata.';

  const prompt = `Anda adalah ahli perencana liburan (professional trip planner) Yogyakarta untuk StayJogja.
Tamu akan menginap selama ${days} hari di akomodasi berikut:
- Nama Akomodasi: ${property.name}
- Kawasan/Area: ${property.area}
- Alamat Lengkap: ${property.address || 'Yogyakarta'}
- Preferensi Liburan: ${preference} (${preferenceGuide})

Tugas Anda:
Susun rencana perjalanan (itinerary) harian yang realistis, logis secara rute jalan (tidak bolak-balik jauh), dan sangat menyenangkan untuk ${days} hari penuh.

Aturan Penting:
1. Mulai perjalanan setiap hari dari hotel, dan akhiri malam hari dengan kembali istirahat ke hotel.
2. Setiap hari WAJIB memiliki 4 slot waktu:
   - "Pagi (07:30 - 11:00)": Sarapan khas atau destinasi pagi yang segar/sejarah/pasar.
   - "Siang (11:30 - 15:30)": Makan siang khas + destinasi budaya/wisata utama.
   - "Sore (16:00 - 18:30)": Sunset spot, kafe santai, atau belanja oleh-oleh.
   - "Malam (19:00 - 22:00)": Kuliner malam / nongkrong seru (misal Kopi Joss, Eskala, Angkringan, dll) lalu kembali ke hotel.
3. Berikan rincian jarak realistis dari hotel/titik sebelumnya, deskripsi aktivitas, serta tips praktis.

WAJIB FORMAT JSON VALID PERSIS:
{
  "trip_title": "Itinerary ${days} Hari Liburan Istimewa di Sekitar ${property.name}",
  "total_days": ${days},
  "hotel_base": "${property.name}",
  "preference": "${preference}",
  "days": [
    {
      "day_number": 1,
      "title": "Hari 1: Judul Hari Singkat & Menarik",
      "summary": "Ringkasan keseruan hari ke-1 dalam 1 kalimat.",
      "schedule": [
        {
          "time_slot": "Pagi (07:30 - 11:00)",
          "period": "pagi",
          "location_name": "Nama Tempat / Destinasi",
          "activity": "Aktivitas seru apa yang dilakukan di sana.",
          "distance_from_hotel": "± 850 m dari hotel (sekitar 5 menit berkendara)",
          "tips": "Tips praktis berkunjung (waktu terbaik, menu wajib coba, dll).",
          "maps_query": "Nama Tempat Yogyakarta"
        }
      ]
    }
  ]
}
Hanya kembalikan JSON valid tanpa markdown tambahan.`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 3000
          }
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);
        if (parsed && parsed.days && Array.isArray(parsed.days)) {
          // Lengkapi dengan maps URL
          parsed.days.forEach(day => {
            if (day.schedule && Array.isArray(day.schedule)) {
              day.schedule.forEach(item => {
                item.maps_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.maps_query || item.location_name) + ' Yogyakarta')}`;
              });
            }
          });
          parsed.source = 'gemini_ai';
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[GeminiService] Itinerary model ${model} error:`, err.message);
    }
  }

  return generateFallbackItinerary(property, days);
}

/**
 * Fallback itinerary jika API tidak tersedia
 */
function generateFallbackItinerary(property, days = 2) {
  const daysList = [];
  const hotelName = property.name || 'Hotel StayJogja';

  for (let i = 1; i <= days; i++) {
    if (i === 1) {
      daysList.push({
        day_number: 1,
        title: `Hari 1: Eksplorasi Ikonik & Kuliner Terdekat ${hotelName}`,
        summary: `Menikmati pesona budaya, kuliner legendaris, dan suasana malam khas Yogyakarta di sekitar ${hotelName}.`,
        schedule: [
          {
            time_slot: 'Pagi (07:30 - 11:00)',
            period: 'pagi',
            location_name: 'Pasar Kranggan & Kuliner Tradisional',
            activity: 'Sarapan lupis legendaris atau jenang manis dan ngopi santai di lantai dua pasar.',
            distance_from_hotel: '± 800 m dari hotel',
            tips: 'Datang lebih pagi untuk mendapatkan nomor antrean awal.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Pasar%20Kranggan%20Yogyakarta'
          },
          {
            time_slot: 'Siang (11:30 - 15:30)',
            period: 'siang',
            location_name: 'Kraton Yogyakarta & Tamansari',
            activity: 'Menjelajahi keagungan budaya kesultanan Yogyakarta dan berfoto di lorong estetik Sumur Gumuling.',
            distance_from_hotel: '± 3.5 km dari hotel',
            tips: 'Gunakan pemandu wisata lokal untuk mendapatkan cerita sejarah yang otentik.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Tamansari%20Yogyakarta'
          },
          {
            time_slot: 'Sore (16:00 - 18:30)',
            period: 'sore',
            location_name: 'Jalan Malioboro & Pasar Beringharjo',
            activity: 'Belanja cinderamata batik dan oleh-oleh khas Jogja sambil berjalan santai di pedestrian Malioboro.',
            distance_from_hotel: '± 1.8 km dari hotel',
            tips: 'Pasar Beringharjo tutup pukul 17.00 WIB, jadi belanja batik terlebih dahulu.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Pasar%20Beringharjo%20Yogyakarta'
          },
          {
            time_slot: 'Malam (19:00 - 22:00)',
            period: 'malam',
            location_name: `Tugu Pal Putih & Kembali Istirahat di ${hotelName}`,
            activity: 'Menikmati malam di Tugu Jogja, mencicipi Kopi Joss arang membara, lalu kembali ke hotel untuk beristirahat.',
            distance_from_hotel: '± 700 m kembali ke hotel',
            tips: 'Hati-hati saat menyeberang jalan untuk berfoto di spot Tugu.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Tugu%20Yogyakarta'
          }
        ]
      });
    } else {
      daysList.push({
        day_number: i,
        title: `Hari ${i}: Eksplorasi Alam & Kafe Hits Jogja`,
        summary: `Menikmati udara sejuk pegunungan atau candi bersejarah, ditutup dengan makan malam santai.`,
        schedule: [
          {
            time_slot: 'Pagi (07:30 - 11:00)',
            period: 'pagi',
            location_name: 'Warung Kopi Klotok Pakem',
            activity: 'Sarapan pisang goreng hangat, telur dadar krispi, dan sayur lodeh ndeso di tepi sawah.',
            distance_from_hotel: '± 14 km ke arah utara',
            tips: 'Datang sebelum pukul 07.30 pagi untuk menghindari antrean panjang.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Kopi%20Klotok%20Pakem%20Yogyakarta'
          },
          {
            time_slot: 'Siang (11:30 - 15:30)',
            period: 'siang',
            location_name: 'Candi Prambanan atau Lava Tour Merapi',
            activity: 'Menyaksikan kemegahan mahakarya candi Hindu terbesar atau berpetualang naik Jeep.',
            distance_from_hotel: '± 16 km dari hotel',
            tips: 'Bawa payung atau topi karena cuaca bisa cukup terik di siang hari.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Candi%20Prambanan%20Yogyakarta'
          },
          {
            time_slot: 'Sore (16:00 - 18:30)',
            period: 'sore',
            location_name: 'Kafe Santai & Sentra Bakpia Pathok',
            activity: 'Membeli bakpia kukus/basah hangat segar langsung dari pabriknya dan nongkrong sore santai.',
            distance_from_hotel: '± 2.5 km dari hotel',
            tips: 'Beli bakpia yang baru matang agar aromanya maksimal saat dibawa pulang.',
            maps_url: 'https://www.google.com/maps/search/?api=1&query=Bakpia%20Pathok%20Yogyakarta'
          },
          {
            time_slot: 'Malam (19:00 - 22:00)',
            period: 'malam',
            location_name: `Dinner Santai & Kembali ke ${hotelName}`,
            activity: `Menikmati makan malam santai di area kuliner dekat hotel, lalu kembali beristirahat nyaman di ${hotelName}.`,
            distance_from_hotel: 'Kembali ke hotel',
            tips: 'Tidur nyenyak untuk memulihkan energi setelah seharian berkeliling.',
            maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelName + ' Yogyakarta')}`
          }
        ]
      });
    }
  }

  return {
    trip_title: `Rencana Perjalanan ${days} Hari di Sekitar ${hotelName}`,
    total_days: days,
    hotel_base: hotelName,
    preference: 'semua',
    days: daysList,
    source: 'fallback'
  };
}

module.exports = {
  getNearbyRecommendations,
  getFallbackNearbySpots,
  answerChatbotWithGemini,
  generateItineraryForProperty
};

