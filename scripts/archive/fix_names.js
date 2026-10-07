const fs = require('fs');

// admin.html
let adminHtml = fs.readFileSync('public/admin.html', 'utf8');
adminHtml = adminHtml.replace('<span class="text-slate-300 font-medium">Administrator Utama</span>', '<span id="admin-header-name" class="text-slate-300 font-medium">Administrator Utama</span>');
fs.writeFileSync('public/admin.html', adminHtml);

// owner.html
let ownerHtml = fs.readFileSync('public/owner.html', 'utf8');
ownerHtml = ownerHtml.replace('<span class="font-bold text-slate-900 block">Ibu Kartika</span>', '<span id="owner-header-name" class="font-bold text-slate-900 block">Ibu Kartika</span>');
fs.writeFileSync('public/owner.html', ownerHtml);

// admin.js (append logic)
fs.appendFileSync('public/js/admin.js', `
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(user.name) {
    const el = document.getElementById('admin-header-name');
    if(el) el.textContent = user.name;
  }
});
`);

// owner.js (append logic)
fs.appendFileSync('public/js/owner.js', `
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(user.name) {
    const el = document.getElementById('owner-header-name');
    if(el) el.textContent = user.name;
  }
});
`);
