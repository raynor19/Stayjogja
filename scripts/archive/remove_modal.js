const fs = require('fs');
let admin = fs.readFileSync('public/admin.html', 'utf8');
const start = admin.indexOf('<!-- Print Modal');
const end = admin.indexOf('<!-- JavaScript -->');
if(start !== -1 && end !== -1) {
  admin = admin.slice(0, start) + admin.slice(end);
  fs.writeFileSync('public/admin.html', admin);
  console.log('Removed Print Modal');
}
