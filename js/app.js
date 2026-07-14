// Missara Clothing - Global App Logic

document.addEventListener("DOMContentLoaded", async () => {
  await initApp();
});

// App State
let cart = [];
let wishlist = [];

async function initApp() {
  // Load State from LocalStorage synchronously first before any async awaits
  loadCartState();
  loadWishlistState();

  // Load products catalog from server first
  if (typeof loadProductsCatalog === "function") {
    await loadProductsCatalog();
  }

  // Setup Global Event Listeners
  setupDrawerListeners();
  setupSearchListeners();
  setupStickyHeader();
  setupToastContainer();

  // Initial Sync of badges and cart elements
  updateCartBadges();
  updateWishlistBadges();
  renderCartDrawer();

  // Inject Navigation Links & Inbox widget
  injectNavigationLinks();
  initInboxSimulator();
  setupAuthState();
}



// ==========================================
// AUTHENTICATION STATE
// ==========================================
function setupAuthState() {
  const token = localStorage.getItem('missara_token');
  const userStr = localStorage.getItem('missara_user');
  
  // Find all user icon links in the headers across pages
  const userIcons = document.querySelectorAll('.fa-user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      const firstName = user.name ? user.name.split(' ')[0] : 'Account';
      
      userIcons.forEach(icon => {
        const parentLink = icon.closest('a');
        if (parentLink) {
          // If logged in, point to the customer dashboard
          parentLink.href = "dashboard.html";
          parentLink.innerHTML = `<span style="font-size:13px; font-weight:600; text-transform:uppercase;">Hi, ${firstName}</span>`;
          // Remove click listener so it follows the link to dashboard.html
          parentLink.onclick = null;
        }
      });
    } catch(e) {}
  } else {
    // Not logged in, point to login
    userIcons.forEach(icon => {
      const parentLink = icon.closest('a');
      if (parentLink) {
        parentLink.href = "login.html";
      }
    });
  }
}

// ==========================================
// STATE MANAGEMENT (LOCAL STORAGE)
// ==========================================
function loadCartState() {
  const storedCart = localStorage.getItem("missara_cart");
  if (storedCart) {
    try {
      cart = JSON.parse(storedCart);
    } catch (e) {
      cart = [];
    }
  }
}

function saveCartState() {
  localStorage.setItem("missara_cart", JSON.stringify(cart));
  updateCartBadges();
  renderCartDrawer();
}

function loadWishlistState() {
  const storedWishlist = localStorage.getItem("missara_wishlist");
  if (storedWishlist) {
    try {
      wishlist = JSON.parse(storedWishlist);
    } catch (e) {
      wishlist = [];
    }
  }
}

function saveWishlistState() {
  localStorage.setItem("missara_wishlist", JSON.stringify(wishlist));
  updateWishlistBadges();
}

// ==========================================
// CART OPERATIONS
// ==========================================
window.addToCart = function(productId, size, quantity = 1) {
  // Fetch product detail
  const product = getProductById(productId);
  if (!product) return;

  // Validate size
  if (!size) {
    showToast("Please select a size first", "error");
    return;
  }

  // Check if item with this size is already in cart
  const existingItemIndex = cart.findIndex(item => item.id === productId && item.size === size);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      size: size,
      quantity: quantity,
      category: product.category
    });
  }

  saveCartState();
  showToast(`Added ${product.title} (${size}) to Cart!`);
  openCartDrawer();
};

window.updateCartQty = function(productId, size, change) {
  const itemIndex = cart.findIndex(item => item.id === productId && item.size === size);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += change;

  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
    showToast("Item removed from Cart");
  }

  saveCartState();
};

window.removeFromCart = function(productId, size) {
  cart = cart.filter(item => !(item.id === productId && item.size === size));
  saveCartState();
  showToast("Item removed from Cart");
};

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartBadges() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll(".cart-count").forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? "flex" : "none";
  });
}

// ==========================================
// WISHLIST OPERATIONS
// ==========================================
window.toggleWishlist = function(productId) {
  const index = wishlist.indexOf(productId);
  const product = getProductById(productId);
  if (!product) return;

  if (index > -1) {
    wishlist.splice(index, 1);
    showToast("Removed from Wishlist");
    // Trigger event for dynamic items (e.g. in shop page)
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: { id: productId, active: false } }));
  } else {
    wishlist.push(productId);
    showToast("Added to Wishlist!");
    document.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: { id: productId, active: true } }));
  }

  saveWishlistState();
  // Sync page icons
  document.querySelectorAll(`.wishlist-btn-${productId}`).forEach(btn => {
    btn.classList.toggle("active", wishlist.includes(productId));
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = wishlist.includes(productId) ? "fas fa-heart" : "far fa-heart";
    }
  });
};

