// Missara Clothing - Admin Dashboard Controller

document.addEventListener("DOMContentLoaded", async () => {
  // Wait if products catalog is not loaded yet
  if (typeof PRODUCTS === "undefined" || PRODUCTS.length === 0) {
    if (typeof loadProductsCatalog === "function") {
      await loadProductsCatalog();
    }
  }
  initAdminPortal();
});

function initAdminPortal() {
  setupAdminSecurity();
  setupFormHandler();
  renderCatalogTable();
  setupShippingModalListeners();
  setupPaymentSettingsHandler();
  loadPaymentSettingsForm();
}

// ==========================================
// PORTAL ACCESS & LOCK LOGIC
// ==========================================
function setupAdminSecurity() {
  const lockScreen = document.getElementById("admin-lock-screen");
  const loginForm = document.getElementById("admin-login-form");
  const logoutBtn = document.getElementById("admin-logout-btn");
  
  // Check if session is already unlocked
  const isUnlocked = sessionStorage.getItem("missara_admin_unlocked") === "true";
  if (isUnlocked && lockScreen) {
    lockScreen.style.display = "none";
  }

  // Handle PIN unlock form submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pin = document.getElementById("admin-pin-input").value.trim();

      try {
        const response = await fetch('/api/admin/verify-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': pin
          }
        });

        if (response.ok) {
          sessionStorage.setItem("missara_admin_unlocked", "true");
          sessionStorage.setItem("missara_admin_pin", pin);
          if (lockScreen) {
            lockScreen.style.opacity = "0";
            setTimeout(() => {
              lockScreen.style.display = "none";
            }, 300);
          }
          showToast("Portal Unlocked Successfully!");
        } else {
          showToast("Incorrect Security PIN code!", "error");
          document.getElementById("admin-pin-input").value = "";
        }
      } catch (err) {
        showToast("Could not contact server to verify PIN", "error");
      }
    });
  }

  // Handle Logout Lock Click
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("missara_admin_unlocked");
      showToast("Portal locked.");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });
  }
}

// ==========================================
// NAVIGATION TAB SWITCHER
// ==========================================
window.switchPanel = function(panelId, btnElement) {
  // Reset active classes on buttons
  document.querySelectorAll(".admin-menu-btn").forEach(btn => btn.classList.remove("active"));
  btnElement.classList.add("active");

  // Reset active panel visibility
  document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.remove("active"));
  const targetPanel = document.getElementById(`panel-${panelId}`);
  if (targetPanel) {
    targetPanel.classList.add("active");
  }

  // If switched to catalog list, CRM, or email logs, re-render
  if (panelId === "manage-catalog") {
    renderCatalogTable();
  } else if (panelId === "crm-orders") {
    renderCRMOrdersTable();
  } else if (panelId === "email-logs") {
    renderEmailLogsTable();
  } else if (panelId === "payment-settings") {
    loadPaymentSettingsForm();
  }
};

// ==========================================
// ADD PRODUCT FORM HANDLER (Multi-Image Upload)
// ==========================================

// Store selected image files for multi-upload
let selectedImageFiles = [];
const MAX_IMAGES = 5;
let editingProductId = null;
window.existingImagesBase64 = [];

function setupFormHandler() {
  const form = document.getElementById("admin-add-product-form");
  if (!form) return;

  setupImageUploadZone();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get input values
    const title = document.getElementById("prod-title").value.trim();
    let sku = document.getElementById("prod-sku").value.trim();
    const category = document.getElementById("prod-category").value;

    // Check SKU & Auto-generate if empty
    if (!sku) {
      const catMap = {
        "Kurtas & Suits": "KRT",
        "Sarees": "SAR",
        "Lehengas": "LHG",
        "Anarkalis": "ANR",
        "Co-Ord Sets": "CRD",
        "Fusion Wear": "FSN",
        "New Arrivals": "NEW",
        "Plus Sizes": "PLS",
        "Tunics & Tops": "TNP"
      };
      const code = catMap[category] || "GEN";
      const randNum = Math.floor(1000 + Math.random() * 9000);
      sku = `MSR-${code}-${randNum}`;
    }

    // Check for duplicate SKU in catalog
    const duplicateSku = PRODUCTS.find(p => p.sku && p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingProductId);
    if (duplicateSku) {
      showToast(`SKU Error: A product with SKU "${sku}" already exists ("${duplicateSku.title}").`, "error");
      return;
    }

    // Check for duplicate product title in the same category
    const duplicateTitle = PRODUCTS.find(p => p.title.toLowerCase() === title.toLowerCase() && p.category === category && p.id !== editingProductId);
    if (duplicateTitle) {
      const proceed = confirm(`Warning: A product named "${title}" already exists in the "${category}" category. Do you want to add/save this anyway?`);
      if (!proceed) return;
    }
    const price = parseInt(document.getElementById("prod-price").value);
    const originalPrice = parseInt(document.getElementById("prod-original-price").value);
    const tag = document.getElementById("prod-tag").value;
    const inventory = parseInt(document.getElementById("prod-inventory").value) || 0;
    const description = document.getElementById("prod-desc").value.trim();
    
    // Specifications
    const fabric = document.getElementById("prod-fabric").value.trim();
    const length = document.getElementById("prod-length").value.trim();
    const neck = document.getElementById("prod-neck").value.trim();
    const washCare = document.getElementById("prod-care").value.trim();
    
    // New Fields
    const colorsInput = document.getElementById("prod-colors").value.trim();
    const occasion = document.getElementById("prod-occasion").value.trim();
    const pattern = document.getElementById("prod-pattern").value.trim();
    const style = document.getElementById("prod-style").value.trim();
    const sleeveLength = document.getElementById("prod-sleeve").value.trim();

    // Sizes checked
    const checkedSizes = [];
    document.querySelectorAll(".prod-size-check:checked").forEach(box => {
      checkedSizes.push(box.value);
    });

    if (checkedSizes.length === 0) {
      showToast("Please check at least one size!", "error");
      return;
    }

    // Validate images
    let imagesBase64 = [];
    if (selectedImageFiles.length > 0) {
      try {
        for (const file of selectedImageFiles) {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });
          imagesBase64.push(base64);
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to read image files", "error");
        return;
      }
    } else if (editingProductId && window.existingImagesBase64 && window.existingImagesBase64.length > 0) {
      imagesBase64 = window.existingImagesBase64;
    } else {
      showToast("Please upload at least one product image!", "error");
      return;
    }

    // Build Product Object
    const newProduct = {
      sku: sku,
      title: title,
      category: category,
      price: price,
      originalPrice: originalPrice,
      rating: 4.8, // Mock high rating
      reviewsCount: 1,
      inventory: inventory,
      images: imagesBase64, // All images array
      image: imagesBase64[0], // Main image (backward compat)
      hoverImage: imagesBase64.length > 1 ? imagesBase64[1] : imagesBase64[0], // Hover image
      description: description,
      sizes: checkedSizes,
      colors: colorsInput ? colorsInput.split(',').map(c => c.trim()) : ["Blush Pink"],
      tag: tag || null,
      details: {
        fabric: fabric,
        length: length,
        neck: neck || "N/A",
        washCare: washCare,
        occasion: occasion,
        pattern: pattern,
        style: style,
        sleeveLength: sleeveLength
      }
    };

    if (editingProductId) {
      newProduct.id = editingProductId;
    } else {
      newProduct.id = Date.now(); // Unique numeric ID
    }

    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': getAdminPin()
        },
        body: JSON.stringify(newProduct)
      });
      if (!response.ok) throw new Error('Server returned error adding/updating product');
      
      showToast(editingProductId ? "Product updated successfully!" : "Product added successfully!");
      form.reset();
      selectedImageFiles = [];
      editingProductId = null;
      window.existingImagesBase64 = [];
      document.querySelector("#admin-add-product-form button[type='submit']").innerHTML = "Add to Catalog";
      document.querySelector("#panel-add-article .panel-title").innerText = "Add New Boutique Article";
      renderImagePreviews();
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast("Failed to save product to backend database", "error");
    }
  });
}

