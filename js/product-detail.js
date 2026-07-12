// Missara Clothing - Product Detail Page Controller

let currentProduct = null;
let selectedSize = "";
let selectedColor = "";

document.addEventListener("DOMContentLoaded", async () => {
  // Wait if products catalog is not loaded yet
  if (typeof PRODUCTS === "undefined" || PRODUCTS.length === 0) {
    if (typeof loadProductsCatalog === "function") {
      await loadProductsCatalog();
    }
  }
  initProductDetail();
});

function initProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    showErrorState();
    return;
  }

  currentProduct = getProductById(id);

  if (!currentProduct) {
    showErrorState();
    return;
  }

  // Hide error, show content
  document.getElementById("product-detail-layout").style.display = "grid";
  document.getElementById("product-error-box").style.display = "none";

  renderProductDetails();
  renderRelatedProducts();
  setupEventListeners();
  setupSizeChartModal();
}

function showErrorState() {
  document.getElementById("product-detail-layout").style.display = "none";
  document.getElementById("product-error-box").style.display = "block";
  document.getElementById("related-products-section").style.display = "none";
}

// ==========================================
// RENDER DETAILS FOR ACTIVE PRODUCT
// ==========================================
function renderProductDetails() {
  const p = currentProduct;

  // Title, Category & Breadcrumb
  document.getElementById("detail-category").textContent = p.category;
  document.getElementById("detail-title").textContent = p.title;
  
  // Tab Title
  document.title = `${p.title} | Missara Clothing`;

  // LLM SEO: Inject dynamic Product JSON-LD Schema
  let schemaScript = document.getElementById("product-ld-json");
  if (!schemaScript) {
    schemaScript = document.createElement("script");
    schemaScript.id = "product-ld-json";
    schemaScript.type = "application/ld+json";
    document.head.appendChild(schemaScript);
  }
  
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": p.title,
    "image": [
      `https://missara.com/${p.image}`
    ],
    "description": p.description,
    "sku": `MSC-${p.id}`,
    "brand": {
      "@type": "Brand",
      "name": "Missara Clothing"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "INR",
      "price": p.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": p.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": p.rating,
      "reviewCount": p.reviewsCount
    }
  };
  schemaScript.textContent = JSON.stringify(productSchema);

  // Gallery Main Image & Thumbnails
  const mainImg = document.getElementById("gallery-main-image");
  const thumbsContainer = document.getElementById("gallery-thumbnails");

  // Build images list: prefer images[] array (multi-upload), fallback to image/hoverImage
  let imagesList = [];
  if (p.images && Array.isArray(p.images) && p.images.length > 0) {
    imagesList = p.images;
  } else {
    imagesList = [p.image];
    if (p.hoverImage && p.hoverImage !== p.image) {
      imagesList.push(p.hoverImage);
    }
  }

  mainImg.src = imagesList[0];
  mainImg.alt = p.title;

  // Hide thumbnail column if only 1 image
  if (imagesList.length <= 1) {
    thumbsContainer.style.display = "none";
  } else {
    thumbsContainer.style.display = "";
  }
  
  let thumbsHTML = "";
  imagesList.forEach((imgSrc, index) => {
    thumbsHTML += `
      <img src="${imgSrc}" class="thumbnail-img ${index === 0 ? 'active' : ''}" alt="View ${index + 1}" onclick="swapGalleryImage(this, '${imgSrc.replace(/'/g, "\\'")}')">
    `;
  });
  thumbsContainer.innerHTML = thumbsHTML;

  // Review Stars
  const starsContainer = document.getElementById("detail-stars-container");
  const reviewText = document.getElementById("detail-reviews-text");
  let starsHTML = "";
  const fullStars = Math.floor(p.rating);
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      starsHTML += `<i class="fas fa-star"></i>`;
    } else {
      starsHTML += `<i class="far fa-star"></i>`;
    }
  }
  starsContainer.innerHTML = starsHTML;
  reviewText.textContent = `(${p.reviewsCount} Customer Reviews)`;

  // Pricing details
  const discountPercent = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
  document.getElementById("detail-price-current").textContent = `₹${p.price.toLocaleString()}`;
  document.getElementById("detail-price-original").textContent = `₹${p.originalPrice.toLocaleString()}`;
  document.getElementById("detail-price-discount").textContent = `${discountPercent}% OFF`;

  // Stock status badge
  const priceRow = document.querySelector(".detail-price-row");
  if (priceRow) {
    let stockBadge = document.getElementById("detail-stock-badge");
    if (!stockBadge) {
      stockBadge = document.createElement("span");
      stockBadge.id = "detail-stock-badge";
      stockBadge.className = "badge-tag";
      priceRow.appendChild(stockBadge);
    }
    
    if (p.inventory !== undefined && p.inventory <= 0) {
      stockBadge.textContent = "Out of Stock";
      stockBadge.style.backgroundColor = "#E53E3E";
      stockBadge.style.color = "#FFFFFF";
      stockBadge.style.marginLeft = "15px";
      stockBadge.style.display = "inline-block";
    } else {
      const qty = p.inventory !== undefined ? p.inventory : 10;
      stockBadge.textContent = `In Stock (${qty} left)`;
      stockBadge.style.backgroundColor = "#38A169";
      stockBadge.style.color = "#FFFFFF";
      stockBadge.style.marginLeft = "15px";
      stockBadge.style.display = "inline-block";
    }
  }

  const isOutOfStock = p.inventory !== undefined && p.inventory <= 0;

  // Action Buttons row update based on stock
  const actionsRow = document.querySelector(".actions-row");
  if (actionsRow) {
    if (isOutOfStock) {
      actionsRow.innerHTML = `
        <button class="btn" disabled style="background-color: #E2E8F0; color: #A0AEC0; border: 1px solid #E2E8F0; cursor: not-allowed; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-ban"></i> OUT OF STOCK</button>
      `;
    } else {
      actionsRow.innerHTML = `
        <button class="btn btn-secondary" id="add-to-cart-btn"><i class="fas fa-shopping-bag" style="margin-right: 8px;"></i> Add to Bag</button>
        <button class="btn btn-primary" id="buy-now-btn">Buy It Now</button>
      `;
    }
  }

  // Size Selector buttons
  const sizesContainer = document.getElementById("detail-sizes-container");
  let sizesHTML = "";
  p.sizes.forEach(size => {
    if (isOutOfStock) {
      sizesHTML += `
        <button class="size-btn" disabled style="opacity: 0.5; cursor: not-allowed; border-color: var(--border-light);">${size}</button>
      `;
    } else {
      sizesHTML += `
        <button class="size-btn" onclick="selectSize(this, '${size}')">${size}</button>
      `;
    }
  });
  sizesContainer.innerHTML = sizesHTML;

  // Auto-select size if only one (e.g. Free Size) and in stock
  if (!isOutOfStock && p.sizes.length === 1) {
    setTimeout(() => {
      const singleBtn = sizesContainer.querySelector(".size-btn");
      if (singleBtn) singleBtn.click();
    }, 50);
  }

  // Color Swatches
  const colorsContainer = document.getElementById("detail-colors-container");
  let colorsHTML = "";
  p.colors.forEach((color, index) => {
    // Generate simple style shades matching ethnic vibe
    let bgStyle = "background-color: #E2E8F0;";
    if (color.toLowerCase().includes("pink")) bgStyle = "background-color: #F48FB1;";
    else if (color.toLowerCase().includes("white")) bgStyle = "background-color: #FFFDFB;";
    else if (color.toLowerCase().includes("gold")) bgStyle = "background-color: #ECC94B;";
    else if (color.toLowerCase().includes("rose")) bgStyle = "background-color: #D81B60;";

    colorsHTML += `
      <div class="color-swatch ${index === 0 ? 'active' : ''}" style="${bgStyle}" title="${color}" onclick="selectColor(this, '${color}')"></div>
    `;
  });
  colorsContainer.innerHTML = colorsHTML;
  if (p.colors.length > 0) {
    selectedColor = p.colors[0];
  }

  // Accordion descriptions
  document.getElementById("detail-desc").textContent = p.description;
  
  // Fabric care details
  const specObj = p.details;
  let specHTML = `<ul style="list-style: disc; margin-left: 20px; font-size: 0.9rem;">`;
  specHTML += `<li><b>Fabric Type:</b> ${specObj.fabric}</li>`;
  specHTML += `<li><b>Length:</b> ${specObj.length}</li>`;
  if (specObj.neck !== "N/A" && specObj.neck) {
    specHTML += `<li><b>Neckline:</b> ${specObj.neck}</li>`;
  }
  specHTML += `<li><b>Wash & Care:</b> ${specObj.washCare}</li>`;
  specHTML += `</ul>`;
  document.getElementById("detail-specifications").innerHTML = specHTML;
}

