const fs = require('fs');

// ADMIN
let admin = fs.readFileSync('public/js/admin.js', 'utf8');
admin = admin.replace(
  "document.addEventListener('DOMContentLoaded', () => {\n  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');",
  `document.addEventListener('DOMContentLoaded', () => {
  let user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(!user.id) {
    user = { id: 'adm-001', name: 'Administrator StayJogja', email: 'admin@stayjogja.id', role: 'admin', phone: '081112223334' };
    localStorage.setItem('stayjogja_user', JSON.stringify(user));
  }`
);
fs.writeFileSync('public/js/admin.js', admin);

// OWNER
let owner = fs.readFileSync('public/js/owner.js', 'utf8');
owner = owner.replace(
  "document.addEventListener('DOMContentLoaded', () => {\n  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');",
  `document.addEventListener('DOMContentLoaded', () => {
  let user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(!user.id) {
    user = { id: 'own-001', name: 'Ibu Kartika (Pemilik Hotel & Homestay)', email: 'owner@stayjogja.id', role: 'owner', phone: '081987654321' };
    localStorage.setItem('stayjogja_user', JSON.stringify(user));
  }`
);
fs.writeFileSync('public/js/owner.js', owner);
