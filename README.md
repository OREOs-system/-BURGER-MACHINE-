# Burger Machine

A burger ordering system built with Node.js, Express, MySQL, HTML, CSS, and JavaScript.

## Features
- User sign up and login
- Menu browsing with burger and drinks items
- Cart and order placement
- Transaction history with order status
- Account settings edit page
- Admin login and order management

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create the MySQL database and tables:
   ```bash
   mysql -u root -p < init.sql
   ```
3. Start the app:
   ```bash
   npm start
   ```
4. Open the browser at `http://localhost:3000`

## Admin Access
- Username: `admin`
- Password: `admin001`

## Notes
- Update MySQL connection details by setting environment variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` if needed.
