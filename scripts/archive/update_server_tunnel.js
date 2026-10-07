const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
const search = "app.listen(PORT, () => {";
const replace = `const tunnel = require('./src/utils/tunnel');
app.listen(PORT, () => {
  tunnel.startTunnel(PORT);`;
s = s.replace(search, replace);
fs.writeFileSync('server.js', s);
console.log('Updated server.js');
