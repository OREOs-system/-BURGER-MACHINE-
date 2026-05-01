const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showLogin = document.getElementById('show-login');
const showSignup = document.getElementById('show-signup');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const navButtons = document.querySelectorAll('.topnav button[data-page]');
const navUsername = document.getElementById('nav-username');
const productGrid = document.getElementById('product-grid');
const cartList = document.getElementById('cart-list');
const cartTotalEl = document.getElementById('cart-total');
const clearCartButton = document.getElementById('clear-cart');
const placeOrderButton = document.getElementById('place-order');
const historyList = document.getElementById('history-list');
const settingsForm = document.getElementById('settings-form');
const settingsMessage = document.getElementById('settings-message');
const loginMessage = document.getElementById('login-message');
const signupMessage = document.getElementById('signup-message');

const sections = {
  menu: document.getElementById('menu-page'),
  history: document.getElementById('history-page'),
  settings: document.getElementById('settings-page')
};

let cart = [];
let currentUser = null;

showLogin.addEventListener('click', () => toggleAuth('login'));
showSignup.addEventListener('click', () => toggleAuth('signup'));
loginButton.addEventListener('click', handleLogin);
signupButton.addEventListener('click', handleSignup);
logoutButton.addEventListener('click', handleLogout);
clearCartButton.addEventListener('click', clearCart);
placeOrderButton.addEventListener('click', placeOrder);
settingsForm.addEventListener('submit', handleSettingsUpdate);
navButtons.forEach(button => button.addEventListener('click', () => openPage(button.dataset.page)));

async function init() {
  try {
    const res = await fetch('/api/user');
    if (res.ok) {
      currentUser = await res.json();
      showApp();
    }
  } catch (error) {
    console.error(error);
  }
}

function toggleAuth(mode) {
  if (mode === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  }
}

async function handleLogin() {
  loginMessage.textContent = '';
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) {
    loginMessage.textContent = data.error || 'Unable to log in.';
    return;
  }
  await loadUser();
  showApp();
}

async function handleSignup() {
  signupMessage.textContent = '';
  const body = {
    username: document.getElementById('signup-username').value.trim(),
    firstName: document.getElementById('signup-firstname').value.trim(),
    lastName: document.getElementById('signup-lastname').value.trim(),
    email: document.getElementById('signup-email').value.trim(),
    password: document.getElementById('signup-password').value,
    confirmPassword: document.getElementById('signup-confirm').value,
    contact: document.getElementById('signup-contact').value.trim(),
    address: document.getElementById('signup-address').value.trim()
  };
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    signupMessage.textContent = data.error || 'Sign up failed.';
    return;
  }
  signupMessage.style.color = '#166534';
  signupMessage.textContent = 'Account created. Please log in.';
  toggleAuth('login');
}

async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  currentUser = null;
  authContainer.classList.remove('hidden');
  appContainer.classList.add('hidden');
  clearCart();
}

async function showApp() {
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');
  navUsername.textContent = currentUser?.username || '';
  openPage('menu');
  await loadProducts();
  await loadOrders();
  await loadSettings();
}

function openPage(page) {
  Object.keys(sections).forEach(key => {
    sections[key].classList.toggle('hidden', key !== page);
  });
}

async function loadUser() {
  const res = await fetch('/api/user');
  if (res.ok) {
    currentUser = await res.json();
  }
}

async function loadProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) return;
  const products = await res.json();
  const byCategory = products.reduce((acc, product) => {
    acc[product.category] = acc[product.category] || [];
    acc[product.category].push(product);
    return acc;
  }, {});
  productGrid.innerHTML = '';
  Object.entries(byCategory).forEach(([category, items]) => {
    const sectionTitle = document.createElement('h2');
    sectionTitle.textContent = category;
    sectionTitle.style.gridColumn = '1/-1';
    productGrid.appendChild(sectionTitle);
    items.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <div class="card-body">
          <h3>${product.name}</h3>
          <p>₱${product.price.toFixed(2)}</p>
          <button data-id="${product.id}">Add to Cart</button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => addToCart(product));
      productGrid.appendChild(card);
    });
  });
}

function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  renderCart();
}

function renderCart() {
  if (cart.length === 0) {
    cartList.innerHTML = '<p>Your cart is empty.</p>';
    cartTotalEl.textContent = '0.00';
    return;
  }
  cartList.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    total += item.price * item.quantity;
    const line = document.createElement('div');
    line.className = 'cart-item';
    line.innerHTML = `<span>${item.quantity} × ${item.name}</span><span>₱${(item.price * item.quantity).toFixed(2)}</span>`;
    cartList.appendChild(line);
  });
  cartTotalEl.textContent = total.toFixed(2);
}

function clearCart() {
  cart = [];
  renderCart();
}

async function placeOrder() {
  if (cart.length === 0) return;
  const ok = confirm('Do you want to place this order?');
  if (!ok) return;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart, total })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Unable to place order.');
    return;
  }
  alert('Order placed!');
  clearCart();
  await loadOrders();
}

async function loadOrders() {
  const res = await fetch('/api/orders');
  if (!res.ok) return;
  const orders = await res.json();
  if (orders.length === 0) {
    historyList.innerHTML = '<p>No orders yet.</p>';
    return;
  }
  historyList.innerHTML = orders.map(order => {
    return `
      <div class="history-card">
        <h3>Order #${order.id}</h3>
        <p><strong>Name:</strong> ${order.username}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Contact:</strong> ${order.contact}</p>
        <p><strong>Address:</strong> ${order.address}</p>
        <p><strong>Date & Time:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p class="status-pill">${order.status}</p>
        <ul class="order-items">${order.items.map(item => `<li>${item.quantity} × ${item.name} (₱${item.price.toFixed(2)})</li>`).join('')}</ul>
        <p><strong>Total:</strong> ₱${order.total.toFixed(2)}</p>
      </div>
    `;
  }).join('');
}

async function loadSettings() {
  await loadUser();
  if (!currentUser) return;
  document.getElementById('settings-username').value = currentUser.username;
  document.getElementById('settings-firstname').value = currentUser.firstName;
  document.getElementById('settings-lastname').value = currentUser.lastName;
  document.getElementById('settings-email').value = currentUser.email;
  document.getElementById('settings-contact').value = currentUser.contact;
  document.getElementById('settings-address').value = currentUser.address;
}

async function handleSettingsUpdate(event) {
  event.preventDefault();
  settingsMessage.textContent = '';
  const body = {
    firstName: document.getElementById('settings-firstname').value.trim(),
    lastName: document.getElementById('settings-lastname').value.trim(),
    email: document.getElementById('settings-email').value.trim(),
    password: document.getElementById('settings-password').value,
    confirmPassword: document.getElementById('settings-confirm').value,
    contact: document.getElementById('settings-contact').value.trim(),
    address: document.getElementById('settings-address').value.trim()
  };
  const res = await fetch('/api/user/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    settingsMessage.textContent = data.error || 'Unable to update profile.';
    return;
  }
  settingsMessage.style.color = '#166534';
  settingsMessage.textContent = 'Account successfully updated.';
  await loadUser();
  document.getElementById('settings-password').value = '';
  document.getElementById('settings-confirm').value = '';
}

init();
