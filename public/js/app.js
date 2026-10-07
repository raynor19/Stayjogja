// Main Application Controller for StayJogja
let currentPayMethod = 'qris';
let currentBookingData = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupDefaultDates();
  renderGuestsStepperUI();
  updateGuestsInputLabel();
  initUrlParams();
  loadProperties();
  updateUserBookingsBadge();
  initNavbarAuth();
  restoreChatHistory();

  // Listen to State changes
  State.subscribe(state => {
    updateRoleUI(state.activeRole);
  });
});

function initUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const area = params.get('area');
  const type = params.get('type');
  const cin = params.get('checkIn');
  const cout = params.get('checkOut');

  if (area && document.getElementById('search-location')) {
    document.getElementById('search-location').value = area;
    State.searchForm.location = area;
  }
  if (type) {
    setTypeFilter(type);
  }
  if (cin && document.getElementById('search-check-in')) {
    document.getElementById('search-check-in').value = cin;
    State.searchForm.checkIn = cin;
  }
  if (cout && document.getElementById('search-check-out')) {
    document.getElementById('search-check-out').value = cout;
    State.searchForm.checkOut = cout;
  }
}

// Manage Navbar User Profile / Login status with Strict Role Separation
function initNavbarAuth() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  const activeOrdersBtn = document.getElementById('nav-btn-active-orders');
  const historyOrdersBtn = document.getElementById('nav-btn-history-orders');
  const ownerBtn = document.getElementById('nav-btn-owner');
  const teraBtn = document.getElementById('nav-btn-tera');
  const adminBtn = document.getElementById('nav-btn-admin');
  const checkinBtn = document.getElementById('nav-btn-checkin');

  const setVisible = (el, show, flexClass = 'inline-flex') => {
    if (!el) return;
    if (show) {
      el.classList.remove('hidden');
      el.classList.add(flexClass);
    } else {
      el.classList.add('hidden');
      el.classList.remove('inline-flex', 'lg:inline-flex', 'xl:inline-flex');
    }
  };

  const rawUser = localStorage.getItem('stayjogja_user');
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      const firstName = user.name ? user.name.split(' ')[0] : 'Akun';
      const roleBadge = user.role === 'admin' ? 'Admin' : (user.role === 'owner' ? 'Owner' : 'Tamu');
      const roleColor = user.role === 'admin' ? 'bg-purple-100 text-purple-700' : (user.role === 'owner' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700');
      let profileUrl = '/user';
      let profileTitle = 'Buka Dashboard Tamu';
      if (user.role === 'admin') {
        profileUrl = '/admin';
        profileTitle = 'Buka Dashboard Admin';
      } else if (user.role === 'owner') {
        profileUrl = '/owner';
        profileTitle = 'Buka Dashboard Owner';
      }
      const profileButton = `<a href="${profileUrl}" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200" title="${profileTitle}">`;
      const closeTag = '</a>';

      // ROLE FILTER:
      if (user.role === 'user') {
        // TAMU: Show only guest order tools, STRICTLY HIDE internal staff/owner tools
        setVisible(activeOrdersBtn, true, 'inline-flex');
        setVisible(historyOrdersBtn, true, 'inline-flex');
        setVisible(ownerBtn, false);
        setVisible(teraBtn, false);
        setVisible(adminBtn, false);
        setVisible(checkinBtn, false);
      } else if (user.role === 'owner') {
        // OWNER: Show Owner management & register property, hide guest orders & frontdesk
        setVisible(activeOrdersBtn, false);
        setVisible(historyOrdersBtn, false);
        setVisible(ownerBtn, true, 'inline-flex');
        setVisible(teraBtn, true, 'inline-flex');
        setVisible(adminBtn, false);
        setVisible(checkinBtn, false);
      } else if (user.role === 'admin') {
        // ADMIN: Show Admin panel & receptionist check-in portal
        setVisible(activeOrdersBtn, false);
        setVisible(historyOrdersBtn, false);
        setVisible(ownerBtn, false);
        setVisible(teraBtn, false);
        setVisible(adminBtn, true, 'inline-flex');
        setVisible(checkinBtn, true, 'inline-flex');
      }

      container.innerHTML = `
        <div class="flex items-center gap-2">
          ${profileButton}
            <span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              <i class="fa-solid fa-user"></i>
            </span>
            <span class="max-w-[110px] truncate">${firstName}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ${roleColor}">${roleBadge}</span>
          ${closeTag}
          <button onclick="openGlobalEditProfileModal(event)" title="Edit Profil" class="p-2 text-xs font-bold text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer">
            <i class="fa-solid fa-user-pen"></i>
          </button>
          <button onclick="handleLogout()" title="Keluar / Ganti Akun" class="p-2 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;
      return;
    } catch (e) {
      console.error(e);
    }
  }

  // Guest / Unauthenticated Visitor
  setVisible(activeOrdersBtn, true, 'inline-flex');
  setVisible(historyOrdersBtn, true, 'inline-flex');
  setVisible(ownerBtn, false);
  setVisible(teraBtn, true, 'hidden lg:inline-flex');
  setVisible(adminBtn, false);
  setVisible(checkinBtn, false);

  container.innerHTML = `
    <a href="/login" class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white btn-gold shadow-md hover:scale-105 transition cursor-pointer">
      <i class="fa-solid fa-right-to-bracket"></i>
      <span>Masuk / Login</span>
    </a>
  `;
}

function handleLogout() {
  localStorage.removeItem('stayjogja_user');
  window.location.href = '/';
}

// Setup default Check-in & Check-out dates (Today & Tomorrow)
function setupDefaultDates() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = d => d.toISOString().split('T')[0];

  const checkInInput = document.getElementById('search-check-in');
  const checkOutInput = document.getElementById('search-check-out');

  if (checkInInput && checkOutInput) {
    checkInInput.value = formatDate(today);
    checkOutInput.value = formatDate(tomorrow);
    checkInInput.min = formatDate(today);
    checkOutInput.min = formatDate(today);

    checkInInput.addEventListener('change', calculateNights);
    checkOutInput.addEventListener('change', calculateNights);
    calculateNights();
  }
}

// Calculate nights between check-in and check-out
function calculateNights() {
  const cin = document.getElementById('search-check-in').value;
  const cout = document.getElementById('search-check-out').value;
  const badge = document.getElementById('nights-count-badge');

  if (cin && cout) {
    const d1 = new Date(cin);
    const d2 = new Date(cout);
    const diffTime = d2 - d1;
    let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights <= 0) nights = 1;
    State.searchForm.nights = nights;
    State.searchForm.checkIn = cin;
    State.searchForm.checkOut = cout;
    try {
      sessionStorage.setItem('stayjogja_search_dates', JSON.stringify({ checkIn: cin, checkOut: cout, nights }));
    } catch(e) {}
    if (badge) badge.textContent = `${nights} Malam`;
  }
}

// Format IDR Currency
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// Fetch & Render Properties
async function loadProperties() {
  const loading = document.getElementById('loading-state');
  const container = document.getElementById('property-list-container');
  const empty = document.getElementById('empty-state');
  const countBadge = document.getElementById('results-count-badge');

  if (loading) loading.classList.remove('hidden');
  if (container) container.innerHTML = '';
  if (empty) empty.classList.add('hidden');

  try {
    const res = await API.getProperties(State.filters);
    if (loading) loading.classList.add('hidden');

    if (res.success && res.data.length > 0) {
      if (countBadge) countBadge.textContent = `${res.data.length} Akomodasi Tersedia`;
      renderPropertyList(res.data);
    } else {
      if (countBadge) countBadge.textContent = '0 Akomodasi';
      if (empty) empty.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Failed to load properties:', err);
    if (loading) loading.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
  }
}

// Render Bento Property Cards (StayJogja UI/UX Pro Max)
function renderPropertyList(properties) {
  const container = document.getElementById('property-list-container');
  if (!container) return;

  container.innerHTML = properties.map(p => {
    // Star rating markup
    let starsHtml = '';
    if (p.type === 'hotel' && p.stars) {
      starsHtml = `<span class="star-rating ml-1.5 text-xs text-amber-500 font-bold">` + '★'.repeat(p.stars) + '☆'.repeat(5 - p.stars) + `</span>`;
    }

    // Type badge style
    let typeBadgeColor = 'bg-slate-900/85 text-amber-300 border border-amber-500/30';
    let typeIcon = 'fa-hotel';
    let typeLabel = `Hotel ${p.stars ? 'Bintang ' + p.stars : ''}`;
    if (p.type === 'homestay') {
      typeBadgeColor = 'bg-emerald-950/85 text-emerald-300 border border-emerald-500/30';
      typeIcon = 'fa-house-chimney';
      typeLabel = 'Homestay';
    } else if (p.type === 'apartemen') {
      typeBadgeColor = 'bg-purple-950/85 text-purple-300 border border-purple-500/30';
      typeIcon = 'fa-building';
      typeLabel = 'Apartemen';
    }

    // Facilities snippet
    const facHtml = (p.facilities || []).slice(0, 3).map(f => `
      <span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-[11px] font-medium border border-slate-200/60">
        <i class="fa-solid fa-check text-amber-600 text-[9px]"></i> ${f}
      </span>
    `).join('');

    const mainPhoto = (p.photos && p.photos[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

    return `
      <div class="bento-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-card flex flex-col md:flex-row hover:border-amber-400 transition-all duration-300">
        
        <!-- Image Box with Zoom Effect -->
        <a href="/detail?id=${p.id}" class="card-img-zoom md:w-72 h-52 md:h-auto relative flex-shrink-0 bg-slate-100 block">
          <img src="${mainPhoto}" alt="${p.name}" class="w-full h-full object-cover">
          <div class="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
            <span class="px-2.5 py-1 rounded-xl text-[11px] font-bold ${typeBadgeColor} shadow-sm backdrop-blur-md flex items-center gap-1.5">
              <i class="fa-solid ${typeIcon}"></i> ${typeLabel}
            </span>
          </div>
        </a>

        <!-- Details Box -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <a href="/detail?id=${p.id}" class="text-base sm:text-lg font-bold text-slate-900 hover:text-amber-700 transition block font-display">
                  ${p.name} ${starsHtml}
                </a>
                <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                  <i class="fa-solid fa-location-dot text-amber-600"></i> ${p.area} • <span class="text-slate-400">${p.address}</span>
                </p>
              </div>

              <!-- Rating Badge -->
              <div class="text-right flex-shrink-0">
                <div class="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-sm">
                  <span>${p.rating || '9.0'}</span>
                  <i class="fa-solid fa-star text-[10px] text-amber-100"></i>
                </div>
                <span class="block text-[10px] text-slate-400 mt-0.5">(${p.review_count || 120} ulasan)</span>
              </div>
            </div>

            <p class="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
              ${p.description}
            </p>

            <!-- Facilities tags -->
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${facHtml}
            </div>
          </div>

          <!-- Price & Action Box -->
          <div class="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span class="text-[11px] text-slate-400 block font-medium">Mulai dari</span>
              <div class="text-lg sm:text-xl font-black text-amber-700 font-display">
                ${formatRupiah(p.min_price)} <span class="text-xs font-normal text-slate-500 font-sans">/malam</span>
              </div>
            </div>
            <button type="button" onclick="handleBookNowClick('${p.id}')" class="px-5 py-2.5 btn-gold text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95">
              <span>Book Now</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}
