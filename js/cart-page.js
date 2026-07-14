// Missara Clothing - Cart Page & Checkout Controller

let activeDiscountPercent = 0;
let appliedCouponCode = "";

document.addEventListener("DOMContentLoaded", () => {
  initCartPage();
});

function initCartPage() {
  // Determine which page we are on by checking container IDs
  if (document.getElementById("cart-items-container")) {
    renderCartPage();
    setupCartPageListeners();
  }

  if (document.getElementById("checkout-summary-items")) {
    renderCheckoutPage();
    setupCheckoutListeners();
  }
}

// ==========================================
// CART PAGE RENDERING
// ==========================================
function renderCartPage() {
  const emptyView = document.getElementById("cart-empty-view");
  const filledLayout = document.getElementById("cart-filled-layout");
  const container = document.getElementById("cart-items-container");

  if (!emptyView || !filledLayout) return;

  if (cart.length === 0) {
    emptyView.style.display = "block";
    filledLayout.style.display = "none";
    return;
  }

  emptyView.style.display = "none";
  filledLayout.style.display = "grid";

  if (!container) return;

  let html = "";
  cart.forEach(item => {
    html += `
      <div class="cart-item-row">
        <!-- Details Cell -->
        <div class="cart-product-cell">
          <img class="cart-product-img" src="${item.image}" alt="${item.title}">
          <div class="cart-product-info">
            <a href="product.html?id=${item.id}" class="cart-product-title">${item.title}</a>
            <span class="cart-product-meta">Category: ${item.category}</span>
            <span class="cart-product-meta">Size: <b>${item.size}</b></span>
          </div>
        </div>
        <!-- Price Cell -->
        <div style="font-weight: 500;">₹${item.price.toLocaleString()}</div>
        <!-- Quantity Editor Cell -->
        <div class="cart-qty-selector">
          <button class="cart-qty-btn" onclick="modifyCartPageQty(${item.id}, '${item.size}', -1)">-</button>
          <span style="font-weight: 600;">${item.quantity}</span>
          <button class="cart-qty-btn" onclick="modifyCartPageQty(${item.id}, '${item.size}', 1)">+</button>
        </div>
        <!-- Subtotal / Remove Cell -->
        <div class="cart-item-subtotal" style="display:flex; align-items:center; justify-content:space-between; padding-right:15px;">
          <span>₹${(item.price * item.quantity).toLocaleString()}</span>
          <button class="cart-remove-icon-btn" onclick="removeCartPageItem(${item.id}, '${item.size}')" title="Remove Item">
            <i class="far fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  calculateTotals();
}

window.modifyCartPageQty = function(id, size, change) {
  updateCartQty(id, size, change);
  // Re-read global state & re-render
  renderCartPage();
};

window.removeCartPageItem = function(id, size) {
  removeFromCart(id, size);
  renderCartPage();
};

function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate discount coupon deduction
  let discountAmount = 0;
  if (activeDiscountPercent > 0) {
    discountAmount = Math.round(subtotal * (activeDiscountPercent / 100));
  }

  const grandTotal = subtotal - discountAmount;

  // Render to DOM
  const subtotalEl = document.getElementById("summary-subtotal");
  const discountRow = document.getElementById("summary-discount-row");
  const discountValEl = document.getElementById("summary-discount-val");
  const grandTotalEl = document.getElementById("summary-grand-total");

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString()}`;
  
  if (discountRow && discountValEl) {
    if (discountAmount > 0) {
      discountRow.style.display = "flex";
      discountValEl.textContent = `-₹${discountAmount.toLocaleString()}`;
    } else {
      discountRow.style.display = "none";
    }
  }

  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString()}`;

  // Store active session parameters so checkout page can read them
  sessionStorage.setItem("missara_discount_percent", activeDiscountPercent);
  sessionStorage.setItem("missara_coupon_code", appliedCouponCode);
}

function setupCartPageListeners() {
  const couponForm = document.getElementById("coupon-form");
  if (!couponForm) return;

  couponForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("coupon-input").value.trim().toUpperCase();
    const msgEl = document.getElementById("coupon-applied-msg");

    if (code === "MISSARA10") {
      activeDiscountPercent = 10;
      appliedCouponCode = code;
      calculateTotals();
      
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "#2F855A";
        msgEl.innerHTML = `<i class="fas fa-check-circle"></i> Promo code <b>MISSARA10</b> applied! 10% Discount subtracted.`;
      }
      showToast("Coupon Applied Successfully!");
    } else {
      showToast("Invalid Coupon Code", "error");
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "#C53030";
        msgEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> Invalid promo code. Try using <b>MISSARA10</b>.`;
      }
    }
  });
}

