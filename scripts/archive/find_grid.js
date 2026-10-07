const fs = require('fs');
let admin = fs.readFileSync('public/admin.html', 'utf8');
let start = admin.lastIndexOf('<div class="grid', 17000);
console.log(admin.substring(start, start + 100));
