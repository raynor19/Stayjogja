const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

console.log('Testing StayJogja Guest Portal elements in index.html & app.js...');

assert(html.includes('StayJogja'), 'Branding in index.html must be StayJogja');
assert(!html.includes('StayYK'), 'Old StayYK branding should be replaced in index.html');
assert(html.includes('id="search-form"') || html.includes('search-capsule'), 'Search capsule must exist');
assert(html.includes('id="property-list"'), 'Property list container must exist');
assert(html.includes('id="detail-modal"'), 'Detail modal must exist');
assert(html.includes('id="booking-modal"'), 'Booking modal must exist');
assert(html.includes('id="voucher-modal"'), 'Voucher modal must exist');
assert(html.includes('id="chatbot-toggle-btn"'), 'Chatbot toggle button must exist');
assert(html.includes('id="chatbot-window"'), 'Chatbot window container must exist');
assert(js.includes('renderProperties'), 'renderProperties function must exist in app.js');

console.log('✅ Guest Portal verification passed!');
