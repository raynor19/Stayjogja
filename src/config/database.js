const firestore = require('./firestoreClient');

class Database {
  constructor() {
    this.users = [];
    this.properties = [];
    this.units = [];
    this.reservations = [];
    this.payments = [];
    this.tourist_spots = [];
    this.notifications = [];
    this.itineraries = [];
    this.reservationColumns = new Set();
    this.propertyColumns = new Set();
    this.notificationColumns = new Set();
    this.firestoreConnected = false;
    this.initPromise = this.initFromFirestore();
  }

  async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this;
  }

  async init() {
    return this.ensureInitialized();
  }

  async refreshReservations() {
    try {
      const bookings = await firestore.fetchCollection('bookings');
      if (Array.isArray(bookings) && bookings.length > 0) {
        this.reservations = bookings;
        if (bookings[0]) {
          this.reservationColumns = new Set(Object.keys(bookings[0]));
        }
      }
    } catch (e) {
      console.warn('[DB] refreshReservations error:', e.message);
    }
    return this.reservations;
  }

  async initFromFirestore() {
    try {
      console.log(`[Firestore] 🚀 Menginisialisasi database dari project '${firestore.PROJECT_ID}'...`);

      // 1. Ambil Hotels (Properties) dari Cloud Firestore
      const hotelsData = await firestore.fetchCollection('hotels');
      if (Array.isArray(hotelsData) && hotelsData.length > 0) {
        this.properties = hotelsData;
        if (hotelsData[0]) {
          this.propertyColumns = new Set(Object.keys(hotelsData[0]));
        }

        // Ekstrak units (kamar) dari array rooms
        const extractedUnits = [];
        for (const h of hotelsData) {
          if (Array.isArray(h.rooms)) {
            for (const r of h.rooms) {
              extractedUnits.push({
                id: r.id || `unit-${h.id}-${extractedUnits.length}`,
                property_id: h.id,
                name: r.name || 'Standard Room',
                price: r.price_per_night || h.starting_price || 350000,
                available_stock: r.stock || 3,
                capacity: r.capacity || 2,
                bed_type: r.bed_type || '1 King Bed',
                room_size: r.room_size || 28,
                facilities: r.facilities || [],
                photos: r.images || []
              });
            }
          }
        }
        this.units = extractedUnits;
      }

      // 2. Ambil Users dari Cloud Firestore
      const usersData = await firestore.fetchCollection('users');
      if (Array.isArray(usersData) && usersData.length > 0) {
        this.users = usersData;
      } else {
        // Default users jika koleksi baru
        this.users = [
          { id: 'usr-001', name: 'Raynor (Tamu Demo)', email: 'raynormuhammad19@gmail.com', role: 'user', phone: '081234567890', status: 'active' },
          { id: 'own-001', name: 'Ibu Kartika (Pemilik Hotel)', email: 'owner@stayjogja.id', role: 'owner', phone: '081987654321', status: 'active' },
          { id: 'adm-001', name: 'Administrator StayJogja', email: 'admin@stayjogja.id', role: 'admin', phone: '0813921207', status: 'active' }
        ];
      }

      // Pastikan akun resepsionis demo selalu ada untuk operasional web
      const hasReceptionist = this.users.some(u => u.email && u.email.toLowerCase() === 'resepsionis@stayjogja.id');
      if (!hasReceptionist) {
        const demoReceptionist = {
          id: 'usr-resepsionis-demo',
          name: 'Resepsionis Front Desk',
          email: 'resepsionis@stayjogja.id',
          password: 'password123',
          role: 'resepsionis',
          phone: '081234567899',
          status: 'active'
        };
        this.users.push(demoReceptionist);
        firestore.setDocument('users', demoReceptionist.id, demoReceptionist);
      }

      // 3. Ambil Reservations (Bookings) dari Cloud Firestore
      const bookingsData = await firestore.fetchCollection('bookings');
      if (Array.isArray(bookingsData)) {
        this.reservations = bookingsData;
        if (bookingsData[0]) {
          this.reservationColumns = new Set(Object.keys(bookingsData[0]));
        }
      }

      // 4. Ambil Attractions (Tourist Spots) dari Cloud Firestore
      const spotsData = await firestore.fetchCollection('attractions');
      if (Array.isArray(spotsData) && spotsData.length > 0) {
        this.tourist_spots = spotsData;
      }

      // 5. Ambil Notifications dari Cloud Firestore
      const notifsData = await firestore.fetchCollection('notifications');
      if (Array.isArray(notifsData)) {
        this.notifications = notifsData;
      }

      // 6. Ambil Itineraries dari Cloud Firestore
      const itinsData = await firestore.fetchCollection('itineraries');
      if (Array.isArray(itinsData)) {
        this.itineraries = itinsData;
      }

      this.firestoreConnected = true;
      console.log(`[Firestore] ✅ Data aktif sepenuhnya: ${this.properties.length} properti/hotel, ${this.units.length} unit kamar, ${this.reservations.length} reservasi, ${this.users.length} user, ${this.tourist_spots.length} atraksi.`);
    } catch (err) {
      console.error('[Firestore] Init error:', err.message);
    }
  }

  // ─── Save / Update Methods ke Cloud Firestore ────────────────────────────

  async saveProperties() {
    if (!this.properties || this.properties.length === 0) return;
    try {
      for (const p of this.properties) {
        if (!p.id) continue;
        // Pasangkan rooms dari units yang bersangkutan
        const propUnits = this.units.filter(u => u.property_id === p.id);
        const roomsPayload = propUnits.map(u => ({
          id: u.id,
          name: u.name,
          capacity: u.capacity || 2,
          price_per_night: u.price,
          original_price: Math.round(u.price * 1.2),
          stock: u.available_stock || 1,
          cancellation_policy: 'Gratis pembatalan s/d 24 jam',
          has_breakfast: true,
          facilities: u.facilities || [],
          images: u.photos || []
        }));

        const docData = {
          ...p,
          rooms: roomsPayload.length > 0 ? roomsPayload : (p.rooms || [])
        };
        await firestore.setDocument('hotels', p.id, docData);
      }
      console.log(`[Firestore] ✅ ${this.properties.length} properties tersinkronisasi ke Firestore.`);
    } catch (e) {
      console.error('[Firestore] saveProperties error:', e.message);
    }
  }

  async deleteProperty(id) {
    this.properties = this.properties.filter(p => p.id !== id);
    this.units = this.units.filter(u => u.property_id !== id);
    await firestore.deleteDocument('hotels', id);
  }

  async saveReservations() {
    if (!this.reservations) return;
    try {
      for (const r of this.reservations) {
        if (!r.id && !r.booking_code) continue;
        const docId = r.id || r.booking_code;
        await firestore.setDocument('bookings', docId, r);
      }
      console.log(`[Firestore] ✅ ${this.reservations.length} reservations tersinkronisasi ke Firestore.`);
    } catch (e) {
      console.error('[Firestore] saveReservations error:', e.message);
    }
  }

  async deleteReservation(id) {
    this.reservations = this.reservations.filter(r => r.id !== id);
    await firestore.deleteDocument('bookings', id);
  }

  async saveUsers() {
    if (!this.users) return;
    try {
      for (const u of this.users) {
        if (!u.id) continue;
        await firestore.setDocument('users', u.id, u);
      }
    } catch (e) {
      console.error('[Firestore] saveUsers error:', e.message);
    }
  }

  async saveNotifications() {
    if (!this.notifications) return;
    try {
      for (const n of this.notifications) {
        const docId = n.id || `notif-${Date.now()}`;
        await firestore.setDocument('notifications', docId, n);
      }
    } catch (e) {
      console.error('[Firestore] saveNotifications error:', e.message);
    }
  }

  async saveItineraries() {
    if (!this.itineraries) return;
    try {
      for (const it of this.itineraries) {
        if (!it.id) continue;
        await firestore.setDocument('itineraries', it.id, it);
      }
    } catch (e) {
      console.error('[Firestore] saveItineraries error:', e.message);
    }
  }

  async uploadImage(buffer, fileName, contentType = 'image/jpeg') {
    // Return placeholder/base64 URL jika offline atau gunakan CDN
    return `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`;
  }
}

const db = new Database();
module.exports = db;
