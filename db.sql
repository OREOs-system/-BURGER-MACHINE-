CREATE DATABASE IF NOT EXISTS burger_machine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE burger_machine;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  contact VARCHAR(50),
  address TEXT,
  role ENUM('user','admin') DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
);

-- Admin user seeded automatically by the server using a hashed password.
-- INSERT IGNORE INTO users (username, first_name, last_name, email, password, contact, address, role)
-- VALUES ('admin', 'Admin', 'User', 'admin@example.com', 'admin001', '0000000000', 'Admin Office', 'admin');
