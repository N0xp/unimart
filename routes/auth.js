/*
 * Auth Routes — Register, Login, Logout
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        // Check if email already exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null]
        );
        res.status(201).json({ message: 'Registration successful. Please log in.' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// POST /api/auth/login
// Supports login by email OR username (name field)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email/username and password are required.' });
        }
        // Try matching by email first, then by name (username)
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ? OR name = ?',
            [email, email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        // Create session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: user.is_admin ? true : false
        };
        res.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin ? true : false } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// POST /api/auth/logout
// Issue #5 FIX: Use the correct session cookie name from app.locals
router.post('/logout', (req, res) => {
    const cookieName = req.app.locals.SESSION_COOKIE_NAME || 'unimart_session';
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout.' });
        }
        res.clearCookie(cookieName);
        res.json({ message: 'Logged out successfully.' });
    });
});

// GET /api/auth/check — check if user is logged in
router.get('/check', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;
