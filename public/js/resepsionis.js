// ==========================================
// STAYJOGJA - PORTAL RESEPSIONIS FRONT DESK
// ==========================================

let allReservations = [];
let currentFilterTab = 'all'; // 'all' | 'ready' | 'checkedin'
let currentPropertyFilter = 'all';
let activeReservationForRoom = null;
let receptionistScanner = null;
let currentCameraFacing = 'environment';

document.addEventListener('DOMContentLoaded', async () => {
  initReceptionistAuth();
  await loadPropertiesFilter();
  await loadReservationsList();
});

// 1. Inisialisasi Autentikasi Resepsionis
function initReceptionistAuth() {
  const userJson = localStorage.getItem('stayjogja_user');
  if (!userJson) {
    window.location.href = '/login';
    return;
  }

  try {
    const user = JSON.parse(userJson);
    const nameEl = document.getElementById('receptionist-name');
    if (nameEl) nameEl.textContent = user.name || 'Resepsionis';

    // Jika bukan resepsionis atau admin, tetapi user ingin akses resepsionis, beri izin jika role owner/admin/resepsionis
  } catch (e) {
    localStorage.removeItem('stayjogja_user');
    window.location.href = '/login';
  }
}

function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari Portal Resepsionis?')) {
    localStorage.removeItem('stayjogja_user');
    sessionStorage.clear();
    window.location.href = '/login';
  }
}

// 2. Load Properties untuk Dropdown Filter Hotel Tugas
async function loadPropertiesFilter() {
  const selectDesktop = document.getElementById('select-property-filter');
  const selectMobile = document.getElementById('select-property-filter-mobile');

  try {
    const res = await fetch('/api/properties');
    const data = await res.json();
    const props = data.data || [];

    let optionsHtml = '<option value="all" class="bg-slate-900 text-white">Semua Hotel / Akomodasi</option>';
    props.forEach(p => {
      optionsHtml += `<option value="${p.id}" class="bg-slate-900 text-white">${p.name}</option>`;
    });

    if (selectDesktop) selectDesktop.innerHTML = optionsHtml;
    if (selectMobile) selectMobile.innerHTML = optionsHtml;
  } catch (err) {
    console.warn('Gagal memuat daftar properti untuk filter:', err);
  }
}

function handlePropertyFilterChange(val) {
  currentPropertyFilter = val;
  const selectDesktop = document.getElementById('select-property-filter');
  const selectMobile = document.getElementById('select-property-filter-mobile');
  if (selectDesktop) selectDesktop.value = val;
  if (selectMobile) selectMobile.value = val;

  loadReservationsList();
}

