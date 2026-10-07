const fs = require('fs');
let admin = fs.readFileSync('public/admin.html', 'utf8');
const search = '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
const gridStart = admin.lastIndexOf(search, 17000);
const sectionEnd = admin.indexOf('<!-- Settlement Table Section -->');
if(gridStart !== -1 && sectionEnd !== -1) {
  admin = admin.slice(0, gridStart) + admin.slice(sectionEnd);
  fs.writeFileSync('public/admin.html', admin);
  console.log('Removed successfully!');
}
