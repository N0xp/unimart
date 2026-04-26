/*
 * Input Validation & Sanitization Middleware
 */

// Strip HTML tags to prevent stored XSS from API clients (curl, Postman, etc.)
function stripHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
}

function sanitizeImageUrl(value) {
    if (!value) return null;
    if (typeof value !== 'string') return null;

    const url = value.trim();
    if (!url) return null;
    if (url.length > 255) return null;

    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? url : null;
    } catch (_) {
        return null;
    }
}

// Validate product input
function validateProduct(req, res, next) {
    const { title, description, price, category_id } = req.body;
    if (!title || !description || !price || !category_id) {
        return res.status(400).json({ error: 'Title, description, price, and category are required.' });
    }
    const cleanTitle = stripHtml(title);
    const cleanDescription = stripHtml(description);

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number.' });
    }
    const numCategory = parseInt(category_id);
    if (isNaN(numCategory) || numCategory <= 0) {
        return res.status(400).json({ error: 'Invalid category.' });
    }
    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
        return res.status(400).json({ error: 'Title must be between 3 and 150 characters.' });
    }
    if (cleanDescription.length < 10) {
        return res.status(400).json({ error: 'Description must be at least 10 characters.' });
    }
    req.body.title = cleanTitle;
    req.body.description = cleanDescription;
    req.body.price = numPrice;
    req.body.category_id = numCategory;
    req.body.image_url = sanitizeImageUrl(req.body.image_url);
    next();
}

// Validate cart input
function validateCartAdd(req, res, next) {
    const { product_id, quantity } = req.body;
    if (!product_id) {
        return res.status(400).json({ error: 'Product ID is required.' });
    }
    const numProductId = parseInt(product_id);
    if (isNaN(numProductId) || numProductId <= 0) {
        return res.status(400).json({ error: 'Invalid product ID.' });
    }
    const numQty = parseInt(quantity) || 1;
    if (numQty < 1 || numQty > 10) {
        return res.status(400).json({ error: 'Quantity must be between 1 and 10.' });
    }
    req.body.product_id = numProductId;
    req.body.quantity = numQty;
    next();
}

// Validate cart update
function validateCartUpdate(req, res, next) {
    const { quantity } = req.body;
    const numQty = parseInt(quantity);
    if (isNaN(numQty) || numQty < 1 || numQty > 10) {
        return res.status(400).json({ error: 'Quantity must be between 1 and 10.' });
    }
    req.body.quantity = numQty;
    next();
}

module.exports = { validateProduct, validateCartAdd, validateCartUpdate, stripHtml };