// ==========================================
// THUMBNAILS SWAP ACTION
// ==========================================
window.swapGalleryImage = function(thumbElement, imageSrc) {
  document.querySelectorAll(".thumbnail-img").forEach(thumb => thumb.classList.remove("active"));
  thumbElement.classList.add("active");
  document.getElementById("gallery-main-image").src = imageSrc;
};

// ==========================================
// SELECTION INTERACTIONS
// ==========================================
window.selectSize = function(sizeBtnElement, sizeVal) {
  document.querySelectorAll(".size-btn").forEach(btn => btn.classList.remove("active"));
  sizeBtnElement.classList.add("active");
  selectedSize = sizeVal;
};

window.selectColor = function(colorSwatchElement, colorVal) {
  document.querySelectorAll(".color-swatch").forEach(swatch => swatch.classList.remove("active"));
  colorSwatchElement.classList.add("active");
  selectedColor = colorVal;
};

// ==========================================
// ACTIONS SETUP
// ==========================================
function setupEventListeners() {
  const addBtn = document.getElementById("add-to-cart-btn");
  const buyBtn = document.getElementById("buy-now-btn");
  const pincodeForm = document.getElementById("pincode-form");

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      if (!selectedSize) {
        showToast("Please choose a size first!", "error");
        return;
      }
      addToCart(currentProduct.id, selectedSize, 1);
    });
  }

  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      if (!selectedSize) {
        showToast("Please choose a size first!", "error");
        return;
      }
      // Add to cart directly
      addToCart(currentProduct.id, selectedSize, 1);
      // Wait briefly for sync, then redirect to checkout
      setTimeout(() => {
        window.location.href = "checkout.html";
      }, 500);
    });
  }

  // Pincode Deliverability Estimator Logic
  if (pincodeForm) {
    pincodeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pincode = document.getElementById("pincode-input").value.trim();
      const responseBox = document.getElementById("pincode-response");

      if (!responseBox) return;

      // Simple 6-digit Indian PIN check
      if (/^\d{6}$/.test(pincode)) {
        responseBox.style.display = "block";
        responseBox.className = "pincode-response success";
        
        // Calculate dynamic delivery date (current date + 3 to 5 days)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        const dateString = deliveryDate.toLocaleDateString('en-US', options);

        // Jabalpur specific check for fun local experience
        if (pincode.startsWith("482")) {
          responseBox.innerHTML = `<i class="fas fa-check-circle"></i> <b>Jabalpur Special Delivery!</b> Hand-delivered by tomorrow. COD available.`;
        } else {
          responseBox.innerHTML = `<i class="fas fa-check-circle"></i> <b>Delivery Available!</b> Expected arrival by <b>${dateString}</b>. Cash on Delivery (COD) is available.`;
        }
      } else {
        responseBox.style.display = "block";
        responseBox.className = "pincode-response error";
        responseBox.innerHTML = `<i class="fas fa-exclamation-circle"></i> Invalid pincode format. Enter a 6-digit number.`;
      }
    });
  }
}