const renderProperties = renderPropertyList;

// Handle Book Now Click (Directly to /login if guest, or /detail if authenticated)
function handleBookNowClick(propId = null) {
  const user = localStorage.getItem('stayjogja_user');
  if (!user) {
    if (propId) {
      sessionStorage.setItem('redirect_after_login', `/detail?id=${propId}`);
    }
    window.location.href = '/login';
    return;
  }

  if (propId) {
    window.location.href = `/detail?id=${propId}`;
  } else {
    const listEl = document.getElementById('property-list');
    if (listEl) {
      listEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/tamu#property-list';
    }
  }
}

// Open Property Detail (Navigate to dedicated /detail page)
function openPropertyDetail(propId) {
  handleBookNowClick(propId);
}

function closePropertyDetailModal() {
  document.getElementById('property-detail-modal').classList.add('hidden');
}

// Open Room Detail Modal (Photos & Room Description)
function openRoomDetail(propId, unitId) {
  const prop = State.currentProperty;
  if (!prop) return;
  const unit = (prop.units || []).find(u => u.id === unitId);
  if (!unit) return;

  // Header
  document.getElementById('room-modal-hotel-name').textContent = `${prop.name} ${prop.stars ? '• Hotel Bintang ' + prop.stars : ''}`;
  document.getElementById('room-modal-name').textContent = unit.name;

  // Photos
  const photos = (unit.photos && unit.photos.length > 0) ? unit.photos : (prop.photos || []);
  const mainPhotoEl = document.getElementById('room-modal-main-photo');
  mainPhotoEl.src = photos[0];
  document.getElementById('room-modal-photo-indicator').textContent = `Foto 1 dari ${photos.length}`;

  const thumbsContainer = document.getElementById('room-modal-thumbnails');
  thumbsContainer.innerHTML = photos.map((url, idx) => `
    <div onclick="switchRoomMainPhoto('${url}', ${idx + 1}, ${photos.length})" class="cursor-pointer rounded-xl overflow-hidden border-2 hover:border-blue-500 transition h-16 sm:h-20 ${idx === 0 ? 'border-blue-600' : 'border-transparent'}">
      <img src="${url}" class="w-full h-full object-cover" alt="Thumbnail Kamar ${idx + 1}">
    </div>
  `).join('');

  // Specs
  document.getElementById('room-modal-bed').textContent = unit.bed_type;
  document.getElementById('room-modal-size').textContent = unit.size || '28 m²';
  document.getElementById('room-modal-capacity').textContent = `Maks ${unit.capacity} Tamu`;
  document.getElementById('room-modal-view').textContent = unit.view || 'Pemandangan Kota';

  // Description
  document.getElementById('room-modal-desc').textContent = unit.description || `Nikmati kenyamanan beristirahat di ${unit.name} yang dilengkapi ${unit.bed_type} berkualitas tinggi, pendingin ruangan (AC), air panas, serta fasilitas terbaik untuk mendukung kunjungan Anda di Yogyakarta.`;

  // Facilities
  const facContainer = document.getElementById('room-modal-facilities');
  facContainer.innerHTML = (unit.facilities || []).map(f => {
    let icon = 'fa-circle-check';
    const lower = f.toLowerCase();
    if (lower.includes('sarapan')) icon = 'fa-utensils';
    else if (lower.includes('ac')) icon = 'fa-snowflake';
    else if (lower.includes('wifi')) icon = 'fa-wifi';
    else if (lower.includes('tv')) icon = 'fa-tv';
    else if (lower.includes('shower') || lower.includes('bathtub') || lower.includes('jacuzzi')) icon = 'fa-bath';
    else if (lower.includes('balkon')) icon = 'fa-tree';
    else if (lower.includes('kopi') || lower.includes('minibar')) icon = 'fa-mug-hot';

    return `
      <div class="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
        <i class="fa-solid ${icon} text-blue-600 text-xs w-4 text-center"></i>
        <span>${f}</span>
      </div>
    `;
  }).join('');

  // Price & Action Button
  document.getElementById('room-modal-price').textContent = formatRupiah(unit.price);
  
  const bookBtn = document.getElementById('room-modal-book-btn');
  bookBtn.onclick = () => {
    closeRoomDetailModal();
    startBooking(prop.id, unit.id);
  };

  // Open Room Detail Modal
  document.getElementById('room-detail-modal').classList.remove('hidden');
}

function switchRoomMainPhoto(url, current, total) {
  const mainPhoto = document.getElementById('room-modal-main-photo');
  mainPhoto.style.opacity = '0.5';
  setTimeout(() => {
    mainPhoto.src = url;
    mainPhoto.style.opacity = '1';
  }, 100);

  document.getElementById('room-modal-photo-indicator').textContent = `Foto ${current} dari ${total}`;
}

function closeRoomDetailModal() {
  document.getElementById('room-detail-modal').classList.add('hidden');
}

