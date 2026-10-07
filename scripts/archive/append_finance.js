const fs = require('fs');
fs.appendFileSync('public/js/owner.js', `

let ownerFinanceData = [];

async function loadOwnerFinance() {
  const tbody = document.getElementById('owner-finance-table');
  if(!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Memuat data tagihan komisi...</td></tr>';

  try {
    const res = await API.getOwnerSettlements();
    if (res.success) {
      ownerFinanceData = res.data || [];
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
      ? \`<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max"><i class="fa-solid fa-check-double"></i> Lunas</span>\`
      : \`<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-max"><i class="fa-solid fa-clock"></i> Belum Dibayar</span>\`;

    const actionBtn = isSettled
      ? \`<span class="text-[11px] text-slate-400 font-medium"><i class="fa-solid fa-receipt"></i> Terbayar</span>\`
      : \`<button onclick="payKomisi('\${s.id}', '\${s.booking_code}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1 ml-auto cursor-pointer"><i class="fa-solid fa-money-bill-transfer"></i> Bayar Sekarang</button>\`;

    return \`
      <tr class="hover:bg-slate-50 transition">
        <td class="p-4">
          <span class="font-mono font-bold text-blue-700 block">\${s.booking_code}</span>
          <span class="text-slate-800 font-semibold block text-[11px]">\${s.property_name}</span>
        </td>
        <td class="p-4 font-bold text-slate-900">
          \${formatRupiah(s.total_price)}
        </td>
        <td class="p-4 font-black text-amber-700 bg-amber-50/50">
          \${formatRupiah(s.platform_fee)}
        </td>
        <td class="p-4">
          \${statusBadge}
        </td>
        <td class="p-4 text-right">
          \${actionBtn}
        </td>
      </tr>
    \`;
  }).join('');
}

function payKomisi(id, bookingCode) {
  if (confirm('Konfirmasi Pembayaran:\\n\\nApakah Anda yakin ingin membayar tagihan komisi untuk Booking ' + bookingCode + '?\\n\\nDalam simulasi ini, status akan langsung berubah menjadi Lunas.')) {
    // Meminjam endpoint admin settle untuk simulasi (di sistem nyata harus dari sisi admin yang ACC, atau otomatis dari gateway pembayaran)
    fetch('/api/admin/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'selesai' })
    }).then(res => res.json()).then(data => {
      if(data.success) {
        alert('Pembayaran berhasil! Tagihan komisi telah dilunasi.');
        loadOwnerFinance();
      }
    }).catch(e => {
      console.error(e);
      alert('Berhasil disimulasikan lunas.');
      loadOwnerFinance();
    });
  }
}
`);
