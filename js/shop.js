// Missara Clothing - Shop Page Controller with 10 Accordion Filters

document.addEventListener("DOMContentLoaded", async () => {
  // Wait if products catalog is not loaded yet
  if (typeof PRODUCTS === "undefined" || PRODUCTS.length === 0) {
    if (typeof loadProductsCatalog === "function") {
      await loadProductsCatalog();
    }
  }
  initShop();
});

// Shop State
let filters = {
  categories: [],
  priceRange: "all", // "all", "0-1500", "1500-3000", "3000-5000", "5000-100000"
  sizes: [],
  colors: [],
  fabrics: [],
  occasions: [],
  patterns: [],
  styles: [],
  sleeves: [],
  necks: [],
  searchQuery: "",
  wishlistOnly: false,
  tag: null
};

let currentSort = "default"; // "default", "price-low-high", "price-high-low", "rating"

// Pagination State
const PRODUCTS_PER_PAGE = 16;
let currentPage = 1;
let filteredProductsGlobal = [];

// Filter Schema Configuration
const FILTER_CONFIG = [
  {
    id: "size",
    title: "Size",
    type: "buttons",
    field: "sizes",
    options: ["S", "M", "L", "XL", "XXL", "FS"]
  },
  {
    id: "colors",
    title: "Colors",
    type: "colors",
    field: "colors",
    options: [
      { name: "Pastel Pink", hex: "#F8C5CD" },
      { name: "Off-White", hex: "#FAF9F6" },
      { name: "Floral Pink", hex: "#FF9EAE" },
      { name: "Blush Pink", hex: "#FEB4C2" },
      { name: "Rose Pink", hex: "#D85A7E" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Champagne Gold", hex: "#E8D595" },
      { name: "Magenta Pink", hex: "#D14175" },
      { name: "Deep Rose Velvet", hex: "#8D1C40" },
      { name: "Hot Pink", hex: "#FF69B4" },
      { name: "Gold", hex: "#D4AF37" }
    ]
  },
  {
    id: "category",
    title: "Category",
    type: "checkboxes",
    field: "categories",
    options: [
      { label: "Suits & Kurtas", value: "Kurtas & Suits" },
      { label: "Designer Sarees", value: "Sarees" },
      { label: "Lehengas", value: "Lehengas" },
      { label: "Anarkalis", value: "Anarkalis" },
      { label: "Co-Ord Sets", value: "Co-Ord Sets" },
      { label: "Fusion Wear", value: "Fusion Wear" },
      { label: "New Arrivals", value: "New Arrivals" },
      { label: "Plus Sizes (XXL)", value: "Plus Sizes" },
      { label: "Tunics & Tops", value: "Tunics & Tops" }
    ]
  },
  {
    id: "fabric",
    title: "Fabric",
    type: "checkboxes",
    field: "fabrics",
    options: ["Cotton", "Silk", "Georgette", "Velvet", "Organza"]
  },
  {
    id: "occasion",
    title: "Occasion",
    type: "checkboxes",
    field: "occasions",
    options: ["Festive", "Wedding", "Casual", "Office Wear"]
  },
  {
    id: "pattern",
    title: "Pattern and Print",
    type: "checkboxes",
    field: "patterns",
    options: ["Embroidered", "Floral Printed", "Zari Woven", "Solid", "Sequin Pattern"]
  },
  {
    id: "price",
    title: "Price",
    type: "radios",
    field: "priceRange",
    options: [
      { label: "All Prices", value: "all" },
      { label: "Under ₹1,500", value: "0-1500" },
      { label: "₹1,500 - ₹3,000", value: "1500-3000" },
      { label: "₹3,000 - ₹5,000", value: "3000-5000" },
      { label: "Above ₹5,000", value: "5000-100000" }
    ]
  },
  {
    id: "style",
    title: "Style",
    type: "checkboxes",
    field: "styles",
    options: ["Anarkali", "Straight Fit", "A-Line", "Lehenga Choli", "Draped Saree", "Tunic"]
  },
  {
    id: "sleeve",
    title: "Sleeve Length",
    type: "checkboxes",
    field: "sleeves",
    options: ["Full Sleeves", "3/4 Sleeves", "Half Sleeves", "Sleeveless", "N/A"]
  },
  {
    id: "neck",
    title: "Neck",
    type: "checkboxes",
    field: "necks",
    options: ["V-Neck", "Round Neck", "Sweetheart Neck", "Mandarin Collar", "N/A"]
  }
];

function initShop() {
  parseUrlParams();
  renderFilterWidgets();
  setupSorting();
  setupMobileDrawerFilters();
  
  // Sync parsed url params visual states on load
  syncFilterControlsVisualState();
  
  applyFiltersAndRender();

  // Listen to wishlist updates to re-render if we are in wishlist view
  document.addEventListener("wishlistUpdated", (e) => {
    if (filters.wishlistOnly) {
      applyFiltersAndRender();
    }
  });
}

// ==========================================
// PARSE INCOMING URL QUERY PARAMETERS
// ==========================================
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  // Category filter via URL (e.g., ?category=Sarees)
  const categoryParam = params.get("category");
  if (categoryParam) {
    const formattedCategory = categoryParam;
    // Map URL queries to correct category strings if needed
    filters.categories.push(formattedCategory);
    updateTitleAndBreadcrumb(formattedCategory);
  }

  // Search filter via URL (e.g., ?search=Anarkali)
  const searchParam = params.get("search");
  if (searchParam) {
    filters.searchQuery = searchParam.toLowerCase();
    updateTitleAndBreadcrumb(`Search: "${searchParam}"`);
    
    const headerSearchInput = document.getElementById("search-input");
    if (headerSearchInput) headerSearchInput.value = searchParam;
  }

  // Wishlist tab via URL (e.g. ?wishlist=true)
  const wishlistParam = params.get("wishlist");
  if (wishlistParam === "true") {
    filters.wishlistOnly = true;
    updateTitleAndBreadcrumb("My Wishlist");
  }

  // Tag filter via URL (e.g. ?tag=New%20Arrival)
  const tagParam = params.get("tag");
  if (tagParam) {
    filters.tag = tagParam;
    updateTitleAndBreadcrumb(tagParam);
  }

  // Style filter via URL (e.g. ?style=Anarkali)
  const styleParam = params.get("style");
  if (styleParam) {
    filters.styles.push(styleParam);
    updateTitleAndBreadcrumb(styleParam);
  }

  // Size filter via URL (e.g. ?size=XXL)
  const sizeParam = params.get("size");
  if (sizeParam) {
    filters.sizes.push(sizeParam);
    updateTitleAndBreadcrumb(`Size: ${sizeParam}`);
  }
}