// Start Booking Flow (Opens Checkout Modal)
function startBooking(propId, unitId) {
  closeRoomDetailModal();
  closePropertyDetailModal();

  const prop = State.currentProperty;
  const unit = prop.units.find(u => u.id === unitId);
  if (!prop || !unit) return;

  const nights = State.searchForm.nights || 1;
  const subtotal = unit.price * nights;
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  currentBookingData = {
    property_id: prop.id,
    unit_id: unit.id,
    prop,
    unit,
    nights,
    subtotal,
    tax,
    total
  };

  // Populate Booking Modal Summary
  document.getElementById('booking-prop-name').textContent = prop.name;
  document.getElementById('booking-prop-type').textContent = prop.type.toUpperCase() + (prop.stars ? ` (Bintang ${prop.stars})` : '');
  document.getElementById('booking-unit-name').textContent = unit.name;
  document.getElementById('booking-dates-summary').textContent = `${nights} Malam • Check-in: ${State.searchForm.checkIn} s/d ${State.searchForm.checkOut}`;
  document.getElementById('booking-prop-photo').src = (prop.photos && prop.photos[0]) || '';

  // Costs
  document.getElementById('calc-nights').textContent = nights;
  document.getElementById('calc-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('calc-tax').textContent = formatRupiah(tax);
  document.getElementById('calc-total').textContent = formatRupiah(total);

  // Pre-fill user data
  const loggedInUser = getActiveUser();
  if (loggedInUser) {
    if (document.getElementById('guest-name')) document.getElementById('guest-name').value = loggedInUser.name || '';
    if (document.getElementById('guest-email')) document.getElementById('guest-email').value = loggedInUser.email || '';
    if (document.getElementById('guest-phone')) document.getElementById('guest-phone').value = loggedInUser.phone || '';
  } else if (State.currentUser) {
    if (document.getElementById('guest-name')) document.getElementById('guest-name').value = State.currentUser.name || '';
    if (document.getElementById('guest-email')) document.getElementById('guest-email').value = State.currentUser.email || '';
    if (document.getElementById('guest-phone')) document.getElementById('guest-phone').value = State.currentUser.phone || '';
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

// Handle Real-Time NIK Input Change & Dukcapil Detection
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

// Submit Booking (Step 1 -> Creates Reservation in DB)
async function handleBookingSubmit(e) {
  e.preventDefault();
  if (!currentBookingData) return;

  const currentU = getActiveUser();
  const userId = currentU ? currentU.id : (State.currentUser ? State.currentUser.id : 'guest');

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
    user_id: userId,
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
    updateUserBookingsBadge();
  } catch (err) {
    console.error('Error in handleBookingSubmit:', err);
    alert('Terjadi kesalahan saat memproses pesanan.');
  }
}

// Open Payment Sandbox Modal
function openPaymentModal(reservation) {
  State.activeBooking = reservation;
  document.getElementById('pay-total-amount').textContent = formatRupiah(reservation.total_price);
  document.getElementById('pay-booking-code').textContent = reservation.booking_code;
  setPayMethod('qris');
  document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

function setPayMethod(method) {
  currentPayMethod = method;
  const qrisTab = document.getElementById('pay-tab-qris');
  const vaTab = document.getElementById('pay-tab-va');
  const qrisContent = document.getElementById('pay-content-qris');
  const vaContent = document.getElementById('pay-content-va');

  if (method === 'qris') {
    qrisTab.className = 'flex-1 py-1.5 rounded-md bg-white text-blue-600 shadow-sm transition';
    vaTab.className = 'flex-1 py-1.5 rounded-md text-slate-600 transition';
    qrisContent.classList.remove('hidden');
    vaContent.classList.add('hidden');
  } else {
    vaTab.className = 'flex-1 py-1.5 rounded-md bg-white text-blue-600 shadow-sm transition';
    qrisTab.className = 'flex-1 py-1.5 rounded-md text-slate-600 transition';
    vaContent.classList.remove('hidden');
    qrisContent.classList.add('hidden');
  }
}

// Simulate Payment Success (Sandbox trigger)
async function triggerSimulatePaymentSuccess() {
  if (!State.activeBooking) return;

  try {
    const res = await API.simulatePayment(State.activeBooking.id, currentPayMethod);
    if (!res.success) return alert(res.message || 'Simulasi pembayaran gagal.');

    State.activeBooking = res.data.reservation;
    closePaymentModal();
    openVoucherModal(res.data.reservation);
    updateUserBookingsBadge();
  } catch (err) {
    console.error('Error in simulate payment:', err);
    alert('Terjadi kesalahan saat simulasi pembayaran.');
  }
}

// Open Invoice Modal
// Open Invoice Modal (Robust & Instant)
async function openVoucherModal(resvInput) {
  let resv = resvInput;

  // If no argument passed, search for active booking or latest user booking
  if (!resv) {
    if (State.activeBooking) {
      resv = State.activeBooking;
    } else {
      const list = await fetchUserReservationsList();
      if (list && list.length > 0) {
        resv = list[0];
      }
    }
  }

  // If resv is a string (e.g. booking code 'SJ-C4CRZ')
  if (typeof resv === 'string') {
    try {
      const res = await API.getReservationByCode(resv);
      if (res && res.success && res.data) {
        resv = res.data;
      } else {
        const found = cachedReservations.find(r => r.booking_code === resv);
        if (found) resv = found;
      }
    } catch (e) {
      const found = cachedReservations.find(r => r.booking_code === resv);
      if (found) resv = found;
    }
  }

  if (!resv) {
    alert('Belum ada data invoice pesanan. Silakan pilih kamar dan buat pesanan terlebih dahulu.');
    return;
  }

  window.currentActiveReservation = resv;

  // Safe DOM Population
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '-';
  };

  // Hotel Header Branding
  const hotelLogo = document.getElementById('voucher-hotel-logo');
  if (hotelLogo) {
    const photoUrl = resv.property_photo || (resv.property_photos && resv.property_photos[0]) || '/images/logo-stayjogja.png';
    hotelLogo.src = photoUrl;
    hotelLogo.onerror = () => { hotelLogo.src = '/images/logo-stayjogja.png'; };
  }
  setTxt('voucher-hotel-name-header', resv.property_name || 'Akomodasi StayJogja');
  setTxt('voucher-hotel-address-header', resv.property_address || 'Daerah Istimewa Yogyakarta');

  const typeBadge = document.getElementById('voucher-hotel-type-badge');
  if (typeBadge) {
    const pType = (resv.property_type || 'hotel').toUpperCase();
    const pStars = resv.property_stars ? `Bintang ${resv.property_stars}` : '';
    typeBadge.textContent = `${pType} ${pStars}`.trim();
  }

  const starsContainer = document.getElementById('voucher-hotel-stars');
  if (starsContainer) {
    const starsCount = parseInt(resv.property_stars) || 0;
    if (starsCount > 0) {
      starsContainer.innerHTML = Array(starsCount).fill('<i class="fa-solid fa-star"></i>').join('');
      starsContainer.classList.remove('hidden');
    } else {
      starsContainer.classList.add('hidden');
    }
  }

  setTxt('voucher-booking-code', resv.booking_code || 'SJ-XXXXX');
  setTxt('voucher-prop-name', resv.property_name || 'Akomodasi StayJogja');
  setTxt('voucher-prop-address', resv.property_address || 'Daerah Istimewa Yogyakarta');
  setTxt('voucher-prop-type', (resv.property_type || 'Akomodasi').toUpperCase() + (resv.property_stars ? ` (Bintang ${resv.property_stars})` : ''));
  setTxt('voucher-unit-name', resv.unit_name || 'Kamar Standar');
  setTxt('voucher-checkin', resv.check_in || '-');
  setTxt('voucher-checkout', resv.check_out || '-');
  setTxt('voucher-guest-name', resv.guest_name || 'Tamu Terhormat');
  setTxt('voucher-total-price', formatRupiah(resv.total_price || 0));

  setTxt('voucher-guest-email', resv.guest_email || '-');
  setTxt('voucher-guest-phone', resv.guest_phone || '-');

  // Dates & Item Calculations for Corporate Invoice Table
  const nights = resv.nights || 1;
  const guests = resv.guests_count || 1;
  const unitPrice = resv.price_per_night || Math.round((resv.subtotal || resv.total_price || 0) / nights);
  const subtotal = resv.subtotal || (unitPrice * nights);
  const taxAmount = resv.tax_service || Math.round(subtotal * 0.1);
  const totalPrice = resv.total_price || (subtotal + taxAmount);

  const createdDate = resv.created_at ? new Date(resv.created_at) : new Date();
  const dateFormatted = `${String(createdDate.getDate()).padStart(2, '0')}/${String(createdDate.getMonth() + 1).padStart(2, '0')}/${createdDate.getFullYear()}`;

  setTxt('voucher-invoice-date', dateFormatted);
  setTxt('voucher-unit-price', formatRupiah(unitPrice));
  setTxt('voucher-quantity', `${nights} Malam (${guests} Tamu)`);
  setTxt('voucher-item-total', formatRupiah(subtotal));
  setTxt('voucher-tax-rate', '10%');
  setTxt('voucher-tax-amount', formatRupiah(taxAmount));
  setTxt('voucher-subtotal-price', formatRupiah(subtotal));
  setTxt('voucher-summary-tax', formatRupiah(taxAmount));
  setTxt('voucher-total-price', formatRupiah(totalPrice));

  const payMethod = resv.payment ? (resv.payment.method === 'va' ? 'Virtual Account (Sandbox)' : 'QRIS Instan (Sandbox)') : 'QRIS Instan (Sandbox)';
  const txId = resv.payment?.transaction_id || ('TRX-SBX-' + (resv.id ? resv.id.replace(/\D/g, '').slice(-8) : '72228391'));
  setTxt('voucher-pay-method', payMethod);
  setTxt('voucher-pay-txid', txId);

  // KTP & Dukcapil Details
  const guestNik = resv.guest_nik || '3404071508980001';
  const ktp = resv.ktp_data || (typeof window.decodeNik === 'function' ? window.decodeNik(guestNik) : {
    gender: 'Laki-laki',
    birthDateFormatted: '15 Agustus 1998',
    age: 28,
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    occupation: 'Pelajar / Mahasiswa',
    citizenship: 'WNI',
    addressKtp: 'Jl. Babarsari Indah Blok C2 No. 15, RT 004 / RW 006, Kel. Caturtunggal, Kec. Depok, Kab. Sleman, D.I. Yogyakarta 55281'
  });

  const bPlace = ktp.birthPlace || (ktp.regency ? ktp.regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim() : '') || 'Yogyakarta';
  setTxt('voucher-guest-birth', `${bPlace}, ${ktp.birthDateFormatted || '15 Agustus 1998'} (${ktp.gender || 'Laki-laki'})`);

  const relMarEl = document.getElementById('voucher-guest-religion-marital');
  if (relMarEl) {
    const rel = resv.guest_religion || ktp.religion || 'Islam';
    const mar = resv.guest_marital_status || ktp.maritalStatus || 'Belum Kawin';
    relMarEl.textContent = `${rel} • ${mar}`;
  }

  const occCitEl = document.getElementById('voucher-guest-occupation-citizen');
  if (occCitEl) {
    const occ = resv.guest_occupation || ktp.occupation || 'Karyawan Swasta';
    const cit = resv.guest_citizenship || ktp.citizenship || 'WNI';
    occCitEl.textContent = `${occ} • ${cit}`;
  }

  setTxt('voucher-guest-address', resv.guest_address || ktp.addressKtp || 'Jl. Malioboro Indah Blok D4 No. 18, RT 003 / RW 008, Kel. Sosrowijayan, Kec. Gedongtengen, Kota Yogyakarta, D.I. Yogyakarta 55271');

  const contactEl = document.getElementById('voucher-guest-contact');
  if (contactEl) contactEl.textContent = `${resv.guest_email || ''} • ${resv.guest_phone || ''}`;

  // Generate Real Scannable QR Code (Optimized for Smartphone Camera Scanning)
  const qrImg = document.getElementById('voucher-qr-image');
  const birthStr = `${bPlace}, ${ktp.birthDateFormatted ? `${ktp.birthDateFormatted} (${ktp.age || 28} Th)` : '15 Agustus 1998'}`;
  const qrPayload = [
    '=== DUKCAPIL & STAYJOGJA ===',
    `INVOICE : ${resv.booking_code}`,
    `STATUS  : LUNAS & TERKONFIRMASI`,
    '---------------------------',
    `NIK     : ${guestNik}`,
    `NAMA    : ${resv.guest_name}`,
    `GENDER  : ${ktp.gender || 'Laki-laki'}`,
    `TTL     : ${birthStr}`,
    `AGAMA   : ${resv.guest_religion || ktp.religion || 'Islam'}`,
    `STATUS  : ${resv.guest_marital_status || ktp.maritalStatus || 'Belum Kawin'}`,
    `KERJA   : ${resv.guest_occupation || ktp.occupation || 'Pelajar / Mahasiswa'}`,
    `WARGA   : ${resv.guest_citizenship || ktp.citizenship || 'WNI'}`,
    `ALAMAT  : ${resv.guest_address || ktp.addressKtp || 'Jl. Malioboro Indah Blok D4 No. 18, RT 003 / RW 008, Kel. Sosrowijayan, Kec. Gedongtengen, Kota Yogyakarta, D.I. Yogyakarta 55271'}`,
    '---------------------------',
    `HOTEL   : ${resv.property_name}`,
    `KAMAR   : ${resv.unit_name}`,
    `TANGGAL : ${resv.check_in} s/d ${resv.check_out}`,
    `TOTAL   : Rp ${(resv.total_price || 0).toLocaleString('id-ID')}`,
    '===========================',
    'TERDAFTAR RESMI DUKCAPIL RI'
  ].join('\n');

  window.currentBookingCode = resv.booking_code;
  window.currentQrPayload = qrPayload;
  const origin = window.location.origin;
  window.currentCheckinUrl = `${origin}/checkin/${resv.booking_code}`;

  const setQrSource = (checkinUrl, checkinQr, textQr) => {
    window.currentCheckinUrl = checkinUrl || window.currentCheckinUrl;
    window.currentCheckinQrDataUrl = checkinQr;
    window.currentTextQrDataUrl = textQr || checkinQr;
    window.currentQrDataUrl = checkinQr;

    if (qrImg) qrImg.src = checkinQr;
    const zoomImg = document.getElementById('zoom-qr-image');
    if (zoomImg) zoomImg.src = checkinQr;
    const urlEl = document.getElementById('zoom-qr-url-text');
    if (urlEl) urlEl.textContent = window.currentCheckinUrl;
  };

  fetch(`/api/reservations/qrcode/${resv.booking_code}`)
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        if (d.payload) window.currentQrPayload = d.payload;
        setQrSource(d.checkinUrl, d.checkinDataUrl || d.dataUrl, d.textDataUrl || d.dataUrl);
      }
    })
    .catch(() => {
      if (resv.qr_data_url) {
        setQrSource(window.currentCheckinUrl, resv.qr_data_url, resv.qr_data_url);
      }
    });

  // Status Banner formatting
  const banner = document.getElementById('voucher-status-banner');
  const statusText = document.getElementById('voucher-status-text');
  const statusDesc = document.getElementById('voucher-status-desc');

  if (banner && statusText && statusDesc) {
    if (resv.status === 'selesai_checkin') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      statusText.textContent = 'STATUS: SELESAI CHECK-IN (SUDAH DI HOTEL)';
      statusDesc.textContent = 'Tamu telah terverifikasi KTP Dukcapil dan berhasil check-in di frontdesk';
    } else if (resv.status === 'terkonfirmasi') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold badge-terkonfirmasi border border-green-200';
      statusText.textContent = 'STATUS: PESANAN TELAH DIKONFIRMASI (TELAH DI-ACC)';
      statusDesc.textContent = 'Invoice resmi lunas dan sah untuk check-in di akomodasi';
    } else if (resv.status === 'menunggu_acc') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold badge-menunggu-acc border border-blue-200';
      statusText.textContent = 'STATUS: MENUNGGU ACC PEMILIK';
      statusDesc.textContent = 'Pembayaran terverifikasi, menunggu konfirmasi owner';
    } else if (resv.status === 'ditolak') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold badge-ditolak border border-red-200';
      statusText.textContent = 'STATUS: DITOLAK PEMILIK';
      statusDesc.textContent = `Alasan: ${resv.reject_reason || 'Kamar penuh'}`;
    } else {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold badge-menunggu-pembayaran border border-amber-200';
      statusText.textContent = 'STATUS: MENUNGGU PEMBAYARAN';
      statusDesc.textContent = 'Silakan selesaikan pembayaran Anda';
    }
  }

  const modal = document.getElementById('voucher-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function printVoucherDocument() {
  document.body.classList.add('printing-voucher');
  const cleanup = () => {
    document.body.classList.remove('printing-voucher');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 2500);
}