// ==========================================
// MULTI-IMAGE UPLOAD ZONE (Drag & Drop + Click)
// ==========================================
function setupImageUploadZone() {
  const zone = document.getElementById("image-upload-zone");
  const fileInput = document.getElementById("prod-image-files");
  if (!zone || !fileInput) return;

  // Click to open file picker
  zone.addEventListener("click", () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener("change", (e) => {
    handleNewFiles(e.target.files);
    fileInput.value = ""; // Reset so same files can be re-selected
  });

  // Drag & Drop events
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    handleNewFiles(files);
  });
}

function handleNewFiles(files) {
  if (!files || files.length === 0) return;

  const remaining = MAX_IMAGES - selectedImageFiles.length;
  if (remaining <= 0) {
    showToast(`Maximum ${MAX_IMAGES} images allowed!`, "error");
    return;
  }

  const filesToAdd = Array.from(files).slice(0, remaining);
  
  // Validate file types
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  for (const file of filesToAdd) {
    if (!validTypes.includes(file.type)) {
      showToast(`Invalid file type: ${file.name}. Use JPG, PNG, or WEBP.`, "error");
      return;
    }
  }

  selectedImageFiles.push(...filesToAdd);

  if (selectedImageFiles.length > MAX_IMAGES) {
    selectedImageFiles = selectedImageFiles.slice(0, MAX_IMAGES);
  }

  renderImagePreviews();

  if (Array.from(files).length > remaining) {
    showToast(`Only ${remaining} more image(s) could be added (max ${MAX_IMAGES})`, "error");
  }
}

function renderImagePreviews() {
  const grid = document.getElementById("image-preview-grid");
  const countInfo = document.getElementById("image-count-info");
  if (!grid) return;

  if (selectedImageFiles.length === 0) {
    if (editingProductId && window.existingImagesBase64 && window.existingImagesBase64.length > 0) {
      // Show existing images if editing and no new files uploaded yet
      let html = "";
      window.existingImagesBase64.forEach((base64, index) => {
        html += `
          <div class="image-preview-item">
            <img src="${base64}" alt="Existing Preview ${index + 1}">
            ${index === 0 ? '<span class="preview-main-badge">Main</span>' : ''}
          </div>
        `;
      });
      grid.innerHTML = html;
      if (countInfo) countInfo.textContent = `${window.existingImagesBase64.length} existing image(s) shown (uploading new files will replace them)`;
    } else {
      grid.innerHTML = "";
      if (countInfo) countInfo.textContent = "";
    }
    return;
  }

  let html = "";
  selectedImageFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    html += `
      <div class="image-preview-item">
        <img src="${url}" alt="Preview ${index + 1}">
        <button type="button" class="preview-remove-btn" onclick="removePreviewImage(${index})" title="Remove">
          <i class="fas fa-times"></i>
        </button>
        ${index === 0 ? '<span class="preview-main-badge">Main</span>' : ''}
      </div>
    `;
  });
  grid.innerHTML = html;

  if (countInfo) {
    countInfo.textContent = `${selectedImageFiles.length} / ${MAX_IMAGES} images selected`;
  }
}

window.removePreviewImage = function(index) {
  selectedImageFiles.splice(index, 1);
  renderImagePreviews();
};

