/**
 * UniMart — main.js
 * Shared utilities: auth check, navbar updates, toast notifications, logout
 * Issue #1 FIX: XSS sanitization utility
 * Issue #25 FIX: Navbar loaded dynamically from navbar.html
 */

/**
 * XSS Sanitization — escape HTML entities (Issue #1)
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

$(document).ready(function () {
    // Issue #25: Load shared navbar
    loadNavbar();

    // Logout handler
    $(document).on('click', '#navLogout', function (e) {
        e.preventDefault();
        $.post('/api/auth/logout', function () {
            showToast('Logged out successfully.', 'success');
            setTimeout(() => window.location.href = 'index.html', 800);
        });
    });
});

/**
 * Load shared navbar from navbar.html (Issue #25)
 */
function loadNavbar() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        $.get('/navbar.html', function (html) {
            navbarPlaceholder.innerHTML = html;
            // Set active nav link based on current page
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            $(`#mainNavbar .nav-link[href="${currentPage}"]`).addClass('active');
            // Now check auth
            checkAuth();
        }).fail(function () {
            // Fallback: if navbar.html doesn't load, still check auth
            checkAuth();
        });
    } else {
        // Navbar is inline (legacy pages), just check auth
        checkAuth();
    }
}

/**
 * Check if user is authenticated and update navbar
 */
function checkAuth() {
    $.get('/api/auth/check', function (data) {
        if (data.loggedIn) {
            window.currentUser = data.user;
            $('#navLogin, #navRegister').addClass('d-none');
            $('#navDashboard, #navCart, #navUser').removeClass('d-none');
            $('#navUserName').text(escapeHtml(data.user.name));

            // Add Admin link to dropdown if admin
            if (data.user.is_admin && $('#navAdmin').length === 0) {
                $('#navUser .dropdown-menu').prepend('<li><a class="dropdown-item text-primary fw-bold" id="navAdmin" href="admin.html"><i class="bi bi-shield-lock"></i> Admin Dashboard</a></li><li><hr class="dropdown-divider"></li>');
            }

            updateCartBadge();
        } else {
            $('#navLogin, #navRegister').removeClass('d-none');
            $('#navDashboard, #navCart, #navUser').addClass('d-none');
        }
    });
}

/**
 * Update cart badge count
 */
function updateCartBadge() {
    $.get('/api/cart', function (items) {
        const count = items.length;
        if (count > 0) {
            $('#cartBadge').text(count).show();
        } else {
            $('#cartBadge').hide();
        }
    }).fail(function () {
        $('#cartBadge').hide();
    });
}

/**
 * Show Bootstrap toast notification (Issue #1: escape message)
 */
function showToast(message, type = 'info') {
    const bgClass = {
        success: 'bg-success',
        danger: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-primary'
    }[type] || 'bg-primary';

    const icon = {
        success: 'bi-check-circle',
        danger: 'bi-x-circle',
        warning: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
    }[type] || 'bi-info-circle';

    const safeMessage = escapeHtml(message);

    const toastHtml = `
    <div class="toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert" style="min-width:280px">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi ${icon} me-2"></i>${safeMessage}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;

    const $toast = $(toastHtml);
    $('#toastContainer').append($toast);
    const bsToast = new bootstrap.Toast($toast[0], { delay: 3000 });
    bsToast.show();
    $toast.on('hidden.bs.toast', function () { $(this).remove(); });
}

/**
 * Require auth — redirect to login if not authenticated
 */
function requireLogin(callback) {
    $.get('/api/auth/check', function (data) {
        if (data.loggedIn) {
            callback(data.user);
        } else {
            showToast('Please log in to access this page.', 'warning');
            setTimeout(() => window.location.href = 'login.html', 1000);
        }
    });
}