function updateWishlistBadges() {
  const totalItems = wishlist.length;
  document.querySelectorAll(".wishlist-count").forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? "flex" : "none";
  });
}

// ==========================================
// DRAWER LOGIC (CART & MOBILE NAV)
// ==========================================
function setupDrawerListeners() {
  const backdrop = document.getElementById("backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  const mobileMenu = document.getElementById("mobile-menu");

  // Open Cart
  document.querySelectorAll(".open-cart-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });

  // Open Mobile Nav
  document.querySelectorAll(".open-menu-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openMobileNav();
    });
  });

  // Close Drawer buttons
  document.querySelectorAll(".drawer-close, .close-drawer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      closeAllDrawers();
    });
  });

  // Click Backdrop to close
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeAllDrawers();
    });
  }
}

window.openCartDrawer = function() {
  const backdrop = document.getElementById("backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  
  if (cartDrawer && backdrop) {
    closeAllDrawers();
    backdrop.style.display = "block";
    // Force reflow
    backdrop.offsetHeight;
    cartDrawer.classList.add("open");
    renderCartDrawer();
  }
};

window.openMobileNav = function() {
  const backdrop = document.getElementById("backdrop");
  const mobileMenu = document.getElementById("mobile-menu");
  
  if (mobileMenu && backdrop) {
    closeAllDrawers();
    backdrop.style.display = "block";
    mobileMenu.classList.add("open");
  }
};

window.closeAllDrawers = function() {
  const backdrop = document.getElementById("backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  const mobileMenu = document.getElementById("mobile-menu");

  if (cartDrawer) cartDrawer.classList.remove("open");
  if (mobileMenu) mobileMenu.classList.remove("open");
  if (backdrop) backdrop.style.display = "none";
};

function renderCartDrawer() {
  const container = document.getElementById("cart-drawer-items");
  const subtotalVal = document.getElementById("cart-drawer-subtotal");
  const drawerFooter = document.getElementById("cart-drawer-footer");

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-msg">
        <i class="fas fa-shopping-bag"></i>
        <p>Your shopping bag is empty.</p>
        <a href="shop.html" class="btn btn-secondary close-drawer-btn" style="margin-top:20px; display:inline-block; width:auto; padding: 10px 25px;">Shop Now</a>
      </div>
    `;
    if (drawerFooter) drawerFooter.style.display = "none";
    return;
  }

  if (drawerFooter) drawerFooter.style.display = "block";

  let cartHTML = "";
  cart.forEach(item => {
    cartHTML += `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.title}">
        <div class="cart-item-info">
          <a href="product.html?id=${item.id}" class="cart-item-title">${item.title}</a>
          <div class="cart-item-meta">Size: ${item.size}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateCartQty(${item.id}, '${item.size}', -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty(${item.id}, '${item.size}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-price">
          <span>₹${(item.price * item.quantity).toLocaleString()}</span>
          <button class="cart-item-remove" onclick="removeFromCart(${item.id}, '${item.size}')">
            <i class="far fa-trash-alt"></i> Remove
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = cartHTML;
  if (subtotalVal) {
    subtotalVal.textContent = `₹${getCartSubtotal().toLocaleString()}`;
  }
}

// ==========================================
// SEARCH LOGIC
// ==========================================
function setupSearchListeners() {
  const searchBtn = document.getElementById("search-toggle-btn");
  const searchOverlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchForm = document.getElementById("search-form");

  if (searchBtn && searchOverlay) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isVisible = searchOverlay.style.display === "block";
      searchOverlay.style.display = isVisible ? "none" : "block";
      if (!isVisible && searchInput) {
        searchInput.focus();
      }
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchOverlay.style.display = "none";
      }
    });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length > 0) {
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
      }
    });
  }
}