// ==========================================
// RENDER CATALOG LISTS TABLE
// ==========================================
function renderCatalogTable() {
  const tbody = document.getElementById("admin-catalog-tbody");
  if (!tbody) return;

  let html = "";
  // PRODUCTS database contains both default ones and merged custom ones
  PRODUCTS.forEach(p => {
    // If ID is from Date.now(), it's custom; else default
    const isCustom = p.id > 10000;
    const stockQty = p.inventory !== undefined ? p.inventory : 10;
    const isOutOfStock = stockQty <= 0;
    
    html += `
      <tr>
        <td style="text-align:center;">
          <input type="checkbox" class="catalog-row-check" data-id="${p.id}" style="cursor: pointer; width: 18px; height: 18px; accent-color: var(--primary-pink);" onchange="updateCatalogSelectionState()">
        </td>
        <td><img src="${p.image}" class="catalog-thumb" alt="${p.title}"></td>
        <td>
          <div style="font-weight:600; color:var(--text-dark);">${p.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); display: flex; gap: 8px;">
            <span>ID: ${p.id}</span>
            ${p.sku ? `<span style="font-weight:700; color:var(--primary-pink);">SKU: ${p.sku}</span>` : ''}
          </div>
        </td>
        <td>${p.category}</td>
        <td>
          <div style="font-weight:600; color:var(--primary-pink);">₹${p.price.toLocaleString()}</div>
          <div style="font-size:0.75rem; text-decoration:line-through; color:var(--text-muted);">₹${p.originalPrice.toLocaleString()}</div>
        </td>
        <td>${p.tag ? `<span class="badge-tag">${p.tag}</span>` : '<span style="color:var(--text-muted); font-size:0.8rem;">None</span>'}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; align-items:center; gap:5px;">
              <button class="qty-btn" onclick="adjustStockInline(${p.id}, -1)">-</button>
              <input type="number" value="${stockQty}" min="0" style="width:50px; text-align:center; padding:4px; border:1px solid var(--border-light); border-radius:4px; font-weight:600;" onchange="updateStockInline(${p.id}, this.value)">
              <button class="qty-btn" onclick="adjustStockInline(${p.id}, 1)">+</button>
            </div>
            <span style="font-size:0.75rem; color:${isOutOfStock ? '#E53E3E' : (stockQty < 5 ? '#DD6B20' : '#38A169')}; font-weight:600;">
              ${isOutOfStock ? '● Out of Stock' : (stockQty < 5 ? `● Low Stock (${stockQty} left)` : '● Live / In Stock')}
            </span>
          </div>
        </td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:15px;">
            <button class="btn-edit" onclick="editBoutiqueProduct(${p.id})">
              <i class="far fa-edit"></i> Edit
            </button>
            <button class="btn-delete" onclick="deleteBoutiqueProduct(${p.id})">
              <i class="far fa-trash-alt"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  
  // Reset selection state after rendering
  const masterCheck = document.getElementById("select-all-catalog");
  if (masterCheck) masterCheck.checked = false;
  updateCatalogSelectionState();
}

// ==========================================
// ADJUST / UPDATE STOCK INLINE
// ==========================================
window.adjustStockInline = function(prodId, change) {
  const product = PRODUCTS.find(p => p.id === prodId);
  if (!product) return;
  const currentStock = product.inventory !== undefined ? product.inventory : 10;
  const newStock = Math.max(0, currentStock + change);
  saveStockUpdate(prodId, newStock);
};

window.updateStockInline = function(prodId, value) {
  const newStock = Math.max(0, parseInt(value) || 0);
  saveStockUpdate(prodId, newStock);
};

async function saveStockUpdate(prodId, newStock) {
  try {
    const res = await fetch(`/api/products/${prodId}/stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': getAdminPin()
      },
      body: JSON.stringify({ inventory: newStock })
    });
    if (!res.ok) throw new Error('Failed to update stock on server');
    
    // Update in-memory state
    const memoryProd = PRODUCTS.find(p => p.id === prodId);
    if (memoryProd) {
      memoryProd.inventory = newStock;
    }

    showToast(`Stock updated to ${newStock}!`);
    renderCatalogTable();
  } catch (e) {
    console.error(e);
    showToast("Failed to save stock update to server", "error");
  }
}

function getAdminPin() {
  let pin = sessionStorage.getItem("missara_admin_pin") || localStorage.getItem("missara_admin_pin");
  if (!pin || pin.trim() === '') {
    pin = "1234";
    sessionStorage.setItem("missara_admin_pin", pin);
  }
  return pin;
}

// ==========================================
// DELETE DYNAMIC PRODUCT
// ==========================================
window.deleteBoutiqueProduct = async function(id) {
  if (!confirm("Are you sure you want to delete this article from the store catalog?")) {
    return;
  }

  const pin = getAdminPin();

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-pin': pin
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || 'Failed to delete product from server');
    }
    
    // Immediately update in-memory PRODUCTS list
    PRODUCTS = PRODUCTS.filter(p => p.id !== id);
    renderCatalogTable();

    showToast("Article deleted successfully.");

    setTimeout(() => {
      window.location.reload();
    }, 800);
  } catch (err) {
    console.error("Delete Error:", err);
    showToast(err.message || "Failed to delete product from database", "error");
  }
};

// ==========================================
// BULK SELECTION & BULK DELETE HANDLERS
// ==========================================
window.toggleSelectAllCatalog = function(masterCheckbox) {
  const checkboxes = document.querySelectorAll(".catalog-row-check");
  checkboxes.forEach(cb => {
    cb.checked = masterCheckbox.checked;
  });
  updateCatalogSelectionState();
};

window.updateCatalogSelectionState = function() {
  const selectedBoxes = document.querySelectorAll(".catalog-row-check:checked");
  const totalBoxes = document.querySelectorAll(".catalog-row-check");
  const btnBulkDelete = document.getElementById("btn-bulk-delete");
  const selectedCountSpan = document.getElementById("selected-count");
  const masterCheck = document.getElementById("select-all-catalog");

  const count = selectedBoxes.length;

  if (selectedCountSpan) selectedCountSpan.textContent = count;

  if (btnBulkDelete) {
    btnBulkDelete.style.display = count > 0 ? "inline-flex" : "none";
  }

  if (masterCheck && totalBoxes.length > 0) {
    masterCheck.checked = count === totalBoxes.length;
    masterCheck.indeterminate = count > 0 && count < totalBoxes.length;
  }
};