// ==========================================
// CHECKOUT PAGE RENDERING & PROCESS
// ==========================================
function renderCheckoutPage() {
  // Prevent checkout access if cart is empty
  if (cart.length === 0) {
    showToast("Your Shopping Bag is empty", "error");
    setTimeout(() => {
      window.location.href = "cart.html";
    }, 500);
    return;
  }

  // ENFORCE AUTHENTICATION
  const token = localStorage.getItem('missara_token');
  if (!token) {
    window.location.href = "login.html?redirect=checkout.html";
    return;
  }

  const itemsContainer = document.getElementById("checkout-summary-items");
  if (!itemsContainer) return;

  // Prefill user data
  try {
    const userStr = localStorage.getItem('missara_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      // Split name into first and last
      const nameParts = user.name ? user.name.split(' ') : [''];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      const elFirst = document.getElementById('checkout-firstname');
      const elLast = document.getElementById('checkout-lastname');
      const elEmail = document.getElementById('checkout-email');
      const elPhone = document.getElementById('checkout-phone');
      
      if (elFirst && !elFirst.value) elFirst.value = firstName;
      if (elLast && !elLast.value) elLast.value = lastName;
      if (elEmail && !elEmail.value) elEmail.value = user.email || '';
      if (elPhone && !elPhone.value) elPhone.value = user.phone || '';
    }
  } catch(e) { console.error("Error prefilling user data", e); }

  // Load applied coupon parameters
  activeDiscountPercent = parseInt(sessionStorage.getItem("missara_discount_percent")) || 0;
  appliedCouponCode = sessionStorage.getItem("missara_coupon_code") || "";

  // Render items summary cards
  let itemsHTML = "";
  cart.forEach(item => {
    itemsHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom: 1px solid var(--border-light); padding-bottom:10px;">
        <div style="display:flex; gap:12px; align-items:center;">
          <img src="${item.image}" style="width:40px; height:55px; object-fit:cover; border-radius:4px;" alt="${item.title}">
          <div>
            <div style="font-size:0.85rem; font-weight:600; line-height:1.2; max-width: 180px;">${item.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Size: ${item.size} | Qty: ${item.quantity}</div>
          </div>
        </div>
        <div style="font-size:0.9rem; font-weight:600;">₹${(item.price * item.quantity).toLocaleString()}</div>
      </div>
    `;
  });
  itemsContainer.innerHTML = itemsHTML;

  // Invoicing Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = 0;
  if (activeDiscountPercent > 0) {
    discountAmount = Math.round(subtotal * (activeDiscountPercent / 100));
  }

  // Renders prices
  document.getElementById("checkout-subtotal").textContent = `₹${subtotal.toLocaleString()}`;
  
  const discountRow = document.getElementById("checkout-discount-row");
  const discountVal = document.getElementById("checkout-discount-val");
  if (discountAmount > 0 && discountRow && discountVal) {
    discountRow.style.display = "flex";
    discountVal.textContent = `-₹${discountAmount.toLocaleString()}`;
    
    // Add promo tag
    const codeTag = document.getElementById("checkout-coupon-tag");
    if (codeTag) {
      codeTag.style.display = "inline-block";
      codeTag.textContent = `Applied: ${appliedCouponCode}`;
    }
  }

  // Initialize checkout totals calculation
  setupPaymentOptionsVisibility();
  updateCheckoutTotals();
}

function updateCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = 0;
  if (activeDiscountPercent > 0) {
    discountAmount = Math.round(subtotal * (activeDiscountPercent / 100));
  }

  // Get shipping pincode details
  const pincodeInput = document.getElementById("checkout-pincode");
  const resultEl = document.getElementById("checkout-pincode-result");
  const shippingChargesEl = document.getElementById("checkout-shipping-charges");
  const codRow = document.getElementById("checkout-cod-row");
  const codChargesEl = document.getElementById("checkout-cod-charges");
  const grandTotalEl = document.getElementById("checkout-grand-total");

  let shippingCharge = 0;
  let isServiceable = false;

  if (pincodeInput && resultEl) {
    const pin = pincodeInput.value.trim();
    if (pin.length === 6) {
      if (typeof checkPincode === "function") {
        const result = checkPincode(pin);
        resultEl.style.display = "block";
        if (result.serviceable) {
          isServiceable = true;
          const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
          const totalWeight = totalItems * 0.5; // Assume 0.5kg per clothing item
          shippingCharge = calculateRate(result.zone, totalWeight);
          
          resultEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; color:#2F855A; padding:6px 10px; background:#F0FFF4; border-radius:4px; border:1px solid #C6F6D5;">
              <i class="fas fa-check-circle"></i>
              <span><b>Est. Delivery:</b> ${result.estimatedDate} (${result.estimatedDays.min}-${result.estimatedDays.max} days) • ${result.city}</span>
              <span style="margin-left:auto; font-size:0.7rem; background:#EBF8FF; color:#2B6CB0; padding:2px 6px; border-radius:8px;"><i class="fas fa-paper-plane" style="margin-right:2px;"></i>NimbusPost</span>
            </div>
          `;
          sessionStorage.setItem("missara_est_delivery", result.estimatedDate);
          sessionStorage.setItem("missara_delivery_zone", result.zone);
        } else {
          resultEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; color:#C53030; padding:6px 10px; background:#FFF5F5; border-radius:4px; border:1px solid #FED7D7;">
              <i class="fas fa-exclamation-circle"></i>
              <span>${result.error}</span>
            </div>
          `;
          sessionStorage.removeItem("missara_est_delivery");
          sessionStorage.removeItem("missara_delivery_zone");
        }
      }
    } else {
      resultEl.style.display = "none";
      sessionStorage.removeItem("missara_est_delivery");
      sessionStorage.removeItem("missara_delivery_zone");
    }
  }

  // Render shipping charges
  if (shippingChargesEl) {
    if (isServiceable) {
      shippingChargesEl.textContent = `₹${shippingCharge.toLocaleString()}`;
      shippingChargesEl.style.color = "var(--text-dark)";
    } else {
      shippingChargesEl.textContent = "—";
      shippingChargesEl.style.color = "var(--text-muted)";
    }
  }

  // COD Fee
  let codCharge = 0;
  const paymentRadioChecked = document.querySelector("input[name='payment-method']:checked");
  if (paymentRadioChecked && paymentRadioChecked.value === "cod") {
    if (typeof NIMBUSPOST !== "undefined") {
      codCharge = NIMBUSPOST.codCharge;
    } else {
      codCharge = 25;
    }
    if (codRow && codChargesEl) {
      codRow.style.display = "flex";
      codChargesEl.textContent = `₹${codCharge.toLocaleString()}`;
    }
  } else {
    if (codRow) codRow.style.display = "none";
  }

  // Calculate grand total
  const grandTotal = subtotal - discountAmount + shippingCharge + codCharge;

  // Render grand total
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString()}`;

  // Store for submission
  sessionStorage.setItem("missara_shipping_charge", shippingCharge);
  sessionStorage.setItem("missara_cod_charge", codCharge);
  sessionStorage.setItem("missara_grand_total", grandTotal);
}

function setupCheckoutListeners() {
  const form = document.getElementById("checkout-details-form");
  const successSection = document.getElementById("checkout-success-receipt");
  const checkoutFormLayout = document.getElementById("checkout-form-layout");

  // Payment radio selection toggle visual logic
  const paymentRadios = document.querySelectorAll("input[name='payment-method']");
  paymentRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      // Toggle inputs
      document.querySelectorAll(".payment-inputs-group").forEach(el => el.style.display = "none");
      const targetDiv = document.getElementById(`payment-details-${radio.value}`);
      if (targetDiv) targetDiv.style.display = "block";
      
      // Update totals with dynamic COD fee
      updateCheckoutTotals();
    });
  });

  // Pincode input events
  const pincodeInput = document.getElementById("checkout-pincode");
  if (pincodeInput) {
    pincodeInput.addEventListener("blur", updateCheckoutTotals);
    pincodeInput.addEventListener("input", () => {
      if (pincodeInput.value.trim().length === 6) {
        updateCheckoutTotals();
      }
    });
  }

  if (!form || !successSection || !checkoutFormLayout) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Check pincode serviceability
    const pincode = document.getElementById("checkout-pincode").value.trim();
    const result = typeof checkPincode === "function" ? checkPincode(pincode) : { serviceable: false };
    if (!result.serviceable) {
      showToast("Selected delivery pincode is not serviceable. Please enter a valid Indian pincode.", "error");
      displayPaymentErrorAlert("Delivery pincode is not serviceable. Please enter a valid Indian pincode.");
      return;
    }

    // Fetch buyer details
    const email = document.getElementById("checkout-email").value.trim();
    const firstname = document.getElementById("checkout-firstname").value.trim();
    const lastname = document.getElementById("checkout-lastname").value.trim();
    const phone = document.getElementById("checkout-phone").value.trim();
    const address = document.getElementById("checkout-address").value.trim();
    const city = document.getElementById("checkout-city").value.trim();
    const state = document.getElementById("checkout-state").value;
    const paymentOption = document.querySelector("input[name='payment-method']:checked").value.toUpperCase();

    // Compile order invoice
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;
    if (activeDiscountPercent > 0) {
      discountAmount = Math.round(subtotal * (activeDiscountPercent / 100));
    }
    
    // Get stored shipping/cod/grand total values
    const shippingCharge = parseInt(sessionStorage.getItem("missara_shipping_charge")) || 0;
    const codCharge = parseInt(sessionStorage.getItem("missara_cod_charge")) || 0;
    const grandTotal = parseInt(sessionStorage.getItem("missara_grand_total")) || (subtotal - discountAmount + shippingCharge + codCharge);
    
    // Generate Order ID
    const orderId = `MS-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      orderId, email, firstname, lastname, phone, address, city, state, pincode, paymentOption, subtotal, discountAmount, grandTotal,
      shippingCharge, codCharge,
      estimatedDelivery: sessionStorage.getItem("missara_est_delivery") || "",
      deliveryZone: sessionStorage.getItem("missara_delivery_zone") || "C"
    };

    if (paymentOption === "COD") {
      completeCheckoutOrder(orderData);
    } else {
      openPaymentGateway(orderData);
    }
  });
}

// ==========================================
// RAZORPAY PAYMENT GATEWAY INTEGRATION
// ==========================================
async function openPaymentGateway(orderData) {
  let settings = { keyId: "rzp_live_T6hbbverISo2yt", merchantName: "Missara Clothing" };
  try {
    const resSettings = await fetch('/api/settings/payment');
    if (resSettings.ok) settings = await resSettings.json();
  } catch (e) {
    console.error("Could not load settings", e);
  }
  
  try {
    const res = await fetch('/api/pay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: orderData.grandTotal, orderId: orderData.orderId })
    });
    if (!res.ok) throw new Error('Failed to create payment order on server');
    const payOrder = await res.json();
    
    if (payOrder.sandbox) {
      // Sandbox mode
      openMockRazorpayGateway(orderData, settings);
    } else {
      // Real Razorpay Integration
      if (typeof Razorpay !== "undefined") {
        const options = {
          "key": payOrder.keyId,
          "amount": payOrder.amount,
          "currency": payOrder.currency,
          "order_id": payOrder.id,
          "name": settings.merchantName,
          "description": `Order ${orderData.orderId}`,
          "image": "images/logo.png",
          "handler": async function (response) {
            try {
              // Verify signature on backend
              const verifyRes = await fetch('/api/pay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });
              
              if (!verifyRes.ok) throw new Error('Signature verification failed');
              const verifyResult = await verifyRes.json();
              
              if (verifyResult.verified) {
                orderData.paymentOption = `Razorpay (Paid: ${response.razorpay_payment_id})`;
                completeCheckoutOrder(orderData);
              } else {
                throw new Error('Payment verification unsuccessful');
              }
            } catch (err) {
              showToast("Payment verification failed", "error");
              displayPaymentErrorAlert("Payment verification failed on the server. Please contact support or try COD.");
            }
          },
          "prefill": {
            "name": `${orderData.firstname} ${orderData.lastname}`,
            "email": orderData.email,
            "contact": orderData.phone
          },
          "notes": {
            "address": `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}`
          },
          "theme": {
            "color": "#D14175"
          }
        };
        
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
          showToast("Payment failed: " + response.error.description, "error");
          displayPaymentErrorAlert("Razorpay Payment Failed: " + response.error.description);
        });
        rzp.open();
      } else {
        console.warn("Razorpay SDK not found, falling back to Sandbox.");
        openMockRazorpayGateway(orderData, settings);
      }
    }
  } catch (e) {
    console.error("Payment setup error:", e);
    showToast("Payment initialization failed", "error");
    displayPaymentErrorAlert("Failed to initialize payment gateway. Please try again or choose Cash on Delivery.");
  }
}

function openMockRazorpayGateway(orderData, settings) {
  const modal = document.getElementById("missara-pay-gateway-modal");
  const totalAmt = document.getElementById("gateway-total-amt");
  const merchantNameEl = document.getElementById("mock-rzp-merchant");
  
  if (!modal) return;
  
  if (totalAmt) totalAmt.textContent = `₹${orderData.grandTotal.toLocaleString()}`;
  if (merchantNameEl) merchantNameEl.textContent = settings.merchantName;
  
  modal.style.display = "flex";
  
  // Setup Simulator Handlers
  const btnSuccess = document.getElementById("gateway-btn-success");
  const btnFailure = document.getElementById("gateway-btn-failure");
  const btnCancel = document.getElementById("gateway-btn-cancel");
  
  btnSuccess.onclick = () => {
    modal.style.display = "none";
    const mockPaymentId = `pay_mock_${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    orderData.paymentOption = `Razorpay Sandbox (Txn: ${mockPaymentId})`;
    completeCheckoutOrder(orderData);
  };
  
  btnFailure.onclick = () => {
    modal.style.display = "none";
    showToast("Transaction declined.", "error");
    displayPaymentErrorAlert("Razorpay Sandbox Payment Declined. Please try again or select Cash on Delivery.");
  };
  
  btnCancel.onclick = () => {
    modal.style.display = "none";
    showToast("Payment cancelled.", "error");
  };
}

