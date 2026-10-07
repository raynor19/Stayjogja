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
    showAlert('Akun Tamu (Budi Santoso) terisi otomatis. Klik tombol Masuk.', 'info');
  } else if (role === 'owner') {
    emailInput.value = 'owner@stayjogja.id';
    passwordInput.value = 'password123';
    showAlert('Akun Pemilik (Ibu Kartika) terisi otomatis. Klik tombol Masuk.', 'info');
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
    showAlert(`Login berhasil! Mengalihkan ke ${data.user.role === 'owner' ? 'Dashboard Mitra' : (data.user.role === 'admin' ? 'Dashboard Admin' : 'Katalog Penginapan')}...`, 'success');

    // Redirect after brief delay (respect redirect_after_login if user clicked Book Now)
    setTimeout(() => {
      const redirectTarget = sessionStorage.getItem('redirect_after_login');
      if (redirectTarget) {
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirectTarget;
      } else {
        window.location.href = data.redirectTo || '/tamu';
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

// ============================================================
// REAL SUPABASE GOOGLE OAUTH INTEGRATION
// ============================================================
let clientSupabaseInstance = null;

async function getClientSupabase() {
  if (clientSupabaseInstance) return clientSupabaseInstance;
  try {
    const res = await fetch('/api/auth/config');
    const cfg = await res.json();
    if (cfg.success && cfg.supabaseUrl && cfg.supabasePublishableKey && window.supabase) {
      clientSupabaseInstance = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
  } catch (err) {
    console.error('[Supabase Auth] Failed to initialize client Supabase:', err);
  }
  return clientSupabaseInstance;
}

// Handle Google Sign-In Button Click
async function handleGoogleSignIn() {
  showAlert('Menghubungkan ke layanan Google...', 'info');
  const supa = await getClientSupabase();
  if (supa) {
    try {
      const { data, error } = await supa.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/login',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });
      if (error) {
        showAlert(`Google Login Error: ${error.message}`, 'error');
      }
    } catch (err) {
      showAlert('Gagal membuka halaman login Google.', 'error');
    }
  } else {
    // Direct browser redirect fallback
    const callbackUrl = encodeURIComponent(window.location.origin + '/login');
    window.location.href = `https://dbhvkxoooxwmssrhfwhh.supabase.co/auth/v1/authorize?provider=google&redirect_to=${callbackUrl}`;
  }
}

// Check if user just returned from Google OAuth redirect
async function checkGoogleOAuthCallback() {
  const hasAuthHash = window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'));
  const hasAuthCode = window.location.search && window.location.search.includes('code=');

  if (!hasAuthHash && !hasAuthCode) return;

  showAlert('Memverifikasi akun Google Anda...', 'info');

  const supa = await getClientSupabase();
  if (!supa) return;

  try {
    const { data: { session }, error } = await supa.auth.getSession();
    if (error || !session || !session.user) {
      // In case session parsing needs a slight tick
      await new Promise(r => setTimeout(r, 800));
      const retry = await supa.auth.getSession();
      if (!retry.data?.session?.user) {
        return;
      }
    }

    const supaUser = session ? session.user : (await supa.auth.getUser()).data.user;
    if (!supaUser) return;

    const meta = supaUser.user_metadata || {};
    const email = supaUser.email;
    const name = meta.full_name || meta.name || email.split('@')[0];
    const avatar = meta.avatar_url || meta.picture || '';

    // Synchronize user to our backend and database
    const syncRes = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        avatar,
        supabase_id: supaUser.id
      })
    });

    const syncData = await syncRes.json();
    if (!syncData.success) {
      return showAlert(syncData.message || 'Gagal menyimpan profil Google.', 'error');
    }

    localStorage.setItem('stayjogja_user', JSON.stringify(syncData.user));
    showAlert(`Login Google berhasil! Selamat datang, ${syncData.user.name}.`, 'success');

    // Clean URL hash/params
    window.history.replaceState(null, null, window.location.pathname);

    setTimeout(() => {
      const redirectTarget = sessionStorage.getItem('redirect_after_login');
      if (redirectTarget) {
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirectTarget;
      } else {
        window.location.href = syncData.redirectTo || '/tamu';
      }
    }, 700);

  } catch (err) {
    console.error('[Google OAuth] Error processing callback:', err);
    showAlert('Gagal menyelesaikan otentikasi Google.', 'error');
  }
}

// Check callback when page loads
document.addEventListener('DOMContentLoaded', () => {
  checkGoogleOAuthCallback();
});

