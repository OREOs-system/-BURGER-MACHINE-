const adminAuth = document.getElementById('admin-auth');
const adminPanel = document.getElementById('admin-panel');
const adminMessage = document.getElementById('admin-message');
const adminUsername = document.getElementById('admin-username');
const adminPassword = document.getElementById('admin-password');
const adminLoginButton = document.getElementById('admin-login');
const adminLogoutButton = document.getElementById('admin-logout');
const ordersContainer = document.getElementById('admin-orders');

adminLoginButton.addEventListener('click', handleAdminLogin);
adminLogoutButton.addEventListener('click', handleAdminLogout);

async function handleAdminLogin() {
  adminMessage.textContent = '';
  const username = adminUsername.value.trim();
  const password = adminPassword.value;
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) {
    adminMessage.textContent = data.error || 'Invalid credentials.';
    return;
  }
  adminAuth.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  loadAdminOrders();
}

async function handleAdminLogout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  adminPanel.classList.add('hidden');
  adminAuth.classList.remove('hidden');
  adminUsername.value = '';
  adminPassword.value = '';
}

async function loadAdminOrders() {
  const res = await fetch('/api/admin/orders');
  if (!res.ok) {
    ordersContainer.innerHTML = '<p>Unable to load orders.</p>';
    return;
  }
  const orders = await res.json();
  if (!orders.length) {
    ordersContainer.innerHTML = '<p>No orders yet.</p>';
    return;
  }
  ordersContainer.innerHTML = orders.map(order => {
    const actions = [];
    if (order.status === 'Pending') {
      actions.push(`<button class="admin-action" data-id="${order.id}" data-action="accept">Accept</button>`);
      actions.push(`<button class="admin-action refuse" data-id="${order.id}" data-action="refuse">Refuse</button>`);
    }
    if (order.status === 'To Prepare') {
      actions.push(`<button class="admin-action" data-id="${order.id}" data-action="done">Mark Ready</button>`);
    }
    return `
      <div class="history-card">
        <h3>Order #${order.id}</h3>
        <p><strong>Username:</strong> ${order.username}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Contact:</strong> ${order.contact}</p>
        <p><strong>Address:</strong> ${order.address}</p>
        <p><strong>Date & Time:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p class="status-pill">${order.status}</p>
        <ul class="order-items">${order.items.map(item => `<li>${item.quantity} × ${item.name} (₱${item.price.toFixed(2)})</li>`).join('')}</ul>
        <p><strong>Total:</strong> ₱${order.total.toFixed(2)}</p>
        <div class="admin-actions">${actions.join(' ')}</div>
      </div>
    `;
  }).join('');
  document.querySelectorAll('.admin-action').forEach(button => {
    button.addEventListener('click', handleAdminAction);
  });
}

async function handleAdminAction(event) {
  const id = event.target.dataset.id;
  const action = event.target.dataset.action;
  const res = await fetch(`/api/admin/orders/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Unable to update order.');
    return;
  }
  loadAdminOrders();
}