// ==========================================
// STICKY HEADER SCROLL EFFECT
// ==========================================
function setupStickyHeader() {
  const header = document.querySelector(".main-header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function setupToastContainer() {
  if (!document.getElementById("toast-notification")) {
    const toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "toast";
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span id="toast-message"></span>`;
    document.body.appendChild(toast);
  }
}

window.showToast = function(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  const toastMsg = document.getElementById("toast-message");
  const toastIcon = toast.querySelector("i");

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;

  if (type === "error") {
    toast.classList.add("error");
    toastIcon.className = "fas fa-exclamation-circle";
  } else {
    toast.classList.remove("error");
    toastIcon.className = "fas fa-check-circle";
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
};

// ==========================================
// RENDER PRODUCT CARD HELPER
// ==========================================
window.createProductCardHTML = function(product) {
  const isWishlisted = wishlist.includes(product.id);
  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;
  
  // Build sizes HTML
  let sizesHTML = "";
  if (!isOutOfStock) {
    product.sizes.forEach(size => {
      sizesHTML += `<button class="size-overlay-btn" onclick="addToCart(${product.id}, '${size}')">${size}</button>`;
    });
  }

  return `
    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
      ${product.tag ? `<span class="product-badge">${product.tag}</span>` : ""}
      ${isOutOfStock ? `<span class="out-of-stock-badge">Out of Stock</span>` : ""}
      <button class="product-wishlist-btn wishlist-btn-${product.id} ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${product.id})">
        <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <a href="product.html?id=${product.id}">
        <div class="product-img-wrapper">
          <img class="product-main-img" src="${product.image}" alt="${product.title}">
          <img class="product-hover-img" src="${product.hoverImage || product.image}" alt="${product.title}">
          ${!isOutOfStock ? `
          <div class="product-size-overlay" onclick="event.preventDefault();">
            <span class="size-overlay-title">Quick Add Size</span>
            <div class="size-overlay-options">
              ${sizesHTML}
            </div>
          </div>
          ` : ""}
        </div>
      </a>
      <div class="product-card-info">
        <div class="product-card-category">${product.category}</div>
        <a href="product.html?id=${product.id}" class="product-card-title">${product.title}</a>
        <div class="product-card-rating">
          <i class="fas fa-star"></i>
          <span>${product.rating}</span>
          <span class="rating-count">(${product.reviewsCount})</span>
        </div>
        <div class="product-card-price">
          <span class="price-current">₹${product.price.toLocaleString()}</span>
          <span class="price-original">₹${product.originalPrice.toLocaleString()}</span>
          <span class="price-discount">${discountPercent}% OFF</span>
        </div>
      </div>
    </div>
  `;
};

// ==========================================
// DYNAMIC NAVIGATION LINKS INJECTION
// ==========================================
function injectNavigationLinks() {
  const isTrackPage = window.location.pathname.endsWith("track.html");
  
  // Desktop Header Nav
  const navList = document.querySelector(".nav-list");
  if (navList && !navList.querySelector('a[href="track.html"]')) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="track.html" class="nav-link ${isTrackPage ? 'active' : ''}">Track Order</a>`;
    navList.appendChild(li);
  }
  
  // Mobile Drawer Menu Nav
  const mobileNavList = document.querySelector(".mobile-nav-list");
  if (mobileNavList && !mobileNavList.querySelector('a[href="track.html"]')) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="track.html" class="mobile-nav-link ${isTrackPage ? 'active' : ''}">Track Order</a>`;
    // Insert before about.html or contact.html
    const contactLinkLi = Array.from(mobileNavList.children).find(child => child.querySelector('a[href="contact.html"]'));
    if (contactLinkLi) {
      mobileNavList.insertBefore(li, contactLinkLi);
    } else {
      mobileNavList.appendChild(li);
    }
  }
  
  // Footer Links (Help & Support column)
  const footerLinks = document.querySelector(".footer-links");
  if (footerLinks && !footerLinks.querySelector('a[href="track.html"]')) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="track.html">Track Order</a>`;
    footerLinks.appendChild(li);
  }
}

// ==========================================
// CUSTOMER TRANSACTIONAL EMAIL INBOX SIMULATOR
// ==========================================
window.triggerSimulatedEmail = async function(to, subject, bodyHtml) {
  try {
    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body: bodyHtml })
    });
    if (!res.ok) throw new Error('Failed to log email to server');
  } catch(e) { 
    console.error(e); 
  }
  
  // Refresh widgets dynamically
  if (typeof updateInboxBadge === "function") {
    updateInboxBadge();
  }
  if (typeof renderInboxMessages === "function") {
    renderInboxMessages();
  }
};