// 3. Load Daftar Reservasi Tamu
async function loadReservationsList() {
  const tbody = document.getElementById('reservations-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-spinner fa-spin text-lg mr-2 text-blue-900"></i>
          Memuat daftar reservasi tamu...
        </td>
      </tr>
    `;
  }

  try {
    let url = '/api/reservations/checkin-ready';
    if (currentPropertyFilter && currentPropertyFilter !== 'all') {
      url += `?property_id=${encodeURIComponent(currentPropertyFilter)}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    allReservations = result.data || [];
    updateStatsKPIs(allReservations);
    renderReservationsTable();
  } catch (err) {
    console.error('Error fetching reservations:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-rose-500 font-bold">
            <i class="fa-solid fa-circle-exclamation mr-1.5"></i> Gagal memuat data reservasi. Silakan klik tombol Refresh.
          </td>
        </tr>
      `;
    }
  }
}

function updateStatsKPIs(list) {
  const readyCount = list.filter(r => r.status === 'terkonfirmasi').length;
  const checkedInCount = list.filter(r => r.status === 'selesai_checkin' || r.status === 'checked_in').length;
  const totalCount = list.length;

  const statReady = document.getElementById('stat-ready-count');
  const statCheckedIn = document.getElementById('stat-checkedin-count');
  const statTotal = document.getElementById('stat-total-count');
  const badgeReady = document.getElementById('badge-tab-ready');
  const badgeCheckedIn = document.getElementById('badge-tab-checkedin');

  if (statReady) statReady.textContent = readyCount;
  if (statCheckedIn) statCheckedIn.textContent = checkedInCount;
  if (statTotal) statTotal.textContent = totalCount;
  if (badgeReady) badgeReady.textContent = readyCount;
  if (badgeCheckedIn) badgeCheckedIn.textContent = checkedInCount;
}

function switchFilterTab(tab) {
  currentFilterTab = tab;
  ['all', 'ready', 'checkedin'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      if (t === tab) {
        btn.className = 'px-3 py-1.5 rounded-lg bg-white shadow-2xs text-blue-950 font-bold transition cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 font-bold transition cursor-pointer flex items-center gap-1';
      }
    }
  });
  renderReservationsTable();
}

function filterGuestTable() {
  renderReservationsTable();
}

function renderReservationsTable() {
  const tbody = document.getElementById('reservations-table-body');
  if (!tbody) return;

  const searchKeyword = (document.getElementById('search-guest-input')?.value || '').toLowerCase().trim();

  let filtered = allReservations.filter(r => {
    if (currentFilterTab === 'ready') return r.status === 'terkonfirmasi';
    if (currentFilterTab === 'checkedin') return r.status === 'selesai_checkin' || r.status === 'checked_in';
    return true;
  });

  if (searchKeyword) {
    filtered = filtered.filter(r => {
      const bCode = (r.booking_code || '').toLowerCase();
      const gName = (r.guest_name || '').toLowerCase();
      const gNik  = (r.guest_nik || '').toLowerCase();
      const pName = (r.property_name || '').toLowerCase();
      const rNum  = (r.room_number || '').toLowerCase();
      return bCode.includes(searchKeyword) || gName.includes(searchKeyword) || gNik.includes(searchKeyword) || pName.includes(searchKeyword) || rNum.includes(searchKeyword);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-inbox text-3xl mb-2 text-slate-300 block"></i>
          Tidak ada tamu yang cocok dengan filter saat ini.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const isCheckedIn = r.status === 'selesai_checkin' || r.status === 'checked_in';
    const roomBadge = r.room_number ? `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs border border-amber-600">
        <i class="fa-solid fa-door-open text-[10px]"></i>
        ${r.room_number}
      </span>
    ` : `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 font-semibold text-[11px] rounded-lg border border-dashed border-slate-300">
        <i class="fa-solid fa-circle-question text-[10px]"></i>
        Belum Diatur
      </span>
    `;

    const statusBadge = isCheckedIn ? `
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <i class="fa-solid fa-circle-check text-[9px]"></i> Sudah Check-In
      </span>
    ` : `
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
        <i class="fa-solid fa-clock text-[9px]"></i> Siap Check-In
      </span>
    `;

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3.5 px-4">
          <span class="font-mono font-bold text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 block w-max">
            ${r.booking_code}
          </span>
          <span class="text-[10px] text-slate-400 block mt-0.5">${formatDateOnly(r.created_at)}</span>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900">${r.guest_name}</div>
          <div class="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span class="font-mono">${r.guest_nik || '-'}</span>
            <span class="text-emerald-600 font-bold" title="Terverifikasi Dukcapil Kemendagri"><i class="fa-solid fa-shield-check"></i></span>
          </div>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-slate-800">${r.property_name}</div>
          <div class="text-[10px] text-amber-700 font-medium">${r.unit_name}</div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <div class="font-medium text-slate-700">${r.check_in} s/d ${r.check_out}</div>
          <div class="text-[10px] text-slate-400">${r.nights || 1} Malam &bull; ${r.guests_count || 1} Tamu</div>
        </td>
        <td class="py-3.5 px-4 text-center">
          ${roomBadge}
        </td>
        <td class="py-3.5 px-4">
          ${statusBadge}
          ${r.checked_in_at ? `<span class="block text-[10px] text-slate-400 mt-0.5">${formatTimeOnly(r.checked_in_at)}</span>` : ''}
        </td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openRoomAssignmentModal('${r.booking_code}')" class="px-3 py-1.5 ${isCheckedIn ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'} font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs" title="${isCheckedIn ? 'Ubah Nomor Kamar' : 'Terima Tamu & Alokasikan Kamar'}">
              <i class="fa-solid fa-${isCheckedIn ? 'pen-to-square' : 'key'} text-[11px]"></i>
              <span>${isCheckedIn ? 'Ubah Kamar' : 'Atur Kamar'}</span>
            </button>
            <a href="/checkin/${r.booking_code}" target="_blank" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1" title="Cetak Formulir Fast Check-In & Data Tamu">
              <i class="fa-solid fa-print text-[11px]"></i>
              <span class="hidden sm:inline">Bukti</span>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 4. Modal Alokasi Kamar
function openRoomAssignmentModal(bookingCode) {
  const resv = allReservations.find(r => r.booking_code.toUpperCase() === bookingCode.toUpperCase());
  if (!resv) {
    alert(`Data reservasi dengan kode ${bookingCode} tidak ditemukan.`);
    return;
  }

  activeReservationForRoom = resv;

  document.getElementById('assign-hotel-name').textContent = resv.property_name;
  document.getElementById('assign-unit-name').textContent = resv.unit_name;
  document.getElementById('assign-code-badge').textContent = resv.booking_code;
  document.getElementById('assign-guest-name').textContent = resv.guest_name;
  document.getElementById('assign-guest-nik').textContent = resv.guest_nik || '-';
  document.getElementById('assign-dates').textContent = `${resv.check_in} s/d ${resv.check_out} (${resv.nights || 1} Malam)`;

  const roomInput = document.getElementById('assign-room-input');
  roomInput.value = resv.room_number || '';

  const btnText = document.getElementById('btn-save-assignment-text');
  if (btnText) {
    btnText.textContent = resv.status === 'selesai_checkin' ? 'Simpan Pembaruan Nomor Kamar' : 'Konfirmasi Check-In & Simpan Kamar';
  }

  const modal = document.getElementById('room-assignment-modal');
  if (modal) modal.classList.remove('hidden');

  setTimeout(() => {
    roomInput.focus();
  }, 100);
}

function closeRoomAssignmentModal() {
  const modal = document.getElementById('room-assignment-modal');
  if (modal) modal.classList.add('hidden');
  activeReservationForRoom = null;
}

function setQuickRoom(num) {
  const input = document.getElementById('assign-room-input');
  if (input) {
    input.value = `Kamar ${num}`;
    input.focus();
  }
}

async function saveRoomAssignment() {
  if (!activeReservationForRoom) return;

  const roomInput = document.getElementById('assign-room-input');
  const roomNumber = roomInput.value.trim();

  if (!roomNumber) {
    alert('Silakan masukkan nomor kamar yang diberikan kepada tamu (contoh: Kamar 102).');
    roomInput.focus();
    return;
  }

  const btn = document.getElementById('btn-save-assignment');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan Alokasi Kamar...';

  try {
    const res = await fetch(`/api/reservations/${encodeURIComponent(activeReservationForRoom.booking_code)}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_number: roomNumber })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-key"></i> <span>Konfirmasi Check-In & Simpan Kamar</span>';

    if (!data.success) {
      alert(data.message || 'Gagal menyimpan alokasi kamar.');
      return;
    }

    closeRoomAssignmentModal();
    playScanBeepSound();

    alert(`Sukses! Tamu ${activeReservationForRoom.guest_name} berhasil di-check-in ke ${roomNumber}. Kunci kamar dapat diserahkan.`);
    await loadReservationsList();

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-key"></i> <span>Konfirmasi Check-In & Simpan Kamar</span>';
    alert('Gagal terhubung dengan server StayJogja.');
  }
}

