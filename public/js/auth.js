const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const adminLoginForm = document.getElementById('adminLoginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const message = document.getElementById('loginMessage');
    message.textContent = '';

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || 'Login failed.';
      return;
    }
    window.location.href = '/main';
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const firstName = document.getElementById('signupFirstName').value.trim();
    const lastName = document.getElementById('signupLastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const contact = document.getElementById('signupContact').value.trim();
    const address = document.getElementById('signupAddress').value.trim();
    const message = document.getElementById('signupMessage');
    message.textContent = '';

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, firstName, lastName, email, password, confirmPassword, contact, address })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || 'Sign up failed.';
      return;
    }
    message.style.color = '#1d7b3c';
    message.textContent = 'Account created. Redirecting to login...';
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  });
}

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const message = document.getElementById('adminLoginMessage');
    message.textContent = '';

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || 'Admin login failed.';
      return;
    }
    window.location.href = '/admin-panel';
  });
}
