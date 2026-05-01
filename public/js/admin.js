const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginMessage = document.getElementById('adminLoginMessage');
const adminOrdersContainer = document.getElementById('adminOrders');
const adminLogoutBtn = document.getElementById('adminLogout');

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    adminLoginMessage.textContent = '';

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      adminLoginMessage.textContent = data.error || 'Invalid credentials.';
      return;
    }
    window.location.href = '/admin-panel';
  });
}

if (adminOrdersContainer) {
  async function loadAdminOrders() {
    adminOrdersContainer.innerHTML = '<p>Loading orders...</p>';
    const response = await fetch('/api/admin/orders');
    if (!response.ok) {
      adminOrdersContainer.innerHTML = '<p>Unable to load orders. Please log in as admin.</p>';
      return;
    }
    const { orders } = await response.json();
    if (orders.length === 0) {
      adminOrdersContainer.innerHTML = '<p>No orders are available.</p>';
      return;
    }
    adminOrdersContainer.innerHTML = '';
    orders.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'admin-order';
      const statusClass = order.status === 'Pending' ? 'pending' : order.status === 'To Prepare' ? 'prepare' : order.status === 'Ready to Claim' ? 'ready' : 'cancelled';
      const actionButtons = [];
      if (order.status === 'Pending') {
        actionButtons.push('<button data-id="' + order.id + '" data-action="accept">Accept</button>');
        actionButtons.push('<button data-id="' + order.id + '" data-action="refuse">Refuse</button>');
      } else if (order.status === 'To Prepare') {
        actionButtons.push('<button data-id="' + order.id + '" data-action="done">Done</button>');
      }
      card.innerHTML = `
        <h3>Order #${order.id}</h3>
        <p><strong>User:</strong> ${order.username}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Contact:</strong> ${order.contact}</p>
        <p><strong>Address:</strong> ${order.address}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <div class="order-status ${statusClass}">${order.status}</div>
        <div style="margin-top:12px;"><strong>Items:</strong></div>
        ${order.items.map((item) => `<p>${item.quantity} × ${item.name} (₱${item.price.toFixed(2)})</p>`).join('')}
        <p><strong>Total:</strong> ₱${Number(order.total_amount).toFixed(2)}</p>
        <div class="order-actions">${actionButtons.join('')}</div>
      `;
      adminOrdersContainer.appendChild(card);
    });
  }

  adminOrdersContainer.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const orderId = button.dataset.id;
    const action = button.dataset.action;
    const response = await fetch('/api/admin/order/' + orderId + '/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (response.ok) {
      loadAdminOrders();
    } else {
      const result = await response.json();
      alert(result.error || 'Could not update order status.');
    }
  });

  loadAdminOrders();
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/admin';
  });
}