window.deleteSelectedBoutiqueProducts = async function() {
  const selectedBoxes = document.querySelectorAll(".catalog-row-check:checked");
  if (selectedBoxes.length === 0) return;

  const selectedIds = Array.from(selectedBoxes).map(cb => parseInt(cb.getAttribute("data-id")));

  if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected article(s) from the catalog?`)) {
    return;
  }

  const pin = getAdminPin();

  try {
    const res = await fetch('/api/products/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin
      },
      body: JSON.stringify({ ids: selectedIds })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || 'Failed to bulk delete products from server');
    }
    const data = await res.json();

    // Update in-memory PRODUCTS list
    PRODUCTS = PRODUCTS.filter(p => !selectedIds.includes(p.id));
    renderCatalogTable();

    showToast(`${data.count || selectedIds.length} product(s) deleted successfully!`);

    setTimeout(() => {
      window.location.reload();
    }, 800);
  } catch (err) {
    console.error("Bulk Delete Error:", err);
    showToast(err.message || "Failed to delete selected products from database", "error");
  }
};

// ==========================================
// EDIT DYNAMIC PRODUCT
// ==========================================
window.editBoutiqueProduct = function(id) {
  const p = PRODUCTS.find(prod => prod.id === id);
  if (!p) return;

  editingProductId = id;
  window.existingImagesBase64 = p.images || [p.image, p.hoverImage].filter(Boolean);

  // Switch to Add Article panel
  const menuBtns = document.querySelectorAll('.admin-menu-btn');
  menuBtns.forEach(btn => btn.classList.remove('active'));
  document.querySelector('.admin-menu-btn[onclick*="add-article"]').classList.add('active');
  
  const panels = document.querySelectorAll('.admin-panel');
  panels.forEach(panel => panel.classList.remove('active'));
  document.getElementById('panel-add-article').classList.add('active');
  
  // Populate form fields
  document.getElementById("prod-title").value = p.title || "";
  document.getElementById("prod-sku").value = p.sku || "";
  document.getElementById("prod-category").value = p.category || "";
  document.getElementById("prod-price").value = p.price || "";
  document.getElementById("prod-original-price").value = p.originalPrice || "";
  document.getElementById("prod-tag").value = p.tag || "";
  document.getElementById("prod-inventory").value = p.inventory !== undefined ? p.inventory : 10;
  document.getElementById("prod-desc").value = p.description || "";
  
  if (p.details) {
    document.getElementById("prod-fabric").value = p.details.fabric || "";
    document.getElementById("prod-length").value = p.details.length || "";
    document.getElementById("prod-neck").value = p.details.neck || "";
    document.getElementById("prod-care").value = p.details.washCare || "";
    document.getElementById("prod-occasion").value = p.details.occasion || "";
    document.getElementById("prod-pattern").value = p.details.pattern || "";
    document.getElementById("prod-style").value = p.details.style || "";
    document.getElementById("prod-sleeve").value = p.details.sleeveLength || "";
  }
  
  document.getElementById("prod-colors").value = p.colors ? p.colors.join(", ") : "";

  // Sizes
  document.querySelectorAll(".prod-size-check").forEach(box => {
    box.checked = p.sizes ? p.sizes.includes(box.value) : false;
  });

  // Images preview
  selectedImageFiles = []; // Clear pending uploads
  
  // Create previews from existing base64
  const grid = document.getElementById("image-preview-grid");
  let existingHtml = "";
  window.existingImagesBase64.forEach((b64, idx) => {
    existingHtml += `
      <div class="image-preview-item">
        <img src="${b64}" alt="Existing image ${idx}">
        <div style="position:absolute; bottom:5px; left:0; width:100%; text-align:center; font-size:10px; background:rgba(0,0,0,0.5); color:#fff;">Old Image</div>
      </div>
    `;
  });
  grid.innerHTML = existingHtml;
  
  // Update button text
  document.querySelector("#admin-add-product-form button[type='submit']").innerHTML = "Update Article";
  document.querySelector("#panel-add-article .panel-title").innerText = "Edit Boutique Article";

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// RENDER CRM ORDERS TABLE
// ==========================================
async function renderCRMOrdersTable() {
  const tbody = document.getElementById("admin-crm-tbody");
  if (!tbody) return;

  let orders = [];
  try {
    const res = await fetch('/api/orders', {
      headers: { 'x-admin-pin': getAdminPin() }
    });
    if (res.ok) orders = await res.json();
  } catch (e) {
    console.error(e);
  }

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 40px; color:var(--text-muted); font-style:italic;">
          <i class="fas fa-shopping-bag" style="font-size:2rem; display:block; margin-bottom:10px; color:var(--border-light);"></i>
          No orders received yet.
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  orders.forEach(order => {
    // Generate order items list
    let itemsHTML = "";
    order.items.forEach(item => {
      itemsHTML += `
        <div style="font-size:0.85rem; margin-bottom: 6px; display:flex; align-items:center; gap: 8px;">
          <img src="${item.image}" style="width: 25px; height: 35px; object-fit:cover; border-radius: 2px;" alt="${item.title}">
          <div style="display:flex; flex-direction:column;">
            <span><b>${item.title}</b> (${item.size}) x ${item.quantity}</span>
            ${item.sku ? `<span style="font-size:0.75rem; font-weight:700; color:var(--primary-pink); margin-top:2px;">SKU: ${item.sku}</span>` : ''}
          </div>
        </div>
      `;
    });

    // Address check for local delivery estimate styling
    const isJabalpur = order.customer.pincode && order.customer.pincode.startsWith("482");

    html += `
      <tr>
        <td style="font-weight:700; color:var(--primary-pink); vertical-align:top;">
          ${order.orderId}
        </td>
        <td style="font-size:0.8rem; color:var(--text-muted); vertical-align:top; white-space:nowrap;">
          ${order.date}
        </td>
        <td style="vertical-align:top; font-size:0.85rem; line-height: 1.4;">
          <div style="font-weight:600; color:var(--text-dark);">${order.customer.name}</div>
          <div style="color:var(--text-muted);"><i class="far fa-envelope"></i> ${order.customer.email}</div>
          <div style="color:var(--text-muted);"><i class="fas fa-phone-alt"></i> ${order.customer.phone}</div>
          <div style="color:var(--text-muted); margin-top:5px; max-width:250px;">
            <i class="fas fa-map-marker-alt"></i> ${order.customer.address}
            ${isJabalpur ? `<span style="background-color:var(--secondary-pink); color:var(--primary-pink); font-size:0.7rem; font-weight:600; padding:1px 5px; border-radius:4px; display:inline-block; margin-left: 5px;">Local</span>` : ""}
          </div>
        </td>
        <td style="vertical-align:top;">
          ${itemsHTML}
        </td>
        <td style="vertical-align:top; font-weight:600; color:var(--text-dark);">
          ₹${order.total.toLocaleString()}
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">Paid via ${order.paymentMethod}</div>
        </td>
        <td style="vertical-align:top;">
          <select class="admin-select" style="padding: 5px 10px; font-size: 0.85rem; border-color:${getStatusBorderColor(order.status)}; font-weight:600;" onchange="updateOrderStatus('${order.orderId}', this.value)">
            <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Shipped" ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
            <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>
          ${(order.status === "Shipped" || order.status === "Delivered") ? `
            <div style="font-size:0.75rem; margin-top:8px; padding:6px; background-color:var(--secondary-pink); border-radius:4px; border:1px solid var(--border-light); line-height: 1.3;">
              <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
                <span style="background:linear-gradient(135deg, #667eea, #764ba2); color:#fff; font-size:0.6rem; padding:1px 5px; border-radius:3px; font-weight:600;">NimbusPost</span>
              </div>
              <div><b>Courier:</b> ${order.courierPartner || 'Delhivery'}</div>
              <div style="margin-top:2px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;"><b>AWB:</b> <span style="font-family:monospace; font-weight:600;">${order.trackingId || 'N/A'}</span></div>
              ${order.estimatedDelivery ? `<div style="margin-top:2px; color:#2F855A;"><b>Est:</b> ${order.estimatedDelivery}</div>` : ''}
            </div>
          ` : ''}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function getStatusBorderColor(status) {
  if (status === "Delivered") return "#38A169";
  if (status === "Shipped") return "#ECC94B";
  return "#D14175"; // Pending
}

window.updateOrderStatus = async function(orderId, newStatus) {
  if (newStatus === "Shipped") {
    openShippingModal(orderId);
  } else {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': getAdminPin()
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status on server');
      
      const order = await res.json();
      if (newStatus === "Delivered") {
        triggerDeliveredEmail(order);
      }
      
      showToast(`Order ${orderId} marked as ${newStatus}!`);
      await renderCRMOrdersTable();
    } catch (e) {
      console.error(e);
      showToast("Failed to update status on server", "error");
    }
  }
};

