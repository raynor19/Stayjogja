const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/properties - Filter & Search Properties
router.get('/', (req, res) => {
  try {
    let results = [...db.properties];

    // Filter by approval status (only approved for public catalog, unless requested by owner/admin)
    if (req.query.status !== 'all') {
      results = results.filter(p => p.status_approval === 'approved');
    }

    // Filter by Type: hotel, homestay, apartemen
    if (req.query.type && req.query.type !== 'all') {
      const types = req.query.type.split(',').map(t => t.trim().toLowerCase());
      results = results.filter(p => types.includes(p.type.toLowerCase()));
    }

    // Filter by Hotel Stars: 1, 2, 3, 4, 5
    if (req.query.stars) {
      const starsArr = req.query.stars.split(',').map(s => parseInt(s.trim(), 10)).filter(s => !isNaN(s));
      if (starsArr.length > 0) {
        results = results.filter(p => {
          // If property is hotel, check if its star is in starsArr
          if (p.type === 'hotel') {
            return starsArr.includes(p.stars);
          }
          // If not hotel, check if user also selected other types
          return false;
        });
      }
    }

    // Filter by Area / Lokasi
    if (req.query.area && req.query.area !== 'all' && req.query.area !== '') {
      const areaKeyword = req.query.area.toLowerCase();
      results = results.filter(p => 
        p.area.toLowerCase().includes(areaKeyword) || 
        p.address.toLowerCase().includes(areaKeyword)
      );
    }

    // Search query keyword (name, description, area, address)
    if (req.query.search && req.query.search.trim() !== '') {
      const q = req.query.search.toLowerCase().trim();
      results = results.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }

    // Attach units & compute lowest price
    results = results.map(p => {
      const units = db.units.filter(u => u.property_id === p.id);
      const minPrice = units.length > 0 ? Math.min(...units.map(u => u.price)) : 0;
      return {
        ...p,
        units,
        min_price: minPrice
      };
    });

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

    // Filter by Facilities
    if (req.query.facilities) {
      const facs = req.query.facilities.split(',').map(f => f.trim().toLowerCase());
      results = results.filter(p => {
        const propFacs = (p.facilities || []).map(f => f.toLowerCase());
        return facs.every(f => propFacs.some(pf => pf.includes(f)));
      });
    }

    // Filter by Guest Capacity & Rooms
    if (req.query.capacity) {
      const reqCap = parseInt(req.query.capacity, 10);
      const reqRooms = parseInt(req.query.rooms, 10) || 1;
      if (!isNaN(reqCap) && reqCap > 0) {
        results = results.filter(p => {
          if (!p.units || p.units.length === 0) return true;
          const maxUnitCap = Math.max(...p.units.map(u => u.capacity || 2));
          return (maxUnitCap * reqRooms) >= reqCap;
        });
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
      // Default: rating and review count popularity
      results.sort((a, b) => ((b.rating || 0) * (b.review_count || 1)) - ((a.rating || 0) * (a.review_count || 1)));
    }

    res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/properties/:id - Detail Property
router.get('/:id', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    const units = db.units.filter(u => u.property_id === prop.id);
    
    // Ambil rekomendasi cerdas tempat sekitar hotel menggunakan Gemini AI (dengan fallback aman)
    const { getNearbyRecommendations } = require('../services/geminiService');
    const nearbySpots = await getNearbyRecommendations(prop);

    res.json({
      success: true,
      data: {
        ...prop,
        units,
        nearby_spots: nearbySpots
      }
    });
  } catch (err) {
    console.error('Error fetching property detail:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/properties/:id/nearby-ai - Refresh/Fetch Gemini AI Nearby Recommendations
router.get('/:id/nearby-ai', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    const forceRefresh = req.query.refresh === 'true';
    const { getNearbyRecommendations } = require('../services/geminiService');
    const spots = await getNearbyRecommendations(prop, { forceRefresh });

    res.json({
      success: true,
      property_id: prop.id,
      property_name: prop.name,
      data: spots
    });
  } catch (err) {
    console.error('Error fetching AI nearby spots:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat rekomendasi tempat sekitar hotel.' });
  }
});

// POST /api/properties/:id/itinerary - Buat Itinerary Liburan Cerdas berbasis Gemini AI
router.post('/:id/itinerary', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    const days = parseInt(req.body.days, 10) || 2;
    const preference = req.body.preference || 'semua';
    const { generateItineraryForProperty } = require('../services/geminiService');
    const itinerary = await generateItineraryForProperty(prop, { days, preference });

    res.json({
      success: true,
      data: itinerary
    });
  } catch (err) {
    console.error('Error generating property itinerary:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat itinerary perjalanan.' });
  }
});

