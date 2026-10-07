const supabase = require('./supabaseClient');

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
    this.supabaseConnected = false;
    this.init();
  }

  async init() {
    // Fetch directly and exclusively from Supabase cloud
    await this.initFromSupabase();
  }

  async initFromSupabase() {
    try {
      // 1. Properties
      const { data: props, error: propErr } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (propErr) {
        console.warn('[Supabase] Warning fetching properties:', propErr.message);
      } else if (Array.isArray(props)) {
        this.properties = props;
        if (props.length > 0 && props[0]) {
          this.propertyColumns = new Set(Object.keys(props[0]));
        }
      }

      // 2. Units
      const { data: unitsData, error: unitErr } = await supabase
        .from('units')
        .select('*');
      if (!unitErr && Array.isArray(unitsData)) {
        this.units = unitsData;
      }

      // 3. Users
      const { data: usersData, error: userErr } = await supabase
        .from('users')
        .select('*');
      if (!userErr && Array.isArray(usersData)) {
        this.users = usersData;
      }

      // 4. Reservations
      const { data: resData, error: resErr } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });
      if (!resErr && Array.isArray(resData)) {
        this.reservations = resData;
        if (resData.length > 0 && resData[0]) {
          this.reservationColumns = new Set(Object.keys(resData[0]));
        }
      }

      // Merge rich reservation metadata from Storage if available (until SQL migration is run)
      try {
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'stayjogja';
        const { data: resMetaBlob } = await supabase
          .storage
          .from(bucketName)
          .download('cloud_data/reservations_meta.json');
        if (resMetaBlob) {
          const metaText = await resMetaBlob.text();
          const metaList = JSON.parse(metaText);
          if (Array.isArray(metaList)) {
            const metaMap = new Map(metaList.map(m => [m.id, m]));
            this.reservations = this.reservations.map(r => {
              const meta = metaMap.get(r.id);
              return meta ? { ...meta, ...r, verified_by_qr: r.verified_by_qr ?? meta.verified_by_qr, ktp_data: r.ktp_data ?? meta.ktp_data } : r;
            });
          }
        }
      } catch (e) {
        // Optional metadata sync
      }

      // 5. Tourist spots
      const { data: spotData, error: spotErr } = await supabase
        .from('tourist_spots')
        .select('*');
      if (!spotErr && Array.isArray(spotData)) {
        this.tourist_spots = spotData;
      }

      // 6. Notifications
      const { data: notifData, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!notifErr && Array.isArray(notifData)) {
        this.notifications = notifData;
        if (notifData.length > 0 && notifData[0]) {
          this.notificationColumns = new Set(Object.keys(notifData[0]));
        }
      }

      // 7. Itineraries from Supabase Storage
      try {
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'stayjogja';
        const { data: itinBlob, error: itinErr } = await supabase
          .storage
          .from(bucketName)
          .download('cloud_data/itineraries.json');
        if (!itinErr && itinBlob) {
          const text = await itinBlob.text();
          this.itineraries = JSON.parse(text);
        }
      } catch (e) {
        // Storage itinerary optional on cold start
      }

      this.supabaseConnected = true;
      console.log(`[Supabase] ✅ Data cloud Supabase aktif sepenuhnya: ${this.properties.length} properti, ${this.units.length} unit, ${this.reservations.length} reservasi, ${this.users.length} user, ${this.notifications.length} notifikasi, ${this.itineraries.length} itinerary.`);
    } catch (err) {
      console.error('[Supabase] Init error:', err.message);
    }
  }

  async uploadImage(buffer, fileName, contentType = 'image/jpeg') {
    try {
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'stayjogja';
      const cleanPath = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const { data, error } = await supabase.storage.from(bucketName).upload(cleanPath, buffer, {
        contentType,
        upsert: true
      });
      if (error) {
        console.error('[Supabase Storage] Upload error:', error.message);
        return null;
      }
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
      return urlData.publicUrl;
    } catch (err) {
      console.error('[Supabase Storage] Exception:', err.message);
      return null;
    }
  }

  saveNotifications() {
    if (this.supabaseConnected && this.notifications.length > 0) {
      const allowedCols = this.notificationColumns && this.notificationColumns.size > 0 ? this.notificationColumns : null;
      const cleanNotifs = this.notifications.map(n => {
        const full = {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          property_name: n.property_name || null,
          property_id: n.property_id || null,
          read: Boolean(n.read),
          timestamp: n.timestamp || new Date().toISOString()
        };
        if (allowedCols) {
          const filtered = {};
          for (const key of Object.keys(full)) {
            if (allowedCols.has(key)) filtered[key] = full[key];
          }
          return filtered;
        }
        return full;
      });

      supabase.from('notifications').upsert(cleanNotifs).then(({ error }) => {
        if (error) console.error('[Supabase] Error saving notifications:', error.message);
      });
    }
  }

  addNotification(notif) {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notif
    };
    this.notifications.unshift(newNotif);
    if (this.notifications.length > 50) this.notifications = this.notifications.slice(0, 50);
    this.saveNotifications();
    return newNotif;
  }

  async saveItineraries() {
    try {
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'stayjogja';
      const payload = JSON.stringify(this.itineraries, null, 2);
      await supabase.storage.from(bucketName).upload('cloud_data/itineraries.json', Buffer.from(payload), {
        contentType: 'application/json',
        upsert: true
      });
    } catch (err) {
      console.error('[Supabase Storage] Failed to save itineraries:', err.message);
    }
  }

  addItinerary(itin) {
    const newItin = {
      id: itin.id || `itin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: itin.created_at || new Date().toISOString(),
      ...itin
    };
    this.itineraries.unshift(newItin);
    this.saveItineraries();
    return newItin;
  }

  getItinerariesByUser(userId) {
    return (this.itineraries || []).filter(i => String(i.user_id) === String(userId));
  }

  deleteItinerary(id, userId = null) {
    const idx = (this.itineraries || []).findIndex(i => i.id === id && (!userId || String(i.user_id) === String(userId)));
    if (idx !== -1) {
      this.itineraries.splice(idx, 1);
      this.saveItineraries();
      return true;
    }
    return false;
  }

  saveReservations() {
    if (this.supabaseConnected && this.reservations.length > 0) {
      const allowedCols = this.reservationColumns && this.reservationColumns.size > 0 ? this.reservationColumns : null;

      const cleanRows = this.reservations.map(r => {
        const full = {
          id: r.id,
          booking_code: r.booking_code,
          user_id: r.user_id || null,
          property_id: r.property_id,
          property_name: r.property_name,
          property_type: r.property_type || null,
          property_stars: r.property_stars || null,
          property_address: r.property_address || null,
          property_photo: r.property_photo || null,
          unit_id: r.unit_id,
          unit_name: r.unit_name,
          guest_name: r.guest_name,
          guest_email: r.guest_email,
          guest_phone: r.guest_phone,
          guest_nik: r.guest_nik || null,
          guest_address: r.guest_address || null,
          guest_religion: r.guest_religion || null,
          guest_marital_status: r.guest_marital_status || null,
          guest_occupation: r.guest_occupation || null,
          guest_citizenship: r.guest_citizenship || null,
          ktp_data: r.ktp_data || null,
          check_in: r.check_in,
          check_out: r.check_out,
          nights: r.nights || 1,
          guests_count: r.guests_count || 1,
          price_per_night: r.price_per_night || null,
          subtotal: r.subtotal || null,
          tax_service: r.tax_service || null,
          total_price: r.total_price || 0,
          special_requests: r.special_requests || null,
          status: r.status || 'menunggu_pembayaran',
          payment_status: r.payment_status || (r.payment ? r.payment.status : 'unpaid'),
          payment_method: r.payment_method || (r.payment ? r.payment.method : null),
          payment_transaction_id: r.payment_transaction_id || (r.payment ? r.payment.transaction_id : null),
          paid_at: r.paid_at || (r.payment ? r.payment.paid_at : null),
          rejection_reason: r.rejection_reason || r.reject_reason || null,
          reject_reason: r.reject_reason || r.rejection_reason || null,
          rejected_at: r.rejected_at || null,
          refund_status: r.refund_status || null,
          acc_at: r.acc_at || null,
          checked_in_at: r.checked_in_at || null,
          verified_by_qr: r.verified_by_qr || false,
          invoice_number: r.invoice_number || r.booking_code,
          qr_payload: r.qr_payload || null,
          settlement_status: r.settlement_status || null,
          created_at: r.created_at || new Date().toISOString()
        };

        if (allowedCols) {
          const filtered = {};
          for (const key of Object.keys(full)) {
            if (allowedCols.has(key)) filtered[key] = full[key];
          }
          return filtered;
        }
        return full;
      });

      supabase.from('reservations').upsert(cleanRows, { onConflict: 'booking_code' }).then(({ error }) => {
        if (error) console.error('[Supabase] Error saving reservations:', error.message);
      });

      // Backup rich metadata to Supabase Storage so no custom field (KTP, QR, special requests) is ever lost
      try {
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'stayjogja';
        const metaPayload = JSON.stringify(this.reservations, null, 2);
        supabase.storage.from(bucketName).upload('cloud_data/reservations_meta.json', Buffer.from(metaPayload), {
          contentType: 'application/json',
          upsert: true
        }).catch(err => {
          // Non-blocking background sync
        });
      } catch (err) {}
    }
  }

  async deleteReservation(id) {
    const idx = this.reservations.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.reservations.splice(idx, 1);
    }
    if (this.supabaseConnected) {
      await supabase.from('reservations').delete().eq('id', id);
    }
  }

  saveProperties() {
    if (this.supabaseConnected) {
      const allowedCols = this.propertyColumns && this.propertyColumns.size > 0 ? this.propertyColumns : null;
      const cleanProps = this.properties.map(p => {
        const { units, ...rest } = p;
        if (allowedCols) {
          const filtered = {};
          for (const key of Object.keys(rest)) {
            if (allowedCols.has(key)) filtered[key] = rest[key];
          }
          return filtered;
        }
        return rest;
      });

      supabase.from('properties').upsert(cleanProps).then(({ error }) => {
        if (error) console.error('[Supabase] Error saving properties:', error.message);
      });

      if (this.units.length > 0) {
        supabase.from('units').upsert(this.units).then(({ error }) => {
          if (error) console.error('[Supabase] Error saving units:', error.message);
        });
      }
    }
  }

  async deleteProperty(id) {
    const propIdx = this.properties.findIndex(p => p.id === id);
    if (propIdx !== -1) {
      this.properties.splice(propIdx, 1);
    }
    this.units = this.units.filter(u => u.property_id !== id);

    if (this.supabaseConnected) {
      await supabase.from('properties').delete().eq('id', id);
    }
  }

  async deleteUnit(unitId) {
    const unitIdx = this.units.findIndex(u => u.id === unitId);
    if (unitIdx !== -1) {
      this.units.splice(unitIdx, 1);
    }
    if (this.supabaseConnected) {
      await supabase.from('units').delete().eq('id', unitId);
    }
  }

  saveUsers() {
    if (this.supabaseConnected && this.users.length > 0) {
      const cleanUsers = this.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role || 'user',
        phone: u.phone || null,
        address: u.address || null,
        status: u.status || 'active',
        created_at: u.created_at || new Date().toISOString()
      }));

      supabase.from('users').upsert(cleanUsers).then(({ error }) => {
        if (error) console.error('[Supabase] Error saving users:', error.message);
      });
    }
  }
}

const db = new Database();
db.supabase = supabase;
module.exports = db;