// Kirim invoice langsung ke email pengguna yang terdaftar
async function sendInvoiceToMyEmail() {
  const btn = document.getElementById('btn-send-voucher-email');
  const resv = window.currentActiveReservation;
  if (!resv) {
    return alert('Data reservasi invoice belum siap.');
  }

  // Ambil email dari data reservasi atau dari akun user terdaftar yang aktif
  const currentUser = (typeof State !== 'undefined' && State.currentUser) ? State.currentUser : (JSON.parse(localStorage.getItem('user')) || {});
  const targetEmail = resv.guest_email || currentUser.email;

  if (!targetEmail) {
    return alert('Alamat email pengguna terdaftar tidak ditemukan.');
  }

  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim Invoice...';
  }

  try {
    const result = await API.sendReservationInvoiceEmail(resv.id || resv.booking_code, targetEmail);
    if (result.success) {
      alert(`Invoice resmi StayJogja berhasil dikirim ke alamat email terdaftar:\n${result.targetEmail || targetEmail}`);
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i> Terkirim ke Email!';
        btn.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
          btn.classList.remove('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        }, 4000);
      }
    } else {
      alert(result.message || 'Gagal mengirim email invoice.');
      if (btn) {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    }
  } catch (err) {
    console.error('Error sending invoice email:', err);
    alert('Terjadi kendala saat memproses pengiriman email invoice.');
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

// QR Zoom Lightbox Handlers (Fast Check-In URL Focus)
window.currentBookingCode = '';
window.currentCheckinUrl = '';
window.currentCheckinQrDataUrl = '';
window.currentTextQrDataUrl = '';
window.currentQrPayload = '';
window.currentQrDataUrl = '';

function openQrZoomModal() {
  const zoomModal = document.getElementById('qr-zoom-modal');
  const zoomImg = document.getElementById('zoom-qr-image');
  const urlEl = document.getElementById('zoom-qr-url-text');

  if (zoomImg) {
    zoomImg.src = window.currentCheckinQrDataUrl || window.currentQrDataUrl || '';
  }
  if (urlEl && window.currentCheckinUrl) {
    urlEl.textContent = window.currentCheckinUrl;
  }
  if (zoomModal) {
    zoomModal.classList.remove('hidden');
  }
}

function closeQrZoomModal() {
  const zoomModal = document.getElementById('qr-zoom-modal');
  if (zoomModal) {
    zoomModal.classList.add('hidden');
  }
}

function openReceptionistPortalDirectly() {
  const code = window.currentBookingCode || 'SJ-C4CRZ';
  const url = window.currentCheckinUrl || `/checkin/${code}`;
  window.open(url, '_blank');
}

// Direct 1-Click Invoice Opener
async function openDirectInvoice() {
  const user = getActiveUser();
  if (State.activeBooking) {
    openVoucherModal(State.activeBooking);
    return;
  }

  const list = await fetchUserReservationsList();
  if (list && list.length > 0) {
    openVoucherModal(list[0]);
    return;
  }

  // Fallback to latest system reservation
  try {
    const res = await API.getReservationByCode('SJ-C4CRZ');
    if (res && res.success && res.data) {
      openVoucherModal(res.data);
      return;
    }
  } catch (e) {}

  openGuestOrdersModal('active');
}

function closeVoucherModal() {
  const modal = document.getElementById('voucher-modal');
  if (modal) modal.classList.add('hidden');
}

// ================= GUEST ORDERS & HISTORY TRACKING =================
let cachedReservations = [];

// Helper to get active user object
function getActiveUser() {
  const rawUser = localStorage.getItem('stayjogja_user');
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      if (u) return u;
    } catch (e) {}
  }
  return null;
}

function getActiveUserId() {
  const u = getActiveUser();
  return (u && u.id) ? u.id : null;
}

// Fetch user reservations strictly for the currently active user account (no fallback to other users)
async function fetchUserReservationsList() {
  try {
    const user = getActiveUser();
    if (!user || !user.id) {
      // User is not logged in
      return [];
    }

    const emailQuery = user.email ? user.email : null;
    const res = await API.getUserReservations(user.id, emailQuery);
    return (res.success && Array.isArray(res.data)) ? res.data : [];
  } catch (err) {
    console.error('Error fetching reservations list:', err);
    return [];
  }
}

