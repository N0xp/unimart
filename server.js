/*
 * UniMart — Campus Marketplace
 * Main Express Server
 */

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Headers (Issue #32: CSP) ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// ─── Middleware ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Database Connection (Issue #30: handle failures) ───
const dbPool = require('./db/connection');

// Test DB connection on startup
dbPool.query('SELECT 1')
  .then(() => console.log('✅ Database connected successfully.'))
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Please check your .env settings and ensure MySQL is running.');
    process.exit(1);
  });

// Session store setup
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000
}, dbPool);

// Session configuration (Issue #5: cookie key must match what logout clears)
const SESSION_COOKIE_NAME = 'unimart_session';
app.use(session({
  key: SESSION_COOKIE_NAME,
  secret: process.env.SESSION_SECRET || 'unimart-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    httpOnly: true,
    sameSite: 'lax'  // Issue #4: SameSite attribute for CSRF mitigation
  }
}));

// Make SESSION_COOKIE_NAME available to routes
app.locals.SESSION_COOKIE_NAME = SESSION_COOKIE_NAME;

// ─── Rate Limiting (Issue #6) ───
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/register attempts per 15 min
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Shared Auth Middleware (Issue #27: consolidated) ───
const { requireAuth, requireAdmin } = require('./middleware/auth');

// ─── Serve static files from /public ───
// EXCEPT admin.html which needs server-side protection (Issue #2)
app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html'
}));

// ─── Protected admin page (Issue #2: server-side admin check) ───
app.get('/admin.html', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── API Routes ───
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

// Apply rate limiting to auth routes (Issue #6)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', requireAuth, cartRoutes);
app.use('/api/orders', requireAuth, orderRoutes);
app.use('/api/users', requireAuth, userRoutes);

// ─── Category route (simple) ───
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── Fallback: serve index.html for root ───
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── 404 Handler (Issue #26) ───
app.use((req, res) => {
  // For API routes, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  // For pages, serve 404.html
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ─── Global Error Handler ───
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start server ───
const server = app.listen(PORT, () => {
  console.log(`✅ UniMart server running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   Change PORT in .env, for example PORT=3001, then restart the server.');
    process.exit(1);
  }
  throw err;
});

// ─── Graceful Shutdown ───
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    dbPool.end().then(() => {
      console.log('Database pool closed.');
      process.exit(0);
    }).catch(() => process.exit(1));
  });
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;