async function setupPaymentOptionsVisibility() {
  let settings = { enableRazorpay: true, enableCod: true };
  try {
    const resSettings = await fetch('/api/settings/payment');
    if (resSettings.ok) settings = await resSettings.json();
  } catch (e) {
    console.error("Could not load settings", e);
  }
  const rzpCard = document.getElementById("option-razorpay-card");
  const codCard = document.getElementById("option-cod-card");
  
  if (rzpCard) rzpCard.style.display = settings.enableRazorpay ? "block" : "none";
  if (codCard) codCard.style.display = settings.enableCod ? "block" : "none";
  
  // Update Checked Radios
  const rzpRadio = document.querySelector("input[name='payment-method'][value='razorpay']");
  const codRadio = document.querySelector("input[name='payment-method'][value='cod']");
  
  if (settings.enableRazorpay && rzpRadio) {
    rzpRadio.checked = true;
    const detailsRzp = document.getElementById("payment-details-razorpay");
    if (detailsRzp) detailsRzp.style.display = "block";
    const detailsCod = document.getElementById("payment-details-cod");
    if (detailsCod) detailsCod.style.display = "none";
  } else if (settings.enableCod && codRadio) {
    codRadio.checked = true;
    const detailsRzp = document.getElementById("payment-details-razorpay");
    if (detailsRzp) detailsRzp.style.display = "none";
    const detailsCod = document.getElementById("payment-details-cod");
    if (detailsCod) detailsCod.style.display = "block";
  }
}

