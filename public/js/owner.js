// Owner Dashboard Controller
document.addEventListener('DOMContentLoaded', () => {
  loadOwnerData();
});

// Format Currency
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// Switch Tabs
function switchOwnerTab(tab) {
  const tabs = ['acc', 'checkin', 'rooms', 'properties', 'finance'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const sec = document.getElementById(`owner-section-${t}`);
    if (btn) {
      if (t === tab) {
        btn.className = 'pb-3 text-amber-700 border-b-2 border-amber-600 transition flex items-center gap-2 cursor-pointer whitespace-nowrap';
      } else {
        btn.className = 'pb-3 text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition flex items-center gap-2 cursor-pointer whitespace-nowrap';
      }
    }
    if (sec) {
      if (t === tab) {
        sec.classList.remove('hidden');
        if (t === 'finance') loadOwnerFinance();
      } else {
        sec.classList.add('hidden');
      }
    }
  });

  if (tab === 'acc') loadOwnerReservations();
  if (tab === 'rooms') loadOwnerRooms();
  if (tab === 'properties') loadOwnerProperties();
  if (tab === 'checkin') loadCheckinList();
}

async function loadOwnerData() {
  await loadOwnerReservations();
  await loadOwnerRooms();
  await loadOwnerProperties();
  await loadOwnerNotifications();
}

