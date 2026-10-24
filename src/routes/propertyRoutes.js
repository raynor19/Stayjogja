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

    // Filter by Owner ID (Khusus Dashboard Owner - Isolasi Ketat)
    if (req.query.owner_id && req.query.owner_id !== 'all') {
      results = results.filter(p => p.owner_id === req.query.owner_id);
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

    let units = db.units.filter(u => u.property_id === prop.id);
    if (units.length === 0 && Array.isArray(prop.rooms) && prop.rooms.length > 0) {
      units = prop.rooms.map((r, idx) => ({
        id: r.id || `unit-${prop.id}-${idx}`,
        property_id: prop.id,
        name: r.name || 'Standard Room',
        price: r.price_per_night || prop.starting_price || 350000,
        available_stock: r.stock || 3,
        capacity: r.capacity || 2,
        bed_type: r.bed_type || '1 King Bed',
        room_size: r.room_size || 32,
        facilities: parseArrayField(r.facilities || ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam']),
        photos: parseArrayField(r.images || prop.images || prop.photos)
      }));
    }

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

// POST /api/properties - Tambah Properti Baru (Owner / TERA)
router.post('/', async (req, res) => {
  try {
    const { name, area, address, type, stars, description, facilities, photos, owner_id } = req.body;
    if (!name || !area) {
      return res.status(400).json({ success: false, message: 'Nama dan Area properti wajib diisi' });
    }

    const newId = `prop-${Date.now()}`;
    const newProp = {
      id: newId,
      name: name.trim(),
      area: area.trim(),
      address: address ? address.trim() : 'Yogyakarta',
      type: type || 'hotel',
      stars: parseInt(stars, 10) || 3,
      description: description || '',
      facilities: parseArrayField(facilities || ['WiFi', 'AC']),
      photos: parseArrayField(photos || ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']),
      images: parseArrayField(photos || ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']),
      status_approval: 'pending', // Menunggu persetujuan Admin
      owner_id: owner_id || 'own-001',
      rating: 4.8,
      total_reviews: 0,
      starting_price: 350000,
      min_price: 350000,
      created_at: new Date().toISOString()
    };

    db.properties.unshift(newProp);
    await db.saveProperties();

    // Beri notifikasi ke Admin
    await db.addNotification({
      type: 'property_created',
      title: 'Properti Baru Didaftarkan',
      message: `Owner mendaftarkan properti "${newProp.name}" di ${newProp.area}. Menunggu verifikasi.`,
      target_id: newProp.id
    });

    res.status(201).json({
      success: true,
      message: 'Properti berhasil didaftarkan dan menunggu verifikasi admin',
      data: newProp
    });
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat properti baru' });
  }
});

// PUT /api/properties/:id - Edit Properti (Owner)
router.put('/:id', async (req, res) => {
  try {
    const propIdx = db.properties.findIndex(p => p.id === req.params.id);
    if (propIdx === -1) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    const existing = db.properties[propIdx];
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id, // ID tidak boleh berubah
      facilities: req.body.facilities ? parseArrayField(req.body.facilities) : existing.facilities,
      photos: req.body.photos ? parseArrayField(req.body.photos) : existing.photos,
      images: req.body.photos ? parseArrayField(req.body.photos) : (existing.images || existing.photos),
      updated_at: new Date().toISOString()
    };

    db.properties[propIdx] = updated;
    await db.saveProperties();

    res.json({
      success: true,
      message: 'Informasi properti berhasil diperbarui',
      data: updated
    });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui properti' });
  }
});

// POST /api/properties/:id/request-delete - Pengajuan Hapus Properti ke Admin
router.post('/:id/request-delete', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    prop.status_deletion = 'pending_deletion';
    prop.deletion_requested_at = new Date().toISOString();
    prop.deletion_reason = req.body.reason || 'Permintaan pemilik properti';
    await db.saveProperties();

    await db.addNotification({
      type: 'property_delete_requested',
      title: 'Pengajuan Hapus Properti',
      message: `Owner mengajukan penghapusan properti "${prop.name}".`,
      target_id: prop.id
    });

    res.json({
      success: true,
      message: 'Pengajuan penghapusan properti telah dikirim ke admin StayJogja',
      data: prop
    });
  } catch (err) {
    console.error('Error requesting property deletion:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses pengajuan penghapusan' });
  }
});

// PUT /api/properties/units/:unitId - Update Unit Kamar
router.put('/units/:unitId', async (req, res) => {
  try {
    const unitIdx = db.units.findIndex(u => u.id === req.params.unitId);
    if (unitIdx === -1) {
      return res.status(404).json({ success: false, message: 'Unit kamar tidak ditemukan' });
    }

    const existingUnit = db.units[unitIdx];
    const updatedUnit = {
      ...existingUnit,
      ...req.body,
      id: existingUnit.id,
      property_id: existingUnit.property_id
    };

    db.units[unitIdx] = updatedUnit;
    await db.saveProperties();

    res.json({
      success: true,
      message: 'Unit kamar berhasil diperbarui',
      data: updatedUnit
    });
  } catch (err) {
    console.error('Error updating unit:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui unit kamar' });
  }
});

// DELETE /api/properties/units/:unitId - Hapus Unit Kamar
router.delete('/units/:unitId', async (req, res) => {
  try {
    const unitIdx = db.units.findIndex(u => u.id === req.params.unitId);
    if (unitIdx === -1) {
      return res.status(404).json({ success: false, message: 'Unit kamar tidak ditemukan' });
    }

    db.units.splice(unitIdx, 1);
    await db.saveProperties();

    res.json({
      success: true,
      message: 'Unit kamar berhasil dihapus'
    });
  } catch (err) {
    console.error('Error deleting unit:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus unit kamar' });
  }
});

module.exports = router;