// ==========================================
// SHIPPING LOGISTICS MODAL LOGIC
// ==========================================
function setupShippingModalListeners() {
  const modal = document.getElementById("admin-shipping-modal");
  const closeBtn = document.getElementById("close-shipping-modal-btn");
  const form = document.getElementById("admin-shipping-form");
  
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      renderCRMOrdersTable(); // Revert visual select state
    });
  }

  if (form && modal) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const orderId = document.getElementById("shipping-order-id").value;
      const courier = document.getElementById("shipping-courier").value;
      const awb = document.getElementById("shipping-awb").value.trim();
      const weight = document.getElementById("shipping-weight") ? document.getElementById("shipping-weight").value : "0.5";
      
      saveOrderShipping(orderId, courier, awb, weight);
      modal.style.display = "none";
    });
  }

  // Email Viewer Modal close
  const emailViewerModal = document.getElementById("admin-email-viewer-modal");
  const emailViewerClose = document.getElementById("close-email-viewer-modal-btn");
  if (emailViewerClose && emailViewerModal) {
    emailViewerClose.addEventListener("click", () => {
      emailViewerModal.style.display = "none";
    });
  }
}

let currentShippingOrderId = null;

function openShippingModal(orderId) {
  const modal = document.getElementById("admin-shipping-modal");
  const orderIdInput = document.getElementById("shipping-order-id");
  const awbInput = document.getElementById("shipping-awb");
  const zoneInfo = document.getElementById("shipping-zone-info");
  const zoneText = document.getElementById("shipping-zone-text");
  const estDelivery = document.getElementById("shipping-est-delivery");
  const aiSuggestion = document.getElementById("shipping-ai-suggestion");
  const aiCourier = document.getElementById("ai-suggested-courier");
  const aiReason = document.getElementById("ai-suggestion-reason");
  const courierSelect = document.getElementById("shipping-courier");
  
  if (!modal || !orderIdInput || !awbInput) return;

  currentShippingOrderId = orderId;
  orderIdInput.value = orderId;
  
  // Generate NimbusPost AWB
  if (typeof generateNimbusAWB === "function") {
    awbInput.value = generateNimbusAWB();
  } else {
    const randDigits = Math.floor(100000000 + Math.random() * 900000000);
    awbInput.value = `NP-${randDigits}`;
  }
  
  // Auto-detect zone from order's pincode
  try {
    const ordersJSON = localStorage.getItem("missara_orders");
    if (ordersJSON) {
      const orders = JSON.parse(ordersJSON);
      const order = orders.find(o => o.orderId === orderId);
      if (order && order.customer.pincode && typeof checkPincode === "function") {
        const result = checkPincode(order.customer.pincode);
        if (result.serviceable) {
          // Show zone info
          if (zoneInfo) {
            zoneInfo.style.display = "block";
            zoneText.textContent = `Zone ${result.zone} (${result.zoneLabel}) • ${result.city}, ${result.state}`;
            estDelivery.textContent = `Est. Delivery: ${result.estimatedDate} (${result.estimatedDays.min}-${result.estimatedDays.max} days)`;
          }
          
          // Show AI suggestion
          if (aiSuggestion && typeof suggestCourier === "function") {
            const suggestion = suggestCourier(result.zone);
            aiSuggestion.style.display = "block";
            aiCourier.textContent = suggestion.courier;
            aiReason.textContent = suggestion.reason;
            
            // Auto-select suggested courier
            if (courierSelect) {
              for (let i = 0; i < courierSelect.options.length; i++) {
                if (courierSelect.options[i].value === suggestion.courier) {
                  courierSelect.selectedIndex = i;
                  break;
                }
              }
            }
          }
        } else {
          if (zoneInfo) zoneInfo.style.display = "none";
          if (aiSuggestion) aiSuggestion.style.display = "none";
        }
      }
    }
  } catch (e) {
    console.error("Zone detection error:", e);
  }
  
  modal.style.display = "flex";

  // Print Label button handler
  const printLabelBtn = document.getElementById("print-label-btn");
  if (printLabelBtn) {
    printLabelBtn.onclick = () => {
      printShippingLabel(orderId);
    };
  }
}

