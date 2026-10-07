const fs = require('fs');
let content = fs.readFileSync('src/routes/reservationRoutes.js', 'utf8');
content = content.replace(/const type = req\.query\.type \|\| 'checkin';/, "const type = 'text';");
fs.writeFileSync('src/routes/reservationRoutes.js', content);
