/**
 * UniMart — validation.js
 * Client-side form validation with jQuery
 */

/**
 * Validate a form field and show error
 */
function validateField($field, condition, message) {
    const $error = $field.siblings('.form-error');
    if (!condition) {
        $field.addClass('is-invalid').removeClass('is-valid');
        $error.text(message).slideDown(200);
        return false;
    } else {
        $field.removeClass('is-invalid').addClass('is-valid');
        $error.slideUp(200);
        return true;
    }
}

/**
 * Email regex check
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate login form
 */
function validateLoginForm() {
    const $email = $('#loginEmail');
    const $password = $('#loginPassword');
    let valid = true;

    valid = validateField($email, $email.val().trim() !== '', 'Email or username is required.') && valid;
    valid = validateField($password, $password.val().trim() !== '', 'Password is required.') && valid;

    return valid;
}

/**
 * Validate registration form
 */
function validateRegisterForm() {
    const $name = $('#regName');
    const $email = $('#regEmail');
    const $password = $('#regPassword');
    const $confirm = $('#regConfirm');
    let valid = true;

    valid = validateField($name, $name.val().trim().length >= 2, 'Name must be at least 2 characters.') && valid;
    valid = validateField($email, $email.val().trim() !== '', 'Email is required.') && valid;
    if ($email.val().trim()) {
        valid = validateField($email, isValidEmail($email.val()), 'Please enter a valid email.') && valid;
    }
    valid = validateField($password, $password.val().length >= 6, 'Password must be at least 6 characters.') && valid;
    valid = validateField($confirm, $confirm.val() === $password.val(), 'Passwords do not match.') && valid;

    return valid;
}

/**
 * Validate checkout form
 */
function validateCheckoutForm() {
    const $address = $('#checkoutAddress');
    const $phone = $('#checkoutPhone');
    let valid = true;

    valid = validateField($address, $address.val().trim().length >= 5, 'Please enter a valid delivery address.') && valid;
    valid = validateField($phone, /^[0-9]{10,}$/.test($phone.val().trim()), 'Please enter a valid phone number (10+ digits).') && valid;

    return valid;
}

/**
 * Validate product listing form
 */
function validateProductForm() {
    const $title = $('#prodTitle');
    const $desc = $('#prodDesc');
    const $price = $('#prodPrice');
    const $category = $('#prodCategory');
    let valid = true;

    valid = validateField($title, $title.val().trim().length >= 3, 'Title must be at least 3 characters.') && valid;
    valid = validateField($desc, $desc.val().trim().length >= 10, 'Description must be at least 10 characters.') && valid;
    valid = validateField($price, parseFloat($price.val()) > 0, 'Price must be greater than 0.') && valid;
    valid = validateField($category, $category.val() !== '', 'Please select a category.') && valid;

    return valid;
}

// Real-time validation on input
$(document).ready(function () {
    // Clear error state on input
    $(document).on('input', '.form-control', function () {
        $(this).removeClass('is-invalid');
        $(this).siblings('.form-error').slideUp(200);
    });

    // Password match indicator (registration)
    $(document).on('input', '#regConfirm', function () {
        const password = $('#regPassword').val();
        const confirm = $(this).val();
        if (confirm.length > 0) {
            if (password === confirm) {
                $(this).removeClass('is-invalid').addClass('is-valid');
                $(this).siblings('.form-error').slideUp(200);
            } else {
                $(this).addClass('is-invalid').removeClass('is-valid');
                $(this).siblings('.form-error').text('Passwords do not match.').slideDown(200);
            }
        }
    });
});