function initInboxSimulator() {
  // Hide on Admin Panel to keep layout clean
  if (window.location.pathname.endsWith("admin.html")) return;

  // Create floating widget HTML elements if not already present
  if (document.getElementById("missara-inbox-widget")) return;

  const widget = document.createElement("div");
  widget.id = "missara-inbox-widget";
  widget.className = "missara-inbox-widget";
  widget.innerHTML = `
    <!-- Floating Button -->
    <button id="missara-inbox-btn" class="missara-inbox-btn" aria-label="Customer Email Inbox Simulator" title="Customer Email Inbox Simulator">
      <i class="far fa-envelope-open" style="font-size: 1.3rem;"></i>
      <span class="inbox-badge-count" id="missara-inbox-count" style="display: none;">0</span>
    </button>
    
    <!-- Inbox Panel Modal -->
    <div id="missara-inbox-panel" class="missara-inbox-panel">
      <div class="inbox-header">
        <div>
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; margin: 0; color: var(--primary-pink); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-envelope-open-text"></i> Customer Mailbox
          </h4>
          <span style="font-size: 0.72rem; color: var(--text-muted);">Simulated transactional email alerts sent to you</span>
        </div>
        <button id="missara-inbox-close" class="inbox-close-btn">&times;</button>
      </div>
      <div id="missara-inbox-list" class="inbox-list">
        <!-- Rendered dynamically -->
      </div>
      <div id="missara-email-viewer" class="email-viewer" style="display: none;">
        <button id="email-viewer-back" class="email-back-btn"><i class="fas fa-arrow-left"></i> Back to Mailbox</button>
        <div id="email-viewer-meta" class="email-viewer-meta"></div>
        <div id="email-viewer-content" class="email-viewer-content"></div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  // Setup Inbox click handlers
  const btn = document.getElementById("missara-inbox-btn");
  const panel = document.getElementById("missara-inbox-panel");
  const closeBtn = document.getElementById("missara-inbox-close");
  const viewerBackBtn = document.getElementById("email-viewer-back");

  if (btn && panel) {
    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        // Mark all as read when opening
        markAllEmailsAsRead();
      }
      renderInboxMessages();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      panel.classList.remove("open");
    });
  }

  if (viewerBackBtn) {
    viewerBackBtn.addEventListener("click", () => {
      document.getElementById("missara-inbox-list").style.display = "block";
      document.getElementById("missara-email-viewer").style.display = "none";
    });
  }

  // Initial updates
  updateInboxBadge();
}

window.updateInboxBadge = async function() {
  const countEl = document.getElementById("missara-inbox-count");
  if (!countEl) return;

  try {
    const res = await fetch('/api/emails/customer/all');
    if (!res.ok) return;
    const emails = await res.json();
    const unread = emails.filter(e => !e.read).length;
    
    countEl.textContent = unread;
    countEl.style.display = unread > 0 ? "flex" : "none";

    // Quick subtle animation if count changes
    if (unread > 0) {
      const btn = document.getElementById("missara-inbox-btn");
      if (btn) {
        btn.classList.add("pulse-alert");
        setTimeout(() => btn.classList.remove("pulse-alert"), 1000);
      }
    }
  } catch (e) {
    console.error("Error updating inbox badge from server:", e);
  }
};

window.renderInboxMessages = async function() {
  const listEl = document.getElementById("missara-inbox-list");
  if (!listEl) return;

  try {
    const res = await fetch('/api/emails/customer/all');
    if (!res.ok) return;
    const emails = await res.json();

    if (emails.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 0.85rem;">
          <i class="far fa-envelope" style="font-size: 2.2rem; display: block; margin-bottom: 12px; opacity: 0.5; color: var(--primary-pink);"></i>
          Your mailbox is empty. Transactional emails triggered by your orders and tracking status updates will appear here!
        </div>
      `;
      return;
    }

    let html = "";
    emails.forEach((email, index) => {
      html += `
        <div class="inbox-item ${email.read ? 'read' : 'unread'}" onclick="viewInboxEmail(${email.id})">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <span style="font-weight: 600; font-size: 0.8rem; color: var(--primary-pink);">To: ${email.to}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${email.date.split(',')[1] || email.date}</span>
          </div>
          <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-dark); margin-bottom: 4px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${email.subject}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            Click to read full notification receipt...
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  } catch (e) {
    console.error("Error rendering inbox messages:", e);
  }
};

window.viewInboxEmail = async function(emailId) {
  try {
    const res = await fetch(`/api/emails/${emailId}/read`, { method: 'PUT' });
    if (!res.ok) return;
    const email = await res.json();
    
    updateInboxBadge();

    const listEl = document.getElementById("missara-inbox-list");
    const viewerEl = document.getElementById("missara-email-viewer");
    const viewerMeta = document.getElementById("email-viewer-meta");
    const viewerContent = document.getElementById("email-viewer-content");

    if (listEl && viewerEl && viewerMeta && viewerContent) {
      listEl.style.display = "none";
      viewerEl.style.display = "block";
      
      viewerMeta.innerHTML = `
        <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 10px; margin-bottom: 15px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;"><b>From:</b> Missara Clothing &lt;alerts@missara.com&gt;</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;"><b>To:</b> ${email.to}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;"><b>Date:</b> ${email.date}</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-dark);">${email.subject}</div>
        </div>
      `;
      viewerContent.innerHTML = email.body;
    }
  } catch (e) {
    console.error("Error viewing inbox email:", e);
  }
};

async function markAllEmailsAsRead() {
  try {
    const res = await fetch('/api/emails/customer/all');
    if (!res.ok) return;
    const emails = await res.json();
    const unread = emails.filter(e => !e.read);
    
    await Promise.all(unread.map(e => 
      fetch(`/api/emails/${e.id}/read`, { method: 'PUT' })
    ));
    
    updateInboxBadge();
  } catch (e) {
    console.error("Error marking all emails as read:", e);
  }
}

// Payment gateway settings are now fetched asynchronously from the backend


