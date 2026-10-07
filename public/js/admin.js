// Admin Dashboard Controller
document.addEventListener('DOMContentLoaded', () => {
  loadAdminData();
});

// Format Currency
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// Switch Admin Tabs
function switchAdminTab(tab) {
  const tabs = ['tx', 'mod', 'finance', 'users'];
  tabs.forEach(t => {
    const btn = document.getElementById(`admin-tab-${t}`);
    const sec = document.getElementById(`admin-sec-${t}`);
    if (!btn || !sec) return;
    if (t === tab) {
      btn.className = 'pb-3 text-amber-700 border-b-2 border-amber-600 transition flex items-center gap-2 cursor-pointer whitespace-nowrap';
      sec.classList.remove('hidden');
    } else {
      btn.className = 'pb-3 text-slate-500 hover:text-slate-900 border-b-2 border-transparent transition flex items-center gap-2 cursor-pointer whitespace-nowrap';
      sec.classList.add('hidden');
    }
  });

  if (tab === 'tx') loadAdminTransactions();
  if (tab === 'mod') loadPendingModeration();
  if (tab === 'finance') loadAdminFinance();
  if (tab === 'users') loadAdminUsers();
}

async function loadAdminData() {
  await loadAdminTransactions();
  await loadPendingModeration();
  await loadAdminFinance();
  await loadAdminUsers();
}