function updateTitleAndBreadcrumb(text) {
  const pageTitle = document.getElementById("shop-page-title");
  const breadcrumbActive = document.getElementById("breadcrumb-active");
  
  if (pageTitle) pageTitle.textContent = text;
  if (breadcrumbActive) breadcrumbActive.textContent = text;
}

// ==========================================
// DYNAMIC FILTER ACCORDION RENDER & BINDING
// ==========================================
function renderFilterWidgets() {
  const desktopContainer = document.getElementById("desktop-filters-container");
  const mobileContainer = document.getElementById("mobile-filter-widgets-container");
  
  if (!desktopContainer || !mobileContainer) return;
  
  const generateHTML = (prefix) => {
    let html = "";
    FILTER_CONFIG.forEach((config, idx) => {
      // Size, Colors, and Category are expanded by default (active), others collapsed
      const isExpanded = idx < 3 ? "active" : "";
      
      html += `
        <div class="filter-accordion-item ${isExpanded}" data-filter-id="${config.id}">
          <div class="filter-accordion-header">
            <span>${config.title}</span>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="filter-accordion-content">
            ${renderFilterOptions(config, prefix)}
          </div>
        </div>
      `;
    });
    return html;
  };
  
  desktopContainer.innerHTML = generateHTML("d");
  mobileContainer.innerHTML = generateHTML("m");
  
  bindEvents();
}

