const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'burger_machine'
};

app.use(express.static(path.join(__dirname, 'public')));
app.use('/menu', express.static(path.join(__dirname, 'menu')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'burger-machine-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
);

const menuItems = [
  { id: 1, category: 'Burgers', name: 'Double Chicken Burger', price: 50.0, image: '/menu/Double Chicken Burger.jpg' },
  { id: 2, category: 'Burgers', name: 'Jumbo Egg Burger', price: 71.0, image: '/menu/Jumbo Egg Burger.jpg' },
  { id: 3, category: 'Burgers', name: 'Jumbo Chili Burger', price: 71.0, image: '/menu/Jumbo Chili Burger.jpg' },
  { id: 4, category: 'Burgers', name: 'Double Longganisa Burger', price: 53.0, image: '/menu/Double Longganisa Burger.jpg' },
  { id: 5, category: 'Burgers', name: 'Jumbo Cheezy Bacon', price: 85.0, image: '/menu/Jumbo Cheezy Bacon Burger.jpg' },
  { id: 6, category: 'Burgers', name: 'Ultimate Double Burger', price: 77.0, image: '/menu/Ultimate Double Burger.jpg' },
  { id: 7, category: 'Burgers', name: 'Big Beef BBQ Burger', price: 58.0, image: '/menu/Big Beef BBQ Burger.jpg' },
  { id: 8, category: 'Burgers', name: 'Classic Burger', price: 28.0, image: '/menu/Classic Burger.jpg' },
  { id: 9, category: 'Burgers', name: 'Jumbo Burger', price: 47.0, image: '/menu/Jumbo Burger.jpg' },
  { id: 10, category: 'Burgers', name: 'Jumbo Cheese Burger', price: 71.0, image: '/menu/Jumbo Cheezy Burger.jpg' },
  { id: 11, category: 'Drinks', name: 'Bottled Water', price: 19.0, image: '/menu/Bottle Water.jpg' },
  { id: 12, category: 'Drinks', name: 'Mountain Dew', price: 21.0, image: '/menu/Soft Drink.jpg' },
  { id: 13, category: 'Drinks', name: 'Hot Choco', price: 24.0, image: '/menu/Hot Choco.jpg' },
  { id: 14, category: 'Drinks', name: 'Hot Coffee', price: 22.0, image: '/menu/Hot Coffee.jpg' },
  { id: 15, category: 'Drinks', name: 'Apple Iced Tea', price: 19.0, image: '/menu/Apple Ice Tea.jpg' }
];

async function dbQuery(sql, values = []) {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute(sql, values);
  await connection.end();
  return rows;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/main');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/main');
  }
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/main', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.get('/admin', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin-panel');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-panel', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));
});

app.get('/api/menu', (req, res) => {
  res.json(menuItems);
});

app.post('/api/signup', async (req, res) => {
  const { username, firstName, lastName, email, password, confirmPassword, contact, address } = req.body;
  if (!username || !firstName || !lastName || !email || !password || !confirmPassword || !contact || !address) {
    return res.status(400).json({ error: 'Fill all fields.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const exists = await dbQuery('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (exists.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    const passwordHash = hashPassword(password);
    await dbQuery(
      'INSERT INTO users (username, first_name, last_name, email, password_hash, contact, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, firstName, lastName, email, passwordHash, contact, address]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Enter username and password.' });
  }

  try {
    const rows = await dbQuery('SELECT id, username, first_name, last_name, email, contact, address FROM users WHERE username = ? AND password_hash = ?', [username, hashPassword(password)]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    const user = rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, user: { username: user.username, firstName: user.first_name, lastName: user.last_name, email: user.email, contact: user.contact, address: user.address } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/user', requireLogin, async (req, res) => {
  try {
    const rows = await dbQuery('SELECT username, first_name, last_name, email, contact, address FROM users WHERE id = ?', [req.session.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = rows[0];
    res.json({ user: { username: user.username, firstName: user.first_name, lastName: user.last_name, email: user.email, contact: user.contact, address: user.address } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.put('/api/user', requireLogin, async (req, res) => {
  const { firstName, lastName, email, contact, address } = req.body;
  if (!firstName || !lastName || !email || !contact || !address) {
    return res.status(400).json({ error: 'Complete all fields.' });
  }
  try {
    await dbQuery('UPDATE users SET first_name = ?, last_name = ?, email = ?, contact = ?, address = ? WHERE id = ?', [firstName, lastName, email, contact, address, req.session.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.post('/api/orders', requireLogin, async (req, res) => {
  const { items, contact, address } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0 || !contact || !address) {
    return res.status(400).json({ error: 'Order must contain items, contact, and address.' });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  try {
    const userRows = await dbQuery('SELECT username, email FROM users WHERE id = ?', [req.session.userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userRows[0];
    await dbQuery(
      'INSERT INTO orders (user_id, username, email, contact, address, items, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.session.userId, user.username, user.email, contact, address, JSON.stringify(items), total.toFixed(2)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.get('/api/orders', requireLogin, async (req, res) => {
  try {
    const rows = await dbQuery('SELECT id, username, email, contact, address, created_at, status, items, total_amount FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
    const orders = rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin001') {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid admin credentials.' });
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('SELECT id, username, email, contact, address, created_at, status, items, total_amount FROM orders ORDER BY created_at DESC');
    const orders = rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.post('/api/admin/order/:id/action', requireAdmin, async (req, res) => {
  const { action } = req.body;
  const orderId = Number(req.params.id);
  if (!['accept', 'done', 'refuse'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action.' });
  }

  try {
    const row = await dbQuery('SELECT status FROM orders WHERE id = ?', [orderId]);
    if (row.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const currentStatus = row[0].status;

    let nextStatus = currentStatus;
    if (action === 'accept' && currentStatus === 'Pending') {
      nextStatus = 'To Prepare';
    }
    if (action === 'done' && currentStatus === 'To Prepare') {
      nextStatus = 'Ready to Claim';
    }
    if (action === 'refuse' && currentStatus === 'Pending') {
      nextStatus = 'Cancelled';
    }
    if (nextStatus === currentStatus) {
      return res.status(400).json({ error: 'Action not allowed for current status.' });
    }

    await dbQuery('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, orderId]);
    res.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.listen(port, () => {
  console.log(`Burger Machine app is running at http://localhost:${port}`);
});