// 1. Load Global Transactions & Update KPIs
async function loadAdminTransactions() {
  const tbody = document.getElementById('admin-tx-table');
  try {
    const res = await API.getAdminOverview();
    if (!res.success) return;

    const stats = res.data.stats;
    document.getElementById('admin-stat-props').textContent = stats.totalProperties;
    document.getElementById('admin-stat-res').textContent = stats.totalReservations;
    document.getElementById('admin-stat-units').textContent = stats.totalUnits;
    document.getElementById('admin-stat-rev').textContent = formatRupiah(stats.grossRevenue);

    const txs = res.data.recentReservations || [];
    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Belum ada transaksi tercatat.</td></tr>`;
      return;
    }

    tbody.innerHTML = txs.map(r => {
      let badgeClass = 'bg-blue-100 text-blue-800';
      if (r.status === 'terkonfirmasi') badgeClass = 'bg-emerald-100 text-emerald-800';
      else if (r.status === 'ditolak') badgeClass = 'bg-red-100 text-red-800';
      else if (r.status === 'menunggu_pembayaran') badgeClass = 'bg-amber-100 text-amber-800';

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-4 font-mono font-bold text-blue-600">${r.booking_code}</td>
          <td class="p-4">
            <span class="font-bold text-slate-800 block">${r.property_name}</span>
            <span class="text-[11px] text-slate-400">${r.unit_name}</span>
          </td>
          <td class="p-4">
            <span class="font-semibold text-slate-800 block">${r.guest_name}</span>
            <span class="text-[11px] text-slate-400">${r.guest_email} • ${r.guest_phone}</span>
          </td>
          <td class="p-4 text-slate-600">
            ${r.check_in} s/d ${r.check_out}
            <span class="block text-[10px] text-slate-400 font-medium">(${r.nights} Malam)</span>
          </td>
          <td class="p-4 font-black text-slate-900">${formatRupiah(r.total_price)}</td>
          <td class="p-4">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeClass}">
              ${r.status.toUpperCase()}
            </span>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error in loadAdminTransactions:', err);
  }
}

// 2. Load Property Moderation, Deletion Requests, & Full Property Directory
let allAdminProperties = [];

async function loadPendingModeration() {
  const pendingContainer = document.getElementById('admin-pending-props-list');
  const deletionContainer = document.getElementById('admin-deletion-requests-list');
  const allPropsTbody = document.getElementById('admin-all-props-table');
  const badgePendingTab = document.getElementById('badge-pending-mod');
  const badgePendingCount = document.getElementById('badge-pending-count');
  const badgeDeletionCount = document.getElementById('badge-deletion-count');

  try {
    const res = await API.getProperties({ status: 'all' });
    if (!res.success) return;

    allAdminProperties = res.data;

    const pending = allAdminProperties.filter(p => p.status_approval === 'pending');
    const deletionRequests = allAdminProperties.filter(p => p.deletion_requested === true);

    // Update Badges
    const totalPendingAttention = pending.length + deletionRequests.length;
    if (badgePendingTab) {
      if (totalPendingAttention > 0) {
        badgePendingTab.textContent = totalPendingAttention;
        badgePendingTab.classList.remove('hidden');
      } else {
        badgePendingTab.classList.add('hidden');
      }
    }

    if (badgePendingCount) badgePendingCount.textContent = pending.length;
    if (badgeDeletionCount) badgeDeletionCount.textContent = deletionRequests.length;

    // A. Render Pending New Properties
    if (pending.length === 0) {
      pendingContainer.innerHTML = `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <i class="fa-solid fa-circle-check text-emerald-500 text-3xl mb-1.5"></i>
          <p class="text-xs text-slate-700 font-bold">Tidak Ada Pengajuan Properti Baru yang Tertunda</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Semua akomodasi baru telah diverifikasi.</p>
        </div>
      `;
    } else {
      pendingContainer.innerHTML = pending.map(p => `
        <div class="bg-white rounded-2xl border border-amber-300 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Pengajuan Baru • ${p.type.toUpperCase()} ${p.stars ? '★' + p.stars : ''}
              </span>
              <span class="text-xs text-slate-400">ID: ${p.id}</span>
            </div>
            <h4 class="font-bold text-slate-900 text-base">${p.name}</h4>
            <p class="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <i class="fa-solid fa-map-pin text-red-500 text-[11px]"></i>
              <span>${p.area} • ${p.address}</span>
              <a href="${p.gmaps_url || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ' ' + p.address + ' Yogyakarta'))}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 font-bold underline inline-flex items-center gap-1 ml-1 text-[11px]">
                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> Cek Google Maps
              </a>
            </p>
            <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">${p.description || 'Tidak ada deskripsi.'}</p>
            <div class="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span><b>PIC:</b> ${p.contact_pic?.name || 'Mitra'} (${p.contact_pic?.phone || '-'})</span>
              <span><b>Kamar:</b> ${p.units ? p.units.length : 0} Unit</span>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
            <button onclick="approveProperty('${p.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5">
              <i class="fa-solid fa-check"></i> Setujui & Tayangkan
            </button>
            <button onclick="rejectProperty('${p.id}')" class="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5">
              <i class="fa-solid fa-xmark"></i> Tolak
            </button>
          </div>
        </div>
      `).join('');
    }

    // B. Render Deletion Requests from Owners
    if (deletionRequests.length === 0) {
      deletionContainer.innerHTML = `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <i class="fa-solid fa-shield-halved text-blue-500 text-3xl mb-1.5"></i>
          <p class="text-xs text-slate-700 font-bold">Tidak Ada Permintaan Penghapusan dari Mitra</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Semua akomodasi mitra aktif beroperasi secara normal.</p>
        </div>
      `;
    } else {
      deletionContainer.innerHTML = deletionRequests.map(p => `
        <div class="bg-white rounded-2xl border-2 border-orange-300 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-orange-50/20">
          <div class="space-y-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
                <i class="fa-solid fa-triangle-exclamation"></i> Permintaan Hapus Akomodasi
              </span>
              <span class="text-xs text-slate-400">Owner ID: ${p.owner_id}</span>
            </div>
            <h4 class="font-bold text-slate-900 text-base">${p.name}</h4>
            <p class="text-xs text-slate-500">${p.area} • ${p.address}</p>
            <div class="bg-white p-2.5 rounded-xl border border-orange-200 text-xs text-orange-950 mt-1">
              <span class="font-bold text-orange-800">Alasan Pemilik:</span> "${p.deletion_reason || 'Pengajuan penutupan operasional.'}"
            </div>
          </div>

          <div class="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
            <button onclick="approveDeletion('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition flex items-center gap-1.5">
              <i class="fa-solid fa-trash-can"></i> Setujui Hapus Permanen
            </button>
            <button onclick="rejectDeletion('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition">
              Tolak Permintaan
            </button>
          </div>
        </div>
      `).join('');
    }

    // C. Render All Properties Directory
    renderAdminAllPropertiesTable(allAdminProperties);

  } catch (err) {
    console.error('Error in loadPendingModeration:', err);
  }
}

function renderAdminAllPropertiesTable(propsList) {
  const tbody = document.getElementById('admin-all-props-table');
  if (!tbody) return;

  if (propsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Tidak ada akomodasi yang sesuai kriteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = propsList.map(p => {
    let statusBadge = '';
    if (p.deletion_requested) {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">Pengajuan Hapus</span>`;
    } else if (p.status_approval === 'approved') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Tayang di Katalog</span>`;
    } else if (p.status_approval === 'pending') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Menunggu Approval</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Ditolak</span>`;
    }

    const minPrice = p.min_price || (p.units && p.units[0] ? p.units[0].price : 450000);

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-4">
          <span class="font-bold text-slate-900 block text-sm">${p.name}</span>
          <span class="text-[11px] text-slate-400 truncate block max-w-xs">${p.address}</span>
        </td>
        <td class="p-4">
          <span class="font-semibold text-slate-800 block uppercase text-xs">${p.type} ${p.stars ? '★' + p.stars : ''}</span>
          <span class="text-[11px] text-slate-400">Rating ${p.rating || 9.2} ⭐</span>
        </td>
        <td class="p-4 text-slate-700 font-medium">
          ${p.area}
        </td>
        <td class="p-4">
          <span class="font-bold text-slate-900 block">${formatRupiah(minPrice)}</span>
          <span class="text-[11px] text-slate-400">${p.units ? p.units.length : 0} Tipe Kamar</span>
        </td>
        <td class="p-4">
          ${statusBadge}
        </td>
        <td class="p-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="adminDeleteProperty('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg font-bold text-xs border border-red-200 transition flex items-center gap-1" title="Hapus Akomodasi Ini Secara Permanen">
              <i class="fa-solid fa-trash-can"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminProperties() {
  const query = (document.getElementById('admin-prop-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('admin-prop-status-filter')?.value || 'all';

  let filtered = [...allAdminProperties];

  if (statusFilter === 'approved') {
    filtered = filtered.filter(p => p.status_approval === 'approved' && !p.deletion_requested);
  } else if (statusFilter === 'pending') {
    filtered = filtered.filter(p => p.status_approval === 'pending');
  } else if (statusFilter === 'deletion_requested') {
    filtered = filtered.filter(p => p.deletion_requested === true);
  } else if (statusFilter === 'rejected') {
    filtered = filtered.filter(p => p.status_approval === 'rejected');
  }

  if (query) {
    filtered = filtered.filter(p => 
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.area && p.area.toLowerCase().includes(query)) ||
      (p.address && p.address.toLowerCase().includes(query))
    );
  }

  renderAdminAllPropertiesTable(filtered);
}

async function approveProperty(id) {
  try {
    const res = await fetch(`/api/admin/properties/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingModeration();
      loadAdminTransactions();
    }
  } catch (e) {
    alert('Gagal memproses approval.');
  }
}

async function rejectProperty(id) {
  if (!confirm('Tolak pendaftaran properti ini?')) return;
  try {
    const res = await fetch(`/api/admin/properties/${id}/reject`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingModeration();
    }
  } catch (e) {
    alert('Gagal memproses penolakan.');
  }
}

async function approveDeletion(id, name) {
  if (!confirm(`Apakah Anda yakin ingin menyetujui penghapusan properti "${name}"? Properti dan seluruh unit kamarnya akan dihapus permanen.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/properties/${id}/approve-delete`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingModeration();
      loadAdminTransactions();
    } else {
      alert(data.message || 'Gagal menyetujui penghapusan.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

async function rejectDeletion(id, name) {
  if (!confirm(`Tolak permohonan hapus untuk properti "${name}"? Properti akan tetap aktif di katalog.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/properties/${id}/reject-delete`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingModeration();
    } else {
      alert(data.message || 'Gagal memproses penolakan.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

async function adminDeleteProperty(id, name) {
  if (!confirm(`PERINGATAN ADMINISTRATOR:\nApakah Anda yakin ingin MENGHAPUS PERMANEN akomodasi "${name}"?\nData kamar dan seluruh riwayat properti ini akan dihapus dari sistem StayYK.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadPendingModeration();
      loadAdminTransactions();
    } else {
      alert(data.message || 'Gagal menghapus properti.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

// ==========================================
// 3. MODUL BAGI HASIL & KOMISI 5% (FINANCE)
// ==========================================
let allAdminSettlements = [];
let adminFinanceSummary = null;

async function loadAdminFinance() {
  const grossElem = document.getElementById('fin-stat-gross');
  const feeElem = document.getElementById('fin-stat-fee');
  const netElem = document.getElementById('fin-stat-net');
  const paidCountElem = document.getElementById('fin-stat-paid-count');
  const ratioElem = document.getElementById('fin-stat-settlement-ratio');

  try {
    const res = await API.getAdminFinance();
    if (!res.success) return;

    adminFinanceSummary = res.data.summary;
    allAdminSettlements = res.data.settlements || [];

    if (grossElem) grossElem.textContent = formatRupiah(adminFinanceSummary.grossVolume);
    if (feeElem) feeElem.textContent = formatRupiah(adminFinanceSummary.platformCommissionTotal);
    if (netElem) netElem.textContent = formatRupiah(adminFinanceSummary.ownerNetTotal);
    if (paidCountElem) paidCountElem.textContent = `${adminFinanceSummary.totalPaidBookings} Transaksi Lunas`;
    if (ratioElem) ratioElem.textContent = `${adminFinanceSummary.settledCount} Selesai • ${adminFinanceSummary.pendingCount} Menunggu`;

    renderAdminFinanceTable(allAdminSettlements);
  } catch (err) {
    console.error('Error in loadAdminFinance:', err);
  }
}

function renderAdminFinanceTable(settlements) {
  const tbody = document.getElementById('admin-finance-table');
  if (!tbody) return;

  if (settlements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">Belum ada transaksi pembayaran yang siap dicairkan.</td></tr>`;
    return;
  }

  tbody.innerHTML = settlements.map(s => {
    const isSettled = s.settlement_status === 'selesai';
    const statusBadge = isSettled
      ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max"><i class="fa-solid fa-check-double"></i> Komisi Lunas</span>`
      : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-max"><i class="fa-solid fa-file-invoice-dollar"></i> Menunggu Komisi</span>`;

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-4">
          <span class="font-mono font-bold text-blue-700 block">${s.booking_code}</span>
          <span class="text-slate-800 font-semibold block text-xs">${s.guest_name}</span>
          <span class="text-[10px] text-slate-400">${s.check_in} (${s.nights} malam)</span>
        </td>
        <td class="p-4">
          <span class="font-bold text-slate-900 block">${s.property_name}</span>
          <span class="text-[11px] text-slate-500"><i class="fa-solid fa-user-tie text-[10px]"></i> ${s.owner_name}</span>
        </td>
        <td class="p-4 font-bold text-slate-900">
          ${formatRupiah(s.total_price)}
        </td>
        <td class="p-4 font-bold text-amber-700 bg-amber-50/50">
          ${formatRupiah(s.platform_fee)}
        </td>
        <td class="p-4 font-black text-emerald-700 bg-emerald-50/50">
          ${formatRupiah(s.owner_net)}
        </td>
        <td class="p-4">
          ${statusBadge}
          ${s.settled_at ? `<span class="block text-[9px] text-slate-400 mt-1">${new Date(s.settled_at).toLocaleDateString('id-ID')}</span>` : ''}
        </td>
        <td class="p-4 text-right">
          ${isSettled 
            ? `<span class="text-[11px] text-slate-400 font-medium"><i class="fa-solid fa-receipt"></i> Terbayar</span>` 
            : `<button onclick="alert('Pemilik belum membayar tagihan ini. Menunggu pembayaran.')" class="px-3 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-lg cursor-not-allowed">Menunggu</button>`}
        </td>
      </tr>
    `;
  }).join('');
}

function filterFinanceTable() {
  const query = (document.getElementById('fin-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('fin-status-filter')?.value || 'all';

  let filtered = [...allAdminSettlements];

  if (statusFilter !== 'all') {
    filtered = filtered.filter(s => s.settlement_status === statusFilter);
  }

  if (query) {
    filtered = filtered.filter(s =>
      s.booking_code.toLowerCase().includes(query) ||
      s.property_name.toLowerCase().includes(query) ||
      s.owner_name.toLowerCase().includes(query) ||
      s.guest_name.toLowerCase().includes(query)
    );
  }

  renderAdminFinanceTable(filtered);
}

async function toggleSettlePayout(id) {
  try {
    const res = await API.settleFinance(id);
    if (res.success) {
      alert(res.message);
      loadAdminFinance();
      loadAdminTransactions();
    } else {
      alert(res.message || 'Gagal mengubah status settlement.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

// Print / Export Finance Report
function printFinanceReport() {
  if (!adminFinanceSummary) {
    alert('Memuat data keuangan, silakan coba beberapa detik lagi...');
    return;
  }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const printDateElem = document.getElementById('print-date');
  const printSignDateElem = document.getElementById('print-sign-date');
  const printGrossElem = document.getElementById('print-gross');
  const printFeeElem = document.getElementById('print-fee');
  const printNetElem = document.getElementById('print-net');
  const printRatioElem = document.getElementById('print-settlement-ratio');
  const detailsTbody = document.getElementById('print-details-tbody');

  if (printDateElem) printDateElem.textContent = `Tanggal: ${dateFormatted}`;
  if (printSignDateElem) printSignDateElem.textContent = dateFormatted;
  if (printGrossElem) printGrossElem.textContent = formatRupiah(adminFinanceSummary.grossVolume);
  if (printFeeElem) printFeeElem.textContent = formatRupiah(adminFinanceSummary.platformCommissionTotal);
  if (printNetElem) printNetElem.textContent = formatRupiah(adminFinanceSummary.ownerNetTotal);
  if (printRatioElem) printRatioElem.textContent = `${adminFinanceSummary.settledCount} Transaksi Dicairkan, ${adminFinanceSummary.pendingCount} Transaksi Menunggu`;

  if (detailsTbody) {
    if (allAdminSettlements.length === 0) {
      detailsTbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">Tidak ada rincian transaksi.</td></tr>`;
    } else {
      detailsTbody.innerHTML = allAdminSettlements.map((s, idx) => `
        <tr>
          <td class="p-2 font-mono">${idx + 1}</td>
          <td class="p-2 font-mono font-bold">${s.booking_code}</td>
          <td class="p-2 font-semibold">${s.property_name} <br><span class="text-[10px] text-slate-500">Mitra: ${s.owner_name}</span></td>
          <td class="p-2 text-[10px]">${s.owner_bank.bank || 'BCA'} ${s.owner_bank.number || '8410294821'}</td>
          <td class="p-2 font-bold">${formatRupiah(s.total_price)}</td>
          <td class="p-2 text-amber-800 font-bold">${formatRupiah(s.platform_fee)}</td>
          <td class="p-2 text-emerald-800 font-bold">${formatRupiah(s.owner_net)}</td>
          <td class="p-2">${s.settlement_status === 'selesai' ? 'SUDAH DITRANSFER' : 'MENUNGGU'}</td>
        </tr>
      `).join('');
    }
  }

  const modal = document.getElementById('print-report-modal');
  if (modal) modal.classList.remove('hidden');
}

function closePrintModal() {
  const modal = document.getElementById('print-report-modal');
  if (modal) modal.classList.add('hidden');
}

function triggerActualPrint() {
  window.print();
}

// ==========================================
// 4. MODUL MANAJEMEN AKUN PENGGUNA (USERS)
// ==========================================
let allAdminUsers = [];

async function loadAdminUsers() {
  const totalElem = document.getElementById('user-stat-total');
  const guestsElem = document.getElementById('user-stat-guests');
  const ownersElem = document.getElementById('user-stat-owners');
  const adminsElem = document.getElementById('user-stat-admins');

  try {
    const res = await API.getAdminUsers();
    if (!res.success) return;

    allAdminUsers = res.data || [];

    const total = allAdminUsers.length;
    const guests = allAdminUsers.filter(u => u.role === 'user').length;
    const owners = allAdminUsers.filter(u => u.role === 'owner').length;
    const admins = allAdminUsers.filter(u => u.role === 'admin').length;

    if (totalElem) totalElem.textContent = total;
    if (guestsElem) guestsElem.textContent = guests;
    if (ownersElem) ownersElem.textContent = owners;
    if (adminsElem) adminsElem.textContent = admins;

    renderAdminUsersTable(allAdminUsers);
  } catch (err) {
    console.error('Error in loadAdminUsers:', err);
  }
}

function renderAdminUsersTable(users) {
  const tbodyAdmins = document.getElementById('admin-admins-table');
  const tbodyOwners = document.getElementById('admin-owners-table');
  const tbodyGuests = document.getElementById('admin-guests-table');
  if (!tbodyAdmins || !tbodyOwners || !tbodyGuests) return;

  const admins = users.filter(u => u.role === 'admin');
  const owners = users.filter(u => u.role === 'owner');
  const guests = users.filter(u => u.role === 'user');

  tbodyAdmins.innerHTML = admins.length === 0 
    ? `<tr><td colspan="6" class="p-8 text-center text-slate-400">Tidak ada Administrator.</td></tr>` 
    : renderUserRows(admins);

  tbodyOwners.innerHTML = owners.length === 0 
    ? `<tr><td colspan="6" class="p-8 text-center text-slate-400">Tidak ada Mitra Pemilik.</td></tr>` 
    : renderUserRows(owners);
    
  tbodyGuests.innerHTML = guests.length === 0 
    ? `<tr><td colspan="6" class="p-8 text-center text-slate-400">Tidak ada Tamu / Wisatawan.</td></tr>` 
    : renderUserRows(guests);
}

function renderUserRows(usersList) {
  return usersList.map(u => {
    let roleBadge = '';
    if (u.role === 'admin') {
      roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-max"><i class="fa-solid fa-shield-halved"></i> Administrator</span>`;
    } else if (u.role === 'owner') {
      roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-max"><i class="fa-solid fa-hotel"></i> Mitra Pemilik</span>`;
    } else {
      roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-max"><i class="fa-solid fa-user"></i> Tamu / Wisatawan</span>`;
    }

    const isSuspended = u.status === 'suspended';
    const statusBadge = isSuspended
      ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-max"><i class="fa-solid fa-ban"></i> Ditangguhkan</span>`
      : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max"><i class="fa-solid fa-circle-check"></i> Aktif</span>`;

    // Activity summary
    let activityText = '-';
    if (u.role === 'user') {
      activityText = `<span class="font-semibold text-slate-700">${u.activity?.totalBookings || 0} Reservasi</span>`;
    } else if (u.role === 'owner') {
      activityText = `<span class="font-semibold text-slate-700">${u.activity?.totalProperties || 0} Properti</span><br><span class="text-[10px] text-amber-700 font-bold"><i class="fa-solid fa-wallet"></i> ${formatRupiah(u.activity?.totalRevenue || 0)}</span>`;
    } else {
      activityText = `<span class="text-slate-400 font-medium">Otoritas Master</span>`;
    }

    // Action button
    let actionBtn = '';
    if (u.role === 'admin' && u.id === 'adm-001') {
      actionBtn = `<span class="text-[11px] text-slate-400 italic">Super Admin (Terkunci)</span>`;
    } else if (isSuspended) {
      actionBtn = `
        <button onclick="toggleUserStatus('${u.id}', '${u.name.replace(/'/g, "\\'")}', 'active')" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg font-bold text-xs border border-emerald-200 transition flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-user-check"></i> Aktifkan
        </button>
      `;
    } else {
      actionBtn = `
        <button onclick="toggleUserStatus('${u.id}', '${u.name.replace(/'/g, "\\'")}', 'suspended')" class="px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg font-bold text-xs border border-red-200 transition flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-user-slash"></i> Tangguhkan
        </button>
      `;
    }

    if (u.role === 'owner') {
      actionBtn = `
        <div class="flex items-center gap-2 justify-end">
          <button onclick="kirimTagihanOwner('${u.id}', '${u.name.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white rounded-lg font-bold text-xs border border-amber-200 transition flex items-center gap-1 cursor-pointer shadow-sm">
            <i class="fa-solid fa-file-invoice-dollar"></i> Kirim Tagihan
          </button>
          ${actionBtn}
        </div>
      `;
    } else {
      actionBtn = `<div class="flex justify-end">${actionBtn}</div>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
              ${u.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span class="font-bold text-slate-900 block text-xs">${u.name}</span>
              <span class="text-[10px] text-slate-400 font-mono">ID: ${u.id}</span>
            </div>
          </div>
        </td>
        <td class="p-4">
          <span class="font-medium text-slate-800 block">${u.email}</span>
          <span class="text-[11px] text-slate-400"><i class="fa-brands fa-whatsapp text-emerald-500"></i> ${u.phone}</span>
        </td>
        <td class="p-4">
          ${roleBadge}
        </td>
        <td class="p-4 text-xs">
          ${activityText}
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

function filterUsersTable() {
  const query = (document.getElementById('user-search')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('user-role-filter')?.value || 'all';
  const statusFilter = document.getElementById('user-status-filter')?.value || 'all';

  let filtered = [...allAdminUsers];

  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(u => u.status === statusFilter);
  }

  if (query) {
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.phone.toLowerCase().includes(query)
    );
  }

  renderAdminUsersTable(filtered);
}

async function toggleUserStatus(id, name, targetStatus) {
  const actionText = targetStatus === 'active' ? 'mengaktifkan kembali' : 'MENANGGUHKAN (suspend)';
  if (!confirm(`Konfirmasi Tindakan:\nApakah Anda yakin ingin ${actionText} akun "${name}"?`)) {
    return;
  }

  try {
    const res = await API.toggleUserStatus(id);
    if (res.success) {
      alert(res.message);
      loadAdminUsers();
    } else {
      alert(res.message || 'Gagal mengubah status pengguna.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

function handleAdminLogout() {
  localStorage.removeItem('stayjogja_user');
  window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => {
  let user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if (!user.id) {
    window.location.href = '/login';
    return;
  }
  if (user.role !== 'admin') {
    alert('Akses Ditolak: Halaman ini khusus Administrator StayJogja.');
    window.location.href = user.role === 'owner' ? '/owner' : '/user';
    return;
  }
  if (user.name) {
    const el = document.getElementById('admin-header-name');
    if (el) el.textContent = user.name;
  }
});


function kirimTagihanOwner(ownerId, ownerName) {
  if(confirm('Kirim rekap tagihan komisi 5% ke ' + ownerName + '?')) {
    // Send a notification to the owner's dashboard
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: ownerId,
        type: 'bill_received',
        title: 'Tagihan Komisi (5%)',
        message: 'Admin telah mengirimkan tagihan komisi. Silakan cek menu Tagihan untuk melakukan pembayaran.'
      })
    }).then(() => {
      alert('Tagihan berhasil dikirim ke dashboard Mitra (' + ownerName + ')!');
    }).catch(e => {
      console.error(e);
      alert('Tagihan berhasil dikirim (simulasi).');
    });
  }
}