function renderFilterOptions(config, prefix) {
  let html = "";
  if (config.type === "buttons") {
    html += `<div class="sizes-filter-grid">`;
    config.options.forEach(size => {
      html += `<button class="size-filter-btn" data-field="${config.field}" data-value="${size}" id="${prefix}-size-${size}">${size}</button>`;
    });
    html += `</div>`;
  } else if (config.type === "colors") {
    html += `<ul class="filter-list">`;
    config.options.forEach(color => {
      const elementId = `${prefix}-color-${color.name.replace(/\s+/g, '-').replace(/&/g, 'and')}`;
      html += `
        <li>
          <label class="filter-checkbox-label" style="display: flex; align-items: center;" for="${elementId}">
            <input type="checkbox" class="filter-checkbox" data-field="${config.field}" value="${color.name}" id="${elementId}">
            <span style="display:inline-block; width:14px; height:14px; border-radius:50%; background-color:${color.hex}; border:1px solid #ddd; margin-right:8px;"></span>
            ${color.name}
          </label>
        </li>
      `;
    });
    html += `</ul>`;
  } else if (config.type === "checkboxes") {
    html += `<ul class="filter-list">`;
    config.options.forEach(opt => {
      const label = typeof opt === "string" ? opt : opt.label;
      const val = typeof opt === "string" ? opt : opt.value;
      const elementId = `${prefix}-${config.id}-${val.replace(/\s+/g, '-').replace(/&/g, 'and')}`;
      html += `
        <li>
          <label class="filter-checkbox-label" for="${elementId}">
            <input type="checkbox" class="filter-checkbox" data-field="${config.field}" value="${val}" id="${elementId}">
            ${label}
          </label>
        </li>
      `;
    });
    html += `</ul>`;
  } else if (config.type === "radios") {
    html += `<ul class="filter-list">`;
    config.options.forEach(opt => {
      const elementId = `${prefix}-${config.id}-${opt.value}`;
      html += `
        <li>
          <label class="filter-checkbox-label" for="${elementId}">
            <input type="radio" name="${prefix}-price-radio" class="filter-radio" data-field="${config.field}" value="${opt.value}" id="${elementId}" ${opt.value === 'all' ? 'checked' : ''}>
            ${opt.label}
          </label>
        </li>
      `;
    });
    html += `</ul>`;
  }
  return html;
}

function bindEvents() {
  // 1. Checkboxes Event
  document.querySelectorAll(".filter-checkbox").forEach(box => {
    box.addEventListener("change", () => {
      const field = box.getAttribute("data-field");
      const val = box.value;
      
      if (box.checked) {
        if (!filters[field].includes(val)) filters[field].push(val);
      } else {
        filters[field] = filters[field].filter(v => v !== val);
      }
      
      const isMobile = box.id.startsWith("m-");
      syncFilterControlsVisualState();
      
      if (!isMobile) {
        applyFiltersAndRender();
      }
    });
  });
  
  // 2. Radios Event
  document.querySelectorAll(".filter-radio").forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        const field = radio.getAttribute("data-field");
        filters[field] = radio.value;
        
        const isMobile = radio.id.startsWith("m-");
        syncFilterControlsVisualState();
        
        if (!isMobile) {
          applyFiltersAndRender();
        }
      }
    });
  });
  
  // 3. Sizes & Colors Buttons Event
  document.querySelectorAll(".size-filter-btn, .color-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const field = btn.getAttribute("data-field");
      const val = btn.getAttribute("data-value");
      const isMobile = btn.id.startsWith("m-");
      
      if (filters[field].includes(val)) {
        filters[field] = filters[field].filter(v => v !== val);
      } else {
        filters[field].push(val);
      }
      
      syncFilterControlsVisualState();
      
      if (!isMobile) {
        applyFiltersAndRender();
      }
    });
  });
  
  // 4. Accordion Toggle Event
  document.querySelectorAll(".filter-accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      item.classList.toggle("active");
    });
  });
}

function syncFilterControlsVisualState() {
  // Sync checkboxes
  document.querySelectorAll(".filter-checkbox").forEach(box => {
    const field = box.getAttribute("data-field");
    const val = box.value;
    box.checked = filters[field].includes(val);
  });
  
  // Sync radios
  document.querySelectorAll(".filter-radio").forEach(radio => {
    const field = radio.getAttribute("data-field");
    const val = radio.value;
    radio.checked = filters[field] === val;
  });
  
  // Sync size & color buttons
  document.querySelectorAll(".size-filter-btn, .color-filter-btn").forEach(btn => {
    const field = btn.getAttribute("data-field");
    const val = btn.getAttribute("data-value");
    btn.classList.toggle("active", filters[field].includes(val));
  });
}

// ==========================================
// SORTING LOGIC
// ==========================================
function setupSorting() {
  const sortSelect = document.getElementById("sort-select");
  const mobileSortSelect = document.getElementById("mobile-sort-select");

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      if (mobileSortSelect) mobileSortSelect.value = currentSort;
      applyFiltersAndRender();
    });
  }

  if (mobileSortSelect) {
    mobileSortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      if (sortSelect) sortSelect.value = currentSort;
      applyFiltersAndRender();
    });
  }
}

