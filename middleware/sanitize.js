/*
 * Input Validation & Sanitization Middleware
 */

// Validate product input
function validateProduct(req, res, next) {
    const { title, description, price, category_id } = req.body;
    if (!title || !description || !price || !category_id) {
        return res.status(400).json({ error: 'Title, description, price, and category are required.' });
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number.' });
    }
    const numCategory = parseInt(category_id);
    if (isNaN(numCategory) || numCategory <= 0) {
        return res.status(400).json({ error: 'Invalid category.' });
    }
    if (title.length < 3 || title.length > 150) {
        return res.status(400).json({ error: 'Title must be between 3 and 150 characters.' });
    }
    if (description.length < 10) {
        return res.status(400).json({ error: 'Description must be at least 10 characters.' });
    }
    req.body.price = numPrice;
    req.body.category_id = numCategory;
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

module.exports = { validateProduct, validateCartAdd, validateCartUpdate };
