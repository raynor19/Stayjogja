const fs = require('fs');
let owner = fs.readFileSync('public/js/owner.js', 'utf8');
owner = owner.replace(
  "alert('Pembayaran berhasil! Tagihan komisi telah dilunasi.');\n        loadOwnerFinance();\n      }",
  "alert('Pembayaran berhasil! Tagihan komisi telah dilunasi.');\n        loadOwnerFinance();\n        loadOwnerReservations();\n      }"
);
owner = owner.replace(
  "alert('Berhasil disimulasikan lunas.');\n      loadOwnerFinance();\n    }",
  "alert('Berhasil disimulasikan lunas.');\n      loadOwnerFinance();\n      loadOwnerReservations();\n    }"
);
fs.writeFileSync('public/js/owner.js', owner);