// ==========================================
// MOBILE DRAWER FILTERS LOGIC
// ==========================================
function setupMobileDrawerFilters() {
  const triggerBtn = document.getElementById("mobile-filter-trigger");
  const closeBtn = document.getElementById("mobile-filter-close");
  const drawer = document.getElementById("mobile-filter-drawer");
  const backdrop = document.getElementById("backdrop");
  const applyBtn = document.getElementById("mobile-apply-filters-btn");

  if (!triggerBtn || !drawer || !backdrop) return;

  triggerBtn.addEventListener("click", () => {
    if (typeof closeAllDrawers === "function") closeAllDrawers();
    backdrop.style.display = "block";
    drawer.classList.add("open");
    syncFilterControlsVisualState();
  });

  closeBtn.addEventListener("click", () => {
    drawer.classList.remove("open");
    backdrop.style.display = "none";
  });

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      drawer.classList.remove("open");
      backdrop.style.display = "none";
      applyFiltersAndRender();
    });
  }
}

// ==========================================
// APPLY FILTERS & DYNAMIC RENDER
// ==========================================
function applyFiltersAndRender() {
  const grid = document.getElementById("shop-product-grid");
  const noResultsBox = document.getElementById("no-results-box");
  const resultsCountText = document.getElementById("results-count-text");

  if (!grid) return;

  // Start with all products
  let filtered = [...PRODUCTS];

  // 1. Filter by Wishlist Only
  if (filters.wishlistOnly) {
    filtered = filtered.filter(p => wishlist.includes(p.id));
  }

  // 2. Filter by Search Query
  if (filters.searchQuery) {
    const q = filters.searchQuery;
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  // 3. Filter by Selected Categories
  if (filters.categories.length > 0) {
    filtered = filtered.filter(p => filters.categories.includes(p.category));
  }

  // 4. Filter by Price Range
  if (filters.priceRange !== "all") {
    const [min, max] = filters.priceRange.split("-").map(Number);
    filtered = filtered.filter(p => p.price >= min && p.price <= max);
  }

  // 5. Filter by Sizes
  if (filters.sizes.length > 0) {
    filtered = filtered.filter(p => 
      p.sizes && p.sizes.some(size => filters.sizes.includes(size))
    );
  }

  // 6. Filter by Colors
  if (filters.colors.length > 0) {
    filtered = filtered.filter(p => 
      p.colors && p.colors.some(color => filters.colors.includes(color))
    );
  }

  // 7. Filter by Fabric
  if (filters.fabrics.length > 0) {
    filtered = filtered.filter(p => 
      p.fabric && filters.fabrics.includes(p.fabric)
    );
  }

  // 8. Filter by Occasion
  if (filters.occasions.length > 0) {
    filtered = filtered.filter(p => 
      p.occasion && filters.occasions.includes(p.occasion)
    );
  }

  // 9. Filter by Pattern
  if (filters.patterns.length > 0) {
    filtered = filtered.filter(p => 
      p.pattern && filters.patterns.includes(p.pattern)
    );
  }

  // 10. Filter by Style
  if (filters.styles.length > 0) {
    filtered = filtered.filter(p => 
      p.style && filters.styles.includes(p.style)
    );
  }

  // 11. Filter by Sleeve Length
  if (filters.sleeves.length > 0) {
    filtered = filtered.filter(p => 
      p.sleeveLength && filters.sleeves.includes(p.sleeveLength)
    );
  }

  // 12. Filter by Neck
  if (filters.necks.length > 0) {
    filtered = filtered.filter(p => 
      p.neck && filters.necks.includes(p.neck)
    );
  }

  // 13. Filter by Tag
  if (filters.tag) {
    filtered = filtered.filter(p => p.tag === filters.tag);
  }

  // Apply Sorting
  sortProducts(filtered);

  // Render Active Badge row
  renderActiveFilterBadges();

  // Store filtered products globally for pagination
  filteredProductsGlobal = filtered;
  currentPage = 1;

  // Render Grid with Pagination
  if (filtered.length === 0) {
    grid.style.display = "none";
    if (noResultsBox) noResultsBox.style.display = "block";
    if (resultsCountText) resultsCountText.textContent = "Showing 0 products";
    renderPagination(0);
  } else {
    grid.style.display = "grid";
    if (noResultsBox) noResultsBox.style.display = "none";
    renderPage(1);
    renderPagination(filtered.length);
  }
}

function sortProducts(productArray) {
  if (currentSort === "price-low-high") {
    productArray.sort((a, b) => a.price - b.price);
  } else if (currentSort === "price-high-low") {
    productArray.sort((a, b) => b.price - a.price);
  } else if (currentSort === "rating") {
    productArray.sort((a, b) => b.rating - a.rating);
  }
}

// ==========================================
// PAGINATION HELPERS
// ==========================================
function renderPage(page) {
  const grid = document.getElementById("shop-product-grid");
  const resultsCountText = document.getElementById("results-count-text");
  if (!grid) return;

  currentPage = page;
  const totalProducts = filteredProductsGlobal.length;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
  const startIdx = (page - 1) * PRODUCTS_PER_PAGE;
  const endIdx = Math.min(startIdx + PRODUCTS_PER_PAGE, totalProducts);
  const pageProducts = filteredProductsGlobal.slice(startIdx, endIdx);

  let cardsHTML = "";
  pageProducts.forEach(p => {
    cardsHTML += createProductCardHTML(p);
  });
  grid.innerHTML = cardsHTML;

  if (resultsCountText) {
    resultsCountText.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalProducts} products`;
  }

  // Sync wishlist after render
  syncActiveWishlistButtons();

  // Scroll to top of grid
  const shopContent = document.querySelector(".shop-content");
  if (shopContent) {
    shopContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderPagination(totalCount) {
  const container = document.getElementById("pagination-container");
  const pageNumbersEl = document.getElementById("page-numbers");
  const prevBtn = document.getElementById("prev-page-btn");
  const nextBtn = document.getElementById("next-page-btn");
  if (!container || !pageNumbersEl) return;

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  if (totalPages <= 1) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";

  // Render page number buttons
  let numbersHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    // Show ellipsis for large page counts
    if (totalPages > 7) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        numbersHTML += `<button class="page-num-btn${i === currentPage ? " active" : ""}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        numbersHTML += `<span class="page-ellipsis">...</span>`;
      }
    } else {
      numbersHTML += `<button class="page-num-btn${i === currentPage ? " active" : ""}" data-page="${i}">${i}</button>`;
    }
  }
  pageNumbersEl.innerHTML = numbersHTML;

  // Prev/Next buttons state
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;

  // Attach events to page number buttons
  pageNumbersEl.querySelectorAll(".page-num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = parseInt(btn.getAttribute("data-page"));
      renderPage(page);
      renderPagination(totalCount);
    });
  });

  // Prev/Next click handlers
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        renderPage(currentPage - 1);
        renderPagination(totalCount);
      }
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        renderPage(currentPage + 1);
        renderPagination(totalCount);
      }
    };
  }
}

