const menuItems = [
  { id: 1, name: 'Double Chicken Burger', price: 50.0, image: 'Double Chicken Burger.jpg' },
  { id: 2, name: 'Jumbo Egg Burger', price: 71.0, image: 'Jumbo Egg Burger.jpg' },
  { id: 3, name: 'Jumbo Chili Burger', price: 71.0, image: 'Jumbo Chili Burger.jpg' },
  { id: 4, name: 'Double Longganisa Burger', price: 53.0, image: 'Double Longganisa Burger.jpg' },
  { id: 5, name: 'Jumbo Cheezy Bacon', price: 85.0, image: 'Jumbo Cheezy Bacon Burger.jpg' },
  { id: 6, name: 'Ultimate Double Burger', price: 77.0, image: 'Ultimate Double Burger.jpg' },
  { id: 7, name: 'Big Beef BBQ Burger', price: 58.0, image: 'Big Beef BBQ Burger.jpg' },
  { id: 8, name: 'Classic Burger', price: 28.0, image: 'Classic Burger.jpg' },
  { id: 9, name: 'Jumbo Burger', price: 47.0, image: 'Jumbo Burger.jpg' },
  { id: 10, name: 'Jumbo Cheese Burger', price: 71.0, image: 'Jumbo Cheezy Burger.jpg' },
  { id: 11, name: 'Bottled Water', price: 19.0, image: 'Bottle Water.jpg' },
  { id: 12, name: 'Mountain Dew', price: 21.0, image: 'Soft Drink.jpg' },
  { id: 13, name: 'Hot Choco', price: 24.0, image: 'Hot Choco.jpg' },
  { id: 14, name: 'Hot Coffee', price: 22.0, image: 'Hot Coffee.jpg' },
  { id: 15, name: 'Apple Iced Tea', price: 19.0, image: 'Apple Ice Tea.jpg' }
];

const cartKey = 'burger-machine-cart';
let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

function formatMoney(value) {
  return `₱${Number(value).toFixed(2)}`;
}

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
}

function findCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function safeFetchJson(response) {
  return response.json().catch(() => ({ error: 'Invalid server response.' }));
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const counter = document.getElementById('cartCount');
  if (counter) {
    counter.textContent = `${count} item${count === 1 ? '' : 's'}`;
  }
  updateOrderSummary();
}

function updateOrderSummary() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const summaryCount = document.getElementById('orderItemCount');
  const summaryTotal = document.getElementById('orderSummaryTotal');
  if (summaryCount) {
    summaryCount.textContent = `${count} item${count === 1 ? '' : 's'}`;
  }
  if (summaryTotal) {
    summaryTotal.textContent = formatMoney(findCartTotal());
  }
}

