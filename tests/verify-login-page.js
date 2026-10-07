const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.html'), 'utf8');

console.log('Testing StayJogja Login Gateway...');

assert(html.includes('StayJogja'), 'Branding must be StayJogja');
assert(!html.includes('StayYK'), 'StayYK should not remain in login.html');
assert(html.includes('id="login-form"'), 'Login form must exist');
assert(html.includes('id="register-form"'), 'Register form must exist');
assert(html.includes('fillDemoLogin'), 'Quick demo role buttons must exist');

console.log('✅ Login page verification passed!');
