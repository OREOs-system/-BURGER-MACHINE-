const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME || 'burger_machine';
const DB_SOCKET_PATH = process.env.DB_SOCKET_PATH || '/var/run/mysqld/mysqld.sock';
const DB_CREDENTIAL_FILE = '/etc/mysql/debian.cnf';

let defaultDbUser = DB_USER;
let defaultDbPassword = DB_PASSWORD;
if (!defaultDbUser || !defaultDbPassword) {
  try {
    const configText = fs.readFileSync(DB_CREDENTIAL_FILE, 'utf8');
    const userMatch = configText.match(/user\s*=\s*(.+)/);
    const passwordMatch = configText.match(/password\s*=\s*(.+)/);
    if (userMatch) defaultDbUser = userMatch[1].trim();
    if (passwordMatch) defaultDbPassword = passwordMatch[1].trim();
  } catch (error) {
    // ignore if we cannot read system credentials
  }
}

const DB_CONNECTION_CONFIG = {
  user: defaultDbUser || 'root',
  password: defaultDbPassword || '',
  ...(DB_HOST ? { host: DB_HOST } : { socketPath: DB_SOCKET_PATH })
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'burger-machine-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use('/images', express.static(path.join(__dirname, 'menu')));
app.use(express.static(__dirname, { index: 'index.html' }));

let pool;

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes('$')) {
    return false;
  }
  const [salt, hash] = stored.split('$');
  return hashPassword(password, salt) === stored;
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidContact(contact) {
  return typeof contact === 'string' && /^[0-9+\s\-]{7,20}$/.test(contact);
}

async function initDb() {
  const rootConnection = await mysql.createConnection(DB_CONNECTION_CONFIG);
  await rootConnection.query('CREATE DATABASE IF NOT EXISTS `' + DB_NAME + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await rootConnection.end();

  pool = mysql.createPool({
    ...DB_CONNECTION_CONFIG,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      contact VARCHAR(50),
      address TEXT,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      username VARCHAR(50),
      email VARCHAR(100),
      contact VARCHAR(50),
      address TEXT,
      items TEXT NOT NULL,
      total DECIMAL(8,2) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const adminPasswordHash = hashPassword('admin001');
  await pool.query(`
    INSERT IGNORE INTO users (username, first_name, last_name, email, password, contact, address, role)
    VALUES ('admin', 'Admin', 'User', 'admin@example.com', ?, '0000000000', 'Admin Office', 'admin');
  `, [adminPasswordHash]);
  await pool.query('UPDATE users SET password = ? WHERE username = ?', [adminPasswordHash, 'admin']);
}

function requireLogin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'user') {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(401).json({ error: 'Admin login required' });
}

app.post('/api/signup', async (req, res) => {
  const { username, firstName, lastName, email, password, passwordConfirm, contact, address } = req.body;
  if (!username || !firstName || !lastName || !email || !password || !passwordConfirm || !contact || !address) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (!isValidContact(contact)) {
    return res.status(400).json({ error: 'Please provide a valid contact number.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already registered.' });
    }

    const passwordHash = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (username, first_name, last_name, email, password, contact, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, firstName, lastName, email, passwordHash, contact, address]
    );

    req.session.user = {
      id: result.insertId,
      username,
      email,
      role: 'user'
    };

    return res.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both username and password.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0 || !verifyPassword(password, rows[0].password)) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    const user = rows[0];
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    return res.json({ success: true, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Could not log in.' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Enter admin username and password.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'admin']);
    if (rows.length === 0 || !verifyPassword(password, rows[0].password)) {
      return res.status(400).json({ error: 'Invalid admin credentials.' });
    }
    req.session.user = {
      id: rows[0].id,
      username: rows[0].username,
      email: rows[0].email,
      role: 'admin'
    };
    return res.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Could not log in admin.' });
  }
});

app.get('/api/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.json({ user: req.session.user });
});

app.get('/api/user/profile', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  try {
    const [rows] = await pool.query('SELECT id, username, first_name, last_name, email, contact, address FROM users WHERE id = ?', [req.session.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    return res.json({ profile: rows[0] });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Could not load profile.' });
  }
});

app.post('/api/user/update', async (req, res) => {
  const { firstName, lastName, email, contact, address } = req.body;
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (!firstName || !lastName || !email || !contact || !address) {
    return res.status(400).json({ error: 'Please fill in all profile fields.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!isValidContact(contact)) {
    return res.status(400).json({ error: 'Please provide a valid contact number.' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.session.user.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already in use.' });
    }
    await pool.query('UPDATE users SET first_name = ?, last_name = ?, email = ?, contact = ?, address = ? WHERE id = ?', [firstName, lastName, email, contact, address, req.session.user.id]);
    req.session.user.email = email;
    return res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Could not update profile.' });
  }
});

app.post('/api/order', requireLogin, async (req, res) => {
  const { items, total } = req.body;
  if (!items || items.length === 0 || !total) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  try {
    const [rows] = await pool.query('SELECT username, email, contact, address FROM users WHERE id = ?', [req.session.user.id]);
    const user = rows[0];
    const [result] = await pool.query(
      'INSERT INTO orders (user_id, username, email, contact, address, items, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.session.user.id, user.username, user.email, user.contact, user.address, JSON.stringify(items), parseFloat(total).toFixed(2)]
    );
    return res.json({ success: true, orderId: result.insertId });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ error: 'Could not place order.' });
  }
});

app.get('/api/orders', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.session.user.id]);
    const orders = rows.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    return res.json({ orders });
  } catch (error) {
    console.error('Order list error:', error);
    return res.status(500).json({ error: 'Could not load orders.' });
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = rows.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    return res.json({ orders });
  } catch (error) {
    console.error('Admin orders error:', error);
    return res.status(500).json({ error: 'Could not load admin orders.' });
  }
});

app.post('/api/admin/order/:orderId/:action', requireAdmin, async (req, res) => {
  const { orderId, action } = req.params;
  const allowed = ['accept', 'done', 'refuse'];
  if (!allowed.includes(action)) {
    return res.status(400).json({ error: 'Invalid action.' });
  }
  try {
    const [rows] = await pool.query('SELECT status FROM orders WHERE id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    let status = rows[0].status;
    if (action === 'accept' && status === 'Pending') status = 'To Prepare';
    if (action === 'done' && status === 'To Prepare') status = 'Ready to Claim';
    if (action === 'refuse') status = 'Cancelled';
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    return res.json({ success: true, status });
  } catch (error) {
    console.error('Admin action error:', error);
    return res.status(500).json({ error: 'Could not update order.' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Burger machine server running at http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
