document.addEventListener('DOMContentLoaded', () => {
  if (getSession()) {
    window.location.href = 'home.html';
    return;
  }
  const tabLogin  = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin  = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');

  function showLogin() {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.style.display  = '';
    formSignup.style.display = 'none';
    clearErrors();
  }

  function showSignup() {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.style.display = '';
    formLogin.style.display  = 'none';
    clearErrors();
  }

  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);
  showLogin();
  function clearErrors() {
    document.querySelectorAll('.auth-error').forEach(e => {
      e.classList.remove('visible');
      e.textContent = '';
    });
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('visible'); }
  }
  const loginBtn = document.getElementById('btn-login');
  loginBtn.addEventListener('click', handleLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  function handleLogin() {
    clearErrors();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username) { showError('login-error', 'Please enter your username.'); return; }
    if (!password) { showError('login-error', 'Please enter your password.'); return; }
    if (!accountExists(username)) {
      showError('login-error', 'No account found with that username. Create one?');
      return;
    }
    if (!verifyLogin(username, password)) {
      showError('login-error', 'Incorrect password. Please try again.');
      return;
    }

    setSession(username);
    loginBtn.textContent = 'Logging in…';
    loginBtn.disabled = true;
    setTimeout(() => { window.location.href = 'home.html'; }, 500);
  }
  const signupBtn = document.getElementById('btn-signup');
  signupBtn.addEventListener('click', handleSignup);
  document.getElementById('signup-confirm').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignup();
  });
  const pwInput    = document.getElementById('signup-password');
  const pwStrength = document.getElementById('pw-strength-label');
  const segs       = document.querySelectorAll('.pw-strength-seg');

  pwInput.addEventListener('input', () => {
    const strength = getPasswordStrength(pwInput.value);
    segs.forEach((seg, i) => {
      seg.classList.remove('weak', 'medium', 'strong');
      if (i < strength.level) seg.classList.add(strength.class);
    });
    pwStrength.textContent = strength.label;
  });

  function getPasswordStrength(pw) {
    if (pw.length === 0) return { level: 0, class: '', label: '' };
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, class: 'weak',   label: 'Weak' };
    if (score <= 2) return { level: 2, class: 'medium', label: 'Medium' };
    return { level: 3, class: 'strong', label: 'Strong' };
  }

  function handleSignup() {
    clearErrors();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;

    if (!username) { showError('signup-error', 'Please choose a username.'); return; }
    if (username.length < 3) { showError('signup-error', 'Username must be at least 3 characters.'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showError('signup-error', 'Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!password) { showError('signup-error', 'Please choose a password.'); return; }
    if (password.length < 6) { showError('signup-error', 'Password must be at least 6 characters.'); return; }
    if (password !== confirm) { showError('signup-error', 'Passwords do not match.'); return; }
    if (accountExists(username)) {
      showError('signup-error', 'That username is already taken. Try another.');
      return;
    }

    const ok = createAccount(username, password);
    if (!ok) { showError('signup-error', 'Failed to create account. Please try again.'); return; }

    setSession(username);
    signupBtn.textContent = 'Creating account…';
    signupBtn.disabled = true;
    setTimeout(() => { window.location.href = 'home.html'; }, 500);
  }
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input    = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  });
});