// 5. Modal Scanner QR / Barcode Resepsionis
function openReceptionistScannerModal() {
  const modal = document.getElementById('receptionist-scanner-modal');
  if (modal) modal.classList.remove('hidden');
  setTimeout(startReceptionistCamera, 150);
}

async function closeReceptionistScannerModal() {
  if (receptionistScanner) {
    try {
      await receptionistScanner.stop();
    } catch (e) {}
    receptionistScanner = null;
  }
  const modal = document.getElementById('receptionist-scanner-modal');
  if (modal) modal.classList.add('hidden');
}

async function startReceptionistCamera() {
  const statusMsg = document.getElementById('receptionist-scanner-status');
  if (statusMsg) statusMsg.textContent = 'Menghubungkan ke kamera perangkat...';

  try {
    if (typeof Html5Qrcode === 'undefined') {
      if (statusMsg) statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat pustaka scanner...';
      setTimeout(startReceptionistCamera, 400);
      return;
    }

    if (receptionistScanner) {
      try { await receptionistScanner.stop(); } catch (e) {}
    }

    receptionistScanner = new Html5Qrcode("resepsionis-qr-reader");

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0
    };

    await receptionistScanner.start(
      { facingMode: currentCameraFacing },
      config,
      onReceptionistQrScanned,
      () => {}
    );

    if (statusMsg) {
      statusMsg.innerHTML = '<span class="text-emerald-600 font-bold"><i class="fa-solid fa-camera mr-1"></i> Kamera aktif. Arahkan ke QR Code tamu.</span>';
    }

    const laser = document.getElementById('receptionist-laser-line');
    if (laser) laser.classList.remove('hidden');

  } catch (err) {
    console.warn('Gagal mengaktifkan kamera:', err);
    if (statusMsg) {
      statusMsg.innerHTML = `<span class="text-rose-600 font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Kamera tidak dapat diakses (${err.message || 'Izin ditolak'}). Silakan gunakan verifikasi kode manual.</span>`;
    }
  }
}

async function switchReceptionistCamera() {
  currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment";
  await startReceptionistCamera();
}

async function onReceptionistQrScanned(decodedText) {
  if (!decodedText) return;

  if (navigator.vibrate) {
    try { navigator.vibrate([100, 50, 100]); } catch (e) {}
  }
  playScanBeepSound();

  const code = extractBookingCode(decodedText);
  if (!code) {
    alert('QR Code tidak mengandung kode booking valid: ' + decodedText);
    return;
  }

  await closeReceptionistScannerModal();
  openRoomAssignmentModal(code);
}

function handleModalManualVerify(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('modal-scanner-manual-code');
  const code = (input?.value || '').trim();
  if (!code) return alert('Silakan ketik kode booking tamu.');

  closeReceptionistScannerModal();
  openRoomAssignmentModal(extractBookingCode(code));
}

function handleManualVerify(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('manual-booking-input');
  const raw = (input?.value || '').trim();
  if (!raw) return alert('Silakan masukkan kode booking tamu.');

  const code = extractBookingCode(raw);
  openRoomAssignmentModal(code);
}

// Helper: Extract booking code
function extractBookingCode(text) {
  if (!text) return '';
  const match = text.match(/SJ-[A-Z0-9]+/i);
  if (match) return match[0].toUpperCase();
  return text.trim().toUpperCase();
}

// Helper: Audio Beep
function playScanBeepSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function formatDateOnly(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatTimeOnly(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  }) + ' WIB';
}