function renderMenu() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  grid.innerHTML = '';
  menuItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'menu-card';
    card.innerHTML = `
      <img src="/images/${encodeURIComponent(item.image)}" alt="${item.name}" />
      <div class="menu-content">
        <h3>${item.name}</h3>
        <p>${formatMoney(item.price)}</p>
        <div class="menu-actions">
          <span>${formatMoney(item.price)}</span>
          <button class="secondary-btn" data-item-id="${item.id}">Add</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll('button[data-item-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = Number(btn.dataset.itemId);
      addToCart(itemId);
    });
  });
}

function addToCart(itemId) {
  const item = menuItems.find(entry => entry.id === itemId);
  if (!item) return;
  const existing = cart.find(entry => entry.id === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart();
  updateCartCount();
  const cartMessage = document.getElementById('cartMessage');
  if (cartMessage) {
    cartMessage.textContent = `${item.name} added to cart.`;
  }
}

function renderCart() {
  const panel = document.getElementById('cartPanel');
  const itemsWrapper = document.getElementById('cartItems');
  const totalText = document.getElementById('cartTotal');
  if (!itemsWrapper || !totalText || !panel) return;
  itemsWrapper.innerHTML = '';
  if (cart.length === 0) {
    itemsWrapper.innerHTML = '<p>Your cart is empty.</p>';
  } else {
    cart.forEach((item, index) => {
      const block = document.createElement('div');
      block.className = 'cart-item';
      block.innerHTML = `
        <strong>${item.name}</strong>
        <small>Qty: ${item.quantity} × ${formatMoney(item.price)}</small>
        <span>${formatMoney(item.quantity * item.price)}</span>
        <button class="secondary-btn" data-remove="${index}">Remove</button>
      `;
      itemsWrapper.appendChild(block);
    });
    itemsWrapper.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.remove);
        cart.splice(index, 1);
        saveCart();
        renderCart();
        updateCartCount();
      });
    });
  }
  totalText.textContent = formatMoney(findCartTotal());
}

function setupCartButtons() {
  const openBtn = document.getElementById('openCartBtn');
  const closeBtn = document.getElementById('closeCartBtn');
  const clearBtn = document.getElementById('clearCartBtn');
  const placeBtn = document.getElementById('placeOrderBtn');
  if (openBtn) openBtn.addEventListener('click', () => {
    document.getElementById('cartPanel').classList.remove('hidden');
    renderCart();
  });
  const quickBtn = document.getElementById('quickPlaceOrderBtn');
  if (quickBtn) quickBtn.addEventListener('click', () => {
    document.getElementById('cartPanel').classList.remove('hidden');
    renderCart();
  });
  if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById('cartPanel').classList.add('hidden'));
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (confirm('Clear all items from cart?')) {
      cart = [];
      saveCart();
      renderCart();
      updateCartCount();
    }
  });
  if (placeBtn) placeBtn.addEventListener('click', placeOrder);
}

async function placeOrder() {
  if (cart.length === 0) {
    document.getElementById('cartMessage').textContent = 'Add items before placing an order.';
    return;
  }
  if (!confirm('Are you sure you want to place this order?')) {
    return;
  }
  const placeBtn = document.getElementById('placeOrderBtn');
  if (placeBtn) placeBtn.disabled = true;
  try {
    const response = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, total: findCartTotal() })
    });
    const result = await safeFetchJson(response);
    if (!response.ok) {
      document.getElementById('cartMessage').textContent = result.error || 'Unable to place order.';
      return;
    }
    const lastOrder = {
      id: result.orderId || null,
      items: cart,
      total: findCartTotal(),
      placedAt: new Date().toISOString(),
      status: 'Pending'
    };
    localStorage.setItem('burger-machine-last-order', JSON.stringify(lastOrder));
    cart = [];
    saveCart();
    renderCart();
    updateCartCount();
    window.location.href = '/order-confirmation.html';
  } catch (error) {
    document.getElementById('cartMessage').textContent = 'Network error, please try again.';
  } finally {
    if (placeBtn) placeBtn.disabled = false;
  }
}

function setActiveSection(section) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`${section}Section`);
  if (target) target.classList.remove('hidden');
  const nav = document.querySelector(`[data-section="${section}"]`);
  if (nav) nav.classList.add('active');
}

async function loadHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  try {
    const response = await fetch('/api/orders');
    if (!response.ok) {
      container.innerHTML = '<p>Unable to load transaction history.</p>';
      return;
    }
    const data = await safeFetchJson(response);
    if (!data.orders || data.orders.length === 0) {
      container.innerHTML = '<p>No previous orders yet.</p>';
      return;
    }
    container.innerHTML = '';
    data.orders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'transaction-card';
      card.innerHTML = `
        <h3>Order #${order.id}</h3>
        <div class="meta">
          <span><strong>${order.username}</strong> · ${order.email}</span>
          <span>${order.contact} · ${order.address}</span>
          <span>${new Date(order.created_at).toLocaleString()}</span>
        </div>
        <div class="meta">
          <strong>Status:</strong> <span class="badge ${order.status}">${order.status}</span>
        </div>
        <div>
          <strong>Items:</strong>
          <ul>${order.items.map(item => `<li>${item.quantity}× ${item.name} (${formatMoney(item.price)})</li>`).join('')}</ul>
        </div>
        <div class="meta"><strong>Total:</strong> ${formatMoney(order.total)}</div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = '<p>Unable to load transaction history.</p>';
  }
}

