// Missara Clothing - Global App Logic

document.addEventListener("DOMContentLoaded", async () => {
  await initApp();
});

// Global event listener to fallback broken images to Missara Logo
document.addEventListener('error', function (e) {
  if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
    if (!e.target.src.endsWith('images/logo.png')) {
      e.target.src = 'images/logo.png';
    }
  }
}, true); // Use capture phase as error event does not bubble

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
  injectWishlistDrawer();
  renderCartDrawer();

  // Inject Navigation Links & Inbox widget
  injectNavigationLinks();
  // initInboxSimulator();
  setupAuthState();
  injectMobileBottomNav();
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
      sku: product.sku || "",
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

  // Open Wishlist Drawer
  document.querySelectorAll("a[href*='wishlist=true'], a[aria-label='Wishlist']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openWishlistDrawer();
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

window.openWishlistDrawer = function() {
  const backdrop = document.getElementById("backdrop");
  const wishlistDrawer = document.getElementById("wishlist-drawer");
  
  if (wishlistDrawer && backdrop) {
    closeAllDrawers();
    backdrop.style.display = "block";
    // Force reflow
    backdrop.offsetHeight;
    wishlistDrawer.classList.add("open");
    renderWishlistDrawer();
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
  const wishlistDrawer = document.getElementById("wishlist-drawer");

  if (cartDrawer) cartDrawer.classList.remove("open");
  if (mobileMenu) mobileMenu.classList.remove("open");
  if (wishlistDrawer) wishlistDrawer.classList.remove("open");
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

  if (!searchOverlay) return;

  // Create suggestions dropdown container if it doesn't exist
  const container = searchOverlay.querySelector(".container");
  let suggestionsBox = document.getElementById("search-suggestions");
  if (container && !suggestionsBox) {
    suggestionsBox = document.createElement("div");
    suggestionsBox.id = "search-suggestions";
    suggestionsBox.className = "search-suggestions-dropdown";
    container.appendChild(suggestionsBox);
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isVisible = searchOverlay.style.display === "block";
      searchOverlay.style.display = isVisible ? "none" : "block";
      if (!isVisible && searchInput) {
        searchInput.focus();
      }
      if (suggestionsBox) suggestionsBox.style.display = "none";
      if (searchInput) searchInput.value = "";
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchOverlay.style.display = "none";
        if (suggestionsBox) suggestionsBox.style.display = "none";
      }
    });
  }

  if (searchInput && suggestionsBox) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      if (query.length < 2) {
        suggestionsBox.style.display = "none";
        return;
      }

      // Filter products (check title, category, style, tags)
      const matches = (typeof PRODUCTS !== "undefined" ? PRODUCTS : []).filter(p => {
        return (p.title && p.title.toLowerCase().includes(query)) ||
               (p.category && p.category.toLowerCase().includes(query)) ||
               (p.style && p.style.toLowerCase().includes(query)) ||
               (p.tag && p.tag.toLowerCase().includes(query));
      }).slice(0, 5); // limit to top 5 matches

      if (matches.length === 0) {
        suggestionsBox.innerHTML = `<div class="search-suggestions-no-results">No products found matching "${searchInput.value}"</div>`;
        suggestionsBox.style.display = "block";
        return;
      }

      let html = "";
      matches.forEach(p => {
        const hasDiscount = p.originalPrice && p.originalPrice > p.price;
        const priceHTML = hasDiscount 
          ? `<span class="original">₹${p.originalPrice.toLocaleString()}</span>₹${p.price.toLocaleString()}`
          : `₹${p.price.toLocaleString()}`;
          
        html += `
          <a href="product.html?id=${p.id}" class="search-suggestion-item">
            <img src="${p.image || 'images/logo.png'}" class="search-suggestion-img" alt="${p.title}">
            <div class="search-suggestion-info">
              <span class="search-suggestion-title">${p.title}</span>
              <span class="search-suggestion-cat">${p.category}</span>
            </div>
            <div class="search-suggestion-price">
              ${priceHTML}
            </div>
          </a>
        `;
      });

      suggestionsBox.innerHTML = html;
      suggestionsBox.style.display = "block";
    });

    // Close dropdown on clicking outside
    document.addEventListener("click", (e) => {
      if (!searchOverlay.contains(e.target) && e.target !== searchBtn && !searchBtn.contains(e.target)) {
        suggestionsBox.style.display = "none";
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
      <div class="product-img-container">
        ${product.tag ? `<span class="product-badge">${product.tag}</span>` : ""}
        ${isOutOfStock ? `<span class="out-of-stock-badge">Out of Stock</span>` : ""}
        <button class="product-wishlist-btn wishlist-btn-${product.id} ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${product.id})">
          <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <a href="product.html?id=${product.id}">
          <div class="product-img-wrapper">
            <img class="product-main-img" src="${product.image}" alt="${product.title}">
            <img class="product-hover-img" src="${product.hoverImage || product.image}" alt="${product.title}">
            
            <div class="product-image-rating">
              <i class="fas fa-star"></i>
              <span>${product.rating}</span>
              <span class="rating-count">(${product.reviewsCount})</span>
            </div>

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
      </div>
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
        <div class="product-card-sizes">${product.sizes.join(" ")}</div>
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

  const token = localStorage.getItem("missara_token");
  if (!token) {
    countEl.style.display = "none";
    return;
  }

  try {
    const res = await fetch('/api/emails/customer/all', {
      headers: { 'Authorization': token }
    });
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

  const token = localStorage.getItem("missara_token");
  if (!token) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 0.85rem;">
        Please log in to view your mailbox simulation.
      </div>
    `;
    return;
  }

  try {
    const res = await fetch('/api/emails/customer/all', {
      headers: { 'Authorization': token }
    });
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
    const token = localStorage.getItem("missara_token");
    const headers = {};
    if (token) {
      headers['Authorization'] = token;
    }
    const res = await fetch(`/api/emails/${emailId}/read`, { 
      method: 'PUT',
      headers: headers
    });
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
    const token = localStorage.getItem("missara_token");
    if (!token) return;

    const res = await fetch('/api/emails/customer/all', {
      headers: { 'Authorization': token }
    });
    if (!res.ok) return;
    const emails = await res.json();
    const unread = emails.filter(e => !e.read);
    
    await Promise.all(unread.map(e => 
      fetch(`/api/emails/${e.id}/read`, { 
        method: 'PUT',
        headers: { 'Authorization': token }
      })
    ));
    
    updateInboxBadge();
  } catch (e) {
    console.error("Error marking all emails as read:", e);
  }
}

// Payment gateway settings are now fetched asynchronously from the backend


// ==========================================
// WISHLIST DRAWER RENDERING & ACTIONS
// ==========================================
function injectWishlistDrawer() {
  if (document.getElementById("wishlist-drawer")) return;
  const drawer = document.createElement("div");
  drawer.id = "wishlist-drawer";
  drawer.className = "drawer";
  drawer.innerHTML = `
    <div class="drawer-header">
      <h3 class="drawer-title">My Wishlist</h3>
      <button class="drawer-close" aria-label="Close Wishlist" onclick="closeAllDrawers()"><i class="fas fa-times"></i></button>
    </div>
    <div class="wishlist-drawer-content" id="wishlist-drawer-items">
      <!-- Rendered dynamically -->
    </div>
  `;
  document.body.appendChild(drawer);
}

window.renderWishlistDrawer = function() {
  const container = document.getElementById("wishlist-drawer-items");
  if (!container) return;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="empty-wishlist-msg">
        <i class="far fa-heart"></i>
        <p>Your wishlist is empty.</p>
        <a href="shop.html" class="btn btn-secondary close-drawer-btn" onclick="closeAllDrawers(); event.preventDefault(); window.location.href='shop.html';" style="margin-top:20px; display:inline-block; width:auto; padding: 10px 25px;">Browse Shop</a>
      </div>
    `;
    return;
  }

  let html = "";
  wishlist.forEach(id => {
    const p = typeof getProductById === "function" ? getProductById(id) : null;
    if (!p) return;

    html += `
      <div class="wishlist-item" id="wishlist-item-${p.id}">
        <img src="${p.image || 'images/logo.png'}" class="wishlist-item-img" alt="${p.title}">
        <div class="wishlist-item-info">
          <span class="wishlist-item-title">${p.title}</span>
          <span class="wishlist-item-price">₹${p.price.toLocaleString()}</span>
          <div class="wishlist-item-actions">
            <button class="btn btn-primary" onclick="moveToCartFromWishlist(${p.id})">Move to Bag</button>
            <button class="wishlist-item-remove-btn" onclick="removeFromWishlistDrawer(${p.id})" title="Remove item"><i class="far fa-trash-alt"></i></button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

window.removeFromWishlistDrawer = function(productId) {
  toggleWishlist(productId);
  renderWishlistDrawer();
  showToast("Item removed from wishlist.");
};

window.moveToCartFromWishlist = function(productId) {
  const p = typeof getProductById === "function" ? getProductById(productId) : null;
  if (!p) return;

  // Add to cart
  const size = p.sizes && p.sizes.length > 0 ? p.sizes[0] : "FS";
  addToCart(productId, size);
  
  // Remove from wishlist
  toggleWishlist(productId);
  
  // Update UI
  renderWishlistDrawer();
  openCartDrawer();
  showToast("Item moved to Shopping Bag!");
};

// ==========================================
// MOBILE BOTTOM STICKY NAVIGATION INJECTION
// ==========================================
function injectMobileBottomNav() {
  if (document.getElementById("mobile-bottom-nav")) return;
  
  const bottomNav = document.createElement("div");
  bottomNav.id = "mobile-bottom-nav";
  bottomNav.className = "mobile-bottom-nav";
  
  const path = window.location.pathname;
  const search = window.location.search;
  const isHome = path.endsWith("index.html") || path === "/" || path.endsWith("/");
  const isNew = search.includes("tag=New%20Arrival") || search.includes("tag=New Arrival");
  const isWishlist = search.includes("wishlist=true");
  
  // Resolve user account link dynamically based on login state
  const token = localStorage.getItem('missara_token');
  const userStr = localStorage.getItem('missara_user');
  let accountHref = "login.html";
  let accountLabel = "Account";
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      accountHref = "dashboard.html";
      accountLabel = user.name ? user.name.split(' ')[0] : 'Account';
    } catch(e) {}
  }
  
  const isAccount = path.endsWith("admin.html") || path.endsWith(accountHref) || (accountHref === "dashboard.html" && path.endsWith("dashboard.html")) || (accountHref === "login.html" && path.endsWith("login.html"));
  const isSale = path.endsWith("shop.html") && !isNew && !isWishlist;
  
  bottomNav.innerHTML = `
    <a href="index.html" class="bottom-nav-item ${isHome ? "active" : ""}">
      <i class="fas fa-home"></i>
      <span class="bottom-nav-label">Home</span>
    </a>
    <a href="shop.html?tag=New%20Arrival" class="bottom-nav-item ${isNew ? "active" : ""}">
      <i class="far fa-star"></i>
      <span class="bottom-nav-label">New</span>
    </a>
    <a href="shop.html" class="bottom-nav-item ${isSale ? "active" : ""}">
      <i class="fas fa-tags"></i>
      <span class="bottom-nav-label">Sale</span>
    </a>
    <button onclick="openWishlistDrawer()" class="bottom-nav-item">
      <div style="position: relative; display: inline-block;">
        <i class="far fa-heart"></i>
        <span class="icon-badge wishlist-count" style="display: none; top: -8px; right: -8px;">0</span>
      </div>
      <span class="bottom-nav-label">Wishlist</span>
    </button>
    <a href="${accountHref}" class="bottom-nav-item ${isAccount ? "active" : ""}">
      <i class="far fa-user"></i>
      <span class="bottom-nav-label">${accountLabel}</span>
    </a>
  `;
  
  document.body.appendChild(bottomNav);
  
  if (typeof updateWishlistBadges === "function") {
    updateWishlistBadges();
  }
}