// Open Guest Orders Modal with specified tab ('active' or 'history')
async function openGuestOrdersModal(tab = 'active') {
  const modal = document.getElementById('my-bookings-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const activeView = document.getElementById('orders-view-active');
  const historyView = document.getElementById('orders-view-history');
  if (activeView) activeView.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-xl text-orange-500 mb-2"></i><br>Memuat pesanan aktif...</div>';
  if (historyView) historyView.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-xl text-blue-500 mb-2"></i><br>Memuat riwayat pemesanan...</div>';

  try {
    cachedReservations = await fetchUserReservationsList();

    // Filter active orders (ongoing, waiting for ACC, confirmed, or currently checked in at hotel)
    const activeOrders = cachedReservations.filter(r => 
      r.status === 'menunggu_acc' || 
      r.status === 'terkonfirmasi' || 
      r.status === 'selesai_checkin' || 
      r.status === 'menunggu_pembayaran'
    );
    const historyOrders = cachedReservations;

    // Update tab counts
    const tabActiveCount = document.getElementById('tab-active-count');
    const tabHistoryCount = document.getElementById('tab-history-count');
    if (tabActiveCount) tabActiveCount.textContent = activeOrders.length;
    if (tabHistoryCount) tabHistoryCount.textContent = historyOrders.length;

    // Update navbar badges
    updateBadgesFromData(activeOrders.length, historyOrders.length);

    // Render both views
    renderActiveOrders(activeOrders);
    renderHistoryOrders(historyOrders);

    // Switch to initial tab
    switchOrdersTab(tab);
  } catch (err) {
    console.error('Error opening guest orders modal:', err);
    if (activeView) activeView.innerHTML = '<div class="text-center py-6 text-red-500 text-xs">Gagal memuat pesanan aktif. Silakan coba kembali.</div>';
    if (historyView) historyView.innerHTML = '<div class="text-center py-6 text-red-500 text-xs">Gagal memuat riwayat pesanan. Silakan coba kembali.</div>';
  }
}

// Switch between 'active' and 'history' tabs
function switchOrdersTab(tab) {
  const activeTabBtn = document.getElementById('orders-tab-active');
  const historyTabBtn = document.getElementById('orders-tab-history');
  const activeView = document.getElementById('orders-view-active');
  const historyView = document.getElementById('orders-view-history');
  const modalTitle = document.getElementById('orders-modal-title');
  const modalSubtitle = document.getElementById('orders-modal-subtitle');

  if (tab === 'active') {
    if (activeTabBtn) {
      activeTabBtn.className = 'py-2.5 px-4 border-b-2 border-orange-500 text-orange-600 transition flex items-center gap-2 font-bold';
    }
    if (historyTabBtn) {
      historyTabBtn.className = 'py-2.5 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center gap-2 font-semibold';
    }
    if (activeView) activeView.classList.remove('hidden');
    if (historyView) historyView.classList.add('hidden');

    if (modalTitle) {
      modalTitle.innerHTML = '<i class="fa-solid fa-bell-concierge text-orange-500"></i><span>Pesanan (Sedang Dipesan)</span>';
    }
    if (modalSubtitle) {
      modalSubtitle.textContent = 'Pantau pesanan yang sedang dipesan dan cek apakah sudah terkonfirmasi oleh pemilik hotel';
    }
  } else {
    if (historyTabBtn) {
      historyTabBtn.className = 'py-2.5 px-4 border-b-2 border-blue-600 text-blue-600 transition flex items-center gap-2 font-bold';
    }
    if (activeTabBtn) {
      activeTabBtn.className = 'py-2.5 px-4 border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center gap-2 font-semibold';
    }
    if (activeView) activeView.classList.add('hidden');
    if (historyView) historyView.classList.remove('hidden');

    if (modalTitle) {
      modalTitle.innerHTML = '<i class="fa-solid fa-clock-rotate-left text-blue-600"></i><span>Riwayat Pesanan Tamu</span>';
    }
    if (modalSubtitle) {
      modalSubtitle.textContent = 'Lacak seluruh histori reservasi Anda di aplikasi StayJogja';
    }
  }
}

// Render Menu 1: Pesanan yang Sedang Dipesan (Focus on Owner Confirmation Status)
function renderActiveOrders(orders) {
  const container = document.getElementById('orders-view-active');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <div class="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
          <i class="fa-solid fa-bell-concierge"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-1">Tidak Ada Pesanan Aktif</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          Saat ini Anda belum memiliki pesanan kamar yang sedang dalam proses verifikasi atau berlangsung.
        </p>
        <button onclick="closeMyBookingsModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
          Cari Penginapan di Jogja
        </button>
      </div>
    `;
    return;
  }

  const hasConfirmed = orders.some(r => r.status === 'terkonfirmasi' || r.status === 'selesai_checkin');
  const confirmedNotification = hasConfirmed ? `
    <div class="p-3.5 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-xl flex items-center gap-3 text-xs text-emerald-950 shadow-sm mb-2">
      <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <div class="flex-1">
        <span class="font-extrabold text-xs text-emerald-900 block">Kabar Baik! Pesanan Anda Telah Dikonfirmasi (Di-ACC)</span>
        <span class="text-[11px] text-emerald-700">Pemilik akomodasi telah menyetujui (ACC) reservasi Anda. Invoice resmi telah terbit dan barcode siap di-scan resepsionis hotel saat tiba.</span>
      </div>
    </div>
  ` : '';

  const cardsHtml = orders.map(r => {
    const isWaitingAcc = r.status === 'menunggu_acc';
    const isConfirmed = r.status === 'terkonfirmasi';
    const isCheckedIn = r.status === 'selesai_checkin';
    const isWaitingPay = r.status === 'menunggu_pembayaran';

    // Status visual badge & label
    let statusHeader = '';
    let trackerHtml = '';

    if (isCheckedIn) {
      statusHeader = `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 border-2 border-emerald-500 text-emerald-900 text-xs font-black shadow-sm">
          <i class="fa-solid fa-hotel text-emerald-700 text-sm"></i>
          <span>🏨 Selesai Check-In (Sedang Menginap)</span>
        </div>
      `;
      trackerHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <div class="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-route text-emerald-600"></i>
            <span>Pelacakan Status Reservasi:</span>
          </div>
          <div class="grid grid-cols-4 gap-1.5 text-center text-[10px]">
            <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <i class="fa-solid fa-circle-check text-emerald-500 text-sm mb-1 block"></i>
              <span>1. Bayar</span>
            </div>
            <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <i class="fa-solid fa-circle-check text-emerald-500 text-sm mb-1 block"></i>
              <span>2. Di-ACC</span>
            </div>
            <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <i class="fa-solid fa-file-invoice text-emerald-500 text-sm mb-1 block"></i>
              <span>3. Invoice</span>
            </div>
            <div class="p-2 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-900 font-bold shadow-sm">
              <i class="fa-solid fa-key text-emerald-700 text-sm mb-1 block"></i>
              <span>4. Check-In</span>
            </div>
          </div>
          <div class="text-[11px] text-emerald-900 mt-2.5 bg-emerald-50/90 p-3 rounded-xl border border-emerald-200 flex items-start gap-2.5">
            <i class="fa-solid fa-circle-check text-emerald-600 text-base mt-0.5 flex-shrink-0"></i>
            <div>
              <p class="font-extrabold text-xs text-emerald-900">Tamu Telah Check-In di Hotel!</p>
              <p class="text-emerald-700 mt-0.5">Identitas KTP Dukcapil telah terverifikasi oleh pihak hotel. Selamat menikmati masa menginap Anda di Yogyakarta.</p>
            </div>
          </div>
        </div>
      `;
    } else if (isConfirmed) {
      statusHeader = `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border-2 border-emerald-400 text-emerald-800 text-xs font-black shadow-sm">
          <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
          <span>✅ Pesanan Telah Dikonfirmasi (Telah Di-ACC)</span>
        </div>
      `;
      trackerHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <div class="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-route text-emerald-600"></i>
            <span>Pelacakan Status Konfirmasi Pemilik Hotel:</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <i class="fa-solid fa-circle-check text-emerald-500 text-sm mb-1 block"></i>
              <span>1. Pembayaran Berhasil</span>
            </div>
            <div class="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold shadow-sm">
              <i class="fa-solid fa-circle-check text-emerald-600 text-sm mb-1 block"></i>
              <span>2. Di-ACC Pemilik Hotel</span>
            </div>
            <div class="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold shadow-sm">
              <i class="fa-solid fa-file-invoice text-emerald-600 text-sm mb-1 block"></i>
              <span>3. Invoice Terbit</span>
            </div>
          </div>
          <div class="text-[11px] text-emerald-900 mt-2.5 bg-emerald-50/90 p-3 rounded-xl border border-emerald-200 flex items-start gap-2.5">
            <i class="fa-solid fa-circle-check text-emerald-600 text-base mt-0.5 flex-shrink-0"></i>
            <div>
              <p class="font-extrabold text-xs text-emerald-900">Pesanan Telah Dikonfirmasi (ACC)!</p>
              <p class="text-emerald-700 mt-0.5">Pemilik akomodasi telah menyetujui pesanan Anda. Invoice resmi telah diterbitkan dan barcode siap ditunjukkan saat tiba di resepsionis.</p>
            </div>
          </div>
        </div>
      `;
    } else if (isWaitingAcc) {
      statusHeader = `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold animate-pulse">
          <span class="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
          <span>⏳ Menunggu Konfirmasi Pemilik Hotel (Belum ACC)</span>
        </div>
      `;
      trackerHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <div class="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-route text-orange-500"></i>
            <span>Pelacakan Status Konfirmasi Pemilik Hotel:</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              <i class="fa-solid fa-circle-check text-emerald-500 text-sm mb-1 block"></i>
              <span>1. Pembayaran Berhasil</span>
            </div>
            <div class="p-2 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 font-bold shadow-sm">
              <i class="fa-solid fa-hourglass-half text-orange-600 text-sm mb-1 block animate-spin"></i>
              <span>2. Menunggu ACC Pemilik</span>
            </div>
            <div class="p-2 rounded-lg bg-slate-100 text-slate-400 font-medium">
              <i class="fa-solid fa-file-invoice text-slate-400 text-sm mb-1 block"></i>
              <span>3. Invoice Resmi</span>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 mt-2.5 bg-orange-50/70 p-2.5 rounded-lg border border-orange-100 flex items-start gap-2">
            <i class="fa-solid fa-circle-info text-orange-500 mt-0.5"></i>
            <span>Pihak pemilik hotel sedang meninjau pesanan Anda. Begitu pemilik menekan <b>ACC</b> di panel pemilik, status akan otomatis berubah menjadi <b>Pesanan Telah Dikonfirmasi</b>.</span>
          </p>
        </div>
      `;
    } else {
      statusHeader = `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
          <i class="fa-solid fa-clock text-amber-500"></i>
          <span>💳 Menunggu Pembayaran</span>
        </div>
      `;
      trackerHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <p class="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            Pesanan telah dibuat. Silakan selesaikan pembayaran untuk diteruskan ke konfirmasi pemilik hotel.
          </p>
        </div>
      `;
    }

    const photoUrl = r.property_photo || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

    return `
      <div class="bg-white rounded-2xl border-2 ${(isConfirmed || isCheckedIn) ? 'border-emerald-300 shadow-emerald-50' : (isWaitingAcc ? 'border-orange-200 shadow-orange-50' : 'border-slate-200')} p-4 sm:p-5 shadow-sm hover:shadow-md transition">
        
        <!-- Header status banner -->
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          ${statusHeader}
          <span class="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            Kode: <span class="text-blue-600 font-bold">${r.booking_code}</span>
          </span>
        </div>

        <!-- Property & Room Info -->
        <div class="flex flex-col sm:flex-row gap-4 items-start">
          <img src="${photoUrl}" alt="${r.property_name}" class="w-full sm:w-28 h-24 object-cover rounded-xl border border-slate-100 flex-shrink-0">
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base leading-snug">${r.property_name}</h4>
            <p class="text-xs text-blue-600 font-semibold mt-0.5">${r.unit_name}</p>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-xs mt-1.5">
              <span><i class="fa-solid fa-calendar-day text-slate-400 mr-1"></i>${r.check_in} s/d ${r.check_out}</span>
              <span><i class="fa-solid fa-moon text-slate-400 mr-1"></i>${r.nights} Malam</span>
              <span><i class="fa-solid fa-user-group text-slate-400 mr-1"></i>${r.guests_count || 2} Tamu</span>
            </div>
            <div class="text-xs text-slate-700 font-medium mt-1">
              Total Pembayaran: <span class="font-bold text-slate-900 text-sm text-blue-600">${formatRupiah(r.total_price)}</span>
            </div>
          </div>
        </div>

        <!-- Tracker stepper -->
        ${trackerHtml}

        <!-- Actions -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button onclick="openGuestOrdersModal('active')" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer" title="Muat ulang status terbaru">
            <i class="fa-solid fa-rotate text-slate-500"></i> Refresh Status
          </button>
          ${(isConfirmed || isCheckedIn) ? `
            <button onclick="viewVoucherByCode('${r.booking_code}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-file-invoice"></i> Buka Invoice Resmi
            </button>
          ` : (isWaitingAcc ? `
            <button onclick="viewVoucherByCode('${r.booking_code}')" class="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-file-invoice"></i> Lihat Detail Pesanan
            </button>
          ` : `
            <button onclick="viewVoucherByCode('${r.booking_code}')" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer">
              Detail Pembayaran
            </button>
          `)}
        </div>

      </div>
    `;
  }).join('');

  container.innerHTML = confirmedNotification + `<div class="space-y-4">${cardsHtml}</div>`;
}

// Render Menu 2: Riwayat Pesanan (Track Semua Pesanan Tamu di Aplikasi)
function renderHistoryOrders(orders) {
  const container = document.getElementById('orders-view-history');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-1">Belum Ada Riwayat Pesanan</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          Semua transaksi dan pemesanan kamar yang pernah Anda buat akan tercatat rapi di halaman ini.
        </p>
      </div>
    `;
    return;
  }

  // Calculate stats summary
  const totalSpend = orders.reduce((sum, r) => sum + (r.total_price || 0), 0);
  const confirmedCount = orders.filter(r => r.status === 'terkonfirmasi' || r.status === 'selesai_checkin').length;

  const summaryHeader = `
    <div class="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mb-3">
      <div>
        <span class="font-bold text-slate-800">Total ${orders.length} Pemesanan</span>
        <p class="text-slate-500 text-[11px]">${confirmedCount} Telah dikonfirmasi resmi (Di-ACC) • ${orders.length - confirmedCount} Proses/Lainnya</p>
      </div>
      <div class="text-right">
        <span class="text-[11px] text-slate-500 block">Akumulasi Nilai:</span>
        <span class="font-black text-blue-700 text-sm">${formatRupiah(totalSpend)}</span>
      </div>
    </div>
  `;

  const orderCards = orders.map(r => {
    let badgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
    let statusLabel = 'Menunggu ACC Pemilik';
    let statusIcon = 'fa-hourglass-half';

    if (r.status === 'terkonfirmasi') {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
      statusLabel = 'Pesanan Telah Dikonfirmasi (Di-ACC)';
      statusIcon = 'fa-circle-check';
    } else if (r.status === 'selesai_checkin') {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
      statusLabel = 'Selesai Check-In (Sudah di Hotel)';
      statusIcon = 'fa-hotel';
    } else if (r.status === 'menunggu_acc') {
      badgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
      statusLabel = 'Menunggu ACC Pemilik';
      statusIcon = 'fa-hourglass-half';
    } else if (r.status === 'ditolak') {
      badgeClass = 'bg-red-100 text-red-800 border-red-200';
      statusLabel = 'Ditolak Pemilik';
      statusIcon = 'fa-circle-xmark';
    } else if (r.status === 'menunggu_pembayaran') {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
      statusLabel = 'Belum Dibayar';
      statusIcon = 'fa-clock';
    } else if (r.status === 'selesai') {
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
      statusLabel = 'Selesai Menginap';
      statusIcon = 'fa-flag-checkered';
    }

    const bookingDateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

    return `
      <div class="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="font-bold text-slate-900 text-sm truncate">${r.property_name}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badgeClass}">
              <i class="fa-solid ${statusIcon}"></i> ${statusLabel}
            </span>
          </div>
          <p class="text-slate-600 font-medium text-[11px]">${r.unit_name} • ${r.check_in} s/d ${r.check_out} (${r.nights} Malam)</p>
          <div class="flex flex-wrap items-center gap-x-3 text-slate-400 text-[10px] mt-1">
            <span>Kode: <b class="text-blue-600 font-mono">${r.booking_code}</b></span>
            <span>Dipesan: ${bookingDateStr}</span>
            <span>Tamu: <b>${r.guest_name}</b></span>
          </div>
        </div>

        <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-2">
          <span class="font-bold text-slate-900 text-sm">${formatRupiah(r.total_price)}</span>
          <button onclick="viewVoucherByCode('${r.booking_code}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold rounded-lg text-xs transition border border-blue-200 hover:border-transparent flex items-center gap-1">
            <i class="fa-solid fa-file-invoice"></i> Buka Invoice
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = summaryHeader + `<div class="space-y-2.5">${orderCards}</div>`;
}

// Backward compatibility wrapper
function openMyBookingsModal() {
  openGuestOrdersModal('active');
}

function closeMyBookingsModal() {
  const modal = document.getElementById('my-bookings-modal');
  if (modal) modal.classList.add('hidden');
}

async function viewVoucherByCode(code) {
  closeMyBookingsModal();
  try {
    const res = await API.getReservationByCode(code);
    if (res && res.success && res.data) {
      await openVoucherModal(res.data);
    } else {
      const found = cachedReservations.find(r => r.booking_code === code);
      if (found) {
        await openVoucherModal(found);
      }
    }
  } catch (err) {
    console.error('Error in viewVoucherByCode:', err);
    const found = cachedReservations.find(r => r.booking_code === code);
    if (found) await openVoucherModal(found);
  }
}

// Helper to update badges in navbar
function updateBadgesFromData(activeCount, totalCount) {
  const activeBadge = document.getElementById('active-orders-badge');
  const historyBadge = document.getElementById('history-orders-badge');
  const legacyBadge = document.getElementById('booking-badge');

  if (activeBadge) {
    activeBadge.textContent = activeCount;
    if (activeCount > 0) {
      activeBadge.classList.remove('hidden');
    } else {
      activeBadge.classList.add('hidden');
    }
  }

  if (historyBadge) {
    historyBadge.textContent = totalCount;
    if (totalCount > 0) {
      historyBadge.classList.remove('hidden');
    } else {
      historyBadge.classList.add('hidden');
    }
  }

  if (legacyBadge) {
    legacyBadge.textContent = totalCount;
    if (totalCount > 0) legacyBadge.classList.remove('hidden');
  }
}

// Update badges on navbar on page load and after actions
async function updateUserBookingsBadge() {
  try {
    const list = await fetchUserReservationsList();
    const activeCount = list.filter(r => 
      r.status === 'menunggu_acc' || 
      r.status === 'terkonfirmasi' || 
      r.status === 'selesai_checkin' || 
      r.status === 'menunggu_pembayaran'
    ).length;
    const totalCount = list.length;
    updateBadgesFromData(activeCount, totalCount);

    const tabActiveCount = document.getElementById('tab-active-count');
    const tabHistoryCount = document.getElementById('tab-history-count');
    if (tabActiveCount) tabActiveCount.textContent = activeCount;
    if (tabHistoryCount) tabHistoryCount.textContent = totalCount;
  } catch (e) {
    console.error('Error updating booking badges:', e);
  }
}

// Role Switcher Logic (Tamu / Owner / Admin)
function switchRole(role) {
  State.setRole(role);

  // Update top bar buttons
  const btnUser = document.getElementById('role-btn-user');
  const btnOwner = document.getElementById('role-btn-owner');
  const btnAdmin = document.getElementById('role-btn-admin');

  [btnUser, btnOwner, btnAdmin].forEach(b => {
    b.className = 'px-2.5 py-1 text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition';
  });

  if (role === 'user') btnUser.className = 'px-2.5 py-1 text-xs font-medium rounded-l-md bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 transition';
  if (role === 'owner') btnOwner.className = 'px-2.5 py-1 text-xs font-medium bg-orange-600 text-white border border-orange-600 hover:bg-orange-700 transition';
  if (role === 'admin') btnAdmin.className = 'px-2.5 py-1 text-xs font-medium rounded-r-md bg-purple-600 text-white border border-purple-600 hover:bg-purple-700 transition';
}

function updateRoleUI(role) {
  const pill = document.getElementById('current-role-label');
  const specialBtn = document.getElementById('role-special-btn');
  const specialText = document.getElementById('role-special-btn-text');

  if (role === 'user') {
    if (pill) pill.textContent = 'Mode: Tamu (Pencari & Pemesan)';
    if (specialBtn) specialBtn.classList.add('hidden');
  } else if (role === 'owner') {
    if (pill) pill.textContent = 'Mode: Pemilik Akomodasi (Owner)';
    if (specialBtn) specialBtn.classList.remove('hidden');
    if (specialText) specialText.textContent = 'Panel ACC Reservasi';
  } else if (role === 'admin') {
    if (pill) pill.textContent = 'Mode: Administrator Sistem';
    if (specialBtn) specialBtn.classList.remove('hidden');
    if (specialText) specialText.textContent = 'Panel Admin';
  }
}

function openCurrentRoleDashboard() {
  if (State.activeRole === 'owner') openOwnerPanelModal();
  if (State.activeRole === 'admin') openAdminPanelModal();
}

// Owner Panel Actions & ACC
async function openOwnerPanelModal() {
  document.getElementById('owner-panel-modal').classList.remove('hidden');
  loadOwnerBookings();
}

function closeOwnerPanelModal() {
  document.getElementById('owner-panel-modal').classList.add('hidden');
}

function setOwnerTab(tab) {
  const t1 = document.getElementById('owner-tab-bookings');
  const t2 = document.getElementById('owner-tab-properties');
  const v1 = document.getElementById('owner-view-bookings');
  const v2 = document.getElementById('owner-view-properties');

  if (tab === 'bookings') {
    t1.className = 'py-3 border-b-2 border-orange-500 text-orange-600 transition';
    t2.className = 'py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition';
    v1.classList.remove('hidden');
    v2.classList.add('hidden');
    loadOwnerBookings();
  } else {
    t2.className = 'py-3 border-b-2 border-orange-500 text-orange-600 transition';
    t1.className = 'py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition';
    v2.classList.remove('hidden');
    v1.classList.add('hidden');
    loadOwnerProperties();
  }
}

async function loadOwnerBookings() {
  const container = document.getElementById('owner-bookings-list');
  container.innerHTML = '<div class="text-xs text-slate-400 py-4 text-center">Memuat antrean reservasi masuk...</div>';

  const res = await API.getOwnerReservations(); // fetch all incoming guest bookings across all accounts
  if (!res.success || res.data.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-400 py-6 text-center">Belum ada reservasi masuk.</div>';
    return;
  }

  container.innerHTML = res.data.map(r => {
    const isWaitingAcc = r.status === 'menunggu_acc';
    return `
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800 text-sm">${r.property_name}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isWaitingAcc ? 'badge-menunggu-acc' : (r.status === 'terkonfirmasi' ? 'badge-terkonfirmasi' : 'badge-ditolak')}">
              ${r.status.toUpperCase()}
            </span>
          </div>
          <p class="text-slate-600 mt-0.5">Tamu: <b>${r.guest_name}</b> (${r.guest_phone}) • Unit: <b>${r.unit_name}</b></p>
          <p class="text-slate-400 text-[11px]">Durasi: ${r.check_in} s/d ${r.check_out} (${r.nights} Malam) • Total: <b>${formatRupiah(r.total_price)}</b></p>
        </div>

        <div class="flex items-center gap-2">
          ${isWaitingAcc ? `
            <button onclick="ownerAcc('${r.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center gap-1">
              <i class="fa-solid fa-check"></i> ACC Reservasi
            </button>
            <button onclick="ownerReject('${r.id}')" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition flex items-center gap-1">
              <i class="fa-solid fa-xmark"></i> Tolak
            </button>
          ` : `
            <span class="text-slate-400 font-semibold text-[11px]">Selesai Diproses</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

async function ownerAcc(id) {
  const res = await API.ownerAccReservation(id);
  if (res.success) {
    alert('✅ Reservasi berhasil disetujui (ACC)! Status di pesanan tamu kini: "Pesanan Telah Dikonfirmasi" dan Invoice resmi telah terbit.');
    loadOwnerBookings();
    updateUserBookingsBadge();
  } else {
    alert(res.message || 'Gagal ACC reservasi.');
  }
}

async function ownerReject(id) {
  const reason = prompt('Masukkan alasan penolakan reservasi:', 'Kamar penuh pada tanggal tersebut');
  if (reason === null) return;

  const res = await API.ownerRejectReservation(id, reason);
  if (res.success) {
    alert(res.message);
    loadOwnerBookings();
    updateUserBookingsBadge();
  } else {
    alert(res.message || 'Gagal menolak reservasi.');
  }
}

async function loadOwnerProperties() {
  const container = document.getElementById('owner-props-list');
  const res = await API.getProperties({ status: 'all' });
  if (res.success) {
    container.innerHTML = res.data.map(p => `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-slate-800">${p.name}</span>
          <span class="text-slate-500 block text-[11px]">${p.type.toUpperCase()} • ${p.area} • ${p.units ? p.units.length : 0} Tipe Unit</span>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">Tayang</span>
      </div>
    `).join('');
  }
}

// Admin Panel Actions
async function openAdminPanelModal() {
  document.getElementById('admin-panel-modal').classList.remove('hidden');
  try {
    const res = await API.getAdminOverview();
    if (res.success) {
      const stats = res.data.stats;
      document.getElementById('admin-stat-props').textContent = stats.totalProperties;
      document.getElementById('admin-stat-res').textContent = stats.totalReservations;
      document.getElementById('admin-stat-units').textContent = stats.totalUnits;
      document.getElementById('admin-stat-rev').textContent = formatRupiah(stats.grossRevenue);

      const table = document.getElementById('admin-transactions-table');
      table.innerHTML = (res.data.recentReservations || []).map(r => `
        <tr class="hover:bg-slate-100/50">
          <td class="p-3 font-mono font-bold text-blue-600">${r.booking_code}</td>
          <td class="p-3">${r.property_name}</td>
          <td class="p-3">${r.guest_name}</td>
          <td class="p-3 font-semibold">${formatRupiah(r.total_price)}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'terkonfirmasi' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
              ${r.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error in openAdminPanelModal:', err);
  }
}

function closeAdminPanelModal() {
  document.getElementById('admin-panel-modal').classList.add('hidden');
}

// Filter Event Handlers
function handleFilterChange() {
  // Types
  const typeChecks = Array.from(document.querySelectorAll('input[name="prop_type"]:checked')).map(c => c.value);
  State.filters.type = typeChecks.length > 0 ? typeChecks.join(',') : 'all';

  // Stars
  const starChecks = Array.from(document.querySelectorAll('input[name="hotel_star"]:checked')).map(c => c.value);
  State.filters.stars = starChecks;

  // Prices
  State.filters.minPrice = document.getElementById('price-min').value || null;
  State.filters.maxPrice = document.getElementById('price-max').value || null;

  // Facilities
  const facChecks = Array.from(document.querySelectorAll('input[name="facility"]:checked')).map(c => c.value);
  State.filters.facilities = facChecks;

  loadProperties();
}

function setTypeFilter(type) {
  // Update nav tabs styling
  ['all', 'hotel', 'homestay', 'apartemen'].forEach(t => {
    const btn = document.getElementById(`nav-type-${t}`);
    if (btn) {
      if (t === type) {
        btn.className = 'px-3 py-2 text-sm font-semibold rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition flex items-center gap-2';
      } else {
        btn.className = 'px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition flex items-center gap-2';
      }
    }
  });

  // Sync checkboxes
  document.querySelectorAll('input[name="prop_type"]').forEach(c => {
    c.checked = (type !== 'all' && c.value === type);
  });

  State.filters.type = type;
  loadProperties();
}

// ================= SIDEBAR FILTERS (RENTANG HARGA, BINTANG, FASILITAS) =================

// Filter 1: Rentang Harga Per Malam
function handlePriceSliderChange(value) {
  const val = parseInt(value, 10);
  const maxLabel = document.getElementById('price-max-label');

  // Reset active classes on quick budget buttons
  document.querySelectorAll('.quick-budget-btn').forEach(btn => {
    btn.classList.remove('bg-amber-100', 'text-amber-800', 'font-bold', 'border-amber-400');
    btn.classList.add('bg-slate-100', 'text-slate-700');
  });

  if (val >= 3000000) {
    if (maxLabel) maxLabel.textContent = 'Rp 2.500.000+';
    State.filters.maxPrice = null;
  } else {
    if (maxLabel) maxLabel.textContent = formatRupiah(val);
    State.filters.maxPrice = val;
  }

  loadProperties();
}

function setQuickBudget(amount) {
  const slider = document.getElementById('price-range-slider');
  const maxLabel = document.getElementById('price-max-label');

  if (slider) slider.value = amount;
  if (maxLabel) maxLabel.textContent = formatRupiah(amount);
  State.filters.maxPrice = amount;

  // Highlight the clicked button
  document.querySelectorAll('.quick-budget-btn').forEach(btn => {
    const btnAmount = parseInt(btn.getAttribute('data-budget'), 10);
    if (btnAmount === amount) {
      btn.classList.remove('bg-slate-100', 'text-slate-700');
      btn.classList.add('bg-amber-100', 'text-amber-800', 'font-bold', 'border-amber-400');
    } else {
      btn.classList.remove('bg-amber-100', 'text-amber-800', 'font-bold', 'border-amber-400');
      btn.classList.add('bg-slate-100', 'text-slate-700');
    }
  });

  loadProperties();
}

// Filter 2: Klasifikasi Bintang Hotel
function toggleStarFilter(starLevel, isChecked) {
  const selectedStars = [];
  const s5 = document.getElementById('star-5');
  const s4 = document.getElementById('star-4');
  const s3 = document.getElementById('star-3');
  const s2 = document.getElementById('star-2');
  const s1 = document.getElementById('star-1');

  if (s5 && s5.checked) selectedStars.push(5);
  if (s4 && s4.checked) selectedStars.push(4);
  if (s3 && s3.checked) selectedStars.push(3);
  if (s2 && s2.checked) selectedStars.push(2);
  if (s1 && s1.checked) selectedStars.push(1);

  State.filters.stars = selectedStars;
  loadProperties();
}

// Filter 3: Fasilitas Populer
function toggleFacilityFilter(facilityKey, isChecked) {
  const activeFacs = [];
  const fWifi = document.getElementById('fac-wifi');
  const fPool = document.getElementById('fac-pool');
  const fPark = document.getElementById('fac-parking');
  const fBreak = document.getElementById('fac-breakfast');

  if (fWifi && fWifi.checked) activeFacs.push('wifi');
  if (fPool && fPool.checked) activeFacs.push('kolam renang');
  if (fPark && fPark.checked) activeFacs.push('parkir');
  if (fBreak && fBreak.checked) activeFacs.push('sarapan');

  State.filters.facilities = activeFacs;
  loadProperties();
}

function filterByStarOnly(star) {
  setTypeFilter('hotel');
  document.querySelectorAll('input[name="hotel_star"]').forEach(c => {
    c.checked = (c.value === String(star));
  });
  State.filters.stars = [star];
  loadProperties();
}

function quickFilterKeyword(keyword) {
  State.filters.search = keyword;
  loadProperties();
}

function setPriceRange(min, max) {
  const pMin = document.getElementById('price-min');
  if (pMin) pMin.value = min || '';
  const pMax = document.getElementById('price-max');
  if (pMax) pMax.value = max || '';
  State.filters.minPrice = min;
  State.filters.maxPrice = max;
  loadProperties();
}

function resetAllFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
  const pMin = document.getElementById('price-min');
  if (pMin) pMin.value = '';
  const pMax = document.getElementById('price-max');
  if (pMax) pMax.value = '';
  const pSlider = document.getElementById('price-range-slider');
  if (pSlider) pSlider.value = 3000000;
  const pMaxLbl = document.getElementById('price-max-label');
  if (pMaxLbl) pMaxLbl.textContent = 'Rp 2.500.000+';

  const areaInput = document.getElementById('search-area-input');
  if (areaInput) areaInput.value = 'Semua Wilayah Yogyakarta';
  const areaHidden = document.getElementById('search-area');
  if (areaHidden) areaHidden.value = 'all';
  const areaBadge = document.getElementById('selected-area-badge');
  if (areaBadge) areaBadge.textContent = 'Semua Jogja';
  
  const activeAreaChip = document.getElementById('active-area-chip');
  if (activeAreaChip) activeAreaChip.classList.add('hidden');

  const summary = document.getElementById('search-summary-text');
  if (summary) {
    summary.innerHTML = 'Menampilkan seluruh hotel, homestay, dan apartemen di Daerah Istimewa Yogyakarta.';
    summary.classList.add('hidden');
  }

  // Update dropdown items active styling
  document.querySelectorAll('.area-item-btn').forEach(btn => {
    btn.classList.remove('bg-amber-100', 'text-amber-900', 'font-bold');
    if (btn.getAttribute('data-area') === 'all') {
      btn.classList.add('bg-amber-50', 'text-amber-900', 'font-bold');
    }
  });

  setTypeFilter('all');
  State.resetFilters();
  loadProperties();
}

// Traveloka Interactive Area Selector Flow
function toggleAreaDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('area-dropdown-menu');
  const arrow = document.getElementById('area-dropdown-arrow');
  if (menu) {
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
      if (arrow) arrow.classList.add('rotate-180');
    } else {
      menu.classList.add('hidden');
      if (arrow) arrow.classList.remove('rotate-180');
    }
  }
}

