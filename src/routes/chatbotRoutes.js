const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Server-side Response Cache dengan masa berlaku 1 Hari (24 Jam)
const chatbotResponseCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam (1 hari)

function getCachedResponse(key) {
  const item = chatbotResponseCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    chatbotResponseCache.delete(key);
    return null;
  }
  return item.reply;
}

function setCachedResponse(key, reply) {
  if (chatbotResponseCache.size > 500) {
    const oldestKey = chatbotResponseCache.keys().next().value;
    chatbotResponseCache.delete(oldestKey);
  }
  chatbotResponseCache.set(key, {
    reply,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

// Scoped AI Chatbot Engine for Jogja Tourism & Accommodation
router.post('/', async (req, res) => {
  try {
    const { message, current_property_id, stay_duration } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
    }

    const q = message.toLowerCase().trim();

    // Guardrail Check: Off-topic keywords
    const offTopicKeywords = [
      'presiden', 'politik', 'pemilu', 'saham', 'kripto', 'crypto', 'bitcoin',
      'fisika', 'rumus', 'matematika', 'kalkulus', 'coding python', 'java class',
      'bali', 'jakarta', 'surabaya', 'bandung', 'medan', 'singapura', 'malaysia', 'eropa',
      'agama', 'perang'
    ];

    const isOffTopic = offTopicKeywords.some(kw => q.includes(kw));

    if (isOffTopic) {
      return res.json({
        success: true,
        reply: "Mohon maaf, saya adalah asisten virtual khusus **StayYK** yang difokuskan untuk rekomendasi **wisata, kuliner, dan akomodasi (Hotel bintang 1–5, Homestay, Apartemen) di wilayah Daerah Istimewa Yogyakarta**.\n\nSilakan tanyakan hal seputar rekomendasi penginapan, tempat wisata, atau kuliner favorit Anda di Jogja! 😊"
      });
    }

    // 0. Cek Cache 24 Jam
    const cacheKey = `${q}__${current_property_id || ''}__${stay_duration || ''}`;
    const cachedReply = getCachedResponse(cacheKey);
    if (cachedReply) {
      return res.json({
        success: true,
        reply: cachedReply,
        source: 'cache_24h'
      });
    }

    // Context: If asking about current viewed property
    let currentProp = null;
    if (current_property_id) {
      currentProp = db.properties.find(p => p.id === current_property_id);
    }

    // Gunakan kecerdasan Gemini AI jika API key tersedia
    const { answerChatbotWithGemini } = require('../services/geminiService');
    const geminiReply = await answerChatbotWithGemini(message, currentProp, stay_duration);
    if (geminiReply) {
      setCachedResponse(cacheKey, geminiReply);
      return res.json({
        success: true,
        reply: geminiReply,
        source: 'gemini_ai'
      });
    }

    // 1. Budget / Recommendation query (Fallback Rule-based)
    const asksBudget = q.includes('budget') || q.includes('harga') || q.includes('murah') || 
                       q.includes('rekomendasi penginapan') || q.includes('rekomendasi hotel') || 
                       q.includes('rekomendasi') || q.includes('cari') || q.includes('hotel') || 
                       q.includes('homestay') || q.includes('apartemen') || q.includes('penginapan');

    if (asksBudget) {
      let maxBudget = null;
      // Budget matching: e.g. "500 ribu", "1jt", "dibawah 300rb", "rp 500000"
      const budgetMatch = q.match(/(?:rp\.?\s*|budget\s*|dibawah\s*|kurang\s*dari\s*)?(\d+[\d\.,]*)\s*(ribu|rb|jt|juta|k)\b/i) || 
                          q.match(/rp\.?\s*(\d{5,})/i);

      if (budgetMatch) {
        let num = parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.'));
        const unit = budgetMatch[2] ? budgetMatch[2].toLowerCase() : '';
        if (unit === 'jt' || unit === 'juta') num *= 1000000;
        else if (unit === 'rb' || unit === 'ribu' || unit === 'k') num *= 1000;
        maxBudget = num;
      }

      // Check if asking for specific stars
      let starFilter = null;
      if (q.includes('bintang 5') || q.includes('bintang lima')) starFilter = 5;
      else if (q.includes('bintang 4') || q.includes('bintang empat')) starFilter = 4;
      else if (q.includes('bintang 3') || q.includes('bintang tiga')) starFilter = 3;
      else if (q.includes('bintang 2') || q.includes('bintang dua')) starFilter = 2;
      else if (q.includes('bintang 1') || q.includes('bintang satu') || q.includes('melati')) starFilter = 1;

      let matchedProps = db.properties.map(p => {
        const units = db.units.filter(u => u.property_id === p.id);
        const minPrice = units.length > 0 ? Math.min(...units.map(u => u.price)) : 0;
        return { ...p, minPrice, units };
      });

      if (starFilter) {
        matchedProps = matchedProps.filter(p => p.type === 'hotel' && p.stars === starFilter);
      }

      if (q.includes('homestay')) {
        matchedProps = matchedProps.filter(p => p.type === 'homestay');
      } else if (q.includes('apartemen') || q.includes('apartment')) {
        matchedProps = matchedProps.filter(p => p.type === 'apartemen');
      }

      // Filter area if specified
      if (q.includes('prawirotaman')) {
        const areaMatched = matchedProps.filter(p => p.area.toLowerCase().includes('prawirotaman'));
        if (areaMatched.length > 0) matchedProps = areaMatched;
      } else if (q.includes('malioboro')) {
        const areaMatched = matchedProps.filter(p => p.area.toLowerCase().includes('malioboro'));
        if (areaMatched.length > 0) matchedProps = areaMatched;
      } else if (q.includes('kaliurang') || q.includes('sleman')) {
        const areaMatched = matchedProps.filter(p => p.area.toLowerCase().includes('kaliurang') || p.area.toLowerCase().includes('sleman'));
        if (areaMatched.length > 0) matchedProps = areaMatched;
      } else if (q.includes('seturan') || q.includes('babarsari')) {
        const areaMatched = matchedProps.filter(p => p.area.toLowerCase().includes('seturan'));
        if (areaMatched.length > 0) matchedProps = areaMatched;
      }

      // If budget specified
      if (maxBudget !== null) {
        const budgetFiltered = matchedProps.filter(p => p.minPrice <= maxBudget);
        if (budgetFiltered.length > 0) {
          matchedProps = budgetFiltered;
        }
      }

      matchedProps.sort((a, b) => a.minPrice - b.minPrice);

      if (matchedProps.length > 0) {
        let listText = matchedProps.slice(0, 4).map(p => {
          const starIcon = p.stars ? ` (Bintang ${p.stars} ⭐)` : '';
          const typeBadge = p.type.toUpperCase();
          const fmtPrice = new Intl.NumberFormat('id-ID').format(p.minPrice);
          return `• **[${p.name}](/detail.html?id=${p.id})** [${typeBadge}${starIcon}]\n  📍 ${p.area}\n  💰 Mulai **Rp ${fmtPrice}**/malam\n  ✨ *${p.description.substring(0, 90)}...*`;
        }).join('\n\n');

        return res.json({
          success: true,
          reply: `Sugeng rawuh! Berikut rekomendasi akomodasi resmi di katalog StayJogja yang sesuai dengan kriteria Anda:\n\n${listText}\n\n👉 *Klik langsung nama akomodasi di atas untuk masuk ke halaman detail hotel dan melihat foto kamar!*`
        });
      }
    }

    // 2. Kuliner Recommendation
    if (q.includes('kuliner') || q.includes('makan') || q.includes('gudeg') || q.includes('kopi') || q.includes('sate') || q.includes('mercon') || q.includes('gelato')) {
      let filteredSpots = db.tourist_spots.filter(s => s.category === 'kuliner');
      if (q.includes('malioboro')) filteredSpots = filteredSpots.filter(s => s.area.includes('Malioboro'));
      else if (q.includes('prawirotaman')) filteredSpots = filteredSpots.filter(s => s.area.includes('Prawirotaman'));
      else if (q.includes('sleman') || q.includes('kaliurang')) filteredSpots = filteredSpots.filter(s => s.area.includes('Sleman'));

      let listText = (filteredSpots.length > 0 ? filteredSpots : db.tourist_spots.filter(s => s.category === 'kuliner')).slice(0, 3).map(s => {
        return `🍴 **${s.name}** (${s.area})\n${s.description}\n📌 *${s.distance}*`;
      }).join('\n\n');

      return res.json({
        success: true,
        reply: `Yogyakarta terkenal dengan kulinernya yang otentik! Berikut rekomendasi tempat kuliner wajib coba:\n\n${listText}\n\nAda yang ingin Anda tanyakan lebih lanjut seputar kuliner atau penginapan terdekat?`
      });
    }

    // 3. Wisata Recommendation
    if (q.includes('wisata') || q.includes('jalan-jalan') || q.includes('candi') || q.includes('pantai') || q.includes('merapi') || q.includes('kraton') || q.includes('tamansari') || q.includes('tempat menarik')) {
      let filteredSpots = db.tourist_spots.filter(s => s.category === 'wisata');
      if (q.includes('malioboro')) filteredSpots = filteredSpots.filter(s => s.area.includes('Malioboro'));
      else if (q.includes('prawirotaman')) filteredSpots = filteredSpots.filter(s => s.area.includes('Prawirotaman'));
      else if (q.includes('sleman') || q.includes('kaliurang')) filteredSpots = filteredSpots.filter(s => s.area.includes('Sleman'));

      let listText = (filteredSpots.length > 0 ? filteredSpots : db.tourist_spots.filter(s => s.category === 'wisata')).slice(0, 3).map(s => {
        return `🏛️ **${s.name}** (${s.area})\n${s.description}\n📌 *${s.distance}*`;
      }).join('\n\n');

      return res.json({
        success: true,
        reply: `Berikut destinasi wisata unggulan di Yogyakarta untuk melengkapi kunjungan Anda:\n\n${listText}\n\nIngin tahu rekomendasi hotel atau homestay di sekitar destinasi tersebut?`
      });
    }

    // Default intelligent response for Jogja Travel
    res.json({
      success: true,
      reply: `Halo! Saya asisten virtual **StayYK**. Saya dapat membantu Anda dengan:\n1. **Rekomendasi Hotel Bintang 1 hingga 5**, Homestay, atau Apartemen di Jogja sesuai budget Anda.\n2. **Rekomendasi Kuliner Khas Jogja** (Gudeg Yu Djum, Kopi Klotok, Oseng Mercon, Sate Klatak, dll).\n3. **Destinasi Wisata Terdekat** di sekitar Malioboro, Prawirotaman, Sleman, maupun Kaliurang.\n\nContoh pertanyaan:\n- *"Rekomendasi hotel bintang 5 dekat Malioboro"* \n- *"Cari homestay murah di bawah 300 ribu di Prawirotaman"* \n- *"Kuliner malam enak dekat Stasiun Tugu"*`
    });

  } catch (err) {
    console.error('Error in chatbot route:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
