// Missara Clothing - Order Tracking Controller

document.addEventListener("DOMContentLoaded", () => {
  initTrackingPage();
});

function initTrackingPage() {
  const form = document.getElementById("order-lookup-form");
  const input = document.getElementById("order-id-input");
  
  if (!form || !input) return;

  // Process search query params (e.g. ?orderId=MS-108264)
  const urlParams = new URLSearchParams(window.location.search);
  const queryOrderId = urlParams.get("orderId");

  if (queryOrderId) {
    input.value = queryOrderId.trim().toUpperCase();
    performOrderLookup(queryOrderId.trim().toUpperCase());
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const orderId = input.value.trim().toUpperCase();
    if (orderId) {
      // Update URL search query without reloading
      const newUrl = `${window.location.pathname}?orderId=${encodeURIComponent(orderId)}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
      
      performOrderLookup(orderId);
    }
  });
}

async function performOrderLookup(orderId) {
  const loading = document.getElementById("lookup-loading");
  const errorView = document.getElementById("lookup-error");
  const errorMsg = document.getElementById("lookup-error-msg");
  const resultsLayout = document.getElementById("tracking-results-layout");

  if (!loading || !errorView || !resultsLayout) return;

  // Reset display states
  errorView.style.display = "none";
  resultsLayout.style.display = "none";
  loading.style.display = "block";

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    
    // Simulate loading lag for professional visual feedback
    setTimeout(() => {
      loading.style.display = "none";
      
      if (!res.ok) {
        errorView.style.display = "block";
        errorMsg.textContent = `Order ID "${orderId}" not found. Please confirm the code from your invoice receipt.`;
        return;
      }
      
      res.json().then(order => {
        // Render results
        renderOrderTracking(order);
        resultsLayout.style.display = "block";
      }).catch(err => {
        errorView.style.display = "block";
        errorMsg.textContent = "Error parsing order details from server.";
      });
    }, 600);
  } catch (e) {
    loading.style.display = "none";
    errorView.style.display = "block";
    errorMsg.textContent = "Logistics server offline. Please try again later.";
  }
}

function renderOrderTracking(order) {
  // 1. Render Timeline
  const stepPlaced = document.getElementById("timeline-step-placed");
  const stepProcessing = document.getElementById("timeline-step-processing");
  const stepShipped = document.getElementById("timeline-step-shipped");
  const stepDelivered = document.getElementById("timeline-step-delivered");
  const progressBar = document.getElementById("timeline-progress-bar");
  const statusMessage = document.getElementById("timeline-status-message");

  // Reset classes
  [stepPlaced, stepProcessing, stepShipped, stepDelivered].forEach(step => {
    if (step) {
      step.className = "timeline-step-item";
    }
  });

  let progressWidth = "0%";
  let statusHTML = "";

  const status = order.status || "Pending";

  if (status === "Pending") {
    // Stage 1 & 2: Placed & Processing
    if (stepPlaced) stepPlaced.classList.add("completed");
    if (stepProcessing) stepProcessing.classList.add("active");
    progressWidth = "33%";
    statusHTML = `🌸 <b>Tailoring in Progress:</b> Order placed successfully on ${order.date}. Our master weavers and tailors in Jabalpur, MP, are hand-tailoring your selection. Quality packaging will commence soon.`;
  } else if (status === "Shipped") {
    // Stage 3: Shipped
    if (stepPlaced) stepPlaced.classList.add("completed");
    if (stepProcessing) stepProcessing.classList.add("completed");
    if (stepShipped) stepShipped.classList.add("completed");
    if (stepDelivered) stepDelivered.classList.add("active");
    progressWidth = "66%";
    statusHTML = `🚚 <b>Dispatched via NimbusPost:</b> Your outfits have been shipped via <b>${order.courierPartner || "Logistics Partner"}</b> on ${order.shippedDate || "recently"}. <br>Tracking ID (AWB): <b style="font-family:monospace; font-size:1rem; color:var(--primary-pink);">${order.trackingId || "N/A"}</b>. ${order.estimatedDelivery ? '<br><span style="color:#2F855A; font-weight:600;">📅 Expected Delivery: ' + order.estimatedDelivery + '</span>' : 'Expected delivery within 2-3 business days.'}`;
  } else if (status === "Delivered") {
    // Stage 4: Delivered
    if (stepPlaced) stepPlaced.classList.add("completed");
    if (stepProcessing) stepProcessing.classList.add("completed");
    if (stepShipped) stepShipped.classList.add("completed");
    if (stepDelivered) stepDelivered.classList.add("completed");
    progressWidth = "100%";
    statusHTML = `💖 <b>Delivered:</b> Your Missara boutique order has been delivered! We hope you love your premium ethnic outfit. Tag us in your pictures at <b>@MissaraClothing</b> on Instagram.`;
  }

  if (progressBar) progressBar.style.width = progressWidth;
  if (statusMessage) statusMessage.innerHTML = statusHTML;

  // 2. Render Text Metadata Fields
  document.getElementById("detail-order-id").textContent = `#${order.orderId}`;
  document.getElementById("detail-customer-name").textContent = order.customer.name;
  document.getElementById("detail-customer-email").textContent = order.customer.email;
  document.getElementById("detail-customer-phone").textContent = order.customer.phone;
  document.getElementById("detail-customer-address").textContent = order.customer.address;
  document.getElementById("detail-placed-date").textContent = order.date;
  document.getElementById("detail-payment-method").textContent = order.paymentMethod;

  // Courier display row
  const courierRow = document.getElementById("details-courier-row");
  if (courierRow) {
    if (status === "Shipped" || status === "Delivered") {
      courierRow.style.display = "block";
      document.getElementById("detail-courier-partner").textContent = (order.courierPartner || "N/A") + (order.shippingPartner ? ` (via ${order.shippingPartner})` : "");
      document.getElementById("detail-courier-awb").textContent = order.trackingId || "N/A";
      
      // Show estimated delivery
      const estDeliveryEl = document.getElementById("detail-est-delivery");
      if (estDeliveryEl) {
        if (order.estimatedDelivery) {
          if (status === "Shipped") {
            // Calculate days remaining
            const estDate = new Date(order.estimatedDelivery);
            const today = new Date();
            const diffTime = estDate.getTime() - today.getTime();
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            estDeliveryEl.innerHTML = `${order.estimatedDelivery} <span style="background-color:#EBF8FF; color:#2B6CB0; font-size:0.72rem; padding:2px 8px; border-radius:10px; margin-left:6px;">${diffDays > 0 ? diffDays + ' days away' : 'Arriving today!'}</span>`;
          } else {
            estDeliveryEl.textContent = order.estimatedDelivery;
          }
        } else {
          estDeliveryEl.textContent = "3-5 business days";
        }
      }
      
      // Set NimbusPost tracking URL
      const trackBtn = document.getElementById("detail-track-nimbus-btn");
      if (trackBtn && order.trackingId) {
        if (typeof getNimbusTrackingUrl === "function") {
          trackBtn.href = getNimbusTrackingUrl(order.trackingId);
        } else {
          trackBtn.href = `https://ship.nimbuspost.com/shipping/tracking/${encodeURIComponent(order.trackingId)}`;
        }
      }

      // Populate shipping charges and COD fee in Logistics panel
      const shippingCharge = order.shippingCharge !== undefined ? order.shippingCharge : 0;
      const codCharge = order.codCharge !== undefined ? order.codCharge : 0;

      const detailShippingEl = document.getElementById("detail-shipping-charges");
      if (detailShippingEl) {
        detailShippingEl.textContent = shippingCharge > 0 ? `₹${shippingCharge.toLocaleString()}` : "FREE";
        detailShippingEl.style.color = shippingCharge === 0 ? "#2F855A" : "var(--text-dark)";
        detailShippingEl.style.fontWeight = shippingCharge === 0 ? "600" : "normal";
      }

      const detailCodRow = document.getElementById("detail-cod-row");
      const detailCodEl = document.getElementById("detail-cod-charges");
      if (detailCodRow && detailCodEl) {
        if (codCharge > 0) {
          detailCodRow.style.display = "flex";
          detailCodEl.textContent = `₹${codCharge.toLocaleString()}`;
        } else {
          detailCodRow.style.display = "none";
        }
      }
    } else {
      courierRow.style.display = "none";
    }
  }

  // 3. Render Invoice Pricing calculations
  document.getElementById("invoice-subtotal").textContent = `₹${order.subtotal.toLocaleString()}`;
  
  const discountRow = document.getElementById("invoice-discount-row");
  const discountVal = document.getElementById("invoice-discount");
  if (order.discount > 0 && discountRow && discountVal) {
    discountRow.style.display = "flex";
    discountVal.textContent = `-₹${order.discount.toLocaleString()}`;
  } else if (discountRow) {
    discountRow.style.display = "none";
  }

  // Populate shipping charges and COD fee in Invoice panel
  const shippingCharge = order.shippingCharge !== undefined ? order.shippingCharge : 0;
  const codCharge = order.codCharge !== undefined ? order.codCharge : 0;

  const invoiceShippingEl = document.getElementById("invoice-shipping");
  if (invoiceShippingEl) {
    invoiceShippingEl.textContent = shippingCharge > 0 ? `₹${shippingCharge.toLocaleString()}` : "FREE";
    invoiceShippingEl.style.color = shippingCharge === 0 ? "#2F855A" : "var(--text-dark)";
    invoiceShippingEl.style.fontWeight = shippingCharge === 0 ? "600" : "normal";
  }

  const invoiceCodRow = document.getElementById("invoice-cod-row");
  const invoiceCodEl = document.getElementById("invoice-cod");
  if (invoiceCodRow && invoiceCodEl) {
    if (codCharge > 0) {
      invoiceCodRow.style.display = "flex";
      invoiceCodEl.textContent = `₹${codCharge.toLocaleString()}`;
    } else {
      invoiceCodRow.style.display = "none";
    }
  }

  document.getElementById("invoice-total").textContent = `₹${order.total.toLocaleString()}`;

  // 4. Render Articles lists
  const articlesContainer = document.getElementById("detail-articles-tbody");
  if (articlesContainer) {
    let itemsHTML = "";
    order.items.forEach(item => {
      itemsHTML += `
        <div class="track-item-row">
          <div class="track-item-flex">
            <img src="${item.image}" class="track-item-img" alt="${item.title}">
            <div>
              <div class="track-item-title">${item.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Size: ${item.size} | Qty: ${item.quantity}</div>
            </div>
          </div>
          <span class="track-item-price">₹${(item.price * item.quantity).toLocaleString()}</span>
        </div>
      `;
    });
    articlesContainer.innerHTML = itemsHTML;
  }
}