async function saveOrderShipping(orderId, courier, awb, weight) {
  try {
    const shippedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    let estimatedDelivery = "";
    
    // Fetch order first to get shipping pincode
    const orderRes = await fetch(`/api/orders/${orderId}`);
    if (!orderRes.ok) throw new Error('Order not found on server');
    const order = await orderRes.json();
    
    if (order.customer.pincode && typeof checkPincode === "function") {
      const result = checkPincode(order.customer.pincode);
      if (result.serviceable) {
        estimatedDelivery = result.estimatedDate;
      }
    }

    // Map selected courier name to courier ID
    const courierMap = {
      "delhivery": 1,
      "bluedart": 179,
      "xpressbees": 3,
      "dtdc": 1, // Fallback to Delhivery Air
      "ecomexpress": 1,
      "shadowfax": 1,
      "indiapost": 1
    };
    const normalizedCourier = (courier || "").toLowerCase().replace(/\s+/g, '');
    const selectedCourierId = courierMap[normalizedCourier] || 1;

    // Call Real NimbusPost Backend
    try {
      const nimbusPayload = {
        order_number: order.orderId,
        payment_type: order.paymentOption === "COD" ? "cod" : "prepaid",
        order_amount: order.grandTotal,
        package_weight: weight || 500, // assuming grams
        package_length: 10,
        package_width: 10,
        package_height: 10,
        auto_ship: 0,
        auto_pickup: 0,
        courier_id: selectedCourierId,
        consignee: {
          name: `${order.customer.firstname} ${order.customer.lastname}`,
          phone: order.customer.phone,
          address: order.customer.address,
          city: order.customer.city,
          state: order.customer.state,
          pincode: order.customer.pincode
        },
        pickup: {
          warehouse_name: "Primary",
          name: "Missara Admin",
          address: "Missara Store",
          city: "Jabalpur",
          state: "Madhya Pradesh",
          pincode: "482001",
          phone: "7692931715"
        },
        order_items: order.cart.map(item => ({
          name: item.title,
          qty: item.quantity,
          price: item.price,
          sku: `SKU-${item.id}`
        }))
      };

      const npRes = await fetch('/api/shipping/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': getAdminPin()
        },
        body: JSON.stringify(nimbusPayload)
      });
      
      const npData = await npRes.json();
      if (npRes.ok && npData.success && npData.awb) {
        // Automatically overwrite user-typed AWB with the real one returned by NimbusPost API
        awb = npData.awb; 
        console.log("NimbusPost generated real AWB:", awb);
      } else {
        console.warn("NimbusPost API error, falling back to simulated AWB:", npData);
        // It failed (e.g. invalid credentials or sandbox not working), keep the fake awb so user isn't stuck
      }
    } catch (apiErr) {
      console.warn("NimbusPost API route failed, using simulated AWB.", apiErr);
    }
    
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': getAdminPin()
      },
      body: JSON.stringify({
        status: "Shipped",
        courierPartner: courier,
        trackingId: awb,
        estimatedDelivery: estimatedDelivery,
        shippedDate: shippedDate,
        packageWeight: weight || "0.5"
      })
    });
    
    if (!res.ok) throw new Error('Failed to update shipping status on server');
    const updatedOrder = await res.json();
    
    // Trigger dispatch simulated email
    triggerDispatchedEmail(updatedOrder);
    
    showToast(`Order ${orderId} shipped via NimbusPost (${courier})!`);
    await renderCRMOrdersTable();
  } catch (e) {
    console.error(e);
    showToast("Failed to save shipping info", "error");
  }
}

// ==========================================
// EMAIL TRIGGER SIMULATORS
// ==========================================
function triggerDispatchedEmail(order) {
  if (typeof window.triggerSimulatedEmail !== "function") return;
  
  let itemsHtml = "";
  order.items.forEach(item => {
    itemsHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; margin-bottom:8px; border-bottom:1px solid #F0E6EA; padding-bottom:8px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <img src="${item.image}" style="width:35px; height:45px; object-fit:cover; border-radius:3px;" alt="${item.title}">
          <div>
            <div style="font-weight:600; color:#2D2D2D; font-size:0.85rem;">${item.title}</div>
            <div style="font-size:0.75rem; color:#718096;">Size: ${item.size} | Qty: ${item.quantity}</div>
          </div>
        </div>
        <div style="font-weight:600; color:#D14175; font-size:0.85rem;">₹${(item.price * item.quantity).toLocaleString()}</div>
      </div>
    `;
  });

  const emailBodyHtml = `
    <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #F0E6EA; padding: 25px; border-radius: 8px; background-color: #FCF9F6; box-shadow: 0 4px 12px rgba(209, 65, 117, 0.05);">
      <div style="text-align: center; border-bottom: 2px solid #D14175; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #D14175; font-family: 'Playfair Display', serif; margin: 0; font-size: 1.8rem; letter-spacing: 2px;">MISSARA.</h2>
        <span style="font-size: 0.7rem; letter-spacing: 2px; color: #718096; text-transform: uppercase;">Premium Indian Ethnic Wear</span>
      </div>
      <h3 style="color: #2D2D2D; font-family: 'Playfair Display', serif; font-size: 1.3rem; margin-bottom: 15px;">Your Selection has Shipped!</h3>
      <p style="font-size: 0.9rem; color: #2D2D2D;">Dear <b>${order.customer.name}</b>,</p>
      <p style="font-size: 0.9rem; color: #2D2D2D; line-height: 1.5;">Exciting news! Your custom ethnic wear outfits have been tailored, packed, and handed over to our logistics partner. Your package is on its way to you.</p>
      
      <div style="background-color: #FFFFFF; border: 1px solid #F0E6EA; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #D14175; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #F0E6EA; padding-bottom: 6px;">Shipment Details</h4>
        <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 5px;"><b>Order ID:</b> ${order.orderId}</div>
        <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 5px;"><b>Courier Partner:</b> ${order.courierPartner}</div>
        <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 5px;"><b>AWB Tracking ID:</b> <span style="font-family:monospace; font-weight:600; color:var(--primary-pink);">${order.trackingId}</span></div>
        <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 10px;"><b>Shipping Address:</b> ${order.customer.address}</div>
        
        <div style="border-top: 1px dashed #F0E6EA; padding-top: 10px; margin-top: 10px;">
          ${itemsHtml}
        </div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="track.html?orderId=${order.orderId}" target="_blank" style="background-color: #D14175; color: #FFFFFF; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: 600; display: inline-block; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Track Shipment Live</a>
      </div>
      
      <p style="font-size: 0.8rem; color: #718096; text-align: center; border-top: 1px solid #F0E6EA; padding-top: 15px; margin-top: 20px;">
        Missara Clothing, 1st Floor Agrawal Building, Bilhari Main Road, Jabalpur, MP - 482020.
        <br>Need support? Reply to this mail or call us at +91 9713962329.
      </p>
    </div>
  `;
  
  window.triggerSimulatedEmail(order.customer.email, `Your Missara order ${order.orderId} has been shipped!`, emailBodyHtml);
}

function triggerDeliveredEmail(order) {
  if (typeof window.triggerSimulatedEmail !== "function") return;
  
  let itemsHtml = "";
  order.items.forEach(item => {
    itemsHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; margin-bottom:8px; border-bottom:1px solid #F0E6EA; padding-bottom:8px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <img src="${item.image}" style="width:35px; height:45px; object-fit:cover; border-radius:3px;" alt="${item.title}">
          <div>
            <div style="font-weight:600; color:#2D2D2D; font-size:0.85rem;">${item.title}</div>
            <div style="font-size:0.75rem; color:#718096;">Size: ${item.size} | Qty: ${item.quantity}</div>
          </div>
        </div>
        <div style="font-weight:600; color:#D14175; font-size:0.85rem;">₹${(item.price * item.quantity).toLocaleString()}</div>
      </div>
    `;
  });

  const emailBodyHtml = `
    <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #F0E6EA; padding: 25px; border-radius: 8px; background-color: #FCF9F6; box-shadow: 0 4px 12px rgba(209, 65, 117, 0.05);">
      <div style="text-align: center; border-bottom: 2px solid #D14175; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #D14175; font-family: 'Playfair Display', serif; margin: 0; font-size: 1.8rem; letter-spacing: 2px;">MISSARA.</h2>
        <span style="font-size: 0.7rem; letter-spacing: 2px; color: #718096; text-transform: uppercase;">Premium Indian Ethnic Wear</span>
      </div>
      <h3 style="color: #2D2D2D; font-family: 'Playfair Display', serif; font-size: 1.3rem; margin-bottom: 15px;">Your Selection has been Delivered!</h3>
      <p style="font-size: 0.9rem; color: #2D2D2D;">Dear <b>${order.customer.name}</b>,</p>
      <p style="font-size: 0.9rem; color: #2D2D2D; line-height: 1.5;">We are delighted to inform you that your package containing your handcrafted outfits was successfully delivered today.</p>
      <p style="font-size: 0.9rem; color: #2D2D2D; line-height: 1.5;">We hope you love your new garments. We would be absolutely thrilled if you shared your experience and look by tagging <b>@MissaraClothing</b> on Instagram or leaving a review on our website.</p>
      
      <div style="background-color: #FFFFFF; border: 1px solid #F0E6EA; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #D14175; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #F0E6EA; padding-bottom: 6px;">Delivered Items</h4>
        <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 5px;"><b>Order ID:</b> ${order.orderId}</div>
        <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 10px;"><b>Delivered to:</b> ${order.customer.address}</div>
        
        <div style="border-top: 1px dashed #F0E6EA; padding-top: 10px; margin-top: 10px;">
          ${itemsHtml}
        </div>
      </div>
      
      <p style="font-size: 0.8rem; color: #718096; text-align: center; border-top: 1px solid #F0E6EA; padding-top: 15px; margin-top: 20px;">
        Missara Clothing, 1st Floor Agrawal Building, Bilhari Main Road, Jabalpur, MP - 482020.
        <br>Questions? Feedback? Reply to this mail or call us at +91 9713962329.
      </p>
    </div>
  `;
  
  window.triggerSimulatedEmail(order.customer.email, `Delivered: Your Missara boutique selection #${order.orderId}`, emailBodyHtml);
}