// GET /api/properties/:id/itinerary
router.get('/:id/itinerary', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan' });
    }

    const days = parseInt(req.query.days, 10) || 2;
    const preference = req.query.preference || 'semua';
    const { generateItineraryForProperty } = require('../services/geminiService');
    const itinerary = await generateItineraryForProperty(prop, { days, preference });

    res.json({
      success: true,
      data: itinerary
    });
  } catch (err) {
    console.error('Error generating property itinerary:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat itinerary perjalanan.' });
  }
});

// POST /api/properties - Daftarkan Properti Baru (Mitra TERA Traveloka Style)
router.post('/', (req, res) => {
  try {
    const { 
      name, type, stars, address, area, postal_code, description, facilities, photos,
      pic_name, pic_phone, pic_email, gmaps_url,
      bank_name, bank_account, bank_holder, ktp_number,
      units, unit_name, unit_price, unit_stock, unit_capacity, unit_bed, unit_size, unit_facilities, unit_photo
    } = req.body;

    if (!name || !type || !address || !area) {
      return res.status(400).json({ success: false, message: 'Nama properti, tipe akomodasi, alamat, dan area wajib diisi.' });
    }

    const propId = `prop-${Date.now()}`;
    const propType = type.toLowerCase();
    const propStars = propType === 'hotel' ? (parseInt(stars, 10) || 3) : null;

    const defaultPhotos = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
    ];

    const propPhotos = Array.isArray(photos) && photos.length > 0 
      ? photos 
      : (photos && typeof photos === 'string' ? [photos] : defaultPhotos);

    const propFacilities = Array.isArray(facilities) 
      ? facilities 
      : (facilities ? facilities.split(',').map(f => f.trim()) : ['WiFi Gratis', 'AC', 'Resepsionis 24 Jam', 'Parkir Gratis']);

    // Find owner if owner_id not provided
    let resolvedOwnerId = req.body.owner_id || null;
    if (!resolvedOwnerId && pic_email) {
      const matchOwner = db.users.find(u => u.email && u.email.toLowerCase() === pic_email.toLowerCase().trim());
      if (matchOwner) resolvedOwnerId = matchOwner.id;
    }

    const newProp = {
      id: propId,
      owner_id: resolvedOwnerId,
      name,
      type: propType,
      stars: propStars,
      address,
      area,
      postal_code: postal_code || '',
      gmaps_url: (gmaps_url && typeof gmaps_url === 'string') ? gmaps_url.trim() : '',
      description: description || `Akomodasi ${name} berlokasi di kawasan ${area}, Yogyakarta.`,
      rating: 0,
      review_count: 0,
      facilities: propFacilities,
      photos: propPhotos,
      contact_pic: {
        name: pic_name || '',
        phone: pic_phone || '',
        email: pic_email || ''
      },
      payout_info: {
        bank_name: bank_name || '',
        bank_account: bank_account || '',
        bank_holder: bank_holder || '',
        ktp_number: ktp_number || ''
      },
      status_approval: 'pending', // Menunggu persetujuan Administrator
      deletion_requested: false,
      deletion_reason: null,
      created_at: new Date().toISOString()
    };

    db.properties.unshift(newProp);

    // Create room units
    if (Array.isArray(units) && units.length > 0) {
      units.forEach((u, idx) => {
        db.units.push({
          id: `unit-${propId}-${idx + 1}`,
          property_id: propId,
          name: u.name || 'Deluxe Room',
          price: parseFloat(u.price) || 450000,
          available_stock: parseInt(u.available_stock, 10) || 5,
          capacity: parseInt(u.capacity, 10) || 2,
          bed_type: u.bed_type || '1 King Bed',
          room_size: parseInt(u.room_size, 10) || 28,
          facilities: u.facilities || ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam', 'Air Panas', 'TV Layar Datar'],
          photos: u.photos || [propPhotos[0]]
        });
      });
    } else {
      // Default / Single room unit from form fields
      db.units.push({
        id: `unit-${propId}-1`,
        property_id: propId,
        name: unit_name || (propType === 'hotel' ? 'Deluxe Room' : (propType === 'homestay' ? 'Standard Homestay Room' : 'Studio Executive')),
        price: parseFloat(unit_price) || (propType === 'hotel' ? 550000 : 350000),
        available_stock: parseInt(unit_stock, 10) || 5,
        capacity: parseInt(unit_capacity, 10) || 2,
        bed_type: unit_bed || '1 King Bed',
        room_size: parseInt(unit_size, 10) || 28,
        facilities: Array.isArray(unit_facilities) ? unit_facilities : (unit_facilities ? unit_facilities.split(',').map(f => f.trim()) : ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam', 'Air Panas']),
        photos: unit_photo ? [unit_photo] : [propPhotos[0]]
      });
    }

    db.saveProperties();

    res.status(201).json({
      success: true,
      message: `Pendaftaran properti "${name}" berhasil dikirim! Menunggu verifikasi dan persetujuan dari Administrator StayYK.`,
      data: newProp
    });
  } catch (err) {
    console.error('Error adding property:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/properties/:id - Edit Seluruh Data Properti (Owner & Admin)
router.put('/:id', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }

    const {
      name, type, stars, address, area, postal_code, description, facilities, photos,
      contact_pic, payout_info, units, gmaps_url
    } = req.body;

    if (name) prop.name = name.trim();
    if (type) prop.type = type.toLowerCase();
    if (stars !== undefined) prop.stars = prop.type === 'hotel' ? (parseInt(stars, 10) || 3) : null;
    if (address) prop.address = address.trim();
    if (area) prop.area = area.trim();
    if (postal_code) prop.postal_code = postal_code.trim();
    if (gmaps_url !== undefined) prop.gmaps_url = typeof gmaps_url === 'string' ? gmaps_url.trim() : '';
    if (description !== undefined) prop.description = description.trim();
    if (facilities && Array.isArray(facilities)) prop.facilities = facilities;
    if (photos && Array.isArray(photos) && photos.length > 0) prop.photos = photos;

    if (contact_pic) {
      prop.contact_pic = { ...prop.contact_pic, ...contact_pic };
    }
    if (payout_info) {
      prop.payout_info = { ...prop.payout_info, ...payout_info };
    }

    // Update room units if provided
    if (Array.isArray(units) && units.length > 0) {
      // Remove existing units of this property
      db.units = db.units.filter(u => u.property_id !== prop.id);
      // Re-add updated units
      units.forEach((u, idx) => {
        db.units.push({
          id: u.id || `unit-${prop.id}-${idx + 1}`,
          property_id: prop.id,
          name: u.name || `Tipe Kamar ${idx + 1}`,
          price: parseFloat(u.price) || 450000,
          available_stock: parseInt(u.available_stock, 10) || 5,
          capacity: parseInt(u.capacity, 10) || 2,
          bed_type: u.bed_type || '1 King Bed',
          room_size: parseInt(u.room_size, 10) || 28,
          facilities: Array.isArray(u.facilities) ? u.facilities : ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam', 'Air Panas'],
          photos: Array.isArray(u.photos) && u.photos.length > 0 ? u.photos : prop.photos
        });
      });
    }

    db.saveProperties();

    res.json({
      success: true,
      message: `Data properti "${prop.name}" berhasil diperbarui.`,
      data: {
        ...prop,
        units: db.units.filter(u => u.property_id === prop.id)
      }
    });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/properties/:id/request-delete - Owner Mengajukan Penghapusan Properti ke Admin
router.post('/:id/request-delete', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }

    // Jika properti belum disetujui (masih pending atau rejected), owner bisa membatalkan/menghapus langsung
    if (prop.status_approval === 'pending' || prop.status_approval === 'rejected') {
      const propName = prop.name;
      db.properties = db.properties.filter(p => p.id !== prop.id);
      db.units = db.units.filter(u => u.property_id !== prop.id);
      db.saveProperties();
      return res.json({
        success: true,
        message: `Pendaftaran properti "${propName}" yang belum tayang berhasil dibatalkan dan dihapus.`
      });
    }

    // Jika sudah approved/tayang, beri tanda deletion_requested untuk diverifikasi Admin
    prop.deletion_requested = true;
    prop.deletion_reason = req.body.reason || 'Permintaan penghapusan properti oleh mitra pemilik.';
    prop.deletion_requested_at = new Date().toISOString();
    db.saveProperties();

    // Trigger notifikasi owner
    db.addNotification({
      type: 'deletion_requested',
      title: 'Permohonan Hapus Hotel Dikirim',
      message: `Permohonan penghapusan hotel "${prop.name}" telah dikirim ke Administrator StayYK dengan alasan: "${prop.deletion_reason}". Status saat ini: Menunggu persetujuan admin.`,
      property_id: prop.id,
      property_name: prop.name,
      read: false
    });

    res.json({
      success: true,
      message: `Permintaan penghapusan properti "${prop.name}" telah diajukan ke Administrator StayYK untuk disetujui.`
    });
  } catch (err) {
    console.error('Error requesting property deletion:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/properties/:id/cancel-delete-request - Owner Membatalkan Permintaan Hapus Properti
router.post('/:id/cancel-delete-request', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }

    prop.deletion_requested = false;
    prop.deletion_reason = null;
    prop.deletion_requested_at = null;
    db.saveProperties();

    // Trigger notifikasi owner
    db.addNotification({
      type: 'deletion_canceled',
      title: 'Pengajuan Hapus Dibatalkan',
      message: `Pengajuan penghapusan untuk hotel "${prop.name}" telah berhasil dibatalkan. Akomodasi tetap aktif beroperasi di katalog StayYK.`,
      property_id: prop.id,
      property_name: prop.name,
      read: false
    });

    res.json({
      success: true,
      message: `Pengajuan penghapusan properti "${prop.name}" berhasil dibatalkan. Akomodasi tetap aktif di sistem.`
    });
  } catch (err) {
    console.error('Error canceling deletion request:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/properties/upload-image - Upload Image to Supabase Storage Bucket
router.post('/upload-image', async (req, res) => {
  try {
    const { imageBase64, fileName, contentType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Data gambar wajib disertakan.' });
    }
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const publicUrl = await db.uploadImage(buffer, fileName || 'property-photo.jpg', contentType || 'image/jpeg');
    if (!publicUrl) {
      return res.status(500).json({ success: false, message: 'Gagal mengunggah foto ke Supabase Storage.' });
    }
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses gambar.' });
  }
});

// DELETE /api/properties/:id - Hapus Properti Langsung (Admin & Owner)
router.delete('/:id', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }

    const propName = prop.name;
    await db.deleteProperty(req.params.id);

    res.json({
      success: true,
      message: `Properti "${propName}" dan seluruh unit kamarnya berhasil dihapus permanen dari sistem.`
    });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/properties/units/:unitId - Update Harga & Stok Kamar (Owner)
router.put('/units/:unitId', (req, res) => {
  try {
    const unit = db.units.find(u => u.id === req.params.unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit kamar tidak ditemukan.' });
    }

    if (req.body.price !== undefined) unit.price = parseFloat(req.body.price);
    if (req.body.available_stock !== undefined) unit.available_stock = parseInt(req.body.available_stock, 10);
    if (req.body.name !== undefined) unit.name = req.body.name;

    db.saveProperties();
    res.json({
      success: true,
      message: 'Data kamar/unit berhasil diperbarui.',
      data: unit
    });
  } catch (err) {
    console.error('Error updating unit:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/properties/units/:unitId - Hapus Tipe Kamar / Unit Tertentu (Owner & Admin)
router.delete('/units/:unitId', async (req, res) => {
  try {
    const unit = db.units.find(u => u.id === req.params.unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit kamar tidak ditemukan.' });
    }

    // Check remaining units of this property
    const propUnits = db.units.filter(u => u.property_id === unit.property_id);
    if (propUnits.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Akomodasi harus memiliki minimal satu tipe kamar. Tidak dapat menghapus kamar terakhir.'
      });
    }

    const unitName = unit.name;
    await db.deleteUnit(req.params.unitId);

    res.json({
      success: true,
      message: `Tipe kamar "${unitName}" berhasil dihapus. Total kamar berkurang.`,
      totalUnits: db.units.length
    });
  } catch (err) {
    console.error('Error deleting unit:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;


