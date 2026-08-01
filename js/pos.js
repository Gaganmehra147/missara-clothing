// Missara Clothing - POS Billing Controller

let posCart = [];
let posProductsList = [];
let selectedPaymentMode = 'Cash';
let currentHeldBills = [];

document.addEventListener("DOMContentLoaded", () => {
  initPOSController();
});

function initPOSController() {
  loadPOSProducts();
  setupPOSListeners();
  updateHoldCountBadge();
}

// 1. Load Products for POS Counter
async function loadPOSProducts(query = "") {
  try {
    const res = await fetch(`/api/pos/products?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      posProductsList = await res.json();
      renderPOSProductsGrid(posProductsList);
    }
  } catch (err) {
    console.error("Error loading POS products:", err);
  }
}

function renderPOSProductsGrid(products) {
  const container = document.getElementById("pos-product-grid");
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `<div style="grid-column: span 3; text-align:center; padding:30px; color:var(--text-muted);">No products found</div>`;
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="pos-prod-card" data-id="${p.id}" style="border:1px solid var(--border-light); border-radius:6px; padding:8px; text-align:center; background:#fff; cursor:pointer; transition:transform 0.2s, border-color 0.2s;" onclick="addPOSItemFromCard(${p.id})">
      <img src="${p.image || 'images/hero_banner_1.png'}" style="width:100%; height:90px; object-fit:cover; border-radius:4px; margin-bottom:5px;">
      <div style="font-weight:700; font-size:0.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-dark);">${p.title}</div>
      <div style="font-size:0.72rem; color:var(--text-muted);">${p.sku || ('SKU-' + p.id)}</div>
      <div style="font-weight:800; color:var(--primary-pink); font-size:0.85rem; margin-top:3px;">₹${p.price}</div>
    </div>
  `).join('');
}

// 2. Barcode & Search Handlers
function setupPOSListeners() {
  const barcodeInput = document.getElementById("pos-barcode-input");
  const catalogSearch = document.getElementById("pos-catalog-search");
  const categorySelect = document.getElementById("pos-catalog-category");

  const searchAddBtn = document.getElementById("btn-pos-search-add");

  if (barcodeInput) {
    barcodeInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = barcodeInput.value.trim();
        if (!code) return;
        await handleBarcodeScan(code);
        barcodeInput.value = "";
      }
    });
  }

  if (searchAddBtn && barcodeInput) {
    searchAddBtn.addEventListener("click", async () => {
      const code = barcodeInput.value.trim();
      if (!code) {
        if (typeof showToast === "function") showToast("Please type or scan Barcode/SKU first", "error");
        return;
      }
      await handleBarcodeScan(code);
      barcodeInput.value = "";
    });
  }

  if (catalogSearch) {
    catalogSearch.addEventListener("input", () => {
      const q = catalogSearch.value.trim();
      loadPOSProducts(q);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      const cat = categorySelect.value;
      if (!cat) renderPOSProductsGrid(posProductsList);
      else {
        const filtered = posProductsList.filter(p => p.category === cat);
        renderPOSProductsGrid(filtered);
      }
    });
  }

  // Manual Custom Item Addition Listener
  const addManualBtn = document.getElementById("btn-pos-add-manual");
  const manualNameInput = document.getElementById("pos-manual-name");
  const manualPriceInput = document.getElementById("pos-manual-price");
  const manualQtyInput = document.getElementById("pos-manual-qty");

  function handleAddManualCustomItem() {
    const title = (manualNameInput ? manualNameInput.value.trim() : "") || "Custom Item";
    const price = Number(manualPriceInput ? manualPriceInput.value : 0);
    const qty = Number((manualQtyInput ? manualQtyInput.value : 1) || 1);

    if (price <= 0 || isNaN(price)) {
      if (typeof showToast === "function") showToast("Please enter a valid Price for custom item", "error");
      return;
    }

    const customProduct = {
      productId: Date.now(),
      sku: "CUSTOM-" + Math.floor(100 + Math.random() * 900),
      title: title,
      sizes: ["FS"],
      price: price,
      originalPrice: price,
      inventory: 99
    };

    addPOSItemToCart(customProduct);

    if (qty > 1) {
      const idx = posCart.findIndex(i => i.productId === customProduct.productId);
      if (idx >= 0) {
        posCart[idx].quantity = qty;
        posCart[idx].total = qty * price;
        renderPOSTicket();
      }
    }

    if (typeof showToast === "function") showToast(`Added Custom Item: ${title} (₹${price})`);

    if (manualNameInput) manualNameInput.value = "";
    if (manualPriceInput) manualPriceInput.value = "";
    if (manualQtyInput) manualQtyInput.value = "1";
  }

  if (addManualBtn) addManualBtn.addEventListener("click", handleAddManualCustomItem);
  if (manualPriceInput) {
    manualPriceInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddManualCustomItem();
      }
    });
  }

  // Payment Mode Selectors
  document.querySelectorAll(".pos-pay-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pos-pay-mode-btn").forEach(b => {
        b.classList.remove("active");
        b.style.background = "#fff";
        b.style.color = "var(--text-dark)";
        b.style.borderColor = "var(--border-light)";
      });
      btn.classList.add("active");
      btn.style.background = "var(--primary-pink)";
      btn.style.color = "#fff";
      btn.style.borderColor = "var(--primary-pink)";
      selectedPaymentMode = btn.dataset.mode || "Cash";
    });
  });

  // Calculation Inputs
  const discountInput = document.getElementById("pos-calc-discount");
  const gstSelect = document.getElementById("pos-calc-gst");
  if (discountInput) discountInput.addEventListener("input", calculatePOSTotals);
  if (gstSelect) gstSelect.addEventListener("change", calculatePOSTotals);

  // Action Buttons
  const completeBtn = document.getElementById("btn-pos-complete-print");
  const holdBtn = document.getElementById("btn-pos-hold");
  const resumeHoldBtn = document.getElementById("btn-pos-resume-hold");
  const clearAllBtn = document.getElementById("btn-pos-clear-all");

  if (completeBtn) completeBtn.addEventListener("click", completeAndPrintPOSBill);
  if (holdBtn) holdBtn.addEventListener("click", holdPOSOrder);
  if (resumeHoldBtn) resumeHoldBtn.addEventListener("click", openHoldBillsModal);
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearPOSTicket);

  // History & Day Close & Ledger
  const openDayCloseBtn = document.getElementById("btn-open-day-close");
  const openLedgerBtn = document.getElementById("btn-open-ledger");
  const refreshBillsBtn = document.getElementById("btn-refresh-bills");

  if (openDayCloseBtn) openDayCloseBtn.addEventListener("click", openDayCloseModal);
  if (openLedgerBtn) openLedgerBtn.addEventListener("click", openLedgerModal);
  if (refreshBillsBtn) refreshBillsBtn.addEventListener("click", loadPOSBillsHistory);

  // Search in history
  const historySearch = document.getElementById("pos-bills-search");
  const historyDate = document.getElementById("pos-bills-date");
  if (historySearch) historySearch.addEventListener("input", loadPOSBillsHistory);
  if (historyDate) historyDate.addEventListener("change", loadPOSBillsHistory);

  // Modal Closers
  setupPOSModalClosers();
}

