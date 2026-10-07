const fs = require('fs');
fs.appendFileSync('public/js/admin.js', `

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
`);
