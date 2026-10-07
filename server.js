require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database (Reloaded: 2026-09-30T21:37:00)
const db = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Static Frontend (HTML, CSS, JS) - disable automatic index.html so '/' routes to login.html
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/properties', require('./src/routes/propertyRoutes'));
app.use('/api/reservations', require('./src/routes/reservationRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/chatbot', require('./src/routes/chatbotRoutes'));
app.use('/api/itineraries', require('./src/routes/itineraryRoutes'));

// Notifications API (Status Hotel & Status Penghapusan)
app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    total: (db.notifications || []).length,
    unread: (db.notifications || []).filter(n => !n.read).length,
    data: db.notifications || []
  });
});

app.post('/api/notifications/mark-read', (req, res) => {
  if (Array.isArray(db.notifications)) {
    db.notifications.forEach(n => { n.read = true; });
    db.saveNotifications();
  }
  res.json({ success: true, message: 'Semua notifikasi telah ditandai sudah dibaca.' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'StayYK API',
    version: '1.0.0',
    propertiesCount: db.properties.length,
    unitsCount: db.units.length,
    reservationsCount: db.reservations.length,
    timestamp: new Date().toISOString()
  });
});

// Dedicated Role Page Routes
// Halaman Utama: Saat akses localhost:3000 -> Landing Page Editorial
app.get(['/', '/home', '/beranda', '/landing'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Katalog Lengkap & Pencarian Penginapan
app.get(['/katalog', '/explore', '/tamu', '/search'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Portal Masuk / Login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard Tamu (User Hub: Invoices, Bookings, Itineraries, Profile)
app.get(['/user', '/dashboard-user', '/profil', '/user.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

// Traveloka TERA Property Registration Route
app.get(['/tera', '/registration/form', '/register-property'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tera.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Portal Resepsionis Fast Check-in (Scan Barcode Tamu)
app.get(['/checkin', '/checkin/:code', '/verify/:code', '/receptionist/:code', '/frontdesk/:code'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkin.html'));
});


// Halaman Khusus Detail Hotel / Akomodasi
app.get(['/detail', '/detail.html', '/hotel-detail', '/property-detail'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'detail.html'));
});

// Halaman Logo & Brand Identity Guidelines
app.get(['/logo', '/logo.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logo.html'));
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start Server
const tunnel = require('./src/utils/tunnel');
app.listen(PORT, () => {
  tunnel.startTunnel(PORT);
  console.log(`====================================================`);
  console.log(`ðŸš€ StayYK Server berjalan di http://localhost:${PORT}`);
  console.log(`ðŸ¨ Layanan: Hotel (Bintang 1-5), Homestay, Apartemen Jogja`);
  console.log(`ðŸŽ¨ Antarmuka: HTML5 + CSS3 + Vanilla JS (Traveloka Style)`);
  console.log(`====================================================`);
});

module.exports = app;
// restart


