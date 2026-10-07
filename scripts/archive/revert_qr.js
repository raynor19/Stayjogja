const fs = require('fs');
let content = fs.readFileSync('src/routes/reservationRoutes.js', 'utf8');
content = content.replace("const type = 'text';", "const type = req.query.type || 'checkin';");
fs.writeFileSync('src/routes/reservationRoutes.js', content);
console.log('Reverted');
