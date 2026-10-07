const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8');

console.log('Testing StayJogja Admin Control Center...');

assert(html.includes('StayJogja'), 'Admin page must use StayJogja branding');
assert(!html.includes('StayYK'), 'StayYK should not remain in admin.html');
assert(html.includes('id="moderation-property-list"') || html.includes('id="admin-moderation-list"'), 'Property moderation list must exist');
assert(html.includes('id="audit-transactions-table"') || html.includes('id="admin-transactions-table"'), 'Transaction audit table must exist');
assert(html.includes('id="chatbot-knowledge-table"') || html.includes('id="admin-chatbot-table"'), 'Chatbot knowledge table must exist');

console.log('✅ Admin page verification passed!');
