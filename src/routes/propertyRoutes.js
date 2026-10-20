const express = require('express');
const router = express.Router();
const db = require('../config/database');

function parseArrayField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      return [val];
    }
  }
  return [];
}

// GET /api/properties - Filter & Search Properties
router.get('/', (req, res) => {
  try {
    let results = db.properties.map(p => {
      // Harmonisasikan nama field antara Firestore & Frontend Web
      const photos = parseArrayField(p.photos || p.images);
      if (photos.length === 0) {
        photos.push('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80');
      }

      const facilities = parseArrayField(p.facilities);
      const units = db.units.filter(u => u.property_id === p.id);
      
      let minPrice = p.starting_price || p.min_price || 350000;
      if (units.length > 0) {
        const unitPrices = units.map(u => u.price).filter(pr => pr && pr > 0);
        if (unitPrices.length > 0) minPrice = Math.min(...unitPrices);
      }

      return {
        ...p,
        name: p.name || 'Hotel di Yogyakarta',
        type: p.type || 'hotel',
        stars: p.star || p.stars || 4,
        status_approval: p.status_approval || 'approved',
        photos,
        images: photos,
        facilities: facilities.length > 0 ? facilities : ['WiFi Gratis', 'AC', 'Resepsionis 24 Jam'],
        units,
        min_price: minPrice,
        rating: p.rating || 4.7,
        review_count: p.total_reviews || p.review_count || 320,
      };
    });

    // Filter by approval status
    if (req.query.status !== 'all') {
      results = results.filter(p => p.status_approval === 'approved');
    }

    // Filter by Type: hotel, homestay, apartemen
    if (req.query.type && req.query.type !== 'all') {
      const types = req.query.type.split(',').map(t => t.trim().toLowerCase());
      results = results.filter(p => types.includes((p.type || 'hotel').toLowerCase()));
    }

    // Filter by Hotel Stars: 1, 2, 3, 4, 5
    if (req.query.stars) {
      const starsArr = req.query.stars.split(',').map(s => parseInt(s.trim(), 10)).filter(s => !isNaN(s));
      if (starsArr.length > 0) {
        results = results.filter(p => starsArr.includes(p.stars));
      }
    }

    // Filter by Area / Lokasi
    if (req.query.area && req.query.area !== 'all' && req.query.area !== '') {
      const areaKeyword = req.query.area.toLowerCase().trim();
      results = results.filter(p => 
        (p.area && p.area.toLowerCase().includes(areaKeyword)) || 
        (p.address && p.address.toLowerCase().includes(areaKeyword))
      );
    }

    // Search query keyword (name, description, area, address)
    if (req.query.search && req.query.search.trim() !== '') {
      const q = req.query.search.toLowerCase().trim();
      results = results.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.area && p.area.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
      );
    }

    // Filter by Price Range
    if (req.query.minPrice) {
      const minP = parseInt(req.query.minPrice, 10);
      if (!isNaN(minP)) {
        results = results.filter(p => p.min_price >= minP);
      }
    }

    if (req.query.maxPrice) {
      const maxP = parseInt(req.query.maxPrice, 10);
      if (!isNaN(maxP)) {
        results = results.filter(p => p.min_price <= maxP);
      }
    }

    // Sorting
    const sort = req.query.sort || 'popular';
    if (sort === 'price_asc') {
      results.sort((a, b) => a.min_price - b.min_price);
    } else if (sort === 'price_desc') {
      results.sort((a, b) => b.min_price - a.min_price);
    } else if (sort === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      results.sort((a, b) => ((b.rating || 0) * (b.review_count || 1)) - ((a.rating || 0) * (a.review_count || 1)));
    }

    res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data properti' });
  }
});

// GET /api/properties/:id - Detail Property
router.get('/:id', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    const units = db.units.filter(u => u.property_id === prop.id);
    const photos = parseArrayField(prop.photos || prop.images);
    if (photos.length === 0) {
      photos.push('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80');
    }

    res.json({
      success: true,
      data: {
        ...prop,
        photos,
        images: photos,
        facilities: parseArrayField(prop.facilities),
        units
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail properti' });
  }
});

module.exports = router;
