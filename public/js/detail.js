// Dedicated Detail Page Controller for StayJogja
let currentProperty = null;
let currentBookingData = null;

// Format IDR Currency
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  initNavbarAuth();
  setupDefaultDates();

  const urlParams = new URLSearchParams(window.location.search);
  const propId = urlParams.get('id');

  if (!propId) {
    alert('ID akomodasi tidak ditemukan. Mengalihkan ke katalog...');
    window.location.href = '/tamu';
    return;
  }

  await loadPropertyDetail(propId);
});

// Manage Navbar User Profile / Login status
function initNavbarAuth() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  const rawUser = localStorage.getItem('stayjogja_user');
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      const firstName = user.name ? user.name.split(' ')[0] : 'Akun';
      const roleBadge = user.role === 'admin' ? 'Admin' : (user.role === 'owner' ? 'Owner' : 'Tamu');
      const roleColor = user.role === 'admin' ? 'bg-purple-100 text-purple-700' : (user.role === 'owner' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700');
      const targetUrl = user.role === 'admin' ? '/admin' : (user.role === 'owner' ? '/owner' : '/user');

      container.innerHTML = `
        <div class="flex items-center gap-2">
          <a href="${targetUrl}" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200" title="Buka Profil & Reservasi">
            <span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              <i class="fa-solid fa-user"></i>
            </span>
            <span class="max-w-[110px] truncate">${firstName}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ${roleColor}">${roleBadge}</span>
          </a>
          <button onclick="handleLogout()" title="Keluar / Ganti Akun" class="p-2 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;
      return;
    } catch (e) {
      console.error(e);
    }
  }

  // Guest / Unauthenticated
  container.innerHTML = `
    <a href="/login" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition">
      <i class="fa-solid fa-right-to-bracket"></i>
      <span>Login</span>
    </a>
  `;
}

function handleLogout() {
  localStorage.removeItem('stayjogja_user');
  window.location.href = '/';
}

function getActiveUserId() {
  const raw = localStorage.getItem('stayjogja_user');
  if (raw) {
    try {
      const u = JSON.parse(raw);
      if (u && u.id) return u.id;
    } catch (e) {}
  }
  return null;
}

// Setup Dates & Nights
function setupDefaultDates() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = d => d.toISOString().split('T')[0];

  const checkInInput = document.getElementById('detail-check-in');
  const checkOutInput = document.getElementById('detail-check-out');

  if (checkInInput && checkOutInput) {
    // Check if session or state already has dates
    let saved = null;
    try {
      const raw = sessionStorage.getItem('stayjogja_search_dates');
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    checkInInput.value = (saved && saved.checkIn) || State.searchForm.checkIn || formatDate(today);
    checkOutInput.value = (saved && saved.checkOut) || State.searchForm.checkOut || formatDate(tomorrow);
    checkInInput.min = formatDate(today);
    checkOutInput.min = formatDate(today);

    calculateDetailNights();
  }
}

function calculateDetailNights() {
  const cin = document.getElementById('detail-check-in').value;
  const cout = document.getElementById('detail-check-out').value;
  const badge = document.getElementById('detail-nights-badge');

  if (cin && cout) {
    const d1 = new Date(cin);
    const d2 = new Date(cout);
    const diffTime = d2 - d1;
    let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights <= 0) nights = 1;

    State.searchForm.nights = nights;
    State.searchForm.checkIn = cin;
    State.searchForm.checkOut = cout;

    if (badge) badge.textContent = `${nights} Malam`;

    // Keep AI Itinerary Planner duration synced with user's selected stay duration
    syncItineraryDaysWithStay(nights);
  }
}

function handleDetailDateChange() {
  userManuallyChangedDays = false;
  calculateDetailNights();
  renderRoomUnits(currentProperty);
}

function handleDetailCapacityChange() {
  const guests = parseInt(document.getElementById('detail-guests-count').value, 10) || 2;
  const rooms = parseInt(document.getElementById('detail-rooms-count').value, 10) || 1;
  State.searchForm.guests = guests;
  State.searchForm.rooms = rooms;
}

// Load Property Detail
async function loadPropertyDetail(propId) {
  const loadingEl = document.getElementById('detail-loading');
  const contentEl = document.getElementById('detail-content');

  try {
    const res = await API.getPropertyDetail(propId);
    if (!res.success) {
      alert(res.message || 'Properti tidak ditemukan.');
      window.location.href = '/tamu';
      return;
    }

    const p = res.data;
    currentProperty = p;
    State.currentProperty = p;

    // Page title
    document.title = `${p.name} — StayJogja`;

    // Breadcrumbs
    document.getElementById('breadcrumb-area').textContent = p.area || 'Yogyakarta';
    document.getElementById('breadcrumb-name').textContent = p.name;

    // Header info
    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-address').textContent = `${p.address} (${p.area})`;
    document.getElementById('detail-desc').textContent = p.description || 'Akomodasi berkualitas dengan pelayanan ramah dan fasilitas lengkap di Yogyakarta.';

    // Stars & Type
    const typeBadge = document.getElementById('detail-type-badge');
    const starsContainer = document.getElementById('detail-stars-container');

    if (p.type === 'hotel') {
      typeBadge.textContent = `Hotel Bintang ${p.stars || 1}`;
      typeBadge.className = 'px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-blue-100 text-blue-900 border border-blue-200';
      starsContainer.textContent = '★'.repeat(p.stars || 3) + '☆'.repeat(5 - (p.stars || 3));
      starsContainer.classList.remove('hidden');
    } else if (p.type === 'homestay') {
      typeBadge.textContent = 'Homestay Keluarga';
      typeBadge.className = 'px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-200';
      starsContainer.classList.add('hidden');
    } else {
      typeBadge.textContent = 'Apartemen Harian';
      typeBadge.className = 'px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-900 border border-purple-200';
      starsContainer.classList.add('hidden');
    }

    // Rating & Price
    const minPrice = (p.units && p.units.length > 0) ? Math.min(...p.units.map(u => u.price)) : 350000;
    document.getElementById('detail-starting-price').textContent = formatRupiah(minPrice);
    document.getElementById('mobile-price-val').textContent = formatRupiah(minPrice);
    document.getElementById('detail-rating-score').textContent = p.rating || 9.2;
    document.getElementById('detail-review-count').textContent = `${p.review_count || 88} ulasan tamu`;

    // Google Maps link & iframe
    const mapsQuery = encodeURIComponent(`${p.name}, ${p.address}, Yogyakarta`);
    const fallbackMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const mapsUrl = (p.gmaps_url && p.gmaps_url.trim().length > 0) ? p.gmaps_url.trim() : fallbackMapsUrl;
    
    document.getElementById('detail-maps-link').href = mapsUrl;
    document.getElementById('detail-maps-btn-large').href = mapsUrl;
    document.getElementById('detail-maps-address-text').textContent = `${p.address}, ${p.area}, Daerah Istimewa Yogyakarta`;

    const mapsIframe = document.getElementById('detail-maps-iframe');
    if (mapsIframe) {
      mapsIframe.src = `https://maps.google.com/maps?q=${mapsQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }

    // Photos Gallery
    const photos = (Array.isArray(p.photos) && p.photos.length > 0) ? p.photos : [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
    ];

    const mainPhotoEl = document.getElementById('detail-main-photo');
    if (mainPhotoEl) {
      mainPhotoEl.src = photos[0];
      mainPhotoEl.onerror = () => { mainPhotoEl.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'; };
    }

    for (let i = 1; i <= 4; i++) {
      const subPhotoEl = document.getElementById(`detail-sub-photo-${i}`);
      if (subPhotoEl) {
        subPhotoEl.src = photos[i] || photos[0];
        subPhotoEl.onerror = () => { subPhotoEl.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'; };
      }
    }

    // Facilities
    renderFacilities(p.facilities || ['WiFi Gratis', 'AC', 'Parkir Gratis', 'Resepsionis 24 Jam']);

    // Room Units
    renderRoomUnits(p);

    // Nearby tourist spots
    renderNearbySpots(p.nearby_spots || []);

    // Switch view
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

  } catch (err) {
    console.error('Error loading property detail:', err);
    alert('Terjadi kesalahan memuat data properti.');
    window.location.href = '/tamu';
  }
}

// Render Facilities
function renderFacilities(facilities) {
  const container = document.getElementById('detail-facilities-container');
  if (!container) return;

  const iconMap = {
    'wifi': 'fa-wifi',
    'ac': 'fa-snowflake',
    'kolam': 'fa-person-swimming',
    'parkir': 'fa-square-parking',
    'restoran': 'fa-utensils',
    'sarapan': 'fa-utensils',
    'lift': 'fa-elevator',
    'resepsionis': 'fa-bell-concierge',
    'antar': 'fa-van-shuttle',
    'rokok': 'fa-ban-smoking'
  };

  container.innerHTML = facilities.map(fac => {
    let icon = 'fa-circle-check';
    const lower = fac.toLowerCase();
    for (const key in iconMap) {
      if (lower.includes(key)) {
        icon = iconMap[key];
        break;
      }
    }

    return `
      <div class="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
        <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
          <i class="fa-solid ${icon} text-xs"></i>
        </div>
        <span class="font-semibold text-slate-800 text-xs">${fac}</span>
      </div>
    `;
  }).join('');
}

// Render Room Units
function renderRoomUnits(prop) {
  const container = document.getElementById('detail-units-container');
  const countBadge = document.getElementById('detail-units-count-badge');
  if (!container) return;

  const units = prop.units || [];
  if (countBadge) countBadge.textContent = `${units.length} Tipe Kamar Tersedia`;

  if (units.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-3xl border border-slate-200 text-center">
        <i class="fa-solid fa-bed text-3xl text-slate-300 mb-2"></i>
        <h4 class="font-bold text-sm text-slate-700">Kamar Belum Tersedia</h4>
        <p class="text-xs text-slate-400 mt-1">Saat ini belum ada varian unit yang aktif untuk dipesan.</p>
      </div>
    `;
    return;
  }

  const nights = State.searchForm.nights || 1;

  container.innerHTML = units.map(u => {
    const unitPhoto = (u.photos && u.photos[0]) || (prop.photos && prop.photos[0]) || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
    const totalPrice = u.price * nights;
    const isAvailable = (u.available_stock || 0) > 0;

    const facList = (Array.isArray(u.facilities) ? u.facilities : ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam']).slice(0, 5);

    return `
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden hover:border-amber-400 transition-all flex flex-col md:flex-row group">
        
        <!-- Room Photo -->
        <div class="md:w-64 h-48 md:h-auto relative shrink-0 bg-slate-100 overflow-hidden">
          <img src="${unitPhoto}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${u.name}" onerror="this.src='https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'">
          <div class="absolute top-2.5 left-2.5">
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
              <i class="fa-solid fa-user-group text-amber-400 mr-1"></i> Maks ${u.capacity || 2} Tamu
            </span>
          </div>
        </div>

        <!-- Room Details -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-900">${u.name}</h3>
                <span class="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <i class="fa-solid fa-bed text-blue-700"></i> ${u.bed_type || '1 King Bed'} • ${u.room_size || 28} m²
                </span>
              </div>
              <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${isAvailable ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}">
                ${isAvailable ? `Tersisa ${u.available_stock} Kamar` : 'Kamar Penuh'}
              </span>
            </div>

            <!-- Amenities Chips -->
            <div class="flex flex-wrap gap-1.5 mt-3 text-[11px]">
              ${facList.map(f => `
                <span class="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60 font-medium">
                  <i class="fa-solid fa-check text-emerald-600 text-[9px]"></i> ${f}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Price & Action -->
          <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Tarif per Malam</span>
              <div class="flex items-baseline gap-1">
                <span class="text-lg sm:text-xl font-black text-amber-700 font-display">${formatRupiah(u.price)}</span>
                <span class="text-xs text-slate-500 font-normal">/malam</span>
              </div>
              ${nights > 1 ? `
                <span class="text-[11px] text-slate-500 font-medium block">Total ${nights} Malam: <strong class="text-slate-800">${formatRupiah(totalPrice)}</strong></span>
              ` : ''}
            </div>

            <button type="button" onclick="startBookingRoom('${u.id}')" ${!isAvailable ? 'disabled' : ''} class="px-6 py-2.5 btn-gold text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}">
              <span>${isAvailable ? 'Pesan Kamar Ini' : 'Habis Terjual'}</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// Render Nearby Spots (Enhanced with Gemini AI Data & Google Maps Integration)
function renderNearbySpots(spots) {
  const container = document.getElementById('detail-nearby-container');
  if (!container) return;

  if (!spots || spots.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs border border-dashed border-slate-200">
        <i class="fa-solid fa-compass text-slate-300 text-2xl mb-2 block"></i>
        Rekomendasi destinasi wisata dan kuliner sekitar sedang dimuat...
      </div>
    `;
    return;
  }

  const getCategoryTheme = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('kuliner') || c.includes('makan')) {
      return { icon: 'fa-utensils', bg: 'bg-amber-100 text-amber-700', badge: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (c.includes('kafe') || c.includes('kopi') || c.includes('cafe')) {
      return { icon: 'fa-mug-hot', bg: 'bg-rose-100 text-rose-700', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
    if (c.includes('belanja') || c.includes('pasar') || c.includes('batik') || c.includes('oleh')) {
      return { icon: 'fa-bag-shopping', bg: 'bg-blue-100 text-blue-700', badge: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
    return { icon: 'fa-landmark-dome', bg: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  container.innerHTML = spots.map(s => {
    const theme = getCategoryTheme(s.category);
    const mapsUrl = s.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' Yogyakarta')}`;
    const tipsHtml = s.tips ? `
      <div class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-amber-800/90 bg-amber-50/60 p-2 rounded-xl flex items-start gap-1.5">
        <i class="fa-regular fa-lightbulb text-amber-600 mt-0.5 shrink-0"></i>
        <span><strong>Tips:</strong> ${s.tips}</span>
      </div>
    ` : '';

    return `
      <div class="p-4 bg-slate-50/70 hover:bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between gap-2.5 transition duration-200 hover:shadow-md hover:border-amber-300">
        <div>
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl ${theme.bg} flex items-center justify-center text-sm shrink-0 shadow-xs">
                <i class="fa-solid ${theme.icon}"></i>
              </div>
              <div>
                <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-1">${s.name}</h4>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${theme.badge}">${s.category || 'Wisata'}</span>
                  <span class="text-[10px] font-semibold text-slate-500">📍 ${s.distance || 'Dekat Hotel'}</span>
                </div>
              </div>
            </div>
          </div>
          <p class="text-[11.5px] text-slate-600 leading-relaxed mt-1">${s.description || 'Destinasi menarik di sekitar akomodasi.'}</p>
          ${tipsHtml}
        </div>
        <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between">
          <span class="text-[10px] text-slate-400 font-medium">✨ Rekomendasi StayJogja AI</span>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition">
            <span>Buka Maps</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Refresh AI Recommendations on demand
async function refreshNearbyAiRecommendations() {
  if (!currentProperty || !currentProperty.id) return;
  const btn = document.getElementById('btn-refresh-nearby-ai');
  const icon = document.getElementById('icon-refresh-nearby-ai');
  const text = document.getElementById('text-refresh-nearby-ai');

  if (btn) btn.disabled = true;
  if (icon) icon.classList.add('fa-spin');
  if (text) text.textContent = 'Menganalisis Lokasi...';

  try {
    const res = await API.getPropertyNearbyAi(currentProperty.id, true);
    if (res.success && res.data) {
      renderNearbySpots(res.data);
      if (text) text.textContent = 'Rekomendasi Diperbarui!';
      setTimeout(() => {
        if (text) text.textContent = 'Perbarui Rekomendasi AI';
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('fa-spin');
      }, 2000);
    } else {
      alert(res.message || 'Gagal memuat rekomendasi baru.');
      if (text) text.textContent = 'Perbarui Rekomendasi AI';
      if (btn) btn.disabled = false;
      if (icon) icon.classList.remove('fa-spin');
    }
  } catch (err) {
    console.error('Error refreshing AI recommendations:', err);
    if (text) text.textContent = 'Perbarui Rekomendasi AI';
    if (btn) btn.disabled = false;
    if (icon) icon.classList.remove('fa-spin');
  }
}

// ================= BOOKING & PAYMENT FLOW =================
function startBookingRoom(unitId) {
  // If not logged in, redirect directly to /login as requested
  const user = localStorage.getItem('stayjogja_user');
  if (!user) {
    sessionStorage.setItem('redirect_after_login', window.location.href);
    window.location.href = '/login';
    return;
  }

  const prop = currentProperty;
  if (!prop) return;

  const unit = (prop.units || []).find(u => u.id === unitId);
  if (!unit) return alert('Unit kamar tidak ditemukan.');

  const nights = State.searchForm.nights || 1;
  const subtotal = unit.price * nights;
  const tax = Math.round(subtotal * 0.10);
  const total = subtotal + tax;

  currentBookingData = {
    property_id: prop.id,
    unit_id: unit.id,
    nights,
    subtotal,
    tax,
    total
  };

  // Populate Booking Modal
  document.getElementById('booking-prop-name').textContent = prop.name;
  document.getElementById('booking-prop-type').textContent = prop.type.toUpperCase() + (prop.stars ? ` (Bintang ${prop.stars})` : '');
  document.getElementById('booking-unit-name').textContent = `${unit.name} • ${unit.bed_type || '1 King Bed'}`;
  document.getElementById('booking-dates-summary').textContent = `${nights} Malam • ${State.searchForm.checkIn} s/d ${State.searchForm.checkOut}`;
  document.getElementById('booking-prop-photo').src = (unit.photos && unit.photos[0]) || (prop.photos && prop.photos[0]) || '';

  // Costs
  document.getElementById('calc-nights').textContent = nights;
  document.getElementById('calc-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('calc-tax').textContent = formatRupiah(tax);
  document.getElementById('calc-total').textContent = formatRupiah(total);

  // Pre-fill user data
  const rawUser = localStorage.getItem('stayjogja_user');
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      if (u.name) document.getElementById('guest-name').value = u.name;
      if (u.email) document.getElementById('guest-email').value = u.email;
      if (u.phone) document.getElementById('guest-phone').value = u.phone;
    } catch (e) {}
  }

  // Reset NIK and Dukcapil fields so it starts empty
  const nikInput = document.getElementById('guest-nik');
  const addressInput = document.getElementById('guest-address');
  const nikCard = document.getElementById('nik-detect-card');
  const nikBadge = document.getElementById('nik-badge');
  const nikIcon = document.getElementById('nik-icon-status');
  const relSelect = document.getElementById('guest-religion');
  const marSelect = document.getElementById('guest-marital');
  const occInput = document.getElementById('guest-occupation');
  if (nikInput) nikInput.value = '';
  if (addressInput) addressInput.value = '';
  if (nikCard) nikCard.classList.add('hidden');
  if (relSelect) relSelect.value = 'Islam';
  if (marSelect) marSelect.value = 'Belum Kawin';
  if (occInput) occInput.value = 'Pelajar / Mahasiswa';
  if (nikBadge) {
    nikBadge.className = 'text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200';
    nikBadge.textContent = 'Wajib Sesuai KTP';
  }
  if (nikIcon) {
    nikIcon.innerHTML = '<i class="fa-solid fa-id-card"></i>';
    nikIcon.className = 'absolute right-3 top-2.5 text-slate-400 text-sm';
  }

  document.getElementById('booking-modal').classList.remove('hidden');
}

function closeBookingModal() {
  document.getElementById('booking-modal').classList.add('hidden');
}

function handleNikInputChange(val) {
  const nik = String(val).replace(/\D/g, '');
  const badge = document.getElementById('nik-badge');
  const icon = document.getElementById('nik-icon-status');
  const card = document.getElementById('nik-detect-card');
  const genderEl = document.getElementById('nik-detect-gender');
  const birthEl = document.getElementById('nik-detect-birth');
  const regionEl = document.getElementById('nik-detect-region');
  const addressInput = document.getElementById('guest-address');
  const relSelect = document.getElementById('guest-religion');
  const marSelect = document.getElementById('guest-marital');
  const occInput = document.getElementById('guest-occupation');

  if (typeof window.decodeNik !== 'function') return;

  const result = window.decodeNik(nik);
  if (result.isValid) {
    if (badge) {
      badge.className = 'text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300';
      badge.textContent = '✅ NIK Valid Terverifikasi';
    }
    if (icon) {
      icon.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i>';
    }
    if (card) {
      card.classList.remove('hidden');
    }
    if (genderEl) {
      genderEl.textContent = result.gender;
      genderEl.className = result.gender === 'Perempuan' 
        ? 'px-2 py-0.5 bg-pink-600 text-white rounded text-[10px] font-bold'
        : 'px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold';
    }
    if (birthEl) {
      const bPlace = result.birthPlace || (result.regency ? result.regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim() : '') || 'Yogyakarta';
      birthEl.textContent = `${bPlace}, ${result.birthDateFormatted} (${result.age} Th)`;
    }
    if (regionEl) {
      regionEl.textContent = `${result.district ? 'Kec. ' + result.district + ', ' : ''}${result.regency}`;
    }
    if (relSelect && result.religion) {
      relSelect.value = result.religion;
    }
    if (marSelect && result.maritalStatus) {
      marSelect.value = result.maritalStatus;
    }
    if (occInput && result.occupation) {
      occInput.value = result.occupation;
    }
    if (addressInput && (!addressInput.value || addressInput.value.startsWith('Kec.') || addressInput.value.includes('Jl. Malioboro') || addressInput.value.includes('Jl. Kaliurang'))) {
      addressInput.value = `${result.addressKtp}`;
    }
  } else {
    if (card) {
      card.classList.add('hidden');
    }
    if (nik.length === 0) {
      if (badge) {
        badge.className = 'text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200';
        badge.textContent = 'Wajib Sesuai KTP';
      }
      if (icon) {
        icon.innerHTML = '<i class="fa-solid fa-id-card"></i>';
        icon.className = 'absolute right-3 top-2.5 text-slate-400 text-sm';
      }
    } else {
      if (badge) {
        badge.className = 'text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200';
        badge.textContent = `${nik.length}/16 Digit NIK`;
      }
      if (icon) {
        icon.innerHTML = '<i class="fa-solid fa-circle-info text-amber-500"></i>';
      }
    }
    if (birthEl) {
      birthEl.textContent = '-';
    }
    if (regionEl) {
      regionEl.textContent = '-';
    }
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  if (!currentBookingData) return;

  const nikInput = document.getElementById('guest-nik');
  const addressInput = document.getElementById('guest-address');
  const relSelect = document.getElementById('guest-religion');
  const marSelect = document.getElementById('guest-marital');
  const occInput = document.getElementById('guest-occupation');

  const guestNik = nikInput ? nikInput.value.replace(/\D/g, '') : '';
  const guestAddress = addressInput ? addressInput.value.trim() : '';
  const guestReligion = relSelect ? relSelect.value : 'Islam';
  const guestMarital = marSelect ? marSelect.value : 'Belum Kawin';
  const guestOccupation = occInput ? occInput.value.trim() : 'Karyawan Swasta';
  const guestCitizenship = 'WNI';

  if (!guestNik || guestNik.length < 16) {
    alert('Mohon masukkan 16 digit NIK KTP Anda yang valid sebelum melanjutkan pemesanan.');
    if (nikInput) nikInput.focus();
    return;
  }

  const payload = {
    user_id: getActiveUserId(),
    property_id: currentBookingData.property_id,
    unit_id: currentBookingData.unit_id,
    guest_name: document.getElementById('guest-name').value,
    guest_email: document.getElementById('guest-email').value,
    guest_phone: document.getElementById('guest-phone').value,
    guest_nik: guestNik,
    guest_address: guestAddress,
    guest_religion: guestReligion,
    guest_marital_status: guestMarital,
    guest_occupation: guestOccupation,
    guest_citizenship: guestCitizenship,
    special_requests: document.getElementById('special-requests').value,
    check_in: State.searchForm.checkIn,
    check_out: State.searchForm.checkOut,
    nights: currentBookingData.nights,
    guests_count: State.searchForm.guests || 2
  };

  try {
    const res = await API.createReservation(payload);
    if (!res.success) return alert(res.message || 'Gagal membuat reservasi.');

    State.activeBooking = res.data;
    closeBookingModal();
    openPaymentModal(res.data);
  } catch (err) {
    console.error('Error submitting booking:', err);
    alert('Terjadi kesalahan saat memproses pesanan.');
  }
}

function openPaymentModal(reservation) {
  document.getElementById('payment-total-amount').textContent = formatRupiah(reservation.total_price);
  document.getElementById('payment-booking-code').textContent = `Kode Booking: ${reservation.booking_code}`;

  const qrisUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=STAYJOGJA-QRIS-${reservation.booking_code}-${reservation.total_price}`;
  document.getElementById('payment-qris-img').src = qrisUrl;

  document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

async function simulateSuccessfulPayment() {
  if (!State.activeBooking) return;
  const btn = document.getElementById('btn-simulate-pay');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Memproses Transaksi...</span>`;

  try {
    const res = await API.simulatePayment(State.activeBooking.id, 'qris');
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Simulasi Pembayaran Berhasil (Sandbox)</span>`;

    if (res.success) {
      alert(`Pembayaran QRIS Berhasil!\n\nKode Booking: ${State.activeBooking.booking_code}\nPesanan Anda telah diteruskan ke pemilik hotel.`);
      closePaymentModal();
      window.location.href = '/user';
    } else {
      alert('Simulasi pembayaran gagal.');
    }
  } catch (err) {
    console.error('Error simulating payment:', err);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Simulasi Pembayaran Berhasil (Sandbox)</span>`;
    alert('Terjadi kesalahan koneksi.');
  }
}

// Lightbox Photo Viewer
function openPhotoViewer(idx = 0) {
  const p = currentProperty;
  if (!p || !p.photos || p.photos.length === 0) return;
  window.open(p.photos[idx] || p.photos[0], '_blank');
}

// ================= AI TRAVEL ITINERARY PLANNER =================
let selectedItineraryDays = 1;
let recommendedStayDays = 1;
let userManuallyChangedDays = false;
let selectedItineraryPref = 'semua';
let currentGeneratedItinerary = null;

function syncItineraryDaysWithStay(nights, force = false) {
  const stayDays = Math.max(1, Math.min(parseInt(nights, 10) || 1, 7));
  recommendedStayDays = stayDays;

  // Update hint text
  const hintEl = document.getElementById('itinerary-hint-nights');
  if (hintEl) {
    if (stayDays === 1) {
      hintEl.textContent = '1 Hari (1 Malam)';
    } else {
      hintEl.textContent = `${stayDays} Hari (${stayDays} Malam)`;
    }
  }

  // If user hasn't manually selected a specific day count, or if forced
  if (!userManuallyChangedDays || force) {
    selectedItineraryDays = stayDays;
  }

  renderItineraryDayButtons();
}

function renderItineraryDayButtons() {
  const container = document.getElementById('itinerary-days-selector');
  if (!container) return;

  // Generate options from 1 up to max(4, recommendedStayDays)
  const maxDay = Math.max(4, recommendedStayDays);
  const daysList = [];
  for (let i = 1; i <= maxDay; i++) {
    daysList.push(i);
  }

  container.innerHTML = daysList.map(d => {
    const isSelected = d === selectedItineraryDays;
    const isRecommended = d === recommendedStayDays;

    let label = `${d} Hari`;
    if (d === 1) label = '1 Hari';
    else if (d === 2) label = '2 Hari 1 Malam';
    else if (d === 3) label = '3 Hari 2 Malam';
    else if (d === 4) label = '4 Hari 3 Malam';
    else label = `${d} Hari (${d-1} Malam)`;

    const activeClasses = isSelected
      ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400';

    const recBadge = isRecommended
      ? `<span class="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'}">Default Menginap</span>`
      : '';

    return `
      <button type="button" onclick="selectItineraryDays(${d}, true)" class="itinerary-day-btn px-3.5 py-2 rounded-xl text-xs font-bold border ${activeClasses} transition cursor-pointer flex items-center gap-1" data-days="${d}" title="${isRecommended ? 'Sesuai durasi menginap yang Anda pilih' : `Pilih rencana ${d} hari`}">
        <span>${label}</span>
        ${recBadge}
      </button>
    `;
  }).join('');
}

function selectItineraryDays(days, isManual = false) {
  selectedItineraryDays = parseInt(days, 10) || 1;
  if (isManual) {
    userManuallyChangedDays = true;
  }
  renderItineraryDayButtons();
}

function selectItineraryPref(pref) {
  selectedItineraryPref = pref || 'semua';
  const btns = document.querySelectorAll('.itinerary-pref-btn');
  btns.forEach(b => {
    const p = b.getAttribute('data-pref');
    if (p === selectedItineraryPref) {
      b.className = 'itinerary-pref-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-500 bg-amber-50 text-amber-900 transition cursor-pointer';
    } else {
      b.className = 'itinerary-pref-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 transition cursor-pointer';
    }
  });
}

async function triggerGenerateItinerary() {
  if (!currentProperty || !currentProperty.id) {
    alert('Data properti belum termuat.');
    return;
  }

  const container = document.getElementById('itinerary-output-container');
  const btn = document.getElementById('btn-generate-itinerary');
  const textBtn = document.getElementById('text-generate-itinerary');

  if (btn) btn.disabled = true;
  if (textBtn) textBtn.textContent = 'Menyusun Rute Terbaik...';

  if (container) {
    container.innerHTML = `
      <div class="bg-white p-5 sm:p-6 rounded-2xl border border-amber-200/90 shadow-sm space-y-5 animate-in fade-in duration-200">
        <!-- Skeleton Header -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div class="space-y-2 flex-1 max-w-md">
            <div class="h-4 w-36 rounded-md skeleton-shimmer-amber"></div>
            <div class="h-6 w-3/4 rounded-lg skeleton-shimmer"></div>
            <div class="h-3 w-1/2 rounded-md skeleton-shimmer"></div>
          </div>
          <div class="flex gap-2">
            <div class="h-8 w-28 rounded-xl skeleton-shimmer"></div>
            <div class="h-8 w-20 rounded-xl skeleton-shimmer"></div>
          </div>
        </div>

        <!-- Skeleton Day Pills -->
        <div class="flex gap-2 border-b border-slate-100 pb-3">
          <div class="h-8 w-24 rounded-xl skeleton-shimmer-amber"></div>
          <div class="h-8 w-24 rounded-xl skeleton-shimmer"></div>
          <div class="h-8 w-24 rounded-xl skeleton-shimmer"></div>
        </div>

        <!-- Skeleton Day Banner -->
        <div class="p-4 rounded-2xl border border-amber-100 flex items-center gap-3 bg-amber-50/40">
          <div class="w-8 h-8 rounded-xl skeleton-shimmer-amber shrink-0"></div>
          <div class="space-y-1.5 flex-1">
            <div class="h-4 w-48 rounded skeleton-shimmer"></div>
            <div class="h-3 w-72 rounded skeleton-shimmer"></div>
          </div>
        </div>

        <!-- Skeleton Timeline Slots -->
        <div class="space-y-1 pt-1">
          <!-- Slot 1: Pagi -->
          <div class="relative pl-6 pb-6 border-l-2 border-amber-200">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-amber-400"></div>
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div class="flex justify-between items-center">
                <div class="h-4 w-28 rounded-md skeleton-shimmer-amber"></div>
                <div class="h-3 w-20 rounded skeleton-shimmer"></div>
              </div>
              <div class="h-4 w-56 rounded skeleton-shimmer"></div>
              <div class="h-3 w-full rounded skeleton-shimmer"></div>
              <div class="h-3 w-4/5 rounded skeleton-shimmer"></div>
              <div class="h-9 w-full rounded-xl skeleton-shimmer-amber mt-2"></div>
            </div>
          </div>

          <!-- Slot 2: Siang -->
          <div class="relative pl-6 pb-6 border-l-2 border-amber-200">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-amber-300"></div>
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div class="flex justify-between items-center">
                <div class="h-4 w-28 rounded-md skeleton-shimmer"></div>
                <div class="h-3 w-20 rounded skeleton-shimmer"></div>
              </div>
              <div class="h-4 w-44 rounded skeleton-shimmer"></div>
              <div class="h-3 w-full rounded skeleton-shimmer"></div>
            </div>
          </div>

          <!-- Slot 3: Malam -->
          <div class="relative pl-6 pb-2 border-l-2 border-amber-200">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-amber-300"></div>
            <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div class="flex justify-between items-center">
                <div class="h-4 w-28 rounded-md skeleton-shimmer"></div>
                <div class="h-3 w-20 rounded skeleton-shimmer"></div>
              </div>
              <div class="h-4 w-48 rounded skeleton-shimmer"></div>
              <div class="h-3 w-3/4 rounded skeleton-shimmer"></div>
            </div>
          </div>
        </div>

        <div class="text-center pt-2">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 shadow-xs">
            <i class="fa-solid fa-wand-magic-sparkles text-amber-600 animate-spin"></i>
            <span>Gemini AI sedang mengoptimalkan rute cerdas & kuliner legendaris sekitar ${currentProperty.name}...</span>
          </div>
        </div>
      </div>
    `;
  }

  try {
    const res = await API.generatePropertyItinerary(currentProperty.id, selectedItineraryDays, selectedItineraryPref);
    if (res.success && res.data) {
      currentGeneratedItinerary = res.data;
      renderItineraryResult(res.data);
    } else {
      alert(res.message || 'Gagal menyusun itinerary.');
      if (container) {
        container.innerHTML = `
          <div class="p-6 bg-red-50 text-red-700 rounded-2xl text-xs text-center border border-red-200">
            Terjadi kendala saat memproses itinerary. Silakan klik tombol buat kembali.
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Error generating itinerary:', err);
    alert('Terjadi kesalahan koneksi saat memproses AI itinerary.');
  } finally {
    if (btn) btn.disabled = false;
    if (textBtn) textBtn.textContent = 'Buat Jadwal Liburan dengan AI';
  }
}

function renderItineraryResult(itinerary) {
  const container = document.getElementById('itinerary-output-container');
  if (!container || !itinerary || !itinerary.days) return;

  const days = itinerary.days;
  const tripTitle = itinerary.trip_title || `Rencana Liburan ${days.length} Hari di Sekitar ${currentProperty.name}`;

  const tabsHtml = days.map((d, idx) => `
    <button type="button" onclick="switchItineraryDayTab(${idx})" id="itin-tab-${idx}" class="itin-day-tab px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${idx === 0 ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
      Hari ke-${d.day_number || (idx + 1)}
    </button>
  `).join('');

  const daysContentHtml = days.map((d, idx) => {
    const scheduleItems = (d.schedule || []).map(item => {
      let icon = 'fa-sun text-amber-500';
      let periodLabel = 'Pagi';
      let slotBg = 'bg-amber-50 text-amber-900 border-amber-200';

      const pLower = (item.period || item.time_slot || '').toLowerCase();
      if (pLower.includes('pagi')) {
        icon = 'fa-mug-saucer text-amber-600';
        periodLabel = '🌅 Pagi';
        slotBg = 'bg-amber-50 text-amber-900 border-amber-200';
      } else if (pLower.includes('siang')) {
        icon = 'fa-sun text-orange-500';
        periodLabel = '☀️ Siang';
        slotBg = 'bg-orange-50 text-orange-900 border-orange-200';
      } else if (pLower.includes('sore')) {
        icon = 'fa-cloud-sun text-rose-500';
        periodLabel = '🌇 Sore';
        slotBg = 'bg-rose-50 text-rose-900 border-rose-200';
      } else if (pLower.includes('malam')) {
        icon = 'fa-moon text-indigo-600';
        periodLabel = '🌙 Malam';
        slotBg = 'bg-indigo-50 text-indigo-900 border-indigo-200';
      }

      const mapsUrl = item.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.maps_query || item.location_name) + ' Yogyakarta')}`;

      return `
        <div class="relative pl-6 sm:pl-8 pb-6 last:pb-2 border-l-2 border-amber-200/80">
          <!-- Timeline Pin -->
          <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-amber-500 shadow-xs"></div>
          
          <div class="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-amber-300 transition shadow-xs space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${slotBg}">
                <i class="fa-solid ${icon}"></i> ${item.time_slot || periodLabel}
              </span>
              <span class="text-[10px] font-semibold text-slate-500">
                <i class="fa-solid fa-location-dot text-amber-600"></i> ${item.distance_from_hotel || 'Dekat Hotel'}
              </span>
            </div>

            <div>
              <h5 class="text-sm font-extrabold text-slate-900">${item.location_name}</h5>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">${item.activity}</p>
            </div>

            ${item.tips ? `
              <div class="p-2.5 bg-amber-50/60 border border-amber-100/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-1.5">
                <i class="fa-regular fa-lightbulb text-amber-600 mt-0.5 shrink-0"></i>
                <span><strong>Tips Praktis:</strong> ${item.tips}</span>
              </div>
            ` : ''}

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Rute dari: ${currentProperty.name}</span>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-xl transition">
                <span>Buka Petunjuk Arah</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div id="itin-day-content-${idx}" class="itin-day-content space-y-4 ${idx === 0 ? '' : 'hidden'}">
        <div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/80 flex items-start gap-3">
          <div class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
            H${d.day_number || (idx + 1)}
          </div>
          <div>
            <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm">${d.title || `Hari ke-${idx + 1}`}</h4>
            <p class="text-xs text-slate-600 mt-0.5">${d.summary || 'Rencana perjalanan seru sepanjang hari.'}</p>
          </div>
        </div>

        <div class="pt-2">
          ${scheduleItems}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="bg-white p-5 sm:p-6 rounded-2xl border border-amber-200/80 shadow-xs space-y-5 animate-in fade-in duration-200">
      
      <!-- Print Only Header (Starts line 1 of page 1) -->
      <div class="hidden print:block pb-4 mb-4 border-b-2 border-slate-900">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="/images/logo-stayjogja.png" alt="StayJogja" class="w-10 h-10 object-contain" />
            <div>
              <h2 class="text-xs font-black uppercase tracking-widest text-slate-500">STAYJOGJA TRAVEL COMPANION</h2>
              <h1 class="text-base font-extrabold text-slate-900 leading-tight">${tripTitle}</h1>
              <p class="text-[11px] text-slate-600 mt-0.5">Pusat Akomodasi: <strong>${itinerary.hotel_base || currentProperty.name}</strong> • Durasi: <strong>${days.length} Hari Liburan</strong></p>
            </div>
          </div>
          <div class="text-right text-[10px] text-slate-400 shrink-0">
            <p class="font-bold text-slate-700">Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>stayjogja.com</p>
          </div>
        </div>
      </div>

      <!-- Itinerary On-Screen Header (Hidden on Print) -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Jadwal ${days.length} Hari Terkonfirmasi
          </span>
          <h3 class="text-base sm:text-lg font-extrabold text-slate-900 mt-1">${tripTitle}</h3>
          <p class="text-xs text-slate-500">Pusat Akomodasi: <strong>${itinerary.hotel_base || currentProperty.name}</strong></p>
        </div>

        <div class="flex items-center flex-wrap gap-2">
          <button type="button" id="btn-save-itin" onclick="saveCurrentItineraryToUser()" class="px-3.5 py-1.5 btn-gold text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:shadow-md" title="Simpan Rencana Liburan ke Akun Saya">
            <i class="fa-solid fa-bookmark" id="icon-save-itin"></i>
            <span id="text-save-itin">Simpan ke Akun</span>
          </button>
          <button type="button" onclick="copyItineraryText()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer" title="Salin Jadwal Teks">
            <i class="fa-regular fa-copy"></i>
            <span id="text-copy-itin">Salin Teks</span>
          </button>
          <button type="button" onclick="printItineraryDocument()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer" title="Cetak / Simpan PDF">
            <i class="fa-solid fa-print"></i>
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      <!-- Day Tabs (Hidden on Print) -->
      <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-3 print:hidden">
        ${tabsHtml}
      </div>

      <!-- Schedule Timelines -->
      <div>
        ${daysContentHtml}
      </div>

      <!-- Footer Note -->
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <i class="fa-solid fa-shield-halved text-amber-600"></i>
        <span>Semua rute telah dioptimalkan agar Anda kembali dengan mudah dan aman ke <strong>${currentProperty.name}</strong>.</span>
      </div>

    </div>
  `;
}

function printItineraryDocument() {
  const source = document.getElementById('itinerary-output-container');
  if (!source) return;

  let printSheet = document.getElementById('print-itinerary-sheet');
  if (!printSheet) {
    printSheet = document.createElement('div');
    printSheet.id = 'print-itinerary-sheet';
    document.body.appendChild(printSheet);
  }

  // Clone itinerary card directly into root level print sheet
  printSheet.innerHTML = source.innerHTML;

  // Unhide all days so they print in full sequence
  printSheet.querySelectorAll('.itin-day-content').forEach(el => {
    el.classList.remove('hidden');
    el.style.display = 'block';
  });

  document.body.classList.add('printing-itinerary');

  const cleanup = () => {
    document.body.classList.remove('printing-itinerary');
    if (printSheet) printSheet.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 2500);
}

function switchItineraryDayTab(idx) {
  const tabs = document.querySelectorAll('.itin-day-tab');
  const contents = document.querySelectorAll('.itin-day-content');

  tabs.forEach((t, i) => {
    if (i === idx) {
      t.className = 'itin-day-tab px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer bg-amber-600 text-white shadow-xs';
    } else {
      t.className = 'itin-day-tab px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200';
    }
  });

  contents.forEach((c, i) => {
    if (i === idx) {
      c.classList.remove('hidden');
    } else {
      c.classList.add('hidden');
    }
  });
}

function copyItineraryText() {
  if (!currentGeneratedItinerary) return;
  const itin = currentGeneratedItinerary;
  const lines = [
    `=== ${itin.trip_title || 'ITINERARY STAYJOGJA'} ===`,
    `Hotel: ${itin.hotel_base || (currentProperty && currentProperty.name)}`,
    `Durasi: ${itin.total_days || itin.days.length} Hari`,
    '----------------------------------------'
  ];

  (itin.days || []).forEach(d => {
    lines.push(`\n[${d.title || `Hari ke-${d.day_number}`}]`);
    if (d.summary) lines.push(`${d.summary}`);
    (d.schedule || []).forEach(s => {
      lines.push(`\n• ${s.time_slot || s.period}: ${s.location_name} (${s.distance_from_hotel || ''})`);
      lines.push(`  Aktivitas: ${s.activity}`);
      if (s.tips) lines.push(`  Tips: ${s.tips}`);
    });
  });

  lines.push('\n----------------------------------------');
  lines.push('Dibuat otomatis oleh StayJogja AI Trip Planner');

  const textToCopy = lines.join('\n');
  navigator.clipboard.writeText(textToCopy).then(() => {
    const textEl = document.getElementById('text-copy-itin');
    if (textEl) {
      textEl.textContent = 'Tersalin!';
      setTimeout(() => { textEl.textContent = 'Salin Teks'; }, 2500);
    }
  }).catch(() => {
    alert('Gagal menyalin teks secara otomatis.');
  });
}

/**
 * Simpan Itinerary AI Aktif ke Akun Pengguna
 */
async function saveCurrentItineraryToUser() {
  if (!currentGeneratedItinerary) return;

  const rawUser = localStorage.getItem('stayjogja_user');
  if (!rawUser) {
    if (confirm('Silakan login terlebih dahulu untuk menyimpan rencana perjalanan ini ke akun Anda.\n\nApakah Anda ingin membuka halaman login sekarang?')) {
      sessionStorage.setItem('redirect_after_login', window.location.href);
      window.location.href = '/login';
    }
    return;
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch (e) {
    return alert('Sesi login tidak valid. Silakan login ulang.');
  }

  const btn = document.getElementById('btn-save-itin');
  const icon = document.getElementById('icon-save-itin');
  const text = document.getElementById('text-save-itin');

  if (btn) btn.disabled = true;
  if (text) text.textContent = 'Menyimpan...';

  try {
    const payload = {
      user_id: user.id,
      property_id: currentProperty ? currentProperty.id : null,
      property_name: currentProperty ? currentProperty.name : currentGeneratedItinerary.hotel_base,
      property_image: (currentProperty && currentProperty.photos && currentProperty.photos[0]) || '/images/hotels/tentrem-main.jpg',
      trip_title: currentGeneratedItinerary.trip_title,
      days_count: currentGeneratedItinerary.total_days || (currentGeneratedItinerary.days ? currentGeneratedItinerary.days.length : 2),
      preference: currentGeneratedItinerary.preference || selectedItineraryPref || 'semua',
      itinerary: currentGeneratedItinerary
    };

    const res = await API.saveUserItinerary(payload);
    if (res.success) {
      if (btn) {
        btn.className = 'px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs';
      }
      if (icon) {
        icon.className = 'fa-solid fa-circle-check';
      }
      if (text) {
        text.textContent = 'Tersimpan di Akun';
      }

      showSavedItinToast();
    } else {
      alert(res.message || 'Gagal menyimpan rencana perjalanan.');
      if (btn) btn.disabled = false;
      if (text) text.textContent = 'Simpan ke Akun';
    }
  } catch (err) {
    console.error('Error saving itinerary:', err);
    alert('Terjadi kesalahan koneksi saat menyimpan itinerary.');
    if (btn) btn.disabled = false;
    if (text) text.textContent = 'Simpan ke Akun';
  }
}

/**
 * Tampilkan Toast Notifikasi Sukses Simpan Itinerary
 */
function showSavedItinToast() {
  const existing = document.getElementById('itin-saved-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'itin-saved-toast';
  toast.className = 'fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300 max-w-md';
  toast.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
      <i class="fa-solid fa-bookmark text-sm"></i>
    </div>
    <div class="text-xs flex-1">
      <div class="font-extrabold text-amber-300">Rencana Liburan Tersimpan!</div>
      <div class="text-slate-300 text-[11px] mt-0.5">Tersambung ke akun Anda. Buka kapan saja di Dashboard Tamu.</div>
    </div>
    <a href="/user#itinerary" class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition shrink-0">
      Lihat Hub →
    </a>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast) {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
      setTimeout(() => toast.remove(), 500);
    }
  }, 6000);
}