function displayPaymentErrorAlert(msg) {
  let errorBanner = document.getElementById("checkout-payment-error-banner");
  if (!errorBanner) {
    errorBanner = document.createElement("div");
    errorBanner.id = "checkout-payment-error-banner";
    errorBanner.style.backgroundColor = "#FFF5F5";
    errorBanner.style.borderLeft = "4px solid #E53E3E";
    errorBanner.style.padding = "15px 20px";
    errorBanner.style.borderRadius = "4px";
    errorBanner.style.fontSize = "0.9rem";
    errorBanner.style.color = "#C53030";
    errorBanner.style.marginBottom = "25px";
    errorBanner.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i> <span id="payment-error-text"></span>`;
    
    const checkoutDetailsForm = document.getElementById("checkout-details-form");
    if (checkoutDetailsForm) {
      checkoutDetailsForm.insertBefore(errorBanner, checkoutDetailsForm.firstChild);
    }
  }
  
  const textEl = document.getElementById("payment-error-text");
  if (textEl) textEl.textContent = msg;
  errorBanner.style.display = "block";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function completeCheckoutOrder(orderData) {
  // Hide error banner if showing
  const errorBanner = document.getElementById("checkout-payment-error-banner");
  if (errorBanner) errorBanner.style.display = "none";

  const successSection = document.getElementById("checkout-success-receipt");
  const checkoutFormLayout = document.getElementById("checkout-form-layout");
  
  // Render receipt details
  document.getElementById("receipt-order-id").textContent = orderData.orderId;
  document.getElementById("receipt-cust-name").textContent = `${orderData.firstname} ${orderData.lastname}`;
  document.getElementById("receipt-cust-email").textContent = orderData.email;
  document.getElementById("receipt-cust-phone").textContent = orderData.phone;
  document.getElementById("receipt-cust-address").textContent = `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}`;
  document.getElementById("receipt-payment-method").textContent = orderData.paymentOption;
  document.getElementById("receipt-grand-total").textContent = `₹${orderData.grandTotal.toLocaleString()}`;

  // Render receipt shipping and COD charges
  const shippingRow = document.getElementById("receipt-shipping-row");
  const shippingChargeEl = document.getElementById("receipt-shipping-charge");
  if (shippingRow && shippingChargeEl) {
    shippingRow.style.display = "flex";
    shippingChargeEl.textContent = orderData.shippingCharge > 0 ? `₹${orderData.shippingCharge.toLocaleString()}` : "FREE";
    if (orderData.shippingCharge === 0) {
      shippingChargeEl.style.color = "#2F855A";
      shippingChargeEl.style.fontWeight = "600";
    } else {
      shippingChargeEl.style.color = "var(--text-dark)";
      shippingChargeEl.style.fontWeight = "normal";
    }
  }

  const codRow = document.getElementById("receipt-cod-row");
  const codChargeEl = document.getElementById("receipt-cod-charge");
  if (codRow && codChargeEl) {
    if (orderData.codCharge > 0) {
      codRow.style.display = "flex";
      codChargeEl.textContent = `₹${orderData.codCharge.toLocaleString()}`;
    } else {
      codRow.style.display = "none";
    }
  }

  // Render receipt items
  const receiptItemsContainer = document.getElementById("receipt-items-summary");
  if (receiptItemsContainer) {
    let receiptHTML = "";
    cart.forEach(item => {
      receiptHTML += `
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">
          <span>${item.title} (${item.size}) x ${item.quantity}</span>
          <span>₹${(item.price * item.quantity).toLocaleString()}</span>
        </div>
      `;
    });
    receiptItemsContainer.innerHTML = receiptHTML;
  }

  // Save order details to database
  const newOrder = {
    orderId: orderData.orderId,
    customer: {
      name: `${orderData.firstname} ${orderData.lastname}`,
      email: orderData.email,
      phone: orderData.phone,
      address: `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}`,
      city: orderData.city,
      state: orderData.state,
      pincode: orderData.pincode
    },
    items: cart.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
      size: item.size,
      quantity: item.quantity,
      category: item.category
    })),
    subtotal: orderData.subtotal,
    discount: orderData.discountAmount,
    shippingCharge: orderData.shippingCharge,
    codCharge: orderData.codCharge,
    total: orderData.grandTotal,
    paymentMethod: orderData.paymentOption,
    estimatedDelivery: orderData.estimatedDelivery || "",
    deliveryZone: orderData.deliveryZone || "C"
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });
    
    if (!response.ok) throw new Error('Order creation on server failed');

    // Save email address locally for custom customer mailbox widget querying
    localStorage.setItem("missara_customer_email", orderData.email);

    // Clear actual cart state & update local storage
    const cartToEmail = [...cart];
    cart = [];
    saveCartState();

    // Trigger simulated order confirmation email
    if (typeof window.triggerSimulatedEmail === "function") {
      let emailItemsHtml = "";
      cartToEmail.forEach(item => {
        emailItemsHtml += `
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
          <h3 style="color: #2D2D2D; font-family: 'Playfair Display', serif; font-size: 1.3rem; margin-bottom: 15px;">Your Order has been Placed!</h3>
          <p style="font-size: 0.9rem; color: #2D2D2D;">Dear <b>${orderData.firstname} ${orderData.lastname}</b>,</p>
          <p style="font-size: 0.9rem; color: #2D2D2D; line-height: 1.5;">Thank you for shopping with Missara Clothing. We have received your order, and our boutique staff has started custom tailoring your selection. You will receive another update as soon as your package ships.</p>
          
          <div style="background-color: #FFFFFF; border: 1px solid #F0E6EA; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #D14175; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #F0E6EA; padding-bottom: 6px;">Order Receipt</h4>
            <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 5px;"><b>Order ID:</b> ${orderData.orderId}</div>
            <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 5px;"><b>Payment Mode:</b> ${orderData.paymentOption}</div>
            <div style="font-size: 0.85rem; color: #2D2D2D; margin-bottom: 12px;"><b>Shipping to:</b> ${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}</div>
            
            <div style="border-top: 1px dashed #F0E6EA; padding-top: 10px; margin-top: 10px;">
              ${emailItemsHtml}
            </div>
            
            <div style="margin-top: 15px; border-top: 1px dashed #F0E6EA; padding-top: 10px; font-size: 0.85rem; color: #2D2D2D;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Subtotal:</span>
                <span>₹${orderData.subtotal.toLocaleString()}</span>
              </div>
              ${orderData.discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #C53030;">
                <span>Coupon Discount:</span>
                <span>-₹${orderData.discountAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Shipping & Handling (via NimbusPost):</span>
                <span>${orderData.shippingCharge > 0 ? `₹${orderData.shippingCharge.toLocaleString()}` : 'FREE'}</span>
              </div>
              ${orderData.codCharge > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>COD Handling Fee:</span>
                <span>₹${orderData.codCharge.toLocaleString()}</span>
              </div>
              ` : ''}
            </div>
            
            <div style="display: flex; justify-content: space-between; font-weight: 700; color: #D14175; font-size: 0.95rem; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F0E6EA;">
              <span>Grand Total:</span>
              <span>₹${orderData.grandTotal.toLocaleString()}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="track.html?orderId=${orderData.orderId}" target="_blank" style="background-color: #D14175; color: #FFFFFF; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: 600; display: inline-block; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Track Your Outfit Live</a>
          </div>
          
          <p style="font-size: 0.8rem; color: #718096; text-align: center; border-top: 1px solid #F0E6EA; padding-top: 15px; margin-top: 20px;">
            Missara Clothing, 1st Floor Agrawal Building, Bilhari Main Road, Jabalpur, MP - 482020.
            <br>Need support? Reply to this mail or call us at +91 9713962329.
          </p>
        </div>
      `;
      await window.triggerSimulatedEmail(orderData.email, `Order Confirmation - ${orderData.orderId}`, emailBodyHtml);
    }

    // Toggle sections to show receipt screen
    checkoutFormLayout.style.display = "none";
    successSection.style.display = "block";
    
    // Scroll window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Order Placed Successfully!");
  } catch (err) {
    console.error("Failed to submit order:", err);
    showToast("Failed to place order. Database offline.", "error");
    displayPaymentErrorAlert("We experienced a database connectivity issue. Please try again in a few moments.");
  }
}