// ==========================================
// SIZE CHART MODAL TOGGLE
// ==========================================
function setupSizeChartModal() {
  const trigger = document.getElementById("size-guide-trigger");
  const modal = document.getElementById("size-chart-modal");
  const closeBtn = document.getElementById("size-chart-close");

  if (!trigger || !modal || !closeBtn) return;

  trigger.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// ==========================================
// ACCORDIONS TOGGLE
// ==========================================
window.toggleAccordion = function(headerElement) {
  const parent = headerElement.parentElement;
  parent.classList.toggle("active");
};

// ==========================================
// RENDER RELATED PRODUCTS SECTION
// ==========================================
function renderRelatedProducts() {
  const grid = document.getElementById("related-product-grid");
  if (!grid) return;

  // Filter other products in the same category
  const related = PRODUCTS.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id).slice(0, 4);

  if (related.length === 0) {
    // Fallback: pick any other 4 products
    const fallback = PRODUCTS.filter(p => p.id !== currentProduct.id).slice(0, 4);
    let cardsHTML = "";
    fallback.forEach(p => {
      cardsHTML += createProductCardHTML(p);
    });
    grid.innerHTML = cardsHTML;
  } else {
    let cardsHTML = "";
    related.forEach(p => {
      cardsHTML += createProductCardHTML(p);
    });
    grid.innerHTML = cardsHTML;
  }
}