async function loadProfile() {
  try {
    const response = await fetch('/api/user/profile');
    if (!response.ok) {
      window.location.href = '/index.html';
      return;
    }
    const data = await safeFetchJson(response);
    const profile = data.profile;
    document.getElementById('profileUsername').value = profile.username;
    document.getElementById('profileEmail').value = profile.email;
    document.getElementById('profileFirstName').value = profile.first_name;
    document.getElementById('profileLastName').value = profile.last_name;
    document.getElementById('profileContact').value = profile.contact;
    document.getElementById('profileAddress').value = profile.address;
  } catch (error) {
    window.location.href = '/index.html';
  }
}

async function saveProfile() {
  const payload = {
    firstName: document.getElementById('profileFirstName').value.trim(),
    lastName: document.getElementById('profileLastName').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
    contact: document.getElementById('profileContact').value.trim(),
    address: document.getElementById('profileAddress').value.trim()
  };
  const response = await fetch('/api/user/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  const message = document.getElementById('profileMessage');
  if (!response.ok) {
    message.textContent = data.error || 'Unable to save profile.';
    message.className = 'error-message';
    return;
  }
  message.textContent = 'Profile updated successfully.';
  message.className = 'success-message';
}

async function logout() {
  try {
    await fetch('/api/logout');
  } catch (error) {
    console.warn('Logout network error:', error);
  }
  localStorage.removeItem(cartKey);
  window.location.href = '/index.html';
}

async function initAuthPage() {
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authError = document.getElementById('authError');

  function showLogin() {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    authError.textContent = '';
  }
  function showSignup() {
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    authError.textContent = '';
  }

  loginTab.addEventListener('click', showLogin);
  signupTab.addEventListener('click', showSignup);

  const loginButton = document.getElementById('loginButton');
  const signupButton = document.getElementById('signupButton');

  loginButton.addEventListener('click', async () => {
    authError.textContent = '';
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    loginButton.disabled = true;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await safeFetchJson(response);
      if (!response.ok) {
        authError.textContent = result.error || 'Unable to log in.';
        return;
      }
      window.location.href = '/main.html';
    } catch (error) {
      authError.textContent = 'Network error, please try again.';
    } finally {
      loginButton.disabled = false;
    }
  });

  signupButton.addEventListener('click', async () => {
    authError.textContent = '';
    const payload = {
      username: document.getElementById('signupUsername').value.trim(),
      firstName: document.getElementById('signupFirstName').value.trim(),
      lastName: document.getElementById('signupLastName').value.trim(),
      email: document.getElementById('signupEmail').value.trim(),
      password: document.getElementById('signupPassword').value,
      passwordConfirm: document.getElementById('signupConfirmPassword').value,
      contact: document.getElementById('signupContact').value.trim(),
      address: document.getElementById('signupAddress').value.trim()
    };
    signupButton.disabled = true;
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await safeFetchJson(response);
      if (!response.ok) {
        authError.textContent = result.error || 'Could not sign up.';
        return;
      }
      window.location.href = '/main.html';
    } catch (error) {
      authError.textContent = 'Network error, please try again.';
    } finally {
      signupButton.disabled = false;
    }
  });
}

async function initMainPage() {
  const navButtons = document.querySelectorAll('.nav-link');
  navButtons.forEach(btn => btn.addEventListener('click', () => setActiveSection(btn.dataset.section)));
  document.getElementById('logoutButton').addEventListener('click', logout);
  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  setupCartButtons();
  renderMenu();
  updateCartCount();
  loadHistory();
  loadProfile();
}

async function initAdminPage() {
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminError = document.getElementById('adminError');
  adminLoginBtn.addEventListener('click', async () => {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    adminLoginBtn.disabled = true;
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await safeFetchJson(response);
      if (!response.ok) {
        adminError.textContent = result.error || 'Unable to log in as admin.';
        return;
      }
      window.location.href = '/admin-panel.html';
    } catch (error) {
      adminError.textContent = 'Network error, please try again.';
    } finally {
      adminLoginBtn.disabled = false;
    }
  });
}

function createBadge(status) {
  const color = status === 'Pending' ? '#f39c12' : status === 'To Prepare' ? '#3498db' : status === 'Ready to Claim' ? '#27ae60' : '#c0392b';
  return `<span class="badge" style="background:${color}">${status}</span>`;
}