// ==========================================
// EMAIL LOGS TABLE RENDER (ADMIN VIEW)
// ==========================================
let adminEmailLogs = [];

async function renderEmailLogsTable() {
  const tbody = document.getElementById("admin-email-logs-tbody");
  if (!tbody) return;

  try {
    const res = await fetch('/api/emails', {
      headers: { 'x-admin-pin': getAdminPin() }
    });
    if (res.ok) adminEmailLogs = await res.json();
  } catch (e) {
    console.error(e);
  }

  if (adminEmailLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding: 40px; color:var(--text-muted); font-style:italic;">
          No email notifications sent yet.
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  adminEmailLogs.forEach(email => {
    html += `
      <tr>
        <td style="font-weight: 600; color: var(--text-dark);">${email.to}</td>
        <td style="color: var(--text-dark);">${email.subject}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${email.date}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary" style="width: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="previewEmailInAdmin(${email.id})">
            <i class="far fa-eye"></i> View HTML
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

window.previewEmailInAdmin = function(emailId) {
  const email = adminEmailLogs.find(e => e.id === emailId);
  if (!email) return;

  const modal = document.getElementById("admin-email-viewer-modal");
  const meta = document.getElementById("admin-email-meta-container");
  const body = document.getElementById("admin-email-body-container");

  if (modal && meta && body) {
    meta.innerHTML = `
      <div style="margin-bottom: 5px;"><b>Recipient:</b> ${email.to}</div>
      <div style="margin-bottom: 5px;"><b>Subject:</b> ${email.subject}</div>
      <div><b>Sent Date:</b> ${email.date}</div>
    `;
    body.innerHTML = email.body;
    modal.style.display = "flex";
  }
};

// ==========================================
// NIMBUSPOST SHIPPING LABEL PRINTER
// ==========================================
async function printShippingLabel(orderId) {
  let order;
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) order = await res.json();
  } catch(e) {}

  if (!order) {
    showToast("Order not found!", "error");
    return;
  }

  const awb = document.getElementById("shipping-awb") ? document.getElementById("shipping-awb").value : (order.trackingId || "N/A");
  const courier = document.getElementById("shipping-courier") ? document.getElementById("shipping-courier").value : (order.courierPartner || "Delhivery");
  const weight = document.getElementById("shipping-weight") ? document.getElementById("shipping-weight").value : (order.packageWeight || "0.5");
  const isCOD = (order.paymentMethod || "").toUpperCase().includes("COD");
  
  let pincodeResult = { zone: order.deliveryZone || "C", estimatedDate: order.estimatedDelivery || "" };
  if (order.customer.pincode && typeof checkPincode === "function") {
    const r = checkPincode(order.customer.pincode);
    if (r.serviceable) pincodeResult = r;
  }

  let itemsHtml = "";
  order.items.forEach((item, idx) => {
    itemsHtml += `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; font-size:11px;">${idx + 1}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; font-size:11px; font-weight:600;">${item.title}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; font-size:11px; text-align:center;">${item.size}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; font-size:11px; text-align:center;">${item.quantity}</td>
      </tr>
    `;
  });

  const labelHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Shipping Label - ${order.orderId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 550px; margin: 0 auto; }
        .label-border { border: 2px solid #1a1a1a; padding: 0; }
        .label-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 2px solid #1a1a1a; background: #f8f4f0; }
        .label-header h2 { font-size: 18px; letter-spacing: 3px; }
        .nimbus-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .addr-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .addr-box { padding: 12px 15px; font-size: 11px; line-height: 1.5; }
        .addr-box:first-child { border-right: 2px solid #1a1a1a; }
        .addr-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #888; margin-bottom: 6px; }
        .addr-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .awb-section { border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; padding: 12px 15px; text-align: center; background: #1a1a1a; color: #fff; }
        .awb-number { font-size: 22px; font-weight: 700; letter-spacing: 4px; font-family: 'Courier New', monospace; }
        .awb-label { font-size: 9px; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 15px; border-bottom: 1px solid #E2E8F0; font-size: 11px; }
        .info-row b { color: #1a1a1a; }
        .cod-badge { background: #E53E3E; color: #fff; padding: 3px 12px; border-radius: 3px; font-weight: 700; font-size: 12px; }
        .prepaid-badge { background: #38A169; color: #fff; padding: 3px 12px; border-radius: 3px; font-weight: 700; font-size: 12px; }
        .print-btn { display: block; margin: 20px auto; padding: 12px 40px; background: #D14175; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .print-btn:hover { background: #B8305F; }
        @media print { .print-btn { display: none; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="label-border">
        <div class="label-header">
          <h2>MISSARA.</h2>
          <span class="nimbus-badge">✈ NimbusPost</span>
        </div>
        
        <div class="addr-grid">
          <div class="addr-box">
            <div class="addr-label">From (Sender)</div>
            <div class="addr-name">MISSARA CLOTHING</div>
            <div>1st Floor, Agrawal Building,<br>Bilhari Main Road<br>Jabalpur, MP - 482020</div>
            <div style="margin-top:4px;">Ph: +91 9713962329</div>
          </div>
          <div class="addr-box">
            <div class="addr-label">To (Receiver)</div>
            <div class="addr-name">${order.customer.name}</div>
            <div>${order.customer.address}</div>
            <div style="margin-top:4px;">Ph: ${order.customer.phone}</div>
          </div>
        </div>
        
        <div class="awb-section">
          <div class="awb-label">AWB Tracking Number</div>
          <div class="awb-number">${awb}</div>
        </div>
        
        <div class="info-row"><b>Order ID:</b> <span>${order.orderId}</span></div>
        <div class="info-row"><b>Courier:</b> <span>${courier} (via NimbusPost)</span></div>
        <div class="info-row"><b>Weight:</b> <span>${weight} Kg</span></div>
        <div class="info-row"><b>Zone:</b> <span>${pincodeResult.zone || "C"} ${pincodeResult.city ? "(" + pincodeResult.city + ")" : ""}</span></div>
        <div class="info-row"><b>Est. Delivery:</b> <span>${pincodeResult.estimatedDate || "5-7 business days"}</span></div>
        <div class="info-row"><b>Payment:</b> <span>${isCOD ? '<span class="cod-badge">COD ₹' + order.total.toLocaleString() + '</span>' : '<span class="prepaid-badge">PREPAID</span>'}</span></div>
        
        <div style="padding: 10px 15px; border-top: 2px solid #1a1a1a;">
          <div style="font-size:9px; text-transform:uppercase; letter-spacing:1px; font-weight:700; color:#888; margin-bottom:6px;">Items in Package</div>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f4f0;">
                <th style="padding:5px 8px; font-size:10px; text-align:left;">#</th>
                <th style="padding:5px 8px; font-size:10px; text-align:left;">Item</th>
                <th style="padding:5px 8px; font-size:10px; text-align:center;">Size</th>
                <th style="padding:5px 8px; font-size:10px; text-align:center;">Qty</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>
        
        <div style="padding:8px 15px; text-align:center; font-size:9px; color:#888; border-top:1px solid #E2E8F0;">
          Generated by NimbusPost • ${new Date().toLocaleDateString("en-IN")} • Missara Clothing, Jabalpur MP
        </div>
      </div>
      
      <button class="print-btn" onclick="window.print()">🖨️ Print Shipping Label</button>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (printWindow) {
    printWindow.document.write(labelHtml);
    printWindow.document.close();
  }
}

// ==========================================
// PAYMENT GATEWAY SETTINGS MANAGEMENT
// ==========================================
async function loadPaymentSettingsForm() {
  let settings = {
    mode: "live",
    keyId: "rzp_live_T6hbbverISo2yt",
    keySecret: "",
    merchantName: "Missara Clothing",
    enableRazorpay: true,
    enableCod: true
  };
  
  try {
    const res = await fetch('/api/settings/payment');
    if (res.ok) {
      const dbSettings = await res.json();
      settings = { ...settings, ...dbSettings };
    }
  } catch (err) {
    console.error("Could not fetch settings from backend", err);
  }
  
  const modeEl = document.getElementById("razorpay-mode");
  const keyIdEl = document.getElementById("razorpay-key-id");
  const keySecretEl = document.getElementById("razorpay-key-secret");
  const merchantNameEl = document.getElementById("razorpay-merchant-name");
  const enableRazorpayEl = document.getElementById("pref-enable-razorpay");
  const enableCodEl = document.getElementById("pref-enable-cod");

  if (modeEl) modeEl.value = settings.mode || "test";
  if (keyIdEl) keyIdEl.value = settings.keyId || "";
  if (keySecretEl) keySecretEl.value = settings.keySecret || "";
  if (merchantNameEl) merchantNameEl.value = settings.merchantName || "";
  if (enableRazorpayEl) enableRazorpayEl.checked = settings.enableRazorpay !== false;
  if (enableCodEl) enableCodEl.checked = settings.enableCod !== false;
}

function setupPaymentSettingsHandler() {
  const form = document.getElementById("admin-payment-settings-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const settings = {
      mode: document.getElementById("razorpay-mode").value,
      keyId: document.getElementById("razorpay-key-id").value.trim(),
      keySecret: document.getElementById("razorpay-key-secret").value.trim(),
      merchantName: document.getElementById("razorpay-merchant-name").value.trim(),
      enableRazorpay: document.getElementById("pref-enable-razorpay").checked,
      enableCod: document.getElementById("pref-enable-cod").checked
    };

    const adminPin = localStorage.getItem("missara_admin_pin");
    
    try {
      const res = await fetch('/api/settings/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin
        },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        showToast("Payment Gateway Settings Saved to Database!");
      } else {
        const error = await res.json();
        showToast("Error saving settings: " + (error.error || "Unauthorized"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving settings to server", "error");
    }
  });
}