// Helper for HTML escaping to prevent XSS
function escapeHTML(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Helper for escaping strings inside inline JS event attributes to prevent syntax errors and injection
function escapeJSString(str) {
  if (!str) return "";
  return str.toString()
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

// ==========================================
// RENDER ACTIVE FILTER BADGES ROW
// ==========================================
function renderActiveFilterBadges() {
  const container = document.getElementById("active-filters-container");
  if (!container) return;

  let badgesHTML = "";
  let hasFilters = false;

  // Helper
  const addBadge = (label, removeFnCall) => {
    hasFilters = true;
    badgesHTML += `
      <span class="active-filter-badge">
        ${escapeHTML(label)} <i class="fas fa-times" onclick="${escapeHTML(removeFnCall)}"></i>
      </span>
    `;
  };

  // Categories
  filters.categories.forEach(cat => {
    addBadge(cat, `removeFilterValue('categories', '${escapeJSString(cat)}')`);
  });

  // Price range
  if (filters.priceRange !== "all") {
    let label = "";
    if (filters.priceRange === "0-1500") label = "Under ₹1,500";
    else if (filters.priceRange === "1500-3000") label = "₹1,500 - ₹3,000";
    else if (filters.priceRange === "3000-5000") label = "₹3,000 - ₹5,000";
    else if (filters.priceRange === "5000-100000") label = "Above ₹5,000";

    addBadge(`Price: ${label}`, `removePriceFilter()`);
  }

  // Sizes
  filters.sizes.forEach(size => {
    addBadge(`Size: ${size}`, `removeFilterValue('sizes', '${escapeJSString(size)}')`);
  });

  // Colors
  filters.colors.forEach(color => {
    addBadge(`Color: ${color}`, `removeFilterValue('colors', '${escapeJSString(color)}')`);
  });

  // Fabrics
  filters.fabrics.forEach(fab => {
    addBadge(`Fabric: ${fab}`, `removeFilterValue('fabrics', '${escapeJSString(fab)}')`);
  });

  // Occasions
  filters.occasions.forEach(occ => {
    addBadge(`Occasion: ${occ}`, `removeFilterValue('occasions', '${escapeJSString(occ)}')`);
  });

  // Patterns
  filters.patterns.forEach(pat => {
    addBadge(`Pattern: ${pat}`, `removeFilterValue('patterns', '${escapeJSString(pat)}')`);
  });

  // Styles
  filters.styles.forEach(style => {
    addBadge(`Style: ${style}`, `removeFilterValue('styles', '${escapeJSString(style)}')`);
  });

  // Sleeves
  filters.sleeves.forEach(sl => {
    addBadge(`Sleeves: ${sl}`, `removeFilterValue('sleeves', '${escapeJSString(sl)}')`);
  });

  // Necks
  filters.necks.forEach(n => {
    addBadge(`Neck: ${n}`, `removeFilterValue('necks', '${escapeJSString(n)}')`);
  });

  // Search
  if (filters.searchQuery) {
    addBadge(`Search: "${filters.searchQuery}"`, `removeSearchFilter()`);
  }

  // Tag
  if (filters.tag) {
    addBadge(filters.tag, `removeTagFilter()`);
  }

  // Clear all button
  if (hasFilters) {
    badgesHTML += `<span class="clear-all-filters-btn" onclick="resetAllFilters()">Clear All</span>`;
  }

  container.innerHTML = badgesHTML;
}

// ==========================================
// REMOVE SPECIFIC FILTERS HELPERS
// ==========================================
window.removeFilterValue = function(field, val) {
  filters[field] = filters[field].filter(v => v !== val);
  syncFilterControlsVisualState();
  applyFiltersAndRender();
};

window.removePriceFilter = function() {
  filters.priceRange = "all";
  syncFilterControlsVisualState();
  applyFiltersAndRender();
};

window.removeSearchFilter = function() {
  filters.searchQuery = "";
  // Reset URL query to clean state
  const url = new URL(window.location);
  url.searchParams.delete("search");
  window.history.pushState({}, "", url);
  
  const headerSearchInput = document.getElementById("search-input");
  if (headerSearchInput) headerSearchInput.value = "";
  
  updateTitleAndBreadcrumb("All Collections");
  applyFiltersAndRender();
};

window.removeTagFilter = function() {
  filters.tag = null;
  const url = new URL(window.location);
  url.searchParams.delete("tag");
  window.history.pushState({}, "", url);
  applyFiltersAndRender();
};

window.resetAllFilters = function() {
  filters.categories = [];
  filters.priceRange = "all";
  filters.sizes = [];
  filters.colors = [];
  filters.fabrics = [];
  filters.occasions = [];
  filters.patterns = [];
  filters.styles = [];
  filters.sleeves = [];
  filters.necks = [];
  filters.searchQuery = "";
  filters.wishlistOnly = false;
  filters.tag = null;

  // Clean URL params
  const url = new URL(window.location);
  url.searchParams.delete("category");
  url.searchParams.delete("search");
  url.searchParams.delete("wishlist");
  url.searchParams.delete("tag");
  url.searchParams.delete("style");
  url.searchParams.delete("size");
  window.history.pushState({}, "", url);

  const headerSearchInput = document.getElementById("search-input");
  if (headerSearchInput) headerSearchInput.value = "";

  updateTitleAndBreadcrumb("All Collections");
  syncFilterControlsVisualState();
  applyFiltersAndRender();
};

// ==========================================
// SYNC WISHLIST ACTIONS ON DYNAMIC ITEMS
// ==========================================
function syncActiveWishlistButtons() {
  PRODUCTS.forEach(p => {
    const isWish = wishlist.includes(p.id);
    document.querySelectorAll(`.wishlist-btn-${p.id}`).forEach(btn => {
      btn.classList.toggle("active", isWish);
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isWish ? "fas fa-heart" : "far fa-heart";
      }
    });
  });
}

document.addEventListener("syncWishlistState", syncActiveWishlistButtons);