function selectArea(areaKey, displayLabel) {
  const input = document.getElementById('search-area-input');
  const hidden = document.getElementById('search-area');
  const badge = document.getElementById('selected-area-badge');
  const menu = document.getElementById('area-dropdown-menu');
  const arrow = document.getElementById('area-dropdown-arrow');

  const finalKey = (!areaKey || areaKey === 'all') ? 'all' : areaKey;

  if (input) input.value = displayLabel;
  if (hidden) hidden.value = finalKey;
  if (badge) badge.textContent = (finalKey !== 'all') ? finalKey : 'Semua Jogja';

  // Highlight selected button in dropdown
  document.querySelectorAll('.area-item-btn').forEach(btn => {
    if (btn.getAttribute('data-area') === finalKey) {
      btn.classList.add('bg-amber-100', 'text-amber-900', 'font-bold');
    } else {
      btn.classList.remove('bg-amber-100', 'text-amber-900', 'font-bold');
    }
  });

  // Update State filters immediately
  State.filters.area = finalKey;

  // Close dropdown menu
  if (menu) menu.classList.add('hidden');
  if (arrow) arrow.classList.remove('rotate-180');

  // Trigger load properties immediately (instant filter)
  loadProperties();

  // Update active area chip above results
  const activeAreaChip = document.getElementById('active-area-chip');
  const activeAreaName = document.getElementById('active-area-name');
  if (activeAreaChip && activeAreaName) {
    if (finalKey !== 'all') {
      activeAreaName.textContent = displayLabel;
      activeAreaChip.classList.remove('hidden');
    } else {
      activeAreaChip.classList.add('hidden');
    }
  }

  // Update summary description
  const summary = document.getElementById('search-summary-text');
  if (summary) {
    if (finalKey !== 'all') {
      summary.innerHTML = `Menampilkan akomodasi terbaik di kawasan <b>${displayLabel}</b>.`;
      summary.classList.remove('hidden');
    } else {
      summary.innerHTML = `Menampilkan seluruh hotel, homestay, dan apartemen di Daerah Istimewa Yogyakarta.`;
      summary.classList.add('hidden');
    }
  }

  // Smooth scroll down to property list
  const targetEl = document.getElementById('property-list');
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth' });
  }
}

