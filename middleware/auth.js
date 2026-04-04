/*
 * Shared Auth Middleware
 */

// Require authentication
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

// Require admin
function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.is_admin) {
        return next();
    }
    return res.status(403).json({ error: 'Admin access required.' });
}

module.exports = { requireAuth, requireAdmin };