async function handleBarcodeScan(code) {
  try {
    let res = await fetch(`/api/pos/barcode/${encodeURIComponent(code)}`);
    if (res.ok) {
      const product = await res.json();
      addPOSItemToCart(product);
      if (typeof showToast === "function") showToast(`Added: ${product.title}`);
      return;
    }

    // Fallback: search products list by query
    res = await fetch(`/api/pos/products?q=${encodeURIComponent(code)}`);
    if (res.ok) {
      const list = await res.json();
      if (list && list.length > 0) {
        addPOSItemToCart(list[0]);
        if (typeof showToast === "function") showToast(`Added: ${list[0].title}`);
      } else {
        if (typeof showToast === "function") showToast(`No product matching "${code}"`, "error");
      }
    } else {
      if (typeof showToast === "function") showToast(`No item found for barcode: ${code}`, "error");
    }
  } catch (err) {
    console.error("Barcode scan error:", err);
  }
}

window.addPOSItemFromCard = function(productId) {
  const prod = posProductsList.find(p => p.id === productId);
  if (prod) addPOSItemToCart(prod);
};

function addPOSItemToCart(product) {
  const defaultSize = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : "Free Size";
  const existingIdx = posCart.findIndex(item => item.productId === product.id && item.size === defaultSize);

  if (existingIdx >= 0) {
    posCart[existingIdx].quantity += 1;
    posCart[existingIdx].total = posCart[existingIdx].quantity * posCart[existingIdx].price;
  } else {
    posCart.push({
      productId: product.id,
      sku: product.sku || (`MSR-${product.id}`),
      title: product.title,
      size: defaultSize,
      availableSizes: product.sizes || ["FS"],
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      quantity: 1,
      itemDiscount: 0,
      total: product.price
    });
  }
  renderPOSTicket();
}

