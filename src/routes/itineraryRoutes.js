const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * Simpan Itinerary Liburan Cerdas AI ke Akun Pengguna
 * POST /api/itineraries/save
 */
router.post('/save', (req, res) => {
  try {
    const { user_id, property_id, property_name, property_image, trip_title, days_count, preference, itinerary } = req.body;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'Silakan login terlebih dahulu untuk menyimpan rencana perjalanan ke akun Anda.'
      });
    }

    if (!itinerary || !itinerary.days) {
      return res.status(400).json({
        success: false,
        message: 'Format data itinerary tidak valid.'
      });
    }

    const newRecord = db.addItinerary({
      user_id: String(user_id),
      property_id: property_id || null,
      property_name: property_name || (itinerary.hotel_base || 'Penginapan di Jogja'),
      property_image: property_image || null,
      trip_title: trip_title || itinerary.trip_title || 'Rencana Liburan Istimewa Jogja',
      days_count: parseInt(days_count, 10) || (itinerary.days ? itinerary.days.length : 2),
      preference: preference || itinerary.preference || 'semua',
      itinerary_data: itinerary,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Rencana perjalanan liburan berhasil disimpan ke akun Anda!',
      data: newRecord
    });
  } catch (err) {
    console.error('[ItineraryRoutes] Error saving itinerary:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan rencana perjalanan.' });
  }
});

/**
 * Ambil Seluruh Itinerary yang Disimpan oleh Pengguna
 * GET /api/itineraries/user/:userId
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const items = db.getItinerariesByUser(userId);
    res.json({
      success: true,
      total: items.length,
      data: items
    });
  } catch (err) {
    console.error('[ItineraryRoutes] Error fetching user itineraries:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat itinerary tersimpan.' });
  }
});

/**
 * Hapus Itinerary Tersimpan
 * DELETE /api/itineraries/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    const deleted = db.deleteItinerary(id, user_id);

    if (deleted) {
      res.json({ success: true, message: 'Rencana perjalanan berhasil dihapus.' });
    } else {
      res.status(404).json({ success: false, message: 'Itinerary tidak ditemukan.' });
    }
  } catch (err) {
    console.error('[ItineraryRoutes] Error deleting itinerary:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus itinerary.' });
  }
});

module.exports = router;
