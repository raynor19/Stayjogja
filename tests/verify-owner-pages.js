const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ownerHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'owner.html'), 'utf8');
const teraHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'tera.html'), 'utf8');

console.log('Testing Owner Partner Hub & Onboarding...');

assert(ownerHtml.includes('StayJogja'), 'Owner page must use StayJogja branding');
assert(!ownerHtml.includes('StayYK'), 'StayYK should not remain in owner.html');
assert(teraHtml.includes('StayJogja'), 'Registration page must use StayJogja branding');
assert(!teraHtml.includes('StayYK'), 'StayYK should not remain in tera.html');
assert(!teraHtml.includes('traveloka-blue'), 'tera.html should not contain hardcoded traveloka-blue classes');

console.log('✅ Owner and Registration pages verification passed!');
