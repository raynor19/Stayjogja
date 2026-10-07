const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'user.html'), 'utf8');

console.log('Testing StayJogja Guest User Hub (user.html)...');

assert(html.includes('StayJogja'), 'Branding must be StayJogja');
assert(!html.includes('StayYK'), 'StayYK should not remain in user.html');
assert(html.includes('id="active-bookings-list"'), 'Active bookings container must exist');
assert(html.includes('id="history-bookings-list"'), 'History bookings container must exist');

console.log('✅ Guest User Hub verification passed!');
