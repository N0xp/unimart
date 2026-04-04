/*
 * User Profile Routes
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /api/users/profile
router.get('/profile', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, phone, address, created_at FROM users WHERE id = ?',
            [req.session.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

// PUT /api/users/profile
router.put('/profile', async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required.' });
        await db.query(
            'UPDATE users SET name=?, phone=?, address=? WHERE id=?',
            [name, phone || null, address || null, req.session.user.id]
        );
        // Update session name
        req.session.user.name = name;
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// GET /api/users/stats — dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [listings] = await db.query(
            'SELECT COUNT(*) AS count FROM products WHERE seller_id = ?',
            [req.session.user.id]
        );
        const [orders] = await db.query(
            'SELECT COUNT(*) AS count FROM orders WHERE buyer_id = ?',
            [req.session.user.id]
        );
        res.json({
            listingsCount: listings[0].count,
            ordersCount: orders[0].count
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

module.exports = router;
