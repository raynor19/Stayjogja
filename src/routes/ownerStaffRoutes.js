const express = require('express');
const router = express.Router();
const db = require('../config/database');
const firestore = require('../config/firestoreClient');

// GET /api/owner/staff - Ambil daftar staf resepsionis milik owner
router.get('/', async (req, res) => {
  try {
    const ownerId = req.query.owner_id || 'own-001';

    // Filter resepsionis yang dibuat oleh owner ini
    const staffList = db.users.filter(u => 
      u.role === 'resepsionis' && (u.created_by_owner_id === ownerId || !u.created_by_owner_id)
    ).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      assigned_hotel_id: u.assigned_hotel_id || 'htl-tentrem',
      assigned_hotel_name: u.assigned_hotel_name || 'Hotel Tentrem Yogyakarta',
      status: u.status || 'active',
      created_at: u.created_at || new Date().toISOString()
    }));

    res.json({
      success: true,
      total: staffList.length,
      data: staffList
    });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat staf resepsionis.' });
  }
});

// POST /api/owner/staff - Owner mendaftarkan akun Resepsionis baru untuk salah satu hotelnya
router.post('/', async (req, res) => {
  try {
    const { owner_id, hotel_id, name, email, password, phone } = req.body;

    if (!hotel_id || !name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hotel penugasan, nama staf, email login, dan kata sandi wajib diisi.' 
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPassword = String(password).trim();

    // Verifikasi bahwa hotel tersebut ada
    const targetHotel = db.properties.find(p => p.id === hotel_id);
    if (!targetHotel) {
      return res.status(404).json({ success: false, message: 'Hotel penugasan tidak ditemukan.' });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = db.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email tersebut sudah terdaftar di sistem.' });
    }

    const newStaff = {
      id: `usr-rec-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: 'resepsionis',
      phone: phone ? String(phone).trim() : '',
      assigned_hotel_id: targetHotel.id,
      assigned_hotel_name: targetHotel.name,
      created_by_owner_id: owner_id || 'own-001',
      status: 'active',
      created_at: new Date().toISOString()
    };

    // Simpan ke memori lokal & simpan langsung ke Cloud Firestore
    db.users.push(newStaff);
    await firestore.setDocument('users', newStaff.id, newStaff);

    console.log(`[Owner Staff] ✅ Resepsionis baru dibuat: ${newStaff.name} (${newStaff.email}) terikat ke ${targetHotel.name}`);

    res.status(201).json({
      success: true,
      message: `Akun resepsionis untuk "${targetHotel.name}" berhasil dibuat!`,
      data: {
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        assigned_hotel_id: newStaff.assigned_hotel_id,
        assigned_hotel_name: newStaff.assigned_hotel_name
      }
    });
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat akun resepsionis.' });
  }
});

// DELETE /api/owner/staff/:id - Hapus akun resepsionis
router.delete('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const idx = db.users.findIndex(u => u.id === staffId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Staf tidak ditemukan.' });
    }

    db.users.splice(idx, 1);
    await firestore.deleteDocument('users', staffId);

    res.json({ success: true, message: 'Akun resepsionis berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus akun resepsionis.' });
  }
});

module.exports = router;
