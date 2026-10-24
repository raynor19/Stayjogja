// Login & Register Controller
function switchAuthTab(tab) {
  const btnLogin = document.getElementById('auth-tab-login');
  const btnReg = document.getElementById('auth-tab-register');
  const formLogin = document.getElementById('login-form');
  const formReg = document.getElementById('register-form');
  const alertBox = document.getElementById('auth-alert');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const googleContainer = document.getElementById('google-auth-container');

  if (alertBox) alertBox.classList.add('hidden');

  if (tab === 'login') {
    if (btnLogin) btnLogin.className = 'flex-1 py-2 rounded-lg bg-blue-900 text-white shadow-xs transition cursor-pointer';
    if (btnReg) btnReg.className = 'flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer';
    if (formLogin) formLogin.classList.remove('hidden');
    if (formReg) formReg.classList.add('hidden');
    if (title) title.textContent = 'Masuk ke StayJogja';
    if (subtitle) subtitle.textContent = 'Silakan masuk ke akun Anda untuk melanjutkan:';
    if (googleContainer) googleContainer.classList.remove('hidden');
  } else {
    if (btnReg) btnReg.className = 'flex-1 py-2 rounded-lg bg-blue-900 text-white shadow-xs transition cursor-pointer';
    if (btnLogin) btnLogin.className = 'flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer';
    if (formReg) formReg.classList.remove('hidden');
    if (formLogin) formLogin.classList.add('hidden');
    if (title) title.textContent = 'Daftar Akun StayJogja';
    if (subtitle) subtitle.textContent = 'Lengkapi data di bawah untuk membuat akun baru:';
    if (googleContainer) googleContainer.classList.add('hidden');
  }
}

function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  if (field.type === 'password') {
    field.type = 'text';
  } else {
    field.type = 'password';
  }
}

// 1-Click Quick Fill for Demo
function quickFillDemo(role) {
  switchAuthTab('login');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (role === 'user') {
    emailInput.value = 'user@stayjogja.id';
    passwordInput.value = 'password123';
    showAlert('Akun Tamu (Muhammad Raynor Athaillah) terisi otomatis. Klik tombol Masuk.', 'info');
  } else if (role === 'owner') {
    emailInput.value = 'owner@stayjogja.id';
    passwordInput.value = 'password123';
    showAlert('Akun Pemilik (Ibu Kartika) terisi otomatis. Klik tombol Masuk.', 'info');
  } else if (role === 'resepsionis' || role === 'receptionist') {
    emailInput.value = 'resepsionis@stayjogja.id';
    passwordInput.value = 'password123';
    showAlert('Akun Resepsionis (Front Desk) terisi otomatis. Klik tombol Masuk.', 'info');
  } else if (role === 'admin') {
    emailInput.value = 'admin@stayjogja.id';
    passwordInput.value = 'password123';
    showAlert('Akun Administrator terisi otomatis. Klik tombol Masuk.', 'info');
  }
}
const fillDemoLogin = quickFillDemo;

function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('auth-alert');
  alertBox.classList.remove('hidden');

  if (type === 'error') {
    alertBox.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 border border-red-200 text-red-700';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation text-red-500"></i> <span>${message}</span>`;
  } else if (type === 'success') {
    alertBox.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500"></i> <span>${message}</span>`;
  } else {
    alertBox.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-info text-blue-500"></i> <span>${message}</span>`;
  }
}

// Handle Login Submit
async function handleLoginSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-login-submit');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> <span>Memproses...</span>`;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = `<span>Masuk ke Akun</span> <i class="fa-solid fa-arrow-right text-xs"></i>`;

    if (!data.success) {
      return showAlert(data.message, 'error');
    }

    // Save session in localStorage
    localStorage.setItem('stayjogja_user', JSON.stringify(data.user));
    const roleDestName = data.user.role === 'owner' ? 'Dashboard Mitra' : (data.user.role === 'resepsionis' ? 'Portal Resepsionis' : (data.user.role === 'admin' ? 'Dashboard Admin' : 'Katalog Penginapan'));
    showAlert(`Login berhasil! Mengalihkan ke ${roleDestName}...`, 'success');

    // Redirect after brief delay (respect redirect_after_login if user clicked Book Now)
    setTimeout(() => {
      const redirectTarget = sessionStorage.getItem('redirect_after_login');
      if (redirectTarget) {
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirectTarget;
      } else {
        window.location.href = data.redirectTo || '/';
      }
    }, 600);

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = `<span>Masuk ke Akun</span> <i class="fa-solid fa-arrow-right text-xs"></i>`;
    showAlert('Gagal terhubung dengan server.', 'error');
  }
}

// Handle Register Submit
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-register-submit');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const role = document.getElementById('reg-role').value;
  const password = document.getElementById('reg-password').value;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> <span>Mendaftarkan...</span>`;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, role, password })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = `<span>Daftar Akun Baru</span> <i class="fa-solid fa-user-plus text-xs"></i>`;

    if (!data.success) {
      return showAlert(data.message, 'error');
    }

    // Reset formulir pendaftaran
    const regForm = document.getElementById('register-form');
    if (regForm) regForm.reset();

    // Beralih kembali ke tampilan login agar pengguna login ulang
    switchAuthTab('login');

    // Isikan otomatis email yang baru didaftarkan dan fokus ke input kata sandi
    const emailLoginInput = document.getElementById('login-email');
    if (emailLoginInput) {
      emailLoginInput.value = email;
    }
    const passLoginInput = document.getElementById('login-password');
    if (passLoginInput) {
      passLoginInput.value = '';
      passLoginInput.focus();
    }

    // Tampilkan notifikasi sukses dan instruksi login ulang
    showAlert('Akun baru berhasil didaftarkan! Silakan masukkan kata sandi Anda untuk masuk ke akun.', 'success');

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = `<span>Daftar Akun Baru</span> <i class="fa-solid fa-user-plus text-xs"></i>`;
    showAlert('Gagal terhubung dengan server.', 'error');
  }
}

// Modal Controller for Login Portal
function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  }
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLoginModal();
  }
});

// Check callback when page loads
document.addEventListener('DOMContentLoaded', () => {
  checkGoogleOAuthCallback();
});

