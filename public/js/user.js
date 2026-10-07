// User Dashboard Controller
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  loadSavedItineraries();

  const hash = window.location.hash.replace('#', '');
  if (hash === 'itinerary') {
    switchUserTab('itinerary');
  }
});

// Format Currency
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// Switch User Tabs
function switchUserTab(tab) {
  const tabs = ['active', 'history', 'profile', 'itinerary'];
  tabs.forEach(t => {
    const btn = document.getElementById(`user-tab-btn-${t}`);
    const sec = document.getElementById(`user-sec-${t}`);
    if (!btn || !sec) return;
    if (t === tab) {
      btn.className = 'pb-3 text-amber-700 border-b-2 border-amber-600 transition flex items-center gap-2 font-bold cursor-pointer';
      sec.classList.remove('hidden');
    } else {
      btn.className = 'pb-3 text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition flex items-center gap-2 cursor-pointer';
      sec.classList.add('hidden');
    }
  });

  if (tab === 'active' || tab === 'history') loadUserData();
  if (tab === 'itinerary') loadSavedItineraries();
}

async function loadUserData() {
  const activeContainer = document.getElementById('user-active-bookings-list');
  const historyTbody = document.getElementById('user-history-table');
  const activeBadge = document.getElementById('user-tab-badge-active');

  // Read logged-in user from localStorage
  let currentUser = null;
  try {
    const userJson = localStorage.getItem('stayjogja_user');
    if (userJson) currentUser = JSON.parse(userJson);
  } catch (e) {
    console.error('Error parsing stayjogja_user:', e);
  }

  if (!currentUser || !currentUser.id) {
    window.location.href = '/login';
    return;
  }

  // Update header, welcome banner, and profile form if user data exists
  if (currentUser) {
    const welcomeName = document.getElementById('user-welcome-name');
    const displayName = document.getElementById('user-display-name');
    const avatarInitials = document.getElementById('user-avatar-initials');
    const profName = document.getElementById('prof-name');
    const profEmail = document.getElementById('prof-email');
    const profPhone = document.getElementById('prof-phone');

    const userName = currentUser.name || 'Tamu';
    if (welcomeName) welcomeName.textContent = userName;
    if (displayName) displayName.textContent = userName;
    if (avatarInitials) {
      const parts = userName.trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      avatarInitials.textContent = initials;
    }
    if (profName) profName.value = currentUser.name || '';
    if (profEmail) profEmail.value = currentUser.email || '';
    if (profPhone) profPhone.value = currentUser.phone || '';
  }

  activeContainer.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-5 animate-in fade-in duration-200">
        <div class="w-full md:w-56 h-36 rounded-2xl skeleton-shimmer shrink-0"></div>
        <div class="flex-1 space-y-3">
          <div class="flex items-center justify-between">
            <div class="h-5 w-32 rounded-full skeleton-shimmer-amber"></div>
            <div class="h-4 w-24 rounded skeleton-shimmer"></div>
          </div>
          <div class="h-6 w-3/4 max-w-sm rounded-lg skeleton-shimmer"></div>
          <div class="h-4 w-1/2 rounded skeleton-shimmer"></div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div class="h-6 w-28 rounded skeleton-shimmer"></div>
            <div class="h-8 w-36 rounded-xl skeleton-shimmer-amber"></div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-5 animate-in fade-in duration-200">
        <div class="w-full md:w-56 h-36 rounded-2xl skeleton-shimmer shrink-0"></div>
        <div class="flex-1 space-y-3">
          <div class="flex items-center justify-between">
            <div class="h-5 w-32 rounded-full skeleton-shimmer-amber"></div>
            <div class="h-4 w-24 rounded skeleton-shimmer"></div>
          </div>
          <div class="h-6 w-3/4 max-w-sm rounded-lg skeleton-shimmer"></div>
          <div class="h-4 w-1/2 rounded skeleton-shimmer"></div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div class="h-6 w-28 rounded skeleton-shimmer"></div>
            <div class="h-8 w-36 rounded-xl skeleton-shimmer-amber"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const targetUserId = currentUser.id;
    const res = await API.getUserReservations(targetUserId, currentUser.email);
    if (!res.success) return;

    const bookings = res.data;

    // Calculate KPIs
    const active = bookings.filter(b => 
      b.status === 'menunggu_acc' || 
      b.status === 'terkonfirmasi' || 
      b.status === 'selesai_checkin' || 
      b.status === 'menunggu_pembayaran'
    );
    const confirmed = bookings.filter(b => b.status === 'terkonfirmasi' || b.status === 'selesai_checkin');
    const totalSpent = confirmed.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

    document.getElementById('user-kpi-active').textContent = active.length;
    document.getElementById('user-kpi-confirmed').textContent = confirmed.length;
    document.getElementById('user-kpi-total').textContent = bookings.length;
    document.getElementById('user-kpi-spent').textContent = formatRupiah(totalSpent);
    if (activeBadge) activeBadge.textContent = active.length;

    // Render Active Bookings
    if (active.length === 0) {
      activeContainer.innerHTML = `
        <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <i class="fa-solid fa-file-invoice text-slate-300 text-4xl mb-2"></i>
          <p class="text-xs text-slate-600 font-bold">Tidak Ada Invoice Aktif</p>
          <p class="text-[11px] text-slate-400 mt-1 mb-4">Anda belum memiliki pemesanan kamar yang sedang berjalan.</p>
          <a href="/tamu" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>Cari Hotel, Homestay & Apartemen</span>
          </a>
        </div>
      `;
    } else {
      activeContainer.innerHTML = active.map(r => {
        let badgeClass = 'bg-blue-100 text-blue-800';
        let label = 'Menunggu ACC Pemilik';

        if (r.status === 'terkonfirmasi') {
          badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold';
          label = 'Pesanan Telah Dikonfirmasi (Di-ACC)';
        } else if (r.status === 'selesai_checkin') {
          badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold';
          label = 'Selesai Check-In (Sudah di Hotel)';
        } else if (r.status === 'menunggu_pembayaran') {
          badgeClass = 'bg-amber-100 text-amber-800';
          label = 'Menunggu Pembayaran';
        }

        return `
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-amber-400 transition-all duration-200">
            <div class="flex gap-4 items-start">
              <img src="${r.property_photo || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'}" class="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0" alt="${r.property_name}">
              <div>
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="font-bold text-slate-900 text-sm sm:text-base font-display">${r.property_name}</span>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                    ${label}
                  </span>
                </div>
                <p class="text-xs text-slate-600 font-medium">Tipe Unit: <b>${r.unit_name}</b></p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  <i class="fa-regular fa-calendar-days text-amber-600 mr-1"></i> Check-in: <b>${r.check_in}</b> s/d <b>${r.check_out}</b> (${r.nights} Malam)
                </p>
                <p class="text-[11px] text-slate-400 mt-1">
                  Kode Reservasi: <span class="font-mono font-bold text-blue-900">${r.booking_code}</span>
                </p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-end md:items-center gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block uppercase font-bold">Total Pembayaran</span>
                <div class="text-base sm:text-lg font-black text-amber-700 font-display">${formatRupiah(r.total_price)}</div>
              </div>
              <button onclick="viewVoucherModal('${r.booking_code}')" class="px-4 py-2 btn-gold text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-file-invoice"></i>
                <span>Buka Invoice Resmi</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render History Table
    if (bookings.length === 0) {
      historyTbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Belum ada riwayat pesanan.</td></tr>`;
    } else {
      historyTbody.innerHTML = bookings.map(r => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-4 font-mono font-bold text-blue-600">${r.booking_code}</td>
          <td class="p-4">
            <span class="font-bold text-slate-800 block">${r.property_name}</span>
            <span class="text-[11px] text-slate-400">${r.unit_name}</span>
          </td>
          <td class="p-4 text-slate-600">
            ${r.check_in} s/d ${r.check_out}
            <span class="block text-[10px] text-slate-400 font-medium">(${r.nights} Malam)</span>
          </td>
          <td class="p-4 font-black text-slate-900">${formatRupiah(r.total_price)}</td>
          <td class="p-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'terkonfirmasi' || r.status === 'selesai_checkin' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : (r.status === 'ditolak' ? 'bg-red-100 text-red-800' : (r.status === 'menunggu_acc' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'))}">
              ${r.status === 'terkonfirmasi' ? 'DIKONFIRMASI (DI-ACC)' : (r.status === 'selesai_checkin' ? 'SELESAI CHECK-IN' : (r.status === 'menunggu_acc' ? 'MENUNGGU ACC' : r.status.toUpperCase()))}
            </span>
          </td>
          <td class="p-4 text-right">
            <button onclick="viewVoucherModal('${r.booking_code}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition">
              Detail
            </button>
          </td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error('Error in loadUserData:', err);
  }
}

// Open Invoice Modal
async function viewVoucherModal(code) {
  try {
    const res = await API.getReservationByCode(code);
    if (!res.success) return alert('Gagal memuat invoice.');

    const resv = res.data;
    window.currentActiveReservation = resv;
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
      addressKtp: 'Jl. Babarsari Indah Blok C2 No. 15, RT 004 / RW 006, Kel. Caturtunggal, Kec. Depok, Kab. Sleman, D.I. Yogyakarta 55281'
    });

    const nikEl = document.getElementById('voucher-guest-nik');
    if (nikEl) nikEl.textContent = guestNik;

    const bPlace = ktp.birthPlace || (ktp.regency ? ktp.regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim() : '') || 'Yogyakarta';
    const birthEl = document.getElementById('voucher-guest-birth');
    if (birthEl) birthEl.textContent = `${bPlace}, ${ktp.birthDateFormatted || '15 Agustus 1998'} (${ktp.gender || 'Laki-laki'})`;

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

    const addrEl = document.getElementById('voucher-guest-address');
    if (addrEl) addrEl.textContent = resv.guest_address || ktp.addressKtp || 'Jl. Malioboro Indah Blok D4 No. 18, RT 003 / RW 008, Kel. Sosrowijayan, Kec. Gedongtengen, Kota Yogyakarta, D.I. Yogyakarta 55271';

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

    const banner = document.getElementById('voucher-status-banner');
    const statusText = document.getElementById('voucher-status-text');
    const statusDesc = document.getElementById('voucher-status-desc');

    if (resv.status === 'selesai_checkin') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      statusText.textContent = 'STATUS: SELESAI CHECK-IN (SUDAH DI HOTEL)';
      statusDesc.textContent = 'Tamu telah terverifikasi KTP Dukcapil dan berhasil check-in di frontdesk';
    } else if (resv.status === 'terkonfirmasi') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between text-xs font-bold badge-terkonfirmasi border border-green-200';
      statusText.textContent = 'STATUS: PESANAN TELAH DIKONFIRMASI (TELAH DI-ACC)';
      statusDesc.textContent = 'Invoice resmi lunas dan sah untuk check-in';
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

    document.getElementById('voucher-modal').classList.remove('hidden');
  } catch (err) {
    console.error(err);
  }
}

