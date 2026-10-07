const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/admin/overview
router.get('/overview', (req, res) => {
  try {
    const totalUsers = db.users.length;
    const totalProperties = db.properties.length;
    const totalUnits = db.units.length;
    const totalReservations = db.reservations.length;

    const confirmedReservations = db.reservations.filter(r => r.status === 'terkonfirmasi' || r.status === 'selesai');
    const grossRevenue = confirmedReservations.reduce((sum, r) => sum + (r.total_price || 0), 0);

    const pendingProperties = db.properties.filter(p => p.status_approval === 'pending');
    const pendingReservations = db.reservations.filter(r => r.status === 'menunggu_acc');
    const deletionRequests = db.properties.filter(p => p.deletion_requested === true);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProperties,
          totalUnits,
          totalReservations,
          grossRevenue,
          pendingPropertiesCount: pendingProperties.length,
          pendingReservationsCount: pendingReservations.length,
          deletionRequestsCount: deletionRequests.length
        },
        recentReservations: db.reservations.slice(0, 10),
        pendingProperties,
        deletionRequests
      }
    });
  } catch (err) {
    console.error('Error fetching admin overview:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/properties/:id/approve - Setujui Pengajuan Properti Baru
router.post('/properties/:id/approve', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }
    prop.status_approval = 'approved';
    db.saveProperties();

    // Trigger notifikasi untuk owner
    db.addNotification({
      type: 'property_approved',
      title: 'Pendaftaran Hotel Diterima & Disetujui!',
      message: `Selamat! Pendaftaran hotel "${prop.name}" telah disetujui oleh Administrator StayYK. Sekarang akomodasi Anda aktif tayang di katalog dan dapat dipesan oleh tamu.`,
      property_id: prop.id,
      property_name: prop.name,
      read: false
    });

    res.json({ success: true, message: `Properti "${prop.name}" berhasil disetujui untuk tayang di katalog publik.` });
  } catch (err) {
    console.error('Error approving property:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/properties/:id/reject - Tolak Pengajuan Properti
router.post('/properties/:id/reject', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }
    prop.status_approval = 'rejected';
    db.saveProperties();

    // Trigger notifikasi untuk owner
    db.addNotification({
      type: 'property_rejected',
      title: 'Pendaftaran Hotel Ditolak Admin',
      message: `Pendaftaran hotel "${prop.name}" belum disetujui oleh Administrator. Silakan periksa kelengkapan data akomodasi Anda atau ajukan kembali.`,
      property_id: prop.id,
      property_name: prop.name,
      read: false
    });

    res.json({ success: true, message: `Pengajuan properti "${prop.name}" telah ditolak.` });
  } catch (err) {
    console.error('Error rejecting property:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/properties/:id/approve-delete - Setujui Permintaan Hapus dari Owner
router.post('/properties/:id/approve-delete', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }
    const propName = prop.name;
    await db.deleteProperty(req.params.id);

    // Trigger notifikasi untuk owner
    db.addNotification({
      type: 'deletion_approved',
      title: 'Penghapusan Hotel Telah Disetujui Admin',
      message: `Permintaan penghapusan hotel "${propName}" telah disetujui oleh Administrator StayYK. Data hotel dan unit kamar telah resmi dihapus dari sistem.`,
      property_name: propName,
      read: false
    });

    res.json({
      success: true,
      message: `Permintaan penghapusan disetujui. Properti "${propName}" telah dihapus permanen.`
    });
  } catch (err) {
    console.error('Error approving deletion:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/properties/:id/reject-delete - Tolak Permintaan Hapus dari Owner
router.post('/properties/:id/reject-delete', (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }
    prop.deletion_requested = false;
    prop.deletion_reason = null;
    db.saveProperties();

    // Trigger notifikasi untuk owner
    db.addNotification({
      type: 'deletion_rejected',
      title: 'Permintaan Hapus Hotel Ditolak Admin',
      message: `Permintaan penghapusan hotel "${prop.name}" telah ditolak oleh Administrator. Hotel Anda tetap beroperasi aktif di katalog StayYK.`,
      property_id: prop.id,
      property_name: prop.name,
      read: false
    });

    res.json({
      success: true,
      message: `Permintaan penghapusan properti "${prop.name}" telah ditolak. Properti tetap aktif di katalog.`
    });
  } catch (err) {
    console.error('Error rejecting deletion:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/admin/properties/:id - Hapus Properti Langsung oleh Admin
router.delete('/properties/:id', async (req, res) => {
  try {
    const prop = db.properties.find(p => p.id === req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Properti tidak ditemukan.' });
    }
    const propName = prop.name;
    await db.deleteProperty(req.params.id);
    res.json({
      success: true,
      message: `Properti "${propName}" dan seluruh unit kamarnya berhasil dihapus permanen oleh Administrator.`
    });
  } catch (err) {
    console.error('Error deleting property by admin:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/tourist-spots
router.get('/tourist-spots', (req, res) => {
  res.json({ success: true, data: db.tourist_spots });
});

// POST /api/admin/tourist-spots
router.post('/tourist-spots', (req, res) => {
  try {
    const { name, area, category, description, distance, tags } = req.body;
    if (!name || !area || !category) {
      return res.status(400).json({ success: false, message: 'Nama, area, dan kategori wajib diisi.' });
    }
    const newSpot = {
      id: `spot-${Date.now()}`,
      name,
      area,
      category,
      description: description || '',
      distance: distance || '',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : [])
    };
    db.tourist_spots.push(newSpot);
    res.status(201).json({ success: true, message: 'Spot wisata/kuliner berhasil ditambahkan.', data: newSpot });
  } catch (err) {
    console.error('Error adding tourist spot:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==========================================
// 1. MODUL BAGI HASIL & KOMISI 5% (FINANCE)
// ==========================================

// GET /api/admin/finance - Rekapitulasi Pembagian Hasil 95% Owner & 5% Platform
router.get('/finance', (req, res) => {
  try {
    // Ambil semua transaksi yang sudah dibayar tamu (terkonfirmasi, selesai, atau menunggu acc owner)
    const paidReservations = db.reservations.filter(r => 
      ['terkonfirmasi', 'selesai', 'menunggu_acc'].includes(r.status)
    );

    const grossVolume = paidReservations.reduce((acc, r) => acc + (r.total_price || 0), 0);
    const platformCommissionTotal = Math.round(grossVolume * 0.05); // 5% komisi platform
    const ownerNetTotal = grossVolume - platformCommissionTotal;    // 95% hak bersih mitra

    const settlements = paidReservations.map(r => {
      const prop = db.properties.find(p => p.id === r.property_id);
      const owner = prop ? db.users.find(u => u.id === prop.owner_id) : null;
      
      const totalPrice = r.total_price || 0;
      const platformFee = Math.round(totalPrice * 0.05);
      const ownerNet = totalPrice - platformFee;

      return {
        id: r.id,
        booking_code: r.booking_code,
        property_id: r.property_id,
        property_name: r.property_name || (prop ? prop.name : 'Akomodasi'),
        property_type: prop ? prop.type : 'hotel',
        owner_name: owner ? owner.name : (prop?.contact_pic?.name || 'Mitra Pemilik'),
        owner_phone: owner ? owner.phone : (prop?.contact_pic?.phone || '-'),
        owner_bank: prop?.bank_account || {
          bank: 'BCA / Mandiri',
          number: '8410294821',
          holder: owner ? owner.name : 'Mitra Pemilik'
        },
        guest_name: r.guest_name,
        created_at: r.created_at || r.check_in,
        check_in: r.check_in,
        check_out: r.check_out,
        nights: r.nights || 1,
        total_price: totalPrice,
        platform_fee: platformFee, // 5%
        owner_net: ownerNet,       // 95%
        settlement_status: r.settlement_status || 'menunggu', // 'menunggu' | 'selesai'
        settled_at: r.settled_at || null
      };
    });

    const pendingCount = settlements.filter(s => s.settlement_status !== 'selesai').length;
    const settledCount = settlements.filter(s => s.settlement_status === 'selesai').length;

    res.json({
      success: true,
      data: {
        summary: {
          grossVolume,
          platformCommissionTotal,
          ownerNetTotal,
          totalPaidBookings: paidReservations.length,
          pendingCount,
          settledCount
        },
        settlements
      }
    });
  } catch (err) {
    console.error('Error fetching admin finance:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/finance/settle/:id - Tandai Pencairan Dana ke Rekening Pemilik Telah Ditransfer
router.post('/finance/settle/:id', (req, res) => {
  try {
    const reservation = db.reservations.find(r => r.id === req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservasi tidak ditemukan.' });
    }

    const currentStatus = reservation.settlement_status || 'menunggu';
    const newStatus = currentStatus === 'selesai' ? 'menunggu' : 'selesai';
    reservation.settlement_status = newStatus;
    reservation.settled_at = newStatus === 'selesai' ? new Date().toISOString() : null;

    db.saveReservations();

    if (newStatus === 'selesai') {
      const netAmount = reservation.total_price - Math.round(reservation.total_price * 0.05);
      db.addNotification({
        type: 'payout_transferred',
        title: 'Bagi Hasil 95% Ditransfer ke Rekening Mitra!',
        message: `Hak bersih booking #${reservation.booking_code} sebesar Rp ${netAmount.toLocaleString('id-ID')} telah sukses ditransfer ke rekening pemilik (${reservation.property_name}).`,
        property_name: reservation.property_name,
        read: false
      });
    }

    res.json({
      success: true,
      message: newStatus === 'selesai'
        ? `Settlement dana bagi hasil (95%) untuk booking ${reservation.booking_code} ditandai SUDAH DITRANSFER.`
        : `Status pencairan booking ${reservation.booking_code} dikembalikan ke MENUNGGU.`,
      data: {
        id: reservation.id,
        settlement_status: reservation.settlement_status,
        settled_at: reservation.settled_at
      }
    });
  } catch (err) {
    console.error('Error updating settlement status:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==========================================
// 2. MODUL MANAJEMEN AKUN PENGGUNA (USERS)
// ==========================================

// GET /api/admin/users - Daftar Semua Akun Terdaftar
router.get('/users', (req, res) => {
  try {
    const safeUsers = db.users.map(u => {
      // Hitung aktivitas akun
      let activityMeta = {};
      if (u.role === 'user') {
        const userBookings = db.reservations.filter(r => r.user_id === u.id);
        activityMeta = {
          totalBookings: userBookings.length,
          lastBooking: userBookings.length > 0 ? userBookings[userBookings.length - 1].booking_code : '-'
        };
      } else if (u.role === 'owner') {
        const ownedProps = db.properties.filter(p => p.owner_id === u.id);
        const propIds = ownedProps.map(p => p.id);
        const ownerBookings = db.reservations.filter(r => propIds.includes(r.property_id) && ['terkonfirmasi', 'selesai_checkin', 'aktif'].includes(r.status));
        const totalRevenue = ownerBookings.reduce((sum, b) => {
          let val = b.total_price || 0;
          if (b.settlement_status === 'selesai') val = val - Math.round(val * 0.05);
          return sum + val;
        }, 0);
        activityMeta = {
          totalProperties: ownedProps.length,
          propertyNames: ownedProps.map(p => p.name).join(', '),
          totalRevenue: totalRevenue
        };
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone || '-',
        status: u.status || 'active',
        created_at: u.created_at || new Date().toISOString(),
        activity: activityMeta
      };
    });

    res.json({
      success: true,
      data: safeUsers
    });
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/toggle-status - Nonaktifkan / Aktifkan Akun Pengguna
router.post('/users/:id/toggle-status', (req, res) => {
  try {
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (user.role === 'admin' && user.id === 'adm-001') {
      return res.status(400).json({ success: false, message: 'Akun Super Administrator Utama tidak dapat dinonaktifkan.' });
    }

    user.status = user.status === 'suspended' ? 'active' : 'suspended';
    db.saveUsers();

    res.json({
      success: true,
      message: `Akun ${user.name} (${user.email}) berhasil ${user.status === 'active' ? 'diaktifkan kembali' : 'ditangguhkan (suspend)'}.`,
      data: {
        id: user.id,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