async function initAdminPanel() {
  document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout');
    window.location.href = '/admin.html';
  });
  await loadAdminOrders();
}

async function loadConfirmation() {
  const container = document.getElementById('confirmationContainer');
  const orderId = document.getElementById('confirmationOrderId');
  const orderDate = document.getElementById('confirmationDate');
  const orderStatus = document.getElementById('confirmationStatus');
  const orderTotal = document.getElementById('confirmationTotal');
  const orderItems = document.getElementById('confirmationItems');
  const orderMessage = document.getElementById('confirmationMessage');
  const saved = localStorage.getItem('burger-machine-last-order');
  if (!saved) {
    window.location.href = '/main.html';
    return;
  }
  const order = JSON.parse(saved);
  if (orderId) orderId.textContent = order.id ? `#${order.id}` : 'Pending';
  if (orderDate) orderDate.textContent = new Date(order.placedAt).toLocaleString();
  if (orderStatus) orderStatus.textContent = order.status;
  if (orderTotal) orderTotal.textContent = formatMoney(order.total);
  if (orderItems) {
    orderItems.innerHTML = order.items.map(item => `<li>${item.quantity}× ${item.name} (${formatMoney(item.price)})</li>`).join('');
  }
  if (orderMessage) {
    orderMessage.textContent = 'Thank you for your order! Your transaction is being processed.';
  }
  const backButton = document.getElementById('backToMenuBtn');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = '/main.html';
    });
  }
}

async function loadAdminOrders() {
  const wrapper = document.getElementById('adminOrders');
  if (!wrapper) return;
  const response = await fetch('/api/admin/orders');
  if (!response.ok) {
    window.location.href = '/admin.html';
    return;
  }
  const data = await response.json();
  if (!data.orders || data.orders.length === 0) {
    wrapper.innerHTML = '<p>No orders yet.</p>';
    return;
  }
  wrapper.innerHTML = '';
  data.orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'admin-order-card';
    card.innerHTML = `
      <h3>Order #${order.id}</h3>
      <div class="meta">
        <span>${order.username} · ${order.email}</span>
        <span>${order.contact} · ${order.address}</span>
        <span>${new Date(order.created_at).toLocaleString()}</span>
      </div>
      <div class="meta"><strong>Status:</strong> ${createBadge(order.status)}</div>
      <div><strong>Items:</strong>
        <ul>${order.items.map(item => `<li>${item.quantity}× ${item.name} (${formatMoney(item.price)})</li>`).join('')}</ul>
      </div>
      <div class="meta"><strong>Total:</strong> ${formatMoney(order.total)}</div>
      <div class="order-actions"></div>
    `;
    const actions = card.querySelector('.order-actions');
    if (order.status === 'Pending') {
      actions.innerHTML = `
        <button class="secondary-btn" data-action="accept" data-order-id="${order.id}">Accept</button>
        <button class="secondary-btn" data-action="refuse" data-order-id="${order.id}">Refuse</button>
      `;
    } else if (order.status === 'To Prepare') {
      actions.innerHTML = `
        <button class="secondary-btn" data-action="done" data-order-id="${order.id}">Done</button>
      `;
    }
    wrapper.appendChild(card);
  });
  wrapper.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', async () => {
      const orderId = button.dataset.orderId;
      const action = button.dataset.action;
      await performAdminAction(orderId, action);
    });
  });
}

async function performAdminAction(orderId, action) {
  const response = await fetch(`/api/admin/order/${orderId}/${action}`, { method: 'POST' });
  if (response.ok) {
    await loadAdminOrders();
  } else {
    const data = await response.json();
    alert(data.error || 'Unable to update order.');
  }
}

if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
  initAuthPage();
} else if (window.location.pathname.endsWith('main.html')) {
  initMainPage();
} else if (window.location.pathname.endsWith('admin.html')) {
  initAdminPage();
} else if (window.location.pathname.endsWith('admin-panel.html')) {
  initAdminPanel();
} else if (window.location.pathname.endsWith('order-confirmation.html')) {
  loadConfirmation();
}