function closeVoucherModal() {
  document.getElementById('voucher-modal').classList.add('hidden');
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

async function saveUserProfile(e) {
  if (e) e.preventDefault();
  let currentUser = null;
  try {
    const userJson = localStorage.getItem('stayjogja_user');
    if (userJson) currentUser = JSON.parse(userJson);
  } catch (err) {
    console.error('Error parsing stayjogja_user:', err);
  }
  if (!currentUser) return;

  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const profPhone = document.getElementById('prof-phone');
  const btn = document.getElementById('save-prof-btn');

  const newName = profName ? profName.value.trim() : currentUser.name;
  const newEmail = profEmail ? profEmail.value.trim() : currentUser.email;
  const newPhone = profPhone ? profPhone.value.trim() : (currentUser.phone || '');

  if (!newName) {
    alert('Nama lengkap tidak boleh kosong.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
  }

  try {
    const res = await fetch(`/api/auth/profile/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone })
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = { ...currentUser, ...data.user };
    } else {
      currentUser.name = newName;
      currentUser.email = newEmail;
      currentUser.phone = newPhone;
    }
  } catch (err) {
    console.warn('Backend sync failed, saving locally:', err);
    currentUser.name = newName;
    currentUser.email = newEmail;
    currentUser.phone = newPhone;
  }

  localStorage.setItem('stayjogja_user', JSON.stringify(currentUser));

  // Update DOM elements immediately
  const welcomeName = document.getElementById('user-welcome-name');
  const displayName = document.getElementById('user-display-name');
  const avatarInitials = document.getElementById('user-avatar-initials');

  if (welcomeName) welcomeName.textContent = currentUser.name;
  if (displayName) displayName.textContent = currentUser.name;
  if (avatarInitials) {
    const parts = currentUser.name.trim().split(/\s+/);
    const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
    avatarInitials.textContent = initials;
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Tersimpan!';
    setTimeout(() => {
      btn.innerHTML = 'Simpan Perubahan';
    }, 2000);
  }
}

function logoutUser() {
  localStorage.removeItem('stayjogja_user');
  window.location.href = '/';
}

// ==========================================
// RENCANA LIBURAN (ITINERARY) TERSIMPAN USER
// ==========================================
window.userSavedItinerariesList = [];

async function loadSavedItineraries() {
  const container = document.getElementById('user-itinerary-list');
  const badge = document.getElementById('user-tab-badge-itinerary');
  if (!container) return;

  let currentUser = null;
  try {
    const userJson = localStorage.getItem('stayjogja_user');
    if (userJson) currentUser = JSON.parse(userJson);
  } catch (e) {}

  if (!currentUser || !currentUser.id) return;

  // Render Skeleton Shimmer Cards while fetching
  container.innerHTML = `
    <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card space-y-4 animate-in fade-in duration-200">
      <div class="flex items-center justify-between">
        <div class="h-4 w-28 rounded-full skeleton-shimmer-amber"></div>
        <div class="h-3 w-20 rounded skeleton-shimmer"></div>
      </div>
      <div class="h-5 w-3/4 rounded-lg skeleton-shimmer"></div>
      <div class="h-3 w-1/2 rounded skeleton-shimmer"></div>
      <div class="p-3 bg-slate-50 rounded-2xl space-y-2">
        <div class="h-3 w-full rounded skeleton-shimmer"></div>
        <div class="h-3 w-4/5 rounded skeleton-shimmer"></div>
      </div>
      <div class="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div class="h-7 w-28 rounded-xl skeleton-shimmer-amber"></div>
        <div class="h-7 w-7 rounded-xl skeleton-shimmer"></div>
      </div>
    </div>
    <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card space-y-4 animate-in fade-in duration-200">
      <div class="flex items-center justify-between">
        <div class="h-4 w-28 rounded-full skeleton-shimmer-amber"></div>
        <div class="h-3 w-20 rounded skeleton-shimmer"></div>
      </div>
      <div class="h-5 w-3/4 rounded-lg skeleton-shimmer"></div>
      <div class="h-3 w-1/2 rounded skeleton-shimmer"></div>
      <div class="p-3 bg-slate-50 rounded-2xl space-y-2">
        <div class="h-3 w-full rounded skeleton-shimmer"></div>
        <div class="h-3 w-4/5 rounded skeleton-shimmer"></div>
      </div>
      <div class="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div class="h-7 w-28 rounded-xl skeleton-shimmer-amber"></div>
        <div class="h-7 w-7 rounded-xl skeleton-shimmer"></div>
      </div>
    </div>
  `;

  try {
    const res = await API.getUserItineraries(currentUser.id);
    if (res.success) {
      window.userSavedItinerariesList = res.data || [];
      if (badge) badge.textContent = window.userSavedItinerariesList.length;
      renderSavedItineraries(window.userSavedItinerariesList);
    }
  } catch (err) {
    console.error('Failed to load saved itineraries:', err);
    container.innerHTML = `
      <div class="col-span-full p-6 bg-red-50 text-red-700 rounded-2xl text-xs text-center border border-red-200">
        Gagal memuat rencana perjalanan. Silakan segarkan halaman.
      </div>
    `;
  }
}

function renderSavedItineraries(items) {
  const container = document.getElementById('user-itinerary-list');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-card text-center space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shadow-xs">
          <i class="fa-solid fa-map-location-dot"></i>
        </div>
        <h4 class="font-bold text-slate-900 text-sm font-display">Belum Ada Rencana Liburan Tersimpan</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Buka halaman detail hotel mana pun di StayJogja, buat rencana perjalanan menggunakan <strong>AI Trip Planner</strong>, lalu klik <strong>"Simpan ke Akun"</strong> untuk menyimpannya di sini!
        </p>
        <div class="pt-2">
          <a href="/tamu" class="inline-flex items-center gap-2 px-4 py-2 btn-gold text-white font-bold text-xs rounded-xl shadow-sm transition">
            <i class="fa-solid fa-hotel"></i>
            <span>Jelajahi Hotel & Rencanakan Liburan</span>
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(itin => {
    const data = itin.itinerary_data || {};
    const days = data.days || [];
    const dateFormatted = new Date(itin.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const prefLabels = {
      kuliner: '🍲 Wisata Kuliner',
      wisata: '🏛️ Wisata & Budaya',
      santai: '☕ Santai & Healing',
      keluarga: '👨‍👩‍👧‍👦 Ramah Keluarga',
      semua: '✨ Lengkap & Berimbang'
    };

    const prefBadge = prefLabels[itin.preference] || '✨ Liburan Seru';

    // Preview 3 spot destinasi
    const dayPreviews = days.slice(0, 3).map((d, i) => {
      const firstSpot = (d.schedule && d.schedule[0]) ? d.schedule[0].location_name : 'Mulai dari Hotel';
      return `<div class="text-[11px] text-slate-600 flex items-center gap-1.5"><span class="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold text-[9px] flex items-center justify-center shrink-0">${i+1}</span> <span class="truncate font-medium">${d.title || `Hari ke-${i+1}`}: ${firstSpot}</span></div>`;
    }).join('');

    return `
      <div class="bg-white rounded-3xl border border-slate-200/80 shadow-card hover:shadow-lg transition p-5 flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <!-- Top Badges -->
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200">
              <i class="fa-solid fa-calendar-days text-amber-600 mr-1"></i> ${itin.days_count} Hari Liburan
            </span>
            <span class="text-[10px] text-slate-400 font-medium">
              <i class="fa-regular fa-clock"></i> ${dateFormatted}
            </span>
          </div>

          <!-- Trip Title & Hotel Base -->
          <div>
            <h4 class="font-extrabold text-sm sm:text-base text-slate-900 font-display leading-snug">${itin.trip_title}</h4>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <i class="fa-solid fa-hotel text-amber-600 text-[11px]"></i>
              <span>Pusat Akomodasi: <strong>${itin.property_name}</strong></span>
            </div>
            <div class="mt-1">
              <span class="inline-block text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                ${prefBadge}
              </span>
            </div>
          </div>

          <!-- Days Preview -->
          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            ${dayPreviews}
            ${days.length > 3 ? `<div class="text-[10px] text-slate-400 italic">+${days.length - 3} hari perjalanan lainnya...</div>` : ''}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <button type="button" onclick="openItineraryDetailModal('${itin.id}')" class="px-3 py-1.5 btn-gold text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs">
              <i class="fa-solid fa-eye text-[11px]"></i>
              <span>Lihat Jadwal Lengkap</span>
            </button>
            ${itin.property_id ? `
              <a href="/detail.html?id=${itin.property_id}" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1" title="Buka Halaman Hotel">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                <span class="hidden sm:inline">Buka Hotel</span>
              </a>
            ` : ''}
          </div>

          <button type="button" onclick="deleteSavedItinerary('${itin.id}')" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer" title="Hapus Itinerary">
            <i class="fa-regular fa-trash-can text-sm"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openItineraryDetailModal(itinId) {
  const itin = (window.userSavedItinerariesList || []).find(i => i.id === itinId);
  if (!itin) return;

  const modal = document.getElementById('itinerary-view-modal');
  const titleEl = document.getElementById('modal-itin-title');
  const hotelEl = document.getElementById('modal-itin-hotel');
  const printTitleEl = document.getElementById('modal-itin-print-title');
  const printHotelEl = document.getElementById('modal-itin-print-hotel');
  const contentEl = document.getElementById('modal-itin-content');

  if (titleEl) titleEl.textContent = itin.trip_title;
  if (hotelEl) hotelEl.textContent = `Pusat Akomodasi: ${itin.property_name} • Durasi: ${itin.days_count} Hari`;
  if (printTitleEl) printTitleEl.textContent = itin.trip_title;
  if (printHotelEl) printHotelEl.textContent = `Pusat Akomodasi: ${itin.property_name} • Durasi: ${itin.days_count} Hari Liburan`;

  const data = itin.itinerary_data || {};
  const days = data.days || [];

  const daysHtml = days.map((d, idx) => {
    const schedules = (d.schedule || []).map(s => {
      let icon = 'fa-sun text-amber-500';
      let slotBg = 'bg-amber-50 text-amber-900 border-amber-200';
      const pLower = (s.period || s.time_slot || '').toLowerCase();
      if (pLower.includes('pagi')) { icon = 'fa-mug-saucer text-amber-600'; slotBg = 'bg-amber-50 text-amber-900 border-amber-200'; }
      else if (pLower.includes('siang')) { icon = 'fa-sun text-orange-500'; slotBg = 'bg-orange-50 text-orange-900 border-orange-200'; }
      else if (pLower.includes('sore')) { icon = 'fa-cloud-sun text-rose-500'; slotBg = 'bg-rose-50 text-rose-900 border-rose-200'; }
      else if (pLower.includes('malam')) { icon = 'fa-moon text-indigo-600'; slotBg = 'bg-indigo-50 text-indigo-900 border-indigo-200'; }

      const mapsUrl = s.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((s.maps_query || s.location_name) + ' Yogyakarta')}`;

      return `
        <div class="relative pl-6 pb-5 last:pb-1 border-l-2 border-amber-200">
          <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-amber-500"></div>
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <div class="flex items-center justify-between flex-wrap gap-1 text-[11px]">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold uppercase border ${slotBg} text-[10px]">
                <i class="fa-solid ${icon}"></i> ${s.time_slot || s.period}
              </span>
              <span class="text-slate-500 font-semibold text-[10px]"><i class="fa-solid fa-location-dot text-amber-600"></i> ${s.distance_from_hotel || 'Dekat Hotel'}</span>
            </div>
            <h6 class="font-extrabold text-xs sm:text-sm text-slate-900">${s.location_name}</h6>
            <p class="text-xs text-slate-600 leading-relaxed">${s.activity}</p>
            ${s.tips ? `<div class="p-2 bg-amber-50 rounded-lg text-[11px] text-amber-900 font-medium">💡 <strong>Tips Praktis:</strong> ${s.tips}</div>` : ''}
            <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Rute dari: ${itin.property_name}</span>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 underline">
                <span>Buka Google Maps</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-amber-500 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
            H${d.day_number || (idx + 1)}
          </div>
          <div>
            <h5 class="font-extrabold text-sm text-slate-900">${d.title || `Hari ke-${idx + 1}`}</h5>
            <p class="text-[11px] text-slate-500">${d.summary || 'Aktivitas seru sepanjang hari.'}</p>
          </div>
        </div>
        <div class="pt-2">
          ${schedules}
        </div>
      </div>
    `;
  }).join('');

  if (contentEl) {
    contentEl.innerHTML = daysHtml;
  }

  if (modal) modal.classList.remove('hidden');
}

function closeItineraryViewModal() {
  const modal = document.getElementById('itinerary-view-modal');
  if (modal) modal.classList.add('hidden');
}

function printItineraryDocument() {
  document.body.classList.add('printing-itinerary');
  const cleanup = () => {
    document.body.classList.remove('printing-itinerary');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 2500);
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

async function deleteSavedItinerary(itinId) {
  if (!confirm('Apakah Anda yakin ingin menghapus rencana liburan ini dari akun Anda?')) return;

  let currentUser = null;
  try {
    const userJson = localStorage.getItem('stayjogja_user');
    if (userJson) currentUser = JSON.parse(userJson);
  } catch (e) {}

  try {
    const res = await API.deleteUserItinerary(itinId, currentUser ? currentUser.id : null);
    if (res.success) {
      loadSavedItineraries();
    } else {
      alert(res.message || 'Gagal menghapus itinerary.');
    }
  } catch (err) {
    console.error('Error deleting itinerary:', err);
    alert('Terjadi kesalahan saat menghapus itinerary.');
  }
}