function renderPOSTicket() {
  const tbody = document.getElementById("pos-ticket-items-body");
  if (!tbody) return;

  if (posCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No items in billing ticket</td></tr>`;
    calculatePOSTotals();
    return;
  }

  tbody.innerHTML = posCart.map((item, idx) => `
    <tr style="border-bottom:1px solid var(--border-light);">
      <td style="padding:6px 8px;">
        <div style="font-weight:600; color:var(--text-dark);">${item.title}</div>
        <div style="font-size:0.7rem; color:var(--text-muted);">${item.sku}</div>
      </td>
      <td style="padding:6px 4px; text-align:center;">
        <select onchange="changePOSItemSize(${idx}, this.value)" style="padding:2px; font-size:0.75rem; border:1px solid var(--border-light); border-radius:3px;">
          ${(item.availableSizes || ['FS']).map(s => `<option value="${s}" ${s === item.size ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="padding:6px 4px; text-align:center;">
        <div style="display:flex; align-items:center; justify-content:center; gap:3px;">
          <button type="button" onclick="updatePOSQty(${idx}, -1)" style="width:20px; height:20px; border:1px solid #ccc; background:#f0f0f0; border-radius:3px; cursor:pointer; font-weight:bold;">-</button>
          <span style="font-weight:700; width:18px; text-align:center;">${item.quantity}</span>
          <button type="button" onclick="updatePOSQty(${idx}, 1)" style="width:20px; height:20px; border:1px solid #ccc; background:#f0f0f0; border-radius:3px; cursor:pointer; font-weight:bold;">+</button>
        </div>
      </td>
      <td style="padding:6px 4px; text-align:right; font-weight:600;">₹${item.price}</td>
      <td style="padding:6px 4px; text-align:right; font-weight:700; color:var(--primary-pink);">₹${item.total}</td>
      <td style="padding:6px 4px; text-align:center;">
        <button type="button" onclick="removePOSItem(${idx})" style="color:#E53E3E; background:none; border:none; cursor:pointer; font-size:0.85rem;"><i class="fas fa-times"></i></button>
      </td>
    </tr>
  `).join('');

  calculatePOSTotals();
}

window.updatePOSQty = function(idx, change) {
  if (posCart[idx]) {
    posCart[idx].quantity += change;
    if (posCart[idx].quantity <= 0) {
      posCart.splice(idx, 1);
    } else {
      posCart[idx].total = posCart[idx].quantity * posCart[idx].price;
    }
    renderPOSTicket();
  }
};

window.changePOSItemSize = function(idx, newSize) {
  if (posCart[idx]) {
    posCart[idx].size = newSize;
  }
};

window.removePOSItem = function(idx) {
  if (posCart[idx]) {
    posCart.splice(idx, 1);
    renderPOSTicket();
  }
};

function calculatePOSTotals() {
  const subtotal = posCart.reduce((sum, item) => sum + item.total, 0);
  const discountInput = document.getElementById("pos-calc-discount");
  const gstSelect = document.getElementById("pos-calc-gst");

  const discountAmount = Math.max(0, Number(discountInput ? discountInput.value : 0));
  const gstPercent = Number(gstSelect ? gstSelect.value : 5);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = Math.round((taxableAmount * gstPercent) / 100);
  const grandTotal = Math.round(taxableAmount + gstAmount);

  const subtotalEl = document.getElementById("pos-calc-subtotal");
  const taxAmountEl = document.getElementById("pos-calc-tax-amount");
  const grandTotalEl = document.getElementById("pos-calc-grand-total");

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (taxAmountEl) taxAmountEl.textContent = `₹${gstAmount} (${gstPercent}%)`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal}`;

  return { subtotal, discountAmount, gstPercent, gstAmount, grandTotal };
}

function clearPOSTicket() {
  posCart = [];
  document.getElementById("pos-cust-name").value = "Walk-in Customer";
  document.getElementById("pos-cust-phone").value = "";
  document.getElementById("pos-calc-discount").value = "0";
  renderPOSTicket();
}

// 3. Complete Bill & Thermal Printing
async function completeAndPrintPOSBill() {
  if (posCart.length === 0) {
    if (typeof showToast === "function") showToast("Please add items to bill first", "error");
    return;
  }

  const custName = document.getElementById("pos-cust-name").value.trim() || "Walk-in Customer";
  const custPhone = document.getElementById("pos-cust-phone").value.trim();
  const totals = calculatePOSTotals();

  const payload = {
    customer: { name: custName, phone: custPhone },
    items: posCart,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    gstPercent: totals.gstPercent,
    gstAmount: totals.gstAmount,
    grandTotal: totals.grandTotal,
    paymentMode: selectedPaymentMode,
    cashierName: "Admin"
  };

  try {
    const res = await fetch('/api/pos/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof showToast === "function") showToast(`Bill #${data.bill.billNo} generated!`);
      
      // Open Thermal Receipt Print Modal
      showThermalReceiptModal(data.bill);
      clearPOSTicket();
      loadPOSProducts(); // Refresh stock inventory
    } else {
      if (typeof showToast === "function") showToast("Failed to complete bill", "error");
    }
  } catch (err) {
    console.error("Error creating bill:", err);
  }
}

