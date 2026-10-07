const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const user = db.users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email tidak terdaftar.' });
    }

    // Check password
    if (user.password !== cleanPassword) {
      return res.status(401).json({ success: false, message: 'Password salah.' });
    }

    // Check account status
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Akun Anda telah ditangguhkan/dinonaktifkan oleh Administrator. Hubungi bantuan untuk informasi lebih lanjut.' });
    }

    // Determine redirect URL based on role
    let redirectTo = '/tamu';
    if (user.role === 'owner') redirectTo = '/owner';
    else if (user.role === 'admin') redirectTo = '/admin';

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || ''
    };

    res.json({
      success: true,
      message: `Selamat datang, ${user.name}!`,
      user: userData,
      redirectTo
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi.' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const exists = db.users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
    }

    const validRole = (role === 'owner') ? 'owner' : 'user';

    const newUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: validRole,
      phone: phone ? String(phone).trim() : '',
      status: 'active',
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    db.saveUsers(); // Simpan ke Supabase

    let redirectTo = validRole === 'owner' ? '/owner' : '/tamu';

    res.status(201).json({
      success: true,
      message: `Registrasi berhasil! Akun Anda aktif sebagai ${validRole === 'owner' ? 'Pemilik Akomodasi' : 'Tamu'}.`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone
      },
      redirectTo
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/auth/demo-accounts (Dynamically loaded from real Supabase accounts)
router.get('/demo-accounts', (req, res) => {
  const user = db.users.find(u => u.role === 'user');
  const owner = db.users.find(u => u.role === 'owner');
  const admin = db.users.find(u => u.role === 'admin');

  const data = [];
  if (user) {
    data.push({
      role: 'user',
      label: `Tamu (${user.name})`,
      email: user.email,
      password: user.password,
      description: 'Mencari hotel bintang 1-5, homestay, apartemen & invoice pemesanan resmi'
    });
  }
  if (owner) {
    data.push({
      role: 'owner',
      label: `Pemilik Akomodasi (${owner.name})`,
      email: owner.email,
      password: owner.password,
      description: 'Kelola reservasi masuk yang sudah dibayar (ACC), edit tarif & unit kamar'
    });
  }
  if (admin) {
    data.push({
      role: 'admin',
      label: `Administrator (${admin.name})`,
      email: admin.email,
      password: admin.password,
      description: 'Audit transaksi global, moderasi properti baru, knowledge base chatbot'
    });
  }

  res.json({
    success: true,
    data
  });
});

// GET /api/auth/config (Client Supabase configuration)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    supabaseUrl: process.env.SUPABASE_URL || 'https://dbhvkxoooxwmssrhfwhh.supabase.co',
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ''
  });
});

// POST /api/auth/google (Google Sign-In)
router.post('/google', async (req, res) => {
  try {
    const { email, name, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email akun Google tidak ditemukan.' });
    }

    const userEmail = String(email).trim().toLowerCase();
    const userName = name ? String(name).trim() : userEmail.split('@')[0];

    let user = db.users.find(u => u.email.toLowerCase() === userEmail);

    if (!user) {
      user = {
        id: `usr-google-${Date.now()}`,
        name: userName,
        email: userEmail,
        password: 'google_oauth_login',
        role: 'user',
        avatar: avatar || '',
        phone: '',
        auth_provider: 'google',
        status: 'active',
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      db.saveUsers();
    }

    res.json({
      success: true,
      message: `Login dengan Google berhasil! Selamat datang, ${user.name}.`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone || '',
        provider: 'google'
      },
      redirectTo: '/tamu'
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses autentikasi Google.' });
  }
});

// Update Profil Pengguna
router.put('/profile/:id', (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.params.id;
    
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    db.saveUsers();

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
  }
});

module.exports = router;