// Global aliases to ensure both selectArea & selectAreaFilter work smoothly everywhere
function selectAreaFilter(areaKey, displayLabel) {
  selectArea(areaKey, displayLabel);
}
window.selectArea = selectArea;
window.selectAreaFilter = selectAreaFilter;

// ================= TAMU & KAMAR (GUESTS & ROOMS) CONTROLLER =================
let stepperState = {
  adults: 1,
  children: 0,
  rooms: 1
};

function toggleGuestsDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('guests-dropdown-menu');
  const arrow = document.getElementById('guests-dropdown-arrow');
  if (!menu) return;

  // Close area dropdown if open
  const areaMenu = document.getElementById('area-dropdown-menu');
  const areaArrow = document.getElementById('area-dropdown-arrow');
  if (areaMenu) {
    areaMenu.classList.add('hidden');
    if (areaArrow) areaArrow.classList.remove('rotate-180');
  }

  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    if (arrow) arrow.classList.add('rotate-180');
    // sync current state
    stepperState.adults = State.searchForm.adults || State.searchForm.guests || 1;
    stepperState.rooms = State.searchForm.rooms || 1;
    stepperState.children = State.searchForm.children || 0;
    renderGuestsStepperUI();
  } else {
    menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
  }
}

function updateGuestsStepper(type, delta) {
  if (type === 'guests' || type === 'adults') {
    stepperState.adults = Math.max(1, Math.min(30, stepperState.adults + delta));
  } else if (type === 'children') {
    stepperState.children = Math.max(0, Math.min(10, (stepperState.children || 0) + delta));
  } else if (type === 'rooms') {
    stepperState.rooms = Math.max(1, Math.min(10, stepperState.rooms + delta));
  }
  renderGuestsStepperUI();
  updateGuestsInputLabel();
}

