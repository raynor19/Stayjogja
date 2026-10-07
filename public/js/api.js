// StayJogja API Client
const API = {
  // Fetch properties with filters
  async getProperties(params = {}) {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'all') query.append('type', params.type);
    if (params.stars && params.stars.length > 0) query.append('stars', params.stars.join(','));
    if (params.area && params.area !== 'all') query.append('area', params.area);
    if (params.minPrice) query.append('minPrice', params.minPrice);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);
    if (params.facilities && params.facilities.length > 0) query.append('facilities', params.facilities.join(','));
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    if (params.capacity) query.append('capacity', params.capacity);
    if (params.rooms) query.append('rooms', params.rooms);
    if (params.status) query.append('status', params.status);
    if (params.owner_id) query.append('owner_id', params.owner_id);

    const res = await fetch(`/api/properties?${query.toString()}`);
    return await res.json();
  },

  // Fetch property detail
  async getPropertyDetail(id) {
    const res = await fetch(`/api/properties/${id}`);
    return await res.json();
  },

  // Rekomendasi Tempat Sekitar Hotel dengan Gemini AI
  async getPropertyNearbyAi(id, refresh = false) {
    const query = refresh ? '?refresh=true' : '';
    const res = await fetch(`/api/properties/${encodeURIComponent(id)}/nearby-ai${query}`);
    return await res.json();
  },

  // Buat Itinerary Liburan Cerdas berbasis Durasi Menginap & Gemini AI
  async generatePropertyItinerary(id, days = 2, preference = 'semua') {
    const res = await fetch(`/api/properties/${encodeURIComponent(id)}/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, preference })
    });
    return await res.json();
  },

  // Create reservation
  async createReservation(data) {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Simulate payment
  async simulatePayment(reservationId, method) {
    const res = await fetch('/api/payments/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: reservationId, method })
    });
    return await res.json();
  },

  // Fetch user reservations
  async getUserReservations(userId, email = null) {
    if (!userId) return { success: false, data: [] };
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`/api/reservations/user/${encodeURIComponent(userId)}${query}`);
    return await res.json();
  },

  // Fetch owner reservations (all incoming reservations from all guests)
  async getOwnerReservations() {
    const res = await fetch('/api/reservations/owner');
    return await res.json();
  },

  // Fetch reservation by booking code
  async getReservationByCode(code) {
    const res = await fetch(`/api/reservations/code/${code}`);
    return await res.json();
  },

  // Kirim invoice reservasi ke email tamu/pengguna terdaftar
  async sendReservationInvoiceEmail(idOrCode, email = null) {
    const res = await fetch(`/api/reservations/${encodeURIComponent(idOrCode)}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  },

  // Owner ACC reservation
  async ownerAccReservation(id) {
    const res = await fetch(`/api/reservations/${id}/acc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  },

  // Owner Reject reservation
  async ownerRejectReservation(id, reason) {
    const res = await fetch(`/api/reservations/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return await res.json();
  },

  // Admin overview
  async getAdminOverview() {
    const res = await fetch('/api/admin/overview');
    return await res.json();
  },

  // Admin approve property
  async adminApproveProperty(id) {
    const res = await fetch(`/api/admin/properties/${id}/approve`, {
      method: 'POST'
    });
    return await res.json();
  },

  // Send message to AI Chatbot
  async sendChatbotMessage(message, currentPropertyId = null, stayDuration = null) {
    const nights = stayDuration || (typeof State !== 'undefined' && State.searchForm ? State.searchForm.nights : 1);
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, current_property_id: currentPropertyId, stay_duration: nights })
    });
    return await res.json();
  },

  // Simpan Rencana Perjalanan AI ke Akun Pengguna
  async saveUserItinerary(data) {
    const res = await fetch('/api/itineraries/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Ambil Daftar Itinerary Tersimpan Milik Pengguna
  async getUserItineraries(userId) {
    const res = await fetch(`/api/itineraries/user/${userId}`);
    return await res.json();
  },

  // Hapus Rencana Perjalanan Tersimpan
  async deleteUserItinerary(id, userId = null) {
    const url = userId ? `/api/itineraries/${id}?user_id=${userId}` : `/api/itineraries/${id}`;
    const res = await fetch(url, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // Update room unit price/stock
  async updateUnit(unitId, data) {
    const res = await fetch(`/api/properties/units/${unitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Delete specific room unit
  async deleteUnit(unitId) {
    const res = await fetch(`/api/properties/units/${unitId}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  // Cancel deletion request for property
  async cancelDeletePropertyRequest(propertyId) {
    const res = await fetch(`/api/properties/${propertyId}/cancel-delete-request`, {
      method: 'POST'
    });
    return await res.json();
  },

  // Get notifications
  async getNotifications() {
    const res = await fetch('/api/notifications');
    return await res.json();
  },

  // Mark all notifications as read
  async markNotificationsRead() {
    const res = await fetch('/api/notifications/mark-read', {
      method: 'POST'
    });
    return await res.json();
  },

  // Admin: Get finance & 5% commission settlement data
  async getAdminFinance() {
    const res = await fetch('/api/admin/finance');
    return await res.json();
  },

  // Admin: Mark settlement as transferred
  async settleFinance(id) {
    const res = await fetch(`/api/admin/finance/settle/${id}`, {
      method: 'POST'
    });
    return await res.json();
  },

  // Admin: Get all registered users
  async getAdminUsers() {
    const res = await fetch('/api/admin/users');
    return await res.json();
  },

  // Admin: Toggle user status (active / suspended)
  async toggleUserStatus(id) {
    const res = await fetch(`/api/admin/users/${id}/toggle-status`, {
      method: 'POST'
    });
    return await res.json();
  }
};



// --- EDIT PROFILE MODAL LOGIC ---
function openGlobalEditProfileModal(e) {
  if(e) { e.preventDefault(); e.stopPropagation(); }
  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(!user.id) return alert('Silakan login terlebih dahulu.');

  // Inject modal to body if not exists
  if (!document.getElementById('global-edit-profile-modal')) {
    const modalHTML = `
      <div id="global-edit-profile-modal" class="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div class="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-900 font-display">Edit Profil Anda</h3>
              <p class="text-[11px] text-slate-500">Perbarui nama, email, dan WhatsApp</p>
            </div>
            <button type="button" onclick="closeGlobalEditProfileModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="global-edit-profile-form" onsubmit="submitGlobalEditProfile(event)" class="p-6 space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input type="text" id="g-prof-name" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Alamat Email</label>
              <input type="email" id="g-prof-email" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
              <input type="tel" id="g-prof-phone" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required>
            </div>
            <button type="submit" class="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid fa-save"></i> Simpan Profil
            </button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  document.getElementById('g-prof-name').value = user.name || '';
  document.getElementById('g-prof-email').value = user.email || '';
  document.getElementById('g-prof-phone').value = user.phone || '';
  
  document.getElementById('global-edit-profile-modal').classList.remove('hidden');
}

function closeGlobalEditProfileModal() {
  const m = document.getElementById('global-edit-profile-modal');
  if (m) m.classList.add('hidden');
}

async function submitGlobalEditProfile(e) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(!user.id) return;

  const name = document.getElementById('g-prof-name').value.trim();
  const email = document.getElementById('g-prof-email').value.trim();
  const phone = document.getElementById('g-prof-phone').value.trim();

  try {
    const res = await fetch(`/api/auth/profile/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });
    const data = await res.json();
    
    if(data.success) {
      localStorage.setItem('stayjogja_user', JSON.stringify(data.user));
      alert('Profil berhasil diperbarui!');
      closeGlobalEditProfileModal();
      window.location.reload();
    } else {
      alert(data.message || 'Gagal memperbarui profil.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}