function showThermalReceiptModal(bill) {
  const modal = document.getElementById("admin-thermal-print-modal");
  const receiptContainer = document.getElementById("printable-thermal-receipt");
  if (!modal || !receiptContainer) return;

  receiptContainer.innerHTML = `
    <div style="text-align:center; margin-bottom:10px;">
      <h3 style="margin:0; font-size:16px; font-weight:bold; letter-spacing:1px;">MISSARA CLOTHING</h3>
      <p style="margin:2px 0; font-size:11px;">Designer Wear & Boutique</p>
      <p style="margin:2px 0; font-size:10px; color:#555;">GSTIN: 23AAAAA0000A1Z5</p>
      <p style="margin:2px 0; font-size:10px; color:#555;">Ph: +91 98260 00000</p>
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      <p style="margin:2px 0; font-weight:bold;">TAX INVOICE</p>
      <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:5px;">
        <span>Bill #: <b>${bill.billNo}</b></span>
        <span>Date: ${bill.date}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px;">
        <span>Cust: ${bill.customer ? bill.customer.name : 'Walk-in'}</span>
        <span>Mob: ${bill.customer ? bill.customer.phone : '-'}</span>
      </div>
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
      <thead>
        <tr style="border-bottom:1px solid #000; text-align:left;">
          <th style="padding-bottom:4px;">Item</th>
          <th style="padding-bottom:4px; text-align:center;">Qty</th>
          <th style="padding-bottom:4px; text-align:right;">Rate</th>
          <th style="padding-bottom:4px; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${bill.items.map(i => `
          <tr>
            <td style="padding:3px 0;">${i.title} (${i.size})</td>
            <td style="padding:3px 0; text-align:center;">${i.quantity}</td>
            <td style="padding:3px 0; text-align:right;">₹${i.price}</td>
            <td style="padding:3px 0; text-align:right;">₹${i.total}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="border-top:1px dashed #000; padding-top:6px; font-size:11px;">
      <div style="display:flex; justify-content:space-between;">
        <span>Subtotal:</span>
        <span>₹${bill.subtotal}</span>
      </div>
      ${bill.discountAmount ? `<div style="display:flex; justify-content:space-between;"><span>Discount:</span><span>-₹${bill.discountAmount}</span></div>` : ''}
      <div style="display:flex; justify-content:space-between;">
        <span>GST (${bill.gstPercent}%):</span>
        <span>+₹${bill.gstAmount}</span>
      </div>
      <div style="border-top:1px solid #000; margin-top:4px; padding-top:4px; display:flex; justify-content:space-between; font-size:14px; font-weight:bold;">
        <span>TOTAL:</span>
        <span>₹${bill.grandTotal}</span>
      </div>
      <div style="margin-top:4px; font-size:10px; text-align:right; font-weight:bold;">
        Payment: ${bill.paymentMode}
      </div>
    </div>

    <div style="text-align:center; margin-top:15px; border-top:1px dashed #000; padding-top:10px; font-size:10px;">
      <p style="margin:2px 0; font-weight:bold;">Thank you for shopping with us!</p>
      <p style="margin:2px 0;">Visit Again • www.missaraclothing.com</p>
    </div>
  `;

  modal.style.display = "flex";

  const printBtn = document.getElementById("trigger-print-receipt-btn");
  if (printBtn) {
    printBtn.onclick = () => {
      const windowUrl = 'about:blank';
      const uniqueName = 'Receipt_' + bill.billNo;
      const printWindow = window.open(windowUrl, uniqueName, 'left=50,top=50,width=400,height=600');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Receipt - ${bill.billNo}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size:12px; margin:0; padding:15px; }
              @media print { body { margin:0; padding:0; } }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 500);">
            ${receiptContainer.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
    };
  }
}

// 4. Hold & Resume Order Logic
async function holdPOSOrder() {
  if (posCart.length === 0) {
    if (typeof showToast === "function") showToast("Cart is empty", "error");
    return;
  }
  const custName = document.getElementById("pos-cust-name").value.trim() || "Walk-in Customer";
  const totals = calculatePOSTotals();

  try {
    const res = await fetch('/api/pos/bills/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: custName },
        items: posCart,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        gstPercent: totals.gstPercent,
        grandTotal: totals.grandTotal,
        holdNote: `Hold at ${new Date().toLocaleTimeString('en-IN')}`
      })
    });

    if (res.ok) {
      if (typeof showToast === "function") showToast("Order held successfully!");
      clearPOSTicket();
      updateHoldCountBadge();
    }
  } catch (err) {
    console.error("Hold order error:", err);
  }
}

async function updateHoldCountBadge() {
  try {
    const res = await fetch('/api/pos/bills/hold');
    if (res.ok) {
      currentHeldBills = await res.json();
      const countEl = document.getElementById("hold-bills-count");
      if (countEl) countEl.textContent = currentHeldBills.length;
    }
  } catch (err) {
    console.error("Error updating hold count:", err);
  }
}

async function openHoldBillsModal() {
  await updateHoldCountBadge();
  const modal = document.getElementById("admin-hold-list-modal");
  const container = document.getElementById("hold-bills-container");
  if (!modal || !container) return;

  if (currentHeldBills.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-muted);">No held bills found</p>`;
  } else {
    container.innerHTML = currentHeldBills.map(h => `
      <div style="border:1px solid var(--border-light); border-radius:6px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; background:#fdfdfd;">
        <div>
          <div style="font-weight:700; color:var(--primary-pink);">${h.holdToken}</div>
          <div style="font-size:0.8rem; color:var(--text-dark);">${h.customer ? h.customer.name : 'Walk-in'} • ${h.items ? h.items.length : 0} items</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${h.holdNote} • Total: ₹${h.grandTotal}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" onclick="resumeHeldBill('${h.holdToken}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; width:auto;">Resume</button>
          <button type="button" onclick="deleteHeldBill('${h.holdToken}')" style="color:#E53E3E; background:none; border:none; cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `).join('');
  }

  modal.style.display = "flex";
}

