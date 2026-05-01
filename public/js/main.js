const menuGrid = document.getElementById('menuGrid');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const toggleCart = document.getElementById('toggleCart');
const cartPanel = document.getElementById('cartPanel');
const clearCartBtn = document.getElementById('clearCart');
const placeOrderBtn = document.getElementById('placeOrder');
const orderConfirm = document.getElementById('orderConfirm');
const confirmOrder = document.getElementById('confirmOrder');
const cancelOrder = document.getElementById('cancelOrder');
const logoutBtn = document.getElementById('logoutBtn');
const historyList = document.getElementById('historyList');
const settingsForm = document.getElementById('settingsForm');
const settingsMessage = document.getElementById('settingsMessage');

const menuSection = document.getElementById('menuSection');
const historySection = document.getElementById('historySection');
const settingsSection = document.getElementById('settingsSection');
const viewButtons = document.querySelectorAll('.top-nav button[data-view]');

let cart = [];

function setView(view) {
  menuSection.classList.toggle('active', view === 'menu');
  historySection.classList.toggle('active', view === 'history');
  settingsSection.classList.toggle('active', view === 'settings');
  viewButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'history') {
    loadHistory();
  }
  if (view === 'settings') {
    loadUser();
  }
}

function updateCartDisplay() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartItemsContainer.innerHTML = '';
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
  } else {
    cart.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <span>₱${item.price.toFixed(2)} x ${item.quantity}</span>
        </div>
        <div>
          <button class="small-button" data-action="remove" data-id="${item.id}">Remove</button>
        </div>
      `;
      cartItemsContainer.appendChild(row);
    });
  }
  cartTotal.textContent = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
}

function toggleCartPanel() {
  cartPanel.classList.toggle('hidden');
}

async function loadMenu() {
  const response = await fetch('/api/menu');
  const items = await response.json();
  menuGrid.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="menu-info">
        <h3>${item.name}</h3>
        <p>₱${item.price.toFixed(2)}</p>
      </div>
      <button data-id="${item.id}">Add to cart</button>
    `;
    menuGrid.appendChild(card);
  });
}

function addToCart(item) {
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  updateCartDisplay();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  updateCartDisplay();
}

async function submitOrder() {
  const response = await fetch('/api/user');
  if (!response.ok) {
    window.location.href = '/';
    return;
  }
  const { user } = await response.json();
  const orderBody = {
    items: cart,
    contact: user.contact,
    address: user.address
  };
  const result = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderBody)
  });
  const data = await result.json();
  if (!result.ok) {
    alert(data.error || 'Could not place order.');
    return;
  }
  cart = [];
  updateCartDisplay();
  toggleCartPanel();
  alert('Order placed successfully!');
}

async function loadHistory() {
  historyList.innerHTML = '<p>Loading orders...</p>';
  const response = await fetch('/api/orders');
  if (!response.ok) {
    historyList.innerHTML = '<p>Unable to load history.</p>';
    return;
  }
  const { orders } = await response.json();
  if (orders.length === 0) {
    historyList.innerHTML = '<p>No orders yet.</p>';
    return;
  }
  historyList.innerHTML = '';
  orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'history-item';
    const statusClass = order.status === 'Pending' ? 'pending' : order.status === 'To Prepare' ? 'prepare' : order.status === 'Ready to Claim' ? 'ready' : 'cancelled';
    card.innerHTML = `
      <h3>Order #${order.id}</h3>
      <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Contact:</strong> ${order.contact}</p>
      <p><strong>Address:</strong> ${order.address}</p>
      <div class="order-status ${statusClass}">${order.status}</div>
      <div style="margin-top:12px;"><strong>Items:</strong></div>
      ${order.items.map((item) => `<p>${item.quantity} × ${item.name} (₱${item.price.toFixed(2)})</p>`).join('')}
      <p><strong>Total:</strong> ₱${Number(order.total_amount).toFixed(2)}</p>
    `;
    historyList.appendChild(card);
  });
}

async function loadUser() {
  settingsMessage.textContent = '';
  const response = await fetch('/api/user');
  if (!response.ok) {
    window.location.href = '/';
    return;
  }
  const { user } = await response.json();
  document.getElementById('settingsUsername').value = user.username;
  document.getElementById('settingsFirstName').value = user.firstName;
  document.getElementById('settingsLastName').value = user.lastName;
  document.getElementById('settingsEmail').value = user.email;
  document.getElementById('settingsContact').value = user.contact;
  document.getElementById('settingsAddress').value = user.address;
}

async function updateSettings(event) {
  event.preventDefault();
  settingsMessage.textContent = '';
  const firstName = document.getElementById('settingsFirstName').value.trim();
  const lastName = document.getElementById('settingsLastName').value.trim();
  const email = document.getElementById('settingsEmail').value.trim();
  const contact = document.getElementById('settingsContact').value.trim();
  const address = document.getElementById('settingsAddress').value.trim();

  const response = await fetch('/api/user', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, contact, address })
  });
  const data = await response.json();
  if (!response.ok) {
    settingsMessage.textContent = data.error || 'Could not save settings.';
    return;
  }
  settingsMessage.style.color = '#1d7b3c';
  settingsMessage.textContent = 'Account updated successfully.';
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

menuGrid.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const itemId = Number(button.dataset.id);
  fetch('/api/menu')
    .then((res) => res.json())
    .then((items) => {
      const item = items.find((entry) => entry.id === itemId);
      if (item) addToCart(item);
    });
});

cartItemsContainer?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === 'remove') {
    removeFromCart(id);
  }
});

toggleCart?.addEventListener('click', toggleCartPanel);
clearCartBtn?.addEventListener('click', () => { cart = []; updateCartDisplay(); });
placeOrderBtn?.addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Add items to the cart first.');
    return;
  }
  orderConfirm.classList.remove('hidden');
});
confirmOrder?.addEventListener('click', async () => {
  orderConfirm.classList.add('hidden');
  await submitOrder();
});
cancelOrder?.addEventListener('click', () => orderConfirm.classList.add('hidden'));
logoutBtn?.addEventListener('click', logout);
settingsForm?.addEventListener('submit', updateSettings);
viewButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));

setView('menu');
loadMenu();
updateCartDisplay();