// 1. Load Reservations & Update KPIs
async function loadOwnerReservations() {
  const container = document.getElementById('owner-reservations-container');
  container.innerHTML = '<div class="text-center py-8 text-xs text-slate-400">Memuat data reservasi...</div>';

  try {
    const res = await API.getOwnerReservations(); // fetch all incoming guest bookings across all accounts
    if (!res.success) return;

    const bookings = res.data;

    // Calculate KPIs
    const pendingAcc = bookings.filter(b => b.status === 'menunggu_acc');
    const confirmed = bookings.filter(b => b.status === 'terkonfirmasi');
    const revenue = confirmed.reduce((acc, curr) => {
      let val = curr.total_price || 0;
      if (curr.settlement_status === 'selesai') {
        val = val - Math.round(val * 0.05); // Kurangi komisi 5% yang sudah dibayarkan
      }
      return acc + val;
    }, 0);

    document.getElementById('kpi-pending-acc').textContent = pendingAcc.length;
    document.getElementById('kpi-confirmed').textContent = confirmed.length;
    document.getElementById('kpi-revenue').textContent = formatRupiah(revenue);
    document.getElementById('tab-badge-acc').textContent = pendingAcc.length;

    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <i class="fa-solid fa-inbox text-slate-300 text-4xl mb-2"></i>
          <p class="text-xs text-slate-500">Belum ada reservasi masuk.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = bookings.map(r => {
      const isWaiting = r.status === 'menunggu_acc';
      let badgeClass = 'bg-blue-100 text-blue-800';
      let label = 'Menunggu ACC';

      if (r.status === 'terkonfirmasi') {
        badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
        label = 'Pesanan Telah Dikonfirmasi (ACC)';
      } else if (r.status === 'ditolak') {
        badgeClass = 'bg-red-100 text-red-800';
        label = 'Ditolak';
      }

      return `
        <div class="bg-white rounded-2xl border ${isWaiting ? 'border-orange-300 shadow-md ring-2 ring-orange-500/10' : 'border-slate-200'} p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold text-slate-900 text-sm sm:text-base">${r.property_name}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                ${label}
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
              <p><i class="fa-solid fa-user text-slate-400 mr-1.5"></i> Tamu: <b>${r.guest_name}</b> (${r.guest_phone})</p>
              <p><i class="fa-solid fa-bed text-slate-400 mr-1.5"></i> Unit: <b>${r.unit_name}</b></p>
              <p><i class="fa-regular fa-calendar-days text-slate-400 mr-1.5"></i> Menginap: <b>${r.check_in}</b> s/d <b>${r.check_out}</b> (${r.nights} Malam)</p>
              <p><i class="fa-solid fa-tag text-slate-400 mr-1.5"></i> Kode: <span class="font-mono font-bold text-blue-600">${r.booking_code}</span></p>
            </div>
            ${r.special_requests ? `<p class="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-2 inline-block"><i class="fa-regular fa-comment-dots mr-1"></i> Permintaan: ${r.special_requests}</p>` : ''}
          </div>

          <div class="flex flex-col sm:flex-row items-end md:items-center gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block uppercase font-bold">Total Pembayaran</span>
              <div class="text-base sm:text-lg font-black text-orange-600">${formatRupiah(r.total_price)}</div>
            </div>

            ${isWaiting ? `
              <div class="flex gap-2">
                <button onclick="handleOwnerAcc('${r.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5">
                  <i class="fa-solid fa-check"></i>
                  <span>ACC Reservasi</span>
                </button>
                <button onclick="handleOwnerReject('${r.id}')" class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition flex items-center gap-1">
                  <i class="fa-solid fa-xmark"></i>
                  <span>Tolak</span>
                </button>
              </div>
            ` : `
              <div class="text-xs text-slate-400 font-semibold px-3 py-1.5 rounded-lg bg-slate-100">
                <i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i> Selesai Diproses
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading owner bookings:', err);
  }
}

// 2. ACC & Reject Actions
async function handleOwnerAcc(id) {
  if (!confirm('Apakah Anda yakin ingin menyetujui (ACC) reservasi ini? Invoice resmi pemesanan akan langsung diterbitkan untuk tamu.')) return;

  try {
    const res = await API.ownerAccReservation(id);
    if (res.success) {
      alert('Berhasil! ' + res.message);
      await loadOwnerReservations();
      await loadOwnerRooms();
    } else {
      alert(res.message || 'Gagal ACC reservasi.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan saat memproses ACC.');
  }
}

async function handleOwnerReject(id) {
  const reason = prompt('Masukkan alasan penolakan reservasi untuk tamu:', 'Kamar penuh pada tanggal tersebut.');
  if (reason === null) return;

  try {
    const res = await API.ownerRejectReservation(id, reason);
    if (res.success) {
      alert('Reservasi telah ditolak. ' + res.message);
      await loadOwnerReservations();
      await loadOwnerRooms();
    } else {
      alert(res.message || 'Gagal menolak reservasi.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan.');
  }
}

// 3. Load Rooms for Management & Update Total Rooms KPI
async function loadOwnerRooms() {
  const tbody = document.getElementById('owner-rooms-table');
  try {
    const res = await API.getProperties({ status: 'all' });
    if (!res.success) return;

    let allUnits = [];
    let totalStock = 0;
    res.data.forEach(p => {
      (p.units || []).forEach(u => {
        allUnits.push({ ...u, property_name: p.name });
        totalStock += parseInt(u.available_stock, 10) || 0;
      });
    });

    // Update KPI Card Total Kamar/Unit secara dinamis
    const kpiTotalEl = document.getElementById('kpi-total-units');
    if (kpiTotalEl) {
      kpiTotalEl.textContent = allUnits.length;
    }
    const kpiSubEl = document.getElementById('kpi-total-units-sub');
    if (kpiSubEl) {
      kpiSubEl.textContent = `${totalStock} kamar fisik (${allUnits.length} varian)`;
    }

    if (!tbody) return;

    if (allUnits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Belum ada kamar/unit terdaftar.</td></tr>`;
      return;
    }

    tbody.innerHTML = allUnits.map(u => `
      <tr class="hover:bg-slate-50 transition" id="row-unit-${u.id}">
        <td class="p-4 font-bold text-slate-900">${u.name}</td>
        <td class="p-4 text-slate-600">${u.property_name}</td>
        <td class="p-4 text-slate-600">${u.capacity} Orang (${u.bed_type})</td>
        <td class="p-4">
          <input type="number" id="input-price-${u.id}" value="${u.price}" class="w-28 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold focus:border-orange-500">
        </td>
        <td class="p-4">
          <input type="number" id="input-stock-${u.id}" value="${u.available_stock}" min="0" class="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold focus:border-orange-500">
        </td>
        <td class="p-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="saveUnitUpdate('${u.id}')" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-sm">
              <i class="fa-solid fa-floppy-disk"></i> Simpan
            </button>
            <button onclick="deleteOwnerUnit('${u.id}', '${u.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold rounded-lg text-xs transition flex items-center gap-1" title="Hapus kamar ini (mengurangi total kamar)">
              <i class="fa-solid fa-trash-can"></i> Hapus
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error in loadOwnerRooms:', err);
  }
}

// Simpan perubahan tarif & stok kamar secara langsung
async function saveUnitUpdate(unitId) {
  const price = document.getElementById(`input-price-${unitId}`).value;
  const stock = document.getElementById(`input-stock-${unitId}`).value;

  try {
    const res = await API.updateUnit(unitId, { price, available_stock: stock });
    if (res.success) {
      alert('Berhasil memperbarui tarif dan stok kamar!');
      await loadOwnerRooms(); // Otomatis perbarui total kamar dan stok di KPI atas
    } else {
      alert(res.message || 'Gagal memperbarui kamar.');
    }
  } catch (err) {
    console.error('Error in saveUnitUpdate:', err);
    alert('Terjadi kesalahan jaringan saat menyimpan.');
  }
}

// Hapus Tipe Kamar secara langsung (mengurangi total kamar di KPI)
async function deleteOwnerUnit(unitId, unitName) {
  if (!confirm(`Apakah Anda yakin ingin menghapus tipe kamar "${unitName}"?\n\nTotal kamar terdaftar pada statistik dashboard akan otomatis berkurang.`)) {
    return;
  }

  try {
    const res = await API.deleteUnit(unitId);
    if (res.success) {
      alert(`Tipe kamar "${unitName}" berhasil dihapus.`);
      await loadOwnerRooms();
      await loadOwnerProperties();
    } else {
      alert(res.message || 'Gagal menghapus tipe kamar.');
    }
  } catch (err) {
    console.error('Error in deleteOwnerUnit:', err);
    alert('Terjadi kesalahan jaringan saat menghapus kamar.');
  }
}

// 4. Load Owner Properties & Manage Statuses
let ownerLoadedProperties = [];
let currentPropertyFilter = 'all';

async function loadOwnerProperties() {
  const container = document.getElementById('owner-properties-grid');
  if (!container) return;
  container.innerHTML = '<div class="col-span-full text-center py-8 text-xs text-slate-400">Memuat properti terdaftar...</div>';

  try {
    const res = await API.getProperties({ status: 'all' });
    if (!res.success) return;

    ownerLoadedProperties = res.data || [];

    updateOwnerStatusBadges();
    renderOwnerPropertiesGrid();
    renderStatusModalContent();

  } catch (err) {
    console.error('Error loading owner properties:', err);
  }
}

// Update status badges across dashboard (banner, filters, and modal)
function updateOwnerStatusBadges() {
  const total = ownerLoadedProperties.length;
  const approved = ownerLoadedProperties.filter(p => p.status_approval === 'approved' && !p.deletion_requested).length;
  const pending = ownerLoadedProperties.filter(p => p.status_approval === 'pending').length;
  const deletion = ownerLoadedProperties.filter(p => p.deletion_requested === true).length;
  const rejected = ownerLoadedProperties.filter(p => p.status_approval === 'rejected').length;

  // Banner badges
  const badgeHotel = document.getElementById('badge-status-hotel-count');
  if (badgeHotel) badgeHotel.textContent = `${total} Hotel`;

  const badgeDel = document.getElementById('badge-status-deletion-count');
  if (badgeDel) badgeDel.textContent = `${deletion} Pengajuan`;

  // Tab 3 Filter Counts
  const elAll = document.getElementById('count-filter-all');
  if (elAll) elAll.textContent = total;
  const elApp = document.getElementById('count-filter-approved');
  if (elApp) elApp.textContent = approved;
  const elPen = document.getElementById('count-filter-pending');
  if (elPen) elPen.textContent = pending;
  const elDel = document.getElementById('count-filter-deletion');
  if (elDel) elDel.textContent = deletion;
  const elRej = document.getElementById('count-filter-rejected');
  if (elRej) elRej.textContent = rejected;

  // Modal tab badges
  const elModApp = document.getElementById('badge-modal-approval-count');
  if (elModApp) elModApp.textContent = total;
  const elModDel = document.getElementById('badge-modal-deletion-count');
  if (elModDel) elModDel.textContent = deletion;
}

// Filter properties in Tab 3 by status
function filterOwnerProperties(filter) {
  currentPropertyFilter = filter;

  const filters = ['all', 'approved', 'pending', 'deletion', 'rejected'];
  filters.forEach(f => {
    const btn = document.getElementById(`prop-filter-btn-${f}`);
    if (btn) {
      if (f === filter) {
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-600 text-white transition shadow-sm flex items-center gap-1.5';
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center gap-1.5';
      }
    }
  });

  renderOwnerPropertiesGrid();
}

// Render grid in Tab 3
function renderOwnerPropertiesGrid() {
  const container = document.getElementById('owner-properties-grid');
  if (!container) return;

  let filtered = [...ownerLoadedProperties];
  if (currentPropertyFilter === 'approved') {
    filtered = filtered.filter(p => p.status_approval === 'approved' && !p.deletion_requested);
  } else if (currentPropertyFilter === 'pending') {
    filtered = filtered.filter(p => p.status_approval === 'pending');
  } else if (currentPropertyFilter === 'deletion') {
    filtered = filtered.filter(p => p.deletion_requested === true);
  } else if (currentPropertyFilter === 'rejected') {
    filtered = filtered.filter(p => p.status_approval === 'rejected');
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center">
        <i class="fa-solid fa-hotel text-slate-300 text-4xl mb-2"></i>
        <p class="text-xs text-slate-600 font-bold">Tidak Ada Properti Sesuai Filter</p>
        <p class="text-[11px] text-slate-400 mt-1">Coba klik tombol filter status lainnya untuk melihat akomodasi Anda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    let statusBadge = '';
    if (p.deletion_requested) {
      statusBadge = `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><i class="fa-solid fa-clock-rotate-left"></i> Pengajuan Hapus Ditinjau Admin</span>`;
    } else if (p.status_approval === 'approved') {
      statusBadge = `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Tayang di Katalog</span>`;
    } else if (p.status_approval === 'pending') {
      statusBadge = `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><i class="fa-solid fa-hourglass-half"></i> Menunggu Approval Admin</span>`;
    } else {
      statusBadge = `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><i class="fa-solid fa-circle-xmark"></i> Ditolak Admin</span>`;
    }

    const photoUrl = (p.photos && p.photos[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

    return `
      <div class="bg-white rounded-2xl border ${p.deletion_requested ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'} overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group">
        <div class="relative h-40 w-full overflow-hidden bg-slate-100">
          <img src="${photoUrl}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <div class="absolute top-2.5 left-2.5">
            <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
              ${p.type.toUpperCase()} ${p.stars ? '★' + p.stars : ''}
            </span>
          </div>
          ${p.deletion_requested ? `
            <div class="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow flex items-center gap-1">
              <i class="fa-solid fa-clock-rotate-left"></i> Review Hapus
            </div>
          ` : ''}
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div class="mb-2">
              ${statusBadge}
            </div>
            <h4 class="font-bold text-slate-900 text-base leading-snug">${p.name}</h4>
            <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <i class="fa-solid fa-location-dot text-red-500 text-[10px]"></i>
              <span class="truncate">${p.area} • ${p.address}</span>
            </p>
          </div>

          <div class="pt-3 border-t border-slate-100">
            <div class="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span class="font-semibold text-slate-700">${p.units ? p.units.length : 0} Tipe Kamar</span>
              <span class="font-bold text-orange-600">Rating: ${p.rating || 9.2} ⭐</span>
            </div>

            <!-- Action Buttons for Owner: Edit, Delete, or Cancel Delete -->
            <div class="grid grid-cols-2 gap-2">
              <button type="button" onclick="openEditPropertyModal('${p.id}')" class="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition flex items-center justify-center gap-1.5 shadow-2xs">
                <i class="fa-solid fa-pen-to-square"></i>
                <span>Edit Data</span>
              </button>
              ${p.deletion_requested ? `
                <button type="button" onclick="cancelDeletePropertyRequest('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 shadow-2xs" title="Batalkan permohonan hapus hotel ini">
                  <i class="fa-solid fa-rotate-left"></i>
                  <span>Batal Hapus</span>
                </button>
              ` : `
                <button type="button" onclick="openRequestDeleteModal('${p.id}', '${p.name.replace(/'/g, "\\'")}', '${p.status_approval}', false)" class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs">
                  <i class="fa-solid fa-trash-can"></i>
                  <span>${p.status_approval === 'approved' ? 'Ajukan Hapus' : 'Hapus'}</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ================= MODAL: STATUS HOTEL & STATUS PENGHAPUSAN =================
function openStatusHotelModal(defaultTab = 'approval') {
  renderStatusModalContent();
  switchStatusModalTab(defaultTab);
  document.getElementById('status-hotel-modal').classList.remove('hidden');
}

function closeStatusHotelModal() {
  document.getElementById('status-hotel-modal').classList.add('hidden');
}

function switchStatusModalTab(tab) {
  const btnApp = document.getElementById('modal-tab-btn-approval');
  const btnDel = document.getElementById('modal-tab-btn-deletion');
  const panelApp = document.getElementById('status-modal-content-approval');
  const panelDel = document.getElementById('status-modal-content-deletion');

  if (tab === 'approval') {
    btnApp.className = 'pb-2.5 text-orange-600 border-b-2 border-orange-600 flex items-center gap-1.5 transition font-bold';
    btnDel.className = 'pb-2.5 text-slate-500 hover:text-slate-800 border-b-2 border-transparent flex items-center gap-1.5 transition font-bold';
    panelApp.classList.remove('hidden');
    panelDel.classList.add('hidden');
  } else {
    btnDel.className = 'pb-2.5 text-red-600 border-b-2 border-red-600 flex items-center gap-1.5 transition font-bold';
    btnApp.className = 'pb-2.5 text-slate-500 hover:text-slate-800 border-b-2 border-transparent flex items-center gap-1.5 transition font-bold';
    panelDel.classList.remove('hidden');
    panelApp.classList.add('hidden');
  }
}

function renderStatusModalContent() {
  const panelApp = document.getElementById('status-modal-content-approval');
  const panelDel = document.getElementById('status-modal-content-deletion');
  if (!panelApp || !panelDel) return;

  // 1. Render Status Persetujuan & Tayang
  if (ownerLoadedProperties.length === 0) {
    panelApp.innerHTML = `
      <div class="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center">
        <i class="fa-solid fa-hotel text-slate-300 text-4xl mb-2"></i>
        <p class="text-xs text-slate-600 font-bold">Belum Ada Properti Terdaftar</p>
        <p class="text-[11px] text-slate-400 mt-1">Daftarkan akomodasi Anda sekarang melalui tombol Daftarkan Properti.</p>
      </div>
    `;
  } else {
    panelApp.innerHTML = ownerLoadedProperties.map(p => {
      let badge = '';
      let statusDesc = '';

      if (p.status_approval === 'approved') {
        badge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Tayang di Katalog</span>`;
        statusDesc = 'Properti telah diverifikasi dan disetujui oleh Administrator StayYK. Tamu dapat menemukan dan memesan akomodasi ini.';
      } else if (p.status_approval === 'pending') {
        badge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><i class="fa-solid fa-hourglass-half"></i> Menunggu Persetujuan Admin</span>`;
        statusDesc = 'Pengajuan pendaftaran akomodasi baru sedang dalam antrean verifikasi tim admin. Mohon tunggu proses approval.';
      } else {
        badge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><i class="fa-solid fa-circle-xmark"></i> Ditolak Admin</span>`;
        statusDesc = 'Pendaftaran belum memenuhi ketentuan. Silakan periksa kembali kelengkapan profil atau hubungi admin.';
      }

      const photoUrl = (p.photos && p.photos[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

      return `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <img src="${photoUrl}" class="w-14 h-14 rounded-xl object-cover shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-bold text-slate-900 text-sm">${p.name}</span>
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">${p.type} ${p.stars ? '★' + p.stars : ''}</span>
              </div>
              <p class="text-xs text-slate-500 mb-1">${p.area} • ${p.units ? p.units.length : 0} Tipe Kamar</p>
              <p class="text-[11px] text-slate-400 leading-snug">${statusDesc}</p>
            </div>
          </div>

          <div class="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
            <div>${badge}</div>
            <button type="button" onclick="closeStatusHotelModal(); openEditPropertyModal('${p.id}');" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition flex items-center gap-1">
              <i class="fa-solid fa-pen-to-square"></i> Edit Data
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Render Status Pengajuan Penghapusan
  const deletionList = ownerLoadedProperties.filter(p => p.deletion_requested === true);
  if (deletionList.length === 0) {
    panelDel.innerHTML = `
      <div class="bg-emerald-50/50 p-8 rounded-2xl border border-emerald-200 text-center space-y-2">
        <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mx-auto">
          <i class="fa-solid fa-shield-check"></i>
        </div>
        <h4 class="font-bold text-slate-800 text-sm">Tidak Ada Pengajuan Penghapusan Aktif</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Seluruh properti Anda beroperasi secara normal. Jika Anda berencana menutup operasional suatu hotel, Anda dapat mengajukannya melalui tombol "Ajukan Hapus".
        </p>
      </div>
    `;
  } else {
    panelDel.innerHTML = deletionList.map(p => {
      const dateStr = p.deletion_requested_at ? new Date(p.deletion_requested_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Baru saja';
      return `
        <div class="bg-red-50/30 p-5 rounded-2xl border-2 border-red-200 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                  <i class="fa-solid fa-clock-rotate-left"></i> Permohonan Hapus Sedang Ditinjau Admin
                </span>
                <span class="text-xs text-slate-400">Diajukan: ${dateStr}</span>
              </div>
              <h4 class="font-bold text-slate-900 text-base">${p.name}</h4>
              <p class="text-xs text-slate-500">${p.area} • ${p.address}</p>
            </div>

            <button type="button" onclick="cancelDeletePropertyRequest('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0">
              <i class="fa-solid fa-rotate-left"></i>
              <span>Batalkan Pengajuan Hapus</span>
            </button>
          </div>

          <div class="bg-white p-3 rounded-xl border border-red-200 text-xs text-slate-700 space-y-1">
            <span class="font-bold text-red-700 flex items-center gap-1">
              <i class="fa-solid fa-quote-left text-red-400"></i> Alasan Penghapusan dari Anda:
            </span>
            <p class="italic text-slate-600">"${p.deletion_reason || 'Pengajuan penutupan operasional.'}"</p>
          </div>

          <p class="text-[11px] text-slate-500 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-info text-blue-500"></i>
            <span>Properti akan tetap berada di sistem hingga Administrator menyetujui penghapusan. Anda dapat membatalkan pengajuan ini sewaktu-waktu.</span>
          </p>
        </div>
      `;
    }).join('');
  }
}

// Batalkan Pengajuan Hapus Properti
async function cancelDeletePropertyRequest(id, name) {
  if (!confirm(`Batalkan pengajuan penghapusan untuk properti "${name}"?\n\nProperti akan kembali aktif normal di katalog StayYK.`)) {
    return;
  }

  try {
    const res = await API.cancelDeletePropertyRequest(id);
    if (res.success) {
      alert(res.message);
      await loadOwnerProperties();
      await loadOwnerRooms();
    } else {
      alert(res.message || 'Gagal membatalkan pengajuan hapus.');
    }
  } catch (err) {
    console.error('Error canceling deletion:', err);
    alert('Terjadi kesalahan jaringan.');
  }
}

// ================= EDIT PROPERTY & PHOTO MODAL CONTROLLER =================
let currentEditingPhotos = [];
let currentEditingUnits = [];

const PRESET_HOTEL_PHOTOS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
];

// Client-side image compression to prevent bloated payloads
function compressImage(dataUrl, maxWidth = 1280, maxHeight = 960, quality = 0.8) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function toggleEditStarsInput() {
  const type = document.getElementById('edit-prop-type').value;
  const starsContainer = document.getElementById('edit-stars-container');
  if (type === 'hotel') {
    starsContainer.classList.remove('hidden');
  } else {
    starsContainer.classList.add('hidden');
  }
}

// ----------------- HOTEL / PROPERTY PHOTOS CONTROLLER -----------------
function renderEditPropPhotos() {
  const grid = document.getElementById('edit-prop-photos-grid');
  const countBadge = document.getElementById('edit-prop-photos-count');
  const hiddenInput = document.getElementById('edit-prop-photos');
  if (!grid) return;

  if (countBadge) countBadge.textContent = `${currentEditingPhotos.length} Foto`;
  if (hiddenInput) hiddenInput.value = currentEditingPhotos.join(', ');

  if (currentEditingPhotos.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 text-slate-400">
        <i class="fa-regular fa-images text-2xl mb-1 text-slate-300"></i>
        <p class="text-xs font-semibold text-slate-600">Belum ada foto hotel yang dipilih</p>
        <p class="text-[10px] text-slate-400">Silakan unggah dari perangkat, tempel tautan URL, atau klik contoh foto di bawah.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = currentEditingPhotos.map((photoUrl, idx) => {
    const isMain = idx === 0;
    return `
      <div class="relative group rounded-xl overflow-hidden border ${isMain ? 'border-2 border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'} bg-slate-100 aspect-video sm:aspect-square flex items-center justify-center shadow-2xs">
        <img src="${photoUrl}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'">
        
        <!-- Fasad Utama Badge / Button -->
        ${isMain ? `
          <span class="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
            <i class="fa-solid fa-star text-amber-300 text-[8px]"></i> Cover Utama
          </span>
        ` : `
          <button type="button" onclick="setEditPropMainPhoto(${idx})" class="opacity-0 group-hover:opacity-100 absolute top-1.5 left-1.5 bg-slate-900/80 hover:bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow transition flex items-center gap-1" title="Jadikan Cover Utama">
            <i class="fa-solid fa-star text-amber-300 text-[8px]"></i> Jadikan Utama
          </button>
        `}

        <!-- Delete button -->
        <button type="button" onclick="removeEditPropPhoto(${idx})" class="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow transition" title="Hapus foto ini">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <span class="absolute bottom-1 right-1.5 text-[9px] font-semibold text-white bg-slate-900/60 px-1 rounded">
          #${idx + 1}
        </span>
      </div>
    `;
  }).join('');
}

function handleEditPropPhotoUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const compressed = await compressImage(evt.target.result);
        currentEditingPhotos.push(compressed);
      } catch (err) {
        currentEditingPhotos.push(evt.target.result);
      }
      loaded++;
      if (loaded === files.length) {
        renderEditPropPhotos();
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function toggleEditPropUrlBox() {
  const box = document.getElementById('edit-prop-url-box');
  if (box) box.classList.toggle('hidden');
}

function addEditPropPhotoFromUrl() {
  const input = document.getElementById('edit-prop-url-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert('Silakan masukkan link URL foto yang valid.');
    return;
  }
  currentEditingPhotos.push(val);
  input.value = '';
  renderEditPropPhotos();
}

function removeEditPropPhoto(idx) {
  if (idx >= 0 && idx < currentEditingPhotos.length) {
    currentEditingPhotos.splice(idx, 1);
    renderEditPropPhotos();
  }
}

function setEditPropMainPhoto(idx) {
  if (idx > 0 && idx < currentEditingPhotos.length) {
    const photo = currentEditingPhotos.splice(idx, 1)[0];
    currentEditingPhotos.unshift(photo);
    renderEditPropPhotos();
  }
}

function addEditPropPresetPhoto() {
  const available = PRESET_HOTEL_PHOTOS.find(p => !currentEditingPhotos.includes(p)) || PRESET_HOTEL_PHOTOS[0];
  currentEditingPhotos.push(available);
  renderEditPropPhotos();
}

// ----------------- SYNC UNITS FROM CURRENT INPUT VALUES -----------------
function syncEditUnitsFromDOM() {
  const container = document.getElementById('edit-units-container');
  if (!container) return;
  const cards = container.querySelectorAll('[data-unit-idx]');
  cards.forEach((card) => {
    const idx = parseInt(card.getAttribute('data-unit-idx'), 10);
    if (currentEditingUnits[idx]) {
      const nameInput = card.querySelector('.edit-unit-name');
      const bedInput = card.querySelector('.edit-unit-bed');
      const priceInput = card.querySelector('.edit-unit-price');
      const stockInput = card.querySelector('.edit-unit-stock');
      const capInput = card.querySelector('.edit-unit-capacity');
      const facsInput = card.querySelector('.edit-unit-facs');

      if (nameInput) currentEditingUnits[idx].name = nameInput.value;
      if (bedInput) currentEditingUnits[idx].bed_type = bedInput.value;
      if (priceInput && !isNaN(parseFloat(priceInput.value))) currentEditingUnits[idx].price = parseFloat(priceInput.value);
      if (stockInput && !isNaN(parseInt(stockInput.value, 10))) currentEditingUnits[idx].available_stock = parseInt(stockInput.value, 10);
      if (capInput && !isNaN(parseInt(capInput.value, 10))) currentEditingUnits[idx].capacity = parseInt(capInput.value, 10);
      if (facsInput) {
        currentEditingUnits[idx].facilities = facsInput.value.split(',').map(f => f.trim()).filter(Boolean);
      }
    }
  });
}

// ----------------- ROOM PHOTOS CONTROLLER -----------------
function handleEditRoomPhotoUpload(e, unitIdx) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;
  syncEditUnitsFromDOM();

  if (!currentEditingUnits[unitIdx].photos) {
    currentEditingUnits[unitIdx].photos = [];
  }

  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const compressed = await compressImage(evt.target.result);
        currentEditingUnits[unitIdx].photos.push(compressed);
      } catch (err) {
        currentEditingUnits[unitIdx].photos.push(evt.target.result);
      }
      loaded++;
      if (loaded === files.length) {
        renderEditUnitsContainer();
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function toggleEditRoomUrlInput(unitIdx) {
  const box = document.getElementById(`edit-room-url-box-${unitIdx}`);
  if (box) box.classList.toggle('hidden');
}

function addEditRoomPhotoFromUrl(unitIdx) {
  const input = document.getElementById(`edit-room-url-input-${unitIdx}`);
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert('Masukkan tautan URL foto kamar.');
    return;
  }
  syncEditUnitsFromDOM();
  if (!currentEditingUnits[unitIdx].photos) currentEditingUnits[unitIdx].photos = [];
  currentEditingUnits[unitIdx].photos.push(val);
  input.value = '';
  renderEditUnitsContainer();
}

function removeEditRoomPhoto(unitIdx, photoIdx) {
  syncEditUnitsFromDOM();
  if (currentEditingUnits[unitIdx] && currentEditingUnits[unitIdx].photos) {
    currentEditingUnits[unitIdx].photos.splice(photoIdx, 1);
    renderEditUnitsContainer();
  }
}

// ----------------- OPEN & CLOSE MODAL -----------------
async function openEditPropertyModal(id) {
  try {
    const res = await API.getPropertyDetail(id);
    if (!res.success) {
      alert('Gagal mengambil detail properti.');
      return;
    }

    const p = res.data;
    document.getElementById('edit-prop-id').value = p.id;
    document.getElementById('edit-prop-name').value = p.name;
    document.getElementById('edit-prop-type').value = p.type;
    toggleEditStarsInput();
    if (p.stars) document.getElementById('edit-prop-stars').value = p.stars;
    document.getElementById('edit-prop-area').value = p.area;
    document.getElementById('edit-prop-postal').value = p.postal_code || '';
    document.getElementById('edit-prop-address').value = p.address;
    const gmapsInput = document.getElementById('edit-prop-gmaps');
    if (gmapsInput) gmapsInput.value = p.gmaps_url || '';
    document.getElementById('edit-prop-desc').value = p.description || '';
    document.getElementById('edit-prop-facilities').value = (p.facilities || []).join(', ');

    // Load property photos
    currentEditingPhotos = (Array.isArray(p.photos) && p.photos.length > 0)
      ? [...p.photos]
      : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'];
    renderEditPropPhotos();

    // Load units
    currentEditingUnits = (p.units && p.units.length > 0) ? JSON.parse(JSON.stringify(p.units)) : [{
      id: `unit-${p.id}-1`,
      name: 'Deluxe Room',
      price: 450000,
      available_stock: 5,
      capacity: 2,
      bed_type: '1 King Bed',
      facilities: ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam', 'Air Panas'],
      photos: []
    }];

    // Ensure each unit has a photos array
    currentEditingUnits.forEach(u => {
      if (!Array.isArray(u.photos)) u.photos = [];
    });

    renderEditUnitsContainer();

    document.getElementById('edit-property-modal').classList.remove('hidden');
  } catch (err) {
    console.error('Error opening edit modal:', err);
    alert('Terjadi kesalahan memuat data properti.');
  }
}

function closeEditPropertyModal() {
  document.getElementById('edit-property-modal').classList.add('hidden');
}

// ----------------- RENDER UNITS WITH ROOM PHOTO CONTROLS -----------------
function renderEditUnitsContainer() {
  const container = document.getElementById('edit-units-container');
  if (!container) return;

  container.innerHTML = currentEditingUnits.map((u, idx) => {
    const unitPhotos = Array.isArray(u.photos) ? u.photos : [];
    return `
    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative" data-unit-idx="${idx}">
      <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
        <span class="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
          <i class="fa-solid fa-bed text-blue-600"></i>
          <span>Tipe Kamar #${idx + 1}</span>
        </span>
        ${currentEditingUnits.length > 1 ? `
          <button type="button" onclick="removeEditUnitCard(${idx})" class="text-red-500 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1">
            <i class="fa-solid fa-trash-can"></i> Hapus Kamar
          </button>
        ` : ''}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-semibold text-slate-600 mb-0.5">Nama Kamar</label>
          <input type="text" class="edit-unit-name w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value="${u.name || ''}" required>
        </div>
        <div>
          <label class="block text-[10px] font-semibold text-slate-600 mb-0.5">Tipe Tempat Tidur</label>
          <select class="edit-unit-bed w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500">
            <option value="1 King Bed" ${u.bed_type && u.bed_type.includes('King') ? 'selected' : ''}>1 King Bed (200x200)</option>
            <option value="1 Queen Bed" ${u.bed_type && u.bed_type.includes('Queen') ? 'selected' : ''}>1 Queen Bed (160x200)</option>
            <option value="2 Single Beds" ${u.bed_type && u.bed_type.includes('Single') ? 'selected' : ''}>2 Single Beds (Twin)</option>
            <option value="1 Double Bed + 1 Single Bed" ${u.bed_type && u.bed_type.includes('Family') ? 'selected' : ''}>Family Bed</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-semibold text-slate-600 mb-0.5">Tarif per Malam (Rp)</label>
          <input type="number" class="edit-unit-price w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500" value="${u.price || 450000}" step="10000" required>
        </div>
        <div>
          <label class="block text-[10px] font-semibold text-slate-600 mb-0.5">Stok Kamar</label>
          <input type="number" class="edit-unit-stock w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value="${u.available_stock || 3}" min="1" required>
        </div>
        <div>
          <label class="block text-[10px] font-semibold text-slate-600 mb-0.5">Kapasitas Tamu</label>
          <input type="number" class="edit-unit-capacity w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value="${u.capacity || 2}" min="1" required>
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-semibold text-slate-600 mb-0.5">Fasilitas Kamar (Pisahkan dengan koma)</label>
        <input type="text" class="edit-unit-facs w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" value="${Array.isArray(u.facilities) ? u.facilities.join(', ') : (u.facilities || 'AC, WiFi Gratis, Kamar Mandi Dalam')}">
      </div>

      <!-- KELOLA FOTO TIPE KAMAR -->
      <div class="pt-2.5 border-t border-slate-200/90 space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <i class="fa-solid fa-camera text-blue-500"></i>
            <span>Foto Tipe Kamar Ini</span>
          </label>
          <span class="text-[10px] text-slate-500 font-medium">${unitPhotos.length > 0 ? unitPhotos.length + ' Foto' : 'Belum ada foto khusus (memakai foto hotel)'}</span>
        </div>

        <div class="flex flex-wrap gap-2 items-center">
          ${unitPhotos.map((ph, pIdx) => `
            <div class="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 group shrink-0 bg-slate-100 shadow-2xs">
              <img src="${ph}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80'">
              <button type="button" onclick="removeEditRoomPhoto(${idx}, ${pIdx})" class="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow transition" title="Hapus foto kamar ini">
                <i class="fa-solid fa-xmark"></i>
              </button>
              <span class="absolute bottom-0.5 left-1 text-[8px] bg-slate-900/70 text-white px-1 rounded font-semibold">#${pIdx + 1}</span>
            </div>
          `).join('')}

          <!-- Tombol Upload File Foto Kamar -->
          <label class="w-16 h-16 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/70 flex flex-col items-center justify-center text-center cursor-pointer transition text-blue-600 shrink-0 shadow-2xs group" title="Unggah foto kamar dari perangkat">
            <input type="file" accept="image/*" multiple onchange="handleEditRoomPhotoUpload(event, ${idx})" class="hidden">
            <i class="fa-solid fa-cloud-arrow-up text-xs mb-0.5 group-hover:scale-110 transition"></i>
            <span class="text-[9px] font-bold">+ Unggah</span>
          </label>

          <!-- Tombol Link URL Foto Kamar -->
          <button type="button" onclick="toggleEditRoomUrlInput(${idx})" class="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer transition text-slate-500 shrink-0" title="Tempel tautan link URL foto">
            <i class="fa-solid fa-link text-xs mb-0.5"></i>
            <span class="text-[9px] font-bold">+ URL</span>
          </button>
        </div>

        <!-- Box Input URL Foto Kamar (Toggle) -->
        <div id="edit-room-url-box-${idx}" class="hidden flex gap-1.5 pt-1">
          <input type="url" id="edit-room-url-input-${idx}" placeholder="https://... (link gambar suasana kamar)" class="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500">
          <button type="button" onclick="addEditRoomPhotoFromUrl(${idx})" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition">
            Tambah
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function addEditUnitCard() {
  syncEditUnitsFromDOM();
  currentEditingUnits.push({
    name: `Tipe Kamar ${currentEditingUnits.length + 1}`,
    price: 450000,
    available_stock: 4,
    capacity: 2,
    bed_type: '1 King Bed',
    facilities: ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam', 'Air Panas'],
    photos: []
  });
  renderEditUnitsContainer();
}

function removeEditUnitCard(idx) {
  if (currentEditingUnits.length > 1) {
    syncEditUnitsFromDOM();
    currentEditingUnits.splice(idx, 1);
    renderEditUnitsContainer();
  }
}

// ----------------- SUBMIT FORM EDIT DATA -----------------
async function handleEditPropertySubmit(e) {
  e.preventDefault();
  syncEditUnitsFromDOM();

  const id = document.getElementById('edit-prop-id').value;
  const btn = document.getElementById('btn-save-edit-prop');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Menyimpan...</span>`;

  try {
    const facsInput = document.getElementById('edit-prop-facilities').value;
    const facilities = facsInput.split(',').map(f => f.trim()).filter(Boolean);

    const photos = currentEditingPhotos.length > 0 
      ? currentEditingPhotos 
      : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'];

    const updatedUnits = currentEditingUnits.map((u, idx) => ({
      id: u.id || `unit-${id}-${idx + 1}`,
      name: u.name || `Tipe Kamar ${idx + 1}`,
      bed_type: u.bed_type || '1 King Bed',
      price: parseFloat(u.price) || 450000,
      available_stock: parseInt(u.available_stock, 10) || 3,
      capacity: parseInt(u.capacity, 10) || 2,
      facilities: (Array.isArray(u.facilities) && u.facilities.length > 0) ? u.facilities : ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam'],
      photos: (Array.isArray(u.photos) && u.photos.length > 0) ? u.photos : photos
    }));

    const payload = {
      name: document.getElementById('edit-prop-name').value.trim(),
      type: document.getElementById('edit-prop-type').value,
      stars: document.getElementById('edit-prop-type').value === 'hotel' ? parseInt(document.getElementById('edit-prop-stars').value, 10) : null,
      area: document.getElementById('edit-prop-area').value,
      postal_code: document.getElementById('edit-prop-postal').value.trim(),
      address: document.getElementById('edit-prop-address').value.trim(),
      gmaps_url: document.getElementById('edit-prop-gmaps') ? document.getElementById('edit-prop-gmaps').value.trim() : '',
      description: document.getElementById('edit-prop-desc').value.trim(),
      facilities: facilities.length > 0 ? facilities : ['WiFi Gratis', 'AC', 'Parkir Gratis'],
      photos: photos,
      units: updatedUnits
    };

    const res = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      if (res.status === 404) {
        throw new Error('Rute server belum aktif (404). Silakan restart server terminal Node.js.');
      }
      throw new Error(`Server mengembalikan status ${res.status}.`);
    }

    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Simpan Perubahan</span>`;

    if (data.success) {
      alert(`Berhasil! Data properti dan foto "${payload.name}" telah diperbarui.`);
      closeEditPropertyModal();
      await loadOwnerProperties();
      await loadOwnerRooms();
      await loadOwnerReservations();
    } else {
      alert(data.message || 'Gagal memperbarui properti.');
    }
  } catch (err) {
    console.error('Error submitting edit property:', err);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Simpan Perubahan</span>`;
    alert(err.message || 'Terjadi kesalahan saat menyimpan data properti.');
  }
}

// ================= REQUEST DELETE MODAL CONTROLLER =================
function openRequestDeleteModal(id, name, status, deletionRequested) {
  if (deletionRequested) {
    alert('Permintaan penghapusan properti ini sedang dalam antrean review oleh Administrator.');
    return;
  }

  document.getElementById('delete-prop-id').value = id;
  document.getElementById('delete-prop-status').value = status;
  document.getElementById('delete-prop-reason').value = '';

  const titleEl = document.getElementById('modal-delete-title');
  const subtitleEl = document.getElementById('modal-delete-subtitle');
  const noteEl = document.getElementById('delete-modal-note');
  const btnLabel = document.getElementById('btn-submit-delete-label');

  if (status === 'pending' || status === 'rejected') {
    titleEl.textContent = `Hapus Pendaftaran "${name}"`;
    subtitleEl.textContent = 'Properti ini belum disetujui tayang oleh Admin. Anda dapat membatalkan dan menghapusnya langsung.';
    noteEl.textContent = 'Pendaftaran akan langsung dihapus dari sistem tanpa perlu verifikasi admin.';
    btnLabel.textContent = 'Hapus Pendaftaran Sekarang';
  } else {
    titleEl.textContent = `Ajukan Hapus Properti "${name}"`;
    subtitleEl.textContent = 'Karena properti ini telah aktif tayang di katalog StayYK, penghapusan memerlukan persetujuan Administrator.';
    noteEl.textContent = 'Permintaan Anda akan masuk ke antrean verifikasi Admin StayYK. Setelah disetujui, properti akan dihapus.';
    btnLabel.textContent = 'Kirim Permintaan Hapus ke Admin';
  }

  document.getElementById('request-delete-modal').classList.remove('hidden');
}

function closeRequestDeleteModal() {
  document.getElementById('request-delete-modal').classList.add('hidden');
}

async function submitDeleteRequest() {
  const id = document.getElementById('delete-prop-id').value;
  const status = document.getElementById('delete-prop-status').value;
  const reason = document.getElementById('delete-prop-reason').value.trim();
  const btn = document.getElementById('btn-submit-delete-req');

  if (!reason) {
    alert('Silakan tuliskan alasan penghapusan properti.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Memproses...</span>`;

  try {
    const res = await fetch(`/api/properties/${id}/request-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      if (res.status === 404) {
        throw new Error('Rute server belum aktif (404). Silakan restart server terminal Node.js Anda dengan menekan Ctrl+C lalu jalankan "npm start" atau "npm run dev".');
      }
      throw new Error(`Server mengembalikan status ${res.status}.`);
    }

    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Kirim Permintaan Hapus</span>`;

    if (data.success) {
      alert(data.message);
      closeRequestDeleteModal();
      await loadOwnerProperties();
      await loadOwnerRooms();
      await loadOwnerReservations();
      await loadOwnerNotifications();
    } else {
      alert(data.message || 'Gagal mengajukan penghapusan.');
    }
  } catch (err) {
    console.error('Error submitting delete request:', err);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Kirim Permintaan Hapus</span>`;
    alert(err.message || 'Terjadi kesalahan jaringan.');
  }
}

// ================= NOTIFICATION CENTER CONTROLLER (LONCENG) =================
let ownerNotifications = [];
let currentNotifFilter = 'all';

async function loadOwnerNotifications() {
  try {
    const res = await API.getNotifications();
    if (!res.success) return;

    ownerNotifications = res.data || [];
    const unreadCount = ownerNotifications.filter(n => !n.read).length;

    // Update Tombol Lonceng di Bawah Total Omzet
    const countEl = document.getElementById('bell-unread-count');
    const dotEl = document.getElementById('bell-unread-dot');
    const statusTextEl = document.getElementById('notif-unread-status-text');

    if (countEl) {
      if (unreadCount > 0) {
        countEl.textContent = `${unreadCount} Baru`;
        countEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white shadow-xs';
      } else {
        countEl.textContent = 'Semua Dibaca';
        countEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200';
      }
    }

    if (dotEl) {
      if (unreadCount > 0) {
        dotEl.classList.remove('hidden');
      } else {
        dotEl.classList.add('hidden');
      }
    }

    if (statusTextEl) {
      statusTextEl.textContent = `${unreadCount} pemberitahuan belum dibaca`;
    }

    renderOwnerNotificationsList();

  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

function openOwnerNotificationModal() {
  loadOwnerNotifications();
  document.getElementById('owner-notification-modal').classList.remove('hidden');
}

function closeOwnerNotificationModal() {
  document.getElementById('owner-notification-modal').classList.add('hidden');
}

function filterNotifications(filter) {
  currentNotifFilter = filter;

  const tabs = ['all', 'approved', 'deletion'];
  tabs.forEach(t => {
    const btn = document.getElementById(`notif-tab-${t}`);
    if (btn) {
      if (t === filter) {
        btn.className = 'px-3 py-1 rounded-lg font-bold bg-orange-600 text-white shadow-xs transition';
      } else {
        btn.className = 'px-3 py-1 rounded-lg font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition';
      }
    }
  });

  renderOwnerNotificationsList();
}

function renderOwnerNotificationsList() {
  const container = document.getElementById('owner-notifications-list');
  if (!container) return;

  let filtered = [...ownerNotifications];
  if (currentNotifFilter === 'approved') {
    filtered = filtered.filter(n => n.type.includes('approved') || n.type.includes('registered') || n.type.includes('rejected'));
  } else if (currentNotifFilter === 'deletion') {
    filtered = filtered.filter(n => n.type.includes('deletion'));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
        <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mx-auto">
          <i class="fa-solid fa-bell-slash"></i>
        </div>
        <h4 class="font-bold text-slate-800 text-sm">Tidak Ada Notifikasi</h4>
        <p class="text-xs text-slate-400 max-w-xs mx-auto">
          Pemberitahuan terkait persetujuan hotel dan pengajuan penghapusan akan muncul di sini.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(n => {
    let icon = '<i class="fa-solid fa-bell text-orange-500"></i>';
    let badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Info</span>';
    let borderClass = 'border-slate-200';

    if (n.type === 'property_approved') {
      icon = '<div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-circle-check"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Disetujui Admin</span>';
      borderClass = 'border-emerald-200 bg-emerald-50/20';
    } else if (n.type === 'deletion_requested') {
      icon = '<div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-clock-rotate-left"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">Menunggu Admin</span>';
      borderClass = 'border-amber-200 bg-amber-50/20';
    } else if (n.type === 'deletion_approved') {
      icon = '<div class="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-trash-can"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">Hapus Disetujui</span>';
      borderClass = 'border-red-200 bg-red-50/20';
    } else if (n.type === 'deletion_rejected') {
      icon = '<div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-ban"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">Hapus Ditolak</span>';
    } else if (n.type === 'deletion_canceled') {
      icon = '<div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-rotate-left"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">Hapus Dibatalkan</span>';
    } else if (n.type === 'property_rejected') {
      icon = '<div class="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-triangle-exclamation"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">Ditolak Admin</span>';
    } else if (n.type === 'property_registered') {
      icon = '<div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-base shrink-0 shadow-2xs"><i class="fa-solid fa-hotel"></i></div>';
      badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">Menunggu Verifikasi</span>';
    }

    const timeStr = n.timestamp ? new Date(n.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Baru saja';

    return `
      <div class="bg-white p-4 rounded-2xl border ${borderClass} shadow-2xs flex items-start justify-between gap-3.5 hover:shadow-xs transition relative group">
        <div class="flex items-start gap-3">
          ${icon}
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 text-xs sm:text-sm">${n.title}</span>
              ${!n.read ? `<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Belum dibaca"></span>` : ''}
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">${n.message}</p>
            <div class="flex items-center gap-3 pt-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">
                <i class="fa-regular fa-clock"></i> ${timeStr}
              </span>
              ${badge}
            </div>
          </div>
        </div>

        <div class="shrink-0 pt-0.5">
          ${n.type === 'property_approved' ? `
            <button type="button" onclick="closeOwnerNotificationModal(); switchOwnerTab('properties');" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition flex items-center gap-1 shadow-2xs">
              <i class="fa-solid fa-arrow-right"></i> Lihat Hotel
            </button>
          ` : ''}
          ${n.type === 'deletion_requested' && n.property_id ? `
            <button type="button" onclick="closeOwnerNotificationModal(); cancelDeletePropertyRequest('${n.property_id}', '${(n.property_name || 'Hotel').replace(/'/g, "\\'")}');" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] rounded-lg border border-amber-200 transition flex items-center gap-1 shadow-2xs">
              <i class="fa-solid fa-rotate-left"></i> Batal Hapus
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function markAllNotificationsAsRead() {
  try {
    const res = await API.markNotificationsRead();
    if (res.success) {
      ownerNotifications.forEach(n => { n.read = true; });
      loadOwnerNotifications();
    }
  } catch (err) {
    console.error('Error marking notifications as read:', err);
  }
}

// Test / Open Google Maps link from owner edit input
function testOwnerGmapsUrl() {
  const input = document.getElementById('edit-prop-gmaps');
  let url = input ? input.value.trim() : '';
  if (!url) {
    const name = document.getElementById('edit-prop-name')?.value || '';
    const addr = document.getElementById('edit-prop-address')?.value || '';
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((name + ' ' + addr).trim() || 'Yogyakarta')}`;
  }
  window.open(url, '_blank');
}

function handleOwnerLogout() {
  localStorage.removeItem('stayjogja_user');
  window.location.href = '/';
}


document.addEventListener('DOMContentLoaded', () => {
  let user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if (!user.id) {
    window.location.href = '/login';
    return;
  }
  if (user.role !== 'owner') {
    alert('Akses Ditolak: Halaman ini khusus Mitra Pemilik Penginapan (Owner).');
    window.location.href = user.role === 'admin' ? '/admin' : '/user';
    return;
  }
  if (user.name) {
    const el = document.getElementById('owner-header-name');
    if (el) el.textContent = user.name;
  }
});


let ownerFinanceData = [];

async function loadOwnerFinance() {
  const tbody = document.getElementById('owner-finance-table');
  if(!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Memuat data tagihan komisi...</td></tr>';

  try {
    const res = await API.getOwnerReservations();
    if (res.success) {
      const bookings = res.data || [];
      // Filter only paid/confirmed bookings
      const paidBookings = bookings.filter(b => 
        ['terkonfirmasi', 'aktif', 'selesai_checkin'].includes(b.status)
      );
      
      ownerFinanceData = paidBookings.map(b => {
        return {
          id: b.id,
          booking_code: b.booking_code,
          property_name: b.property_name,
          total_price: b.total_price,
          platform_fee: Math.round(b.total_price * 0.05),
          settlement_status: b.settlement_status || 'menunggu'
        };
      });
      renderOwnerFinanceTable();
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Gagal memuat data tagihan.</td></tr>';
  }
}

function renderOwnerFinanceTable() {
  const tbody = document.getElementById('owner-finance-table');
  if(!tbody) return;

  if (ownerFinanceData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Belum ada tagihan komisi untuk properti Anda.</td></tr>';
    return;
  }

  tbody.innerHTML = ownerFinanceData.map(s => {
    const isSettled = s.settlement_status === 'selesai';
    const statusBadge = isSettled
      ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max"><i class="fa-solid fa-check-double"></i> Lunas</span>`
      : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-max"><i class="fa-solid fa-clock"></i> Belum Dibayar</span>`;

    const actionBtn = isSettled
      ? `<span class="text-[11px] text-slate-400 font-medium"><i class="fa-solid fa-receipt"></i> Terbayar</span>`
      : `<button onclick="openOwnerInvoiceModal('${s.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 ml-auto cursor-pointer"><i class="fa-solid fa-file-invoice"></i> Lihat Bill</button>`;

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-4">
          <span class="font-mono font-bold text-blue-700 block">${s.booking_code}</span>
          <span class="text-slate-800 font-semibold block text-[11px]">${s.property_name}</span>
        </td>
        <td class="p-4 font-bold text-slate-900">
          ${formatRupiah(s.total_price)}
        </td>
        <td class="p-4 font-black text-amber-700 bg-amber-50/50">
          ${formatRupiah(s.platform_fee)}
        </td>
        <td class="p-4">
          ${statusBadge}
        </td>
        <td class="p-4 text-right">
          ${actionBtn}
        </td>
      </tr>
    `;
  }).join('');
}

function payKomisi(id, bookingCode) {
  if (confirm('Konfirmasi Pembayaran:\n\nApakah Anda yakin ingin membayar tagihan komisi untuk Booking ' + bookingCode + '?\n\nDalam simulasi ini, status akan langsung berubah menjadi Lunas.')) {
    // Meminjam endpoint admin settle untuk simulasi (di sistem nyata harus dari sisi admin yang ACC, atau otomatis dari gateway pembayaran)
    fetch('/api/admin/finance/settle/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'selesai' })
    }).then(res => res.json()).then(data => {
      if(data.success) {
        alert('Pembayaran berhasil! Tagihan komisi telah dilunasi.');
        loadOwnerFinance();
        loadOwnerReservations();
      }
    }).catch(e => {
      console.error(e);
      alert('Berhasil disimulasikan lunas.');
      loadOwnerFinance();
      loadOwnerReservations();
    });
  }
}


function openOwnerInvoiceModal(id) {
  const data = ownerFinanceData.find(s => s.id === id);
  if (!data) return;

  const gross = data.total_price;
  const fee = data.platform_fee;
  const net = gross - fee;

  document.getElementById('inv-gross').textContent = formatRupiah(gross);
  document.getElementById('inv-fee').textContent = formatRupiah(fee);
  document.getElementById('inv-net').textContent = formatRupiah(net);

  document.getElementById('inv-date').textContent = 'Tanggal: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('inv-ref').textContent = 'Ref: INV-FIN-' + data.booking_code;

  const btn = document.getElementById('inv-pay-btn');
  btn.onclick = () => {
    closeOwnerInvoiceModal();
    payKomisi(id, data.booking_code);
  };

  document.getElementById('owner-invoice-modal').classList.remove('hidden');
}

function closeOwnerInvoiceModal() {
  document.getElementById('owner-invoice-modal').classList.add('hidden');
}

// ===== CHECK-IN TAMU TAB =====
async function loadCheckinList() {
  const tbody = document.getElementById('owner-checkin-table');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuat...</td></tr>';

  try {
    const res = await fetch('/api/reservations/checkin-ready');
    const data = await res.json();

    if (!data.success || !data.data || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400">
        <i class="fa-solid fa-calendar-check text-3xl mb-2 block opacity-30"></i>
        <span class="text-xs">Belum ada reservasi yang siap atau sudah check-in.</span>
      </td></tr>`;
      return;
    }

    const list = data.data;
    // Update badge
    const readyCount = list.filter(r => r.status === 'terkonfirmasi').length;
    const badge = document.getElementById('tab-badge-checkin');
    if (badge) {
      badge.textContent = readyCount;
      badge.classList.toggle('hidden', readyCount === 0);
    }

    tbody.innerHTML = list.map(r => renderCheckinRow(r)).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-rose-500 text-xs">Gagal memuat data check-in.</td></tr>';
  }
}

function renderCheckinRow(r) {
  const isCheckedIn = r.status === 'selesai_checkin' || r.status === 'checked_in';
  const checkinUrl  = `/checkin/${r.booking_code}`;

  const statusBadge = isCheckedIn
    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"><i class="fa-solid fa-circle-check"></i> Sudah Check-In</span>`
    : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-key"></i> Siap Check-In</span>`;

  const checkinTime = r.checked_in_at
    ? `<span class="text-[10px] text-slate-500 block mt-0.5">Check-in: ${new Date(r.checked_in_at).toLocaleString('id-ID', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`
    : '';

  const qrVerified = r.verified_by_qr
    ? `<span class="text-[10px] text-emerald-600 font-semibold block"><i class="fa-solid fa-qrcode"></i> via QR Scan</span>`
    : '';

  return `<tr class="hover:bg-slate-50 transition">
    <td class="p-4">
      <p class="font-bold text-slate-900">${r.guest_name}</p>
      <span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">${r.booking_code}</span>
      ${qrVerified}
    </td>
    <td class="p-4">
      <p class="font-semibold text-slate-800">${r.property_name}</p>
      <span class="text-slate-500">${r.unit_name}</span>
    </td>
    <td class="p-4">
      <p class="font-semibold text-slate-800">${r.check_in} → ${r.check_out}</p>
      <span class="text-slate-500">${r.nights || 1} malam • ${r.guests_count || 1} tamu</span>
      ${checkinTime}
    </td>
    <td class="p-4">${statusBadge}</td>
    <td class="p-4">
      <div class="flex items-center justify-end gap-2">
        <a href="${checkinUrl}" target="_blank"
          class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1">
          <i class="fa-solid fa-${isCheckedIn ? 'eye' : 'key'}"></i>
          ${isCheckedIn ? 'Lihat Detail' : 'Check-In'}
        </a>
        <button onclick="window.open('${checkinUrl}', '_blank')" title="Cetak Data Tamu"
          class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-print"></i> Cetak
        </button>
      </div>
    </td>
  </tr>`;
}

// ==========================================
// SCANNER KAMERA QR CHECK-IN OWNER
// ==========================================
let ownerQrScanner = null;
let currentCameraFacingMode = "environment";
let isTorchOn = false;

function extractBookingCode(text) {
  if (!text) return null;
  text = text.trim();
  const urlMatch = text.match(/\/checkin\/([A-Za-z0-9\-]+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1].toUpperCase();
  const queryMatch = text.match(/[?&]code=([A-Za-z0-9\-]+)/i);
  if (queryMatch && queryMatch[1]) return queryMatch[1].toUpperCase();
  const sjMatch = text.match(/\b(SJ-[A-Za-z0-9]+)\b/i);
  if (sjMatch && sjMatch[1]) return sjMatch[1].toUpperCase();
  return text.split('/').pop().split('?')[0].toUpperCase();
}

function playScanBeepSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

async function openOwnerQrScannerModal() {
  const modal = document.getElementById('owner-qr-scanner-modal');
  if (modal) modal.classList.remove('hidden');

  const viewScanner = document.getElementById('owner-scanner-view');
  const viewResult = document.getElementById('owner-scanner-result');
  if (viewScanner) viewScanner.classList.remove('hidden');
  if (viewResult) viewResult.classList.add('hidden');

  setTimeout(() => {
    startOwnerQrCamera();
  }, 100);
}

async function startOwnerQrCamera() {
  const statusMsg = document.getElementById('scanner-status-msg');
  if (statusMsg) statusMsg.textContent = 'Menghubungkan ke kamera perangkat...';

  try {
    if (typeof Html5Qrcode === 'undefined') {
      if (statusMsg) {
        statusMsg.innerHTML = '<span class="text-amber-600 font-semibold"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat modul kamera...</span>';
      }
      setTimeout(startOwnerQrCamera, 500);
      return;
    }

    if (ownerQrScanner) {
      try {
        await ownerQrScanner.stop();
      } catch (e) {}
    }

    ownerQrScanner = new Html5Qrcode("owner-qr-reader");

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0
    };

    await ownerQrScanner.start(
      { facingMode: currentCameraFacingMode },
      config,
      onOwnerQrCodeScanned,
      () => {}
    );

    if (statusMsg) {
      statusMsg.innerHTML = '<span class="text-emerald-700 font-bold"><i class="fa-solid fa-camera mr-1"></i> Kamera aktif. Arahkan ke QR Code tamu.</span>';
    }

    const laser = document.getElementById('scanner-laser-line');
    if (laser) laser.classList.remove('hidden');

  } catch (err) {
    console.warn('Camera start issue:', err);
    if (statusMsg) {
      statusMsg.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Tidak dapat membuka kamera (${err.message || 'Izin ditolak'}). Silakan gunakan input manual di bawah.</span>`;
    }
  }
}

async function onOwnerQrCodeScanned(decodedText) {
  if (!decodedText) return;

  if (navigator.vibrate) {
    try { navigator.vibrate([100, 50, 100]); } catch (e) {}
  }
  playScanBeepSound();

  if (ownerQrScanner) {
    try {
      await ownerQrScanner.stop();
    } catch (e) {}
  }

  const laser = document.getElementById('scanner-laser-line');
  if (laser) laser.classList.add('hidden');

  const statusMsg = document.getElementById('scanner-status-msg');
  if (statusMsg) statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> QR Terdeteksi! Memverifikasi reservasi...';

  const code = extractBookingCode(decodedText);
  if (!code) {
    alert('QR Code tidak mengandung kode booking yang valid: ' + decodedText);
    startOwnerQrCamera();
    return;
  }

  await processOwnerScannedBooking(code);
}

async function processOwnerScannedBooking(code) {
  const viewScanner = document.getElementById('owner-scanner-view');
  const viewResult = document.getElementById('owner-scanner-result');

  try {
    const res = await fetch(`/api/reservations/verify-qr/${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (!data.success && !data.data) {
      alert(data.message || `Kode booking "${code}" tidak ditemukan di database.`);
      startOwnerQrCamera();
      return;
    }

    const resv = data.data;
    const isAlready = data.alreadyCheckedIn;

    if (viewScanner) viewScanner.classList.add('hidden');
    if (viewResult) {
      viewResult.classList.remove('hidden');
      viewResult.innerHTML = `
        <div class="text-center space-y-3">
          <div class="w-14 h-14 mx-auto rounded-2xl ${isAlready ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center text-2xl shadow-xs">
            <i class="fa-solid fa-${isAlready ? 'circle-info' : 'circle-check'}"></i>
          </div>
          <div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isAlready ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">
              ${isAlready ? 'Tamu Sudah Check-In Sebelumnya' : 'Check-In Berhasil Terverifikasi'}
            </span>
            <h4 class="font-extrabold text-base text-slate-900 mt-1">${resv.guest_name}</h4>
            <span class="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${resv.booking_code}</span>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
            <div class="flex justify-between">
              <span class="text-slate-400">Akomodasi:</span>
              <strong class="text-slate-800">${resv.property_name}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Tipe Kamar:</span>
              <span class="text-slate-800 font-semibold">${resv.unit_name}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Jadwal Menginap:</span>
              <span class="text-slate-800">${resv.check_in} s/d ${resv.check_out}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Status Pembayaran:</span>
              <strong class="text-emerald-700">LUNAS (${formatRupiah(resv.total_price)})</strong>
            </div>
          </div>

          <div class="flex flex-col gap-2 pt-2">
            <a href="/checkin/${resv.booking_code}" target="_blank" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-file-invoice"></i>
              <span>Buka Lembar Verifikasi Resepsionis</span>
            </a>
            <div class="flex gap-2">
              <button type="button" onclick="startOwnerQrCamera(); document.getElementById('owner-scanner-view').classList.remove('hidden'); document.getElementById('owner-scanner-result').classList.add('hidden');" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-camera"></i>
                <span>Scan QR Lain</span>
              </button>
              <button type="button" onclick="closeOwnerQrScannerModal()" class="flex-1 py-2 btn-gold text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer">
                Selesai
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (typeof loadCheckinList === 'function') {
      loadCheckinList();
    }

  } catch (err) {
    console.error('Error in processOwnerScannedBooking:', err);
    alert('Terjadi kesalahan saat memverifikasi reservasi.');
    startOwnerQrCamera();
  }
}

async function switchOwnerScannerCamera() {
  currentCameraFacingMode = currentCameraFacingMode === "environment" ? "user" : "environment";
  await startOwnerQrCamera();
}

function handleOwnerManualCodeScan(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('owner-scanner-manual-code');
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return alert('Silakan masukkan kode booking tamu.');
  const code = extractBookingCode(raw);
  processOwnerScannedBooking(code);
}

async function closeOwnerQrScannerModal() {
  if (ownerQrScanner) {
    try {
      await ownerQrScanner.stop();
    } catch (e) {}
    ownerQrScanner = null;
  }
  const modal = document.getElementById('owner-qr-scanner-modal');
  if (modal) modal.classList.add('hidden');
  if (typeof loadCheckinList === 'function') {
    loadCheckinList();
  }
}