window.resumeHeldBill = function(token) {
  const held = currentHeldBills.find(h => h.holdToken === token);
  if (held) {
    posCart = held.items || [];
    if (held.customer) {
      document.getElementById("pos-cust-name").value = held.customer.name || "Walk-in Customer";
      document.getElementById("pos-cust-phone").value = held.customer.phone || "";
    }
    renderPOSTicket();
    deleteHeldBill(token);
    document.getElementById("admin-hold-list-modal").style.display = "none";
    if (typeof showToast === "function") showToast("Held order restored!");
  }
};

window.deleteHeldBill = async function(token) {
  try {
    await fetch(`/api/pos/bills/hold/${token}`, { method: 'DELETE' });
    updateHoldCountBadge();
    openHoldBillsModal();
  } catch (err) {
    console.error("Delete hold error:", err);
  }
};

// 5. History, Day Close & Ledger
async function loadPOSBillsHistory() {
  const search = document.getElementById("pos-bills-search") ? document.getElementById("pos-bills-search").value : "";
  const date = document.getElementById("pos-bills-date") ? document.getElementById("pos-bills-date").value : "";
  const tbody = document.getElementById("pos-bills-history-table-body");
  if (!tbody) return;

  try {
    const res = await fetch(`/api/pos/bills?search=${encodeURIComponent(search)}&date=${encodeURIComponent(date)}`);
    if (res.ok) {
      const bills = await res.json();
      if (bills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No bills found</td></tr>`;
        return;
      }

      tbody.innerHTML = bills.map(b => `
        <tr>
          <td><b style="color:var(--primary-pink);">${b.billNo}</b></td>
          <td>${b.date}</td>
          <td>${b.customer ? b.customer.name : 'Walk-in'}<br><span style="font-size:0.75rem; color:var(--text-muted);">${b.customer ? b.customer.phone : ''}</span></td>
          <td>${b.items ? b.items.length : 0} Items</td>
          <td><span class="badge-tag">${b.paymentMode}</span></td>
          <td><b style="color:var(--text-dark);">₹${b.grandTotal}</b></td>
          <td style="text-align:center;">
            <button type="button" onclick="viewBillReceipt('${b.billNo}')" class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem; width:auto;">
              <i class="fas fa-print"></i> Thermal Slip
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error("Error loading bills history:", err);
  }
}

window.viewBillReceipt = async function(billNo) {
  try {
    const res = await fetch(`/api/pos/bills/${billNo}`);
    if (res.ok) {
      const bill = await res.json();
      showThermalReceiptModal(bill);
    }
  } catch (err) {
    console.error("Error fetching bill receipt:", err);
  }
};

async function openDayCloseModal() {
  const modal = document.getElementById("admin-day-close-modal");
  const body = document.getElementById("day-close-summary-body");
  if (!modal || !body) return;

  try {
    const res = await fetch('/api/pos/day-close/summary');
    if (res.ok) {
      const summary = await res.json();
      body.innerHTML = `
        <div style="background:#f8f9fa; border:1px solid #e2e8f0; border-radius:6px; padding:15px; margin-bottom:15px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>Date:</span><b>${summary.date}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>Total Bills Completed:</span><b>${summary.totalBills}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:var(--primary-pink); font-size:1.1rem; font-weight:bold;">
            <span>Total Gross Revenue:</span><span>₹${summary.totalSales}</span>
          </div>
          <hr style="border:none; border-top:1px dashed #cbd5e0; margin:10px 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>💵 Cash Sales:</span><b>₹${summary.cashSales}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>📱 UPI Sales:</span><b>₹${summary.upiSales}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>💳 Card Sales:</span><b>₹${summary.cardSales}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>📖 Dues/Credit Sales:</span><b>₹${summary.creditSales}</b>
          </div>
          <hr style="border:none; border-top:1px dashed #cbd5e0; margin:10px 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Total Tax Collected (GST):</span><b>₹${summary.totalTax}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Total Discounts Given:</span><b>₹${summary.totalDiscounts}</b>
          </div>
        </div>
      `;

      const saveBtn = document.getElementById("btn-save-day-close");
      if (saveBtn) {
        saveBtn.onclick = async () => {
          await fetch('/api/pos/day-close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary)
          });
          if (typeof showToast === "function") showToast("Day close summary saved!");
          modal.style.display = "none";
        };
      }
    }
  } catch (err) {
    console.error("Error loading day summary:", err);
  }

  modal.style.display = "flex";
}

async function openLedgerModal() {
  const modal = document.getElementById("admin-ledger-modal");
  const container = document.getElementById("ledger-table-container");
  if (!modal || !container) return;

  try {
    const res = await fetch('/api/pos/ledger');
    if (res.ok) {
      const customers = await res.json();
      if (customers.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-muted);">No customer credit dues recorded</p>`;
      } else {
        container.innerHTML = `
          <table class="catalog-table" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Total Dues</th>
                <th>Paid</th>
                <th>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map(c => `
                <tr>
                  <td><b>${c.name}</b></td>
                  <td>${c.phone}</td>
                  <td>₹${c.totalDue}</td>
                  <td style="color:green;">₹${c.totalPaid}</td>
                  <td><b style="color:red;">₹${c.balance}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  } catch (err) {
    console.error("Error loading customer ledger:", err);
  }

  modal.style.display = "flex";
}

function setupPOSModalClosers() {
  const closeThermal = document.getElementById("close-thermal-modal-btn");
  const closeDayClose = document.getElementById("close-day-close-modal-btn");
  const closeLedger = document.getElementById("close-ledger-modal-btn");
  const closeHold = document.getElementById("close-hold-modal-btn");

  if (closeThermal) closeThermal.onclick = () => document.getElementById("admin-thermal-print-modal").style.display = "none";
  if (closeDayClose) closeDayClose.onclick = () => document.getElementById("admin-day-close-modal").style.display = "none";
  if (closeLedger) closeLedger.onclick = () => document.getElementById("admin-ledger-modal").style.display = "none";
  if (closeHold) closeHold.onclick = () => document.getElementById("admin-hold-list-modal").style.display = "none";
}