function setQuickGuestsPreset(adults, rooms, children = 0) {
  stepperState.adults = adults;
  stepperState.rooms = rooms;
  stepperState.children = children;
  renderGuestsStepperUI();
  updateGuestsInputLabel();
}

function renderGuestsStepperUI() {
  const valAdults = document.getElementById('stepper-guests-val');
  const valChildren = document.getElementById('stepper-children-val');
  const valRooms = document.getElementById('stepper-rooms-val');

  if (valAdults) valAdults.textContent = stepperState.adults;
  if (valChildren) valChildren.textContent = stepperState.children || 0;
  if (valRooms) valRooms.textContent = stepperState.rooms;

  // Disabled button states
  const minusAdultsBtn = document.getElementById('stepper-minus-adults');
  if (minusAdultsBtn) {
    if (stepperState.adults <= 1) {
      minusAdultsBtn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      minusAdultsBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
  }

  const minusChildrenBtn = document.getElementById('stepper-minus-children');
  if (minusChildrenBtn) {
    if ((stepperState.children || 0) <= 0) {
      minusChildrenBtn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      minusChildrenBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
  }

  const minusRoomsBtn = document.getElementById('stepper-minus-rooms');
  if (minusRoomsBtn) {
    if (stepperState.rooms <= 1) {
      minusRoomsBtn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      minusRoomsBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
  }
}

function updateGuestsInputLabel() {
  const input = document.getElementById('search-guests-input');
  if (!input) return;

  let label = '';
  if (stepperState.children && stepperState.children > 0) {
    label = `${stepperState.adults} Dewasa, ${stepperState.children} Anak, ${stepperState.rooms} Kamar`;
  } else {
    label = `${stepperState.adults} Dewasa, ${stepperState.rooms} Kamar`;
  }
  input.value = label;
}

function applyGuestsStepper() {
  State.searchForm.guests = stepperState.adults + (stepperState.children || 0);
  State.searchForm.adults = stepperState.adults;
  State.searchForm.children = stepperState.children || 0;
  State.searchForm.rooms = stepperState.rooms;

  updateGuestsInputLabel();

  // Set filter capacity & rooms
  State.filters.capacity = State.searchForm.guests;
  State.filters.rooms = State.searchForm.rooms;

  // Close dropdown
  const menu = document.getElementById('guests-dropdown-menu');
  const arrow = document.getElementById('guests-dropdown-arrow');
  if (menu) menu.classList.add('hidden');
  if (arrow) arrow.classList.remove('rotate-180');

  // Trigger loadProperties with new capacity
  loadProperties();
}

// Close dropdown on click outside
document.addEventListener('click', (e) => {
  // Area dropdown
  const container = document.getElementById('search-area-container');
  const menu = document.getElementById('area-dropdown-menu');
  const arrow = document.getElementById('area-dropdown-arrow');
  if (container && menu && !container.contains(e.target)) {
    menu.classList.add('hidden');
    if (arrow) arrow.classList.remove('rotate-180');
  }

  // Guests & Rooms dropdown
  const guestsContainer = document.getElementById('search-guests-container');
  const guestsMenu = document.getElementById('guests-dropdown-menu');
  const guestsArrow = document.getElementById('guests-dropdown-arrow');
  if (guestsContainer && guestsMenu && !guestsContainer.contains(e.target)) {
    guestsMenu.classList.add('hidden');
    if (guestsArrow) guestsArrow.classList.remove('rotate-180');
  }
});

function handleHeroSearch(e) {
  e.preventDefault();
  const areaInput = document.getElementById('search-area');
  const area = areaInput ? areaInput.value : '';
  State.filters.area = (area && area !== '') ? area : 'all';
  State.filters.capacity = State.searchForm.guests;
  State.filters.rooms = State.searchForm.rooms;
  calculateNights();
  loadProperties();

  // Scroll smoothly to results
  const targetEl = document.getElementById('property-list') || document.querySelector('main');
  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
}

function handleSortChange(e) {
  State.filters.sort = e.target.value;
  loadProperties();
}

// AI Chatbot UI & Messaging with 24-Hour Cache System
const CHAT_CACHE_KEY = 'stayjogja_ai_chat_cache';
const CHAT_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 Hari (24 Jam) dalam milidetik

function getChatHistoryCache() {
  try {
    const raw = localStorage.getItem(CHAT_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const now = Date.now();
    // Jika usia cache sudah lebih dari 24 jam (1 hari), hapus otomatis
    if (!data.timestamp || (now - data.timestamp > CHAT_CACHE_TTL)) {
      console.log('[Chat AI Cache] ⏳ Riwayat chat telah melebihi 1 hari, dibersihkan otomatis.');
      localStorage.removeItem(CHAT_CACHE_KEY);
      return null;
    }
    return data.messages || [];
  } catch (e) {
    return null;
  }
}

function saveMessageToChatCache(text, sender) {
  try {
    let messages = getChatHistoryCache() || [];
    messages.push({
      sender,
      text,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    });
    // Batasi maksimum 100 pesan agar efisien
    if (messages.length > 100) messages = messages.slice(-100);
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      expires_at: Date.now() + CHAT_CACHE_TTL,
      messages
    }));
  } catch (e) {}
}

function restoreChatHistory() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const messages = getChatHistoryCache();
  if (messages && messages.length > 0) {
    container.innerHTML = `
      <div class="text-center my-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
          <i class="fa-solid fa-clock-rotate-left text-[9px] text-amber-500"></i> Riwayat obrolan aktif (Tersimpan 1 hari)
        </span>
      </div>
    `;
    messages.forEach(m => {
      appendChatMessage(m.text, m.sender, true);
    });
  }
}

function clearChatHistory() {
  if (confirm('Mulai obrolan baru dan hapus riwayat chat AI?')) {
    localStorage.removeItem(CHAT_CACHE_KEY);
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.innerHTML = `
        <div class="chat-bubble-bot p-3.5 max-w-[88%] text-xs leading-relaxed">
          Sugeng rawuh! 👋 Saya asisten pintar <strong>StayJogja</strong>.<br><br>
          Ada yang bisa saya bantu seputar rekomendasi <strong>Hotel Bintang 1–5</strong>, <strong>Homestay</strong>, <strong>Apartemen</strong>, atau <strong>kuliner & tempat wisata</strong> di Yogyakarta?
        </div>
      `;
    }
  }
}

function toggleChatbot() {
  const drawer = document.getElementById('chatbot-drawer');
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    document.getElementById('chat-input').focus();
  }
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendChatMessage(msg, 'user');
  input.value = '';

  const typingId = appendChatTyping();

  try {
    const curPropId = State.currentProperty ? State.currentProperty.id : null;
    const res = await API.sendChatbotMessage(msg, curPropId);
    removeChatTyping(typingId);

    if (res.success) {
      appendChatMessage(res.reply, 'bot');
    } else {
      appendChatMessage('Maaf, asisten sedang sibuk. Silakan coba lagi.', 'bot');
    }
  } catch (err) {
    removeChatTyping(typingId);
    appendChatMessage('Gagal terhubung dengan asisten cerdas.', 'bot');
  }
}

function sendQuickPrompt(promptText) {
  document.getElementById('chat-input').value = promptText;
  document.getElementById('chat-form').dispatchEvent(new Event('submit'));
}

function appendChatMessage(text, sender, skipCache = false) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  const div = document.createElement('div');

  let formatted = text || '';

  // 1. Convert markdown links for hotel detail pages (/detail or /detail.html or /hotel-detail)
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]*(?:\/detail|\/detail\.html|\/hotel-detail|\/property-detail)[^)]*)\)/gi, (m, title, url) => {
    return `<a href="${url}" class="hotel-chat-link inline-flex items-center gap-1.5 font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 text-xs shadow-xs transition my-1 group cursor-pointer" title="Buka Halaman ${title}"><i class="fa-solid fa-hotel text-amber-700"></i><span>${title}</span><i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-amber-600 group-hover:translate-x-0.5 transition-transform"></i></a>`;
  });

  // 2. Convert general markdown links (Google Maps, external references)
  formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, (m, title, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline">${title} <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>`;
  });

  // 3. Bullet points at start of line (* or -)
  formatted = formatted.replace(/^[*-]\s+/gm, '• ');

  // 4. Markdown bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // 5. Markdown italic
  formatted = formatted.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');

  // 6. Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  if (sender === 'user') {
    div.className = 'chat-bubble-user p-3 max-w-[85%] ml-auto text-xs';
    div.innerHTML = formatted;
  } else {
    div.className = 'chat-bubble-bot p-3.5 max-w-[88%] text-xs leading-relaxed';
    div.innerHTML = formatted;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  // Simpan ke cache 24 jam jika bukan saat proses pemulihan (restore)
  if (!skipCache) {
    saveMessageToChatCache(text, sender);
  }
}

function appendChatTyping() {
  const container = document.getElementById('chat-messages-container');
  const div = document.createElement('div');
  const id = `typing-${Date.now()}`;
  div.id = id;
  div.className = 'chat-bubble-bot p-2.5 max-w-[50%] text-xs text-slate-500 italic flex items-center gap-1.5';
  div.innerHTML = `
    <span class="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
    <span class="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
    <span class="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
    <span class="text-[11px] ml-1">Mengetik...</span>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeChatTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

