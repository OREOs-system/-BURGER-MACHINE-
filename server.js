const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'burger-machine-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/menu', express.static(path.join(__dirname, 'menu')));

const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin001' };

function requireLogin(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session.admin) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/signup', async (req, res) => {
  try {
    const { username, firstName, lastName, email, password, confirmPassword, contact, address } = req.body;
    if (!username || !firstName || !lastName || !email || !password || !confirmPassword || !contact || !address) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, first_name, last_name, email, password, contact, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, firstName, lastName, email, hashedPassword, contact, address]
    );
    res.json({ message: 'Account created successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    res.json({ message: 'Login successful.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

app.get('/api/user', requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, first_name AS firstName, last_name AS lastName, email, contact, address FROM users WHERE id = ?', [req.session.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load user.' });
  }
});

app.post('/api/user/update', requireLogin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, contact, address } = req.body;
    if (!firstName || !lastName || !email || !contact || !address) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ?', [email, req.session.user.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already in use.' });
    }
    const params = [firstName, lastName, email, contact, address, req.session.user.id];
    await db.query('UPDATE users SET first_name = ?, last_name = ?, email = ?, contact = ?, address = ? WHERE id = ?', params);
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.user.id]);
    }
    res.json({ message: 'Account updated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update account.' });
  }
});

app.get('/api/products', (req, res) => {
  const products = [
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
  res.json(products);
});

app.post('/api/orders', requireLogin, async (req, res) => {
  try {
    const { items, total } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }
    const [userRows] = await db.query('SELECT username, email, contact, address FROM users WHERE id = ?', [req.session.user.id]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userRows[0];
    await db.query(
      'INSERT INTO orders (user_id, username, email, contact, address, items, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.session.user.id, user.username, user.email, user.contact, user.address, JSON.stringify(items), total, 'Pending']
    );
    res.json({ message: 'Order placed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not place the order.' });
  }
});

app.get('/api/orders', requireLogin, async (req, res) => {
  try {
    const [orders] = await db.query('SELECT id, username, email, contact, address, items, total, status, created_at AS createdAt FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.session.user.id]);
    const formatted = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    req.session.admin = true;
    return res.json({ message: 'Admin login successful.' });
  }
  res.status(401).json({ error: 'Invalid admin credentials.' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Admin logged out.' });
  });
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const [orders] = await db.query('SELECT id, username, email, contact, address, items, total, status, created_at AS createdAt FROM orders ORDER BY created_at DESC');
    const formatted = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load admin orders.' });
  }
});

app.post('/api/admin/orders/:id/action', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!['accept', 'refuse', 'done'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }
    const [rows] = await db.query('SELECT status FROM orders WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const current = rows[0].status;
    let status = current;
    if (action === 'accept' && current === 'Pending') {
      status = 'To Prepare';
    } else if (action === 'done' && current === 'To Prepare') {
      status = 'Ready to Claim';
    } else if (action === 'refuse' && current === 'Pending') {
      status = 'Cancelled';
    } else {
      return res.status(400).json({ error: 'Action not allowed.' });
    }
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Order updated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update order.' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Burger Machine app running on http://localhost:${PORT}`);
});
