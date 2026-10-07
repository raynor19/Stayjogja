const fs = require('fs');
fs.appendFileSync('public/js/owner.js', `

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
`);
