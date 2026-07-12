document.addEventListener("DOMContentLoaded", () => {
  // 1. Verify User Login Status
  const token = localStorage.getItem("missara_token");
  const userStr = localStorage.getItem("missara_user");
  
  if (!token || !userStr) {
    // If not logged in, redirect to login page
    window.location.href = "login.html";
    return;
  }

  let user = {};
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    localStorage.removeItem("missara_token");
    localStorage.removeItem("missara_user");
    window.location.href = "login.html";
    return;
  }

  // 2. Populate Sidebar & Profile Info
  const firstName = user.name ? user.name.split(" ")[0] : "Customer";
  document.getElementById("profile-greeting").innerText = `Hello, ${firstName}`;
  document.getElementById("profile-subemail").innerText = user.email || "";
  
  document.getElementById("profile-name").innerText = user.name || "-";
  document.getElementById("profile-email").innerText = user.email || "-";
  document.getElementById("profile-phone").innerText = user.phone || "-";
  document.getElementById("profile-role").innerText = (user.role || "Customer").toUpperCase();

  // 3. Tab Switching Logic
  const navItems = document.querySelectorAll(".dashboard-nav .nav-item[data-target]");
  const tabPanes = document.querySelectorAll(".dashboard-content .tab-pane");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetId = item.getAttribute("data-target");
      
      // Remove active from all nav items & tab panes
      navItems.forEach(nav => nav.classList.remove("active"));
      tabPanes.forEach(pane => pane.classList.remove("active"));
      
      // Add active to current
      item.classList.add("active");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // 4. Logout Logic
  const logoutBtn = document.getElementById("dash-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem("missara_token");
        localStorage.removeItem("missara_user");
        window.location.href = "index.html";
      }
    });
  }

  // 5. Fetch and Render Orders
  fetchUserOrders();

  async function fetchUserOrders() {
    const loader = document.getElementById("orders-loader");
    const ordersList = document.getElementById("orders-list");
    const noOrders = document.getElementById("no-orders");

    try {
      const res = await fetch("/api/user/orders", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }

      const orders = await res.json();
      
      // Hide loader
      loader.style.display = "none";

      if (orders.length === 0) {
        noOrders.style.display = "block";
        ordersList.innerHTML = "";
        return;
      }

      // Render orders list
      noOrders.style.display = "none";
      
      let html = "";
      orders.forEach(order => {
        html += renderOrderCard(order);
      });
      ordersList.innerHTML = html;

    } catch (e) {
      console.error(e);
      loader.style.display = "none";
      ordersList.innerHTML = `<p style="color: #e74c3c; text-align: center;">Something went wrong while loading your orders. Please try again later.</p>`;
    }
  }

  function renderOrderCard(order) {
    const status = order.status || "Pending";
    const statusClass = `status-${status.toLowerCase()}`;
    const itemsCount = order.items ? order.items.length : 0;
    
    // Status Timeline Values
    let timelineWidth = "0%";
    let step1Class = "completed"; // Order Placed is always completed
    let step2Class = ""; // Processing
    let step3Class = ""; // Shipped
    let step4Class = ""; // Delivered

    if (status === "Processing") {
      timelineWidth = "33%";
      step2Class = "active";
    } else if (status === "Shipped") {
      timelineWidth = "66%";
      step2Class = "completed";
      step3Class = "active";
    } else if (status === "Delivered") {
      timelineWidth = "100%";
      step2Class = "completed";
      step3Class = "completed";
      step4Class = "completed";
    } else if (status === "Pending") {
      step1Class = "active";
    }

    // Courier tracking info if shipped
    let trackingInfoHTML = "";
    if (status === "Shipped" || status === "Delivered") {
      const awb = order.awb_number || order.awb || order.tracking_number || "";
      const courier = order.courier_name || order.courier || "Delhivery/NimbusPost";
      if (awb) {
        trackingInfoHTML = `
          <div style="margin-top: 15px; font-size: 0.85rem; padding-top: 15px; border-top: 1px dashed var(--border-light); color: var(--text-dark);">
            <i class="fas fa-truck" style="color: var(--primary-pink); margin-right: 8px;"></i>
            <strong>Courier Partner:</strong> ${courier} | <strong>Tracking AWB:</strong> <span style="font-family: monospace; font-weight: 600; color: var(--primary-pink);">${awb}</span>
          </div>
        `;
      }
    }

    // Render items rows
    let itemsHTML = "";
    if (order.items) {
      order.items.forEach(item => {
        const itemImage = item.image ? item.image : "images/placeholder.png";
        itemsHTML += `
          <div class="order-item-row">
            <img src="${itemImage}" alt="${item.title}" class="order-item-img" onerror="this.src='images/placeholder.png'">
            <div class="order-item-info">
              <a href="product.html?id=${item.id}" class="order-item-name">${item.title}</a>
              <div class="order-item-qty">Size: <strong>${item.size || 'N/A'}</strong> | Qty: <strong>${item.quantity || 1}</strong></div>
            </div>
            <div class="order-item-price">₹${(item.price * (item.quantity || 1)).toLocaleString()}</div>
          </div>
        `;
      });
    }

    return `
      <div class="order-card" id="order-${order.orderId}">
        <div class="order-header">
          <div class="order-meta">
            <div class="meta-group">
              <span class="meta-label">Order Placed</span>
              <span class="meta-value">${order.date || 'N/A'}</span>
            </div>
            <div class="meta-group">
              <span class="meta-label">Order ID</span>
              <span class="meta-value">#${order.orderId}</span>
            </div>
            <div class="meta-group">
              <span class="meta-label">Total Amount</span>
              <span class="meta-value" style="color: var(--primary-pink); font-weight: 600;">₹${(order.total || 0).toLocaleString()}</span>
            </div>
            <div class="meta-group">
              <span class="meta-label">Payment Mode</span>
              <span class="meta-value">${(order.paymentMethod || 'COD').toUpperCase()}</span>
            </div>
          </div>
          <span class="status-badge ${statusClass}">${status}</span>
        </div>
        
        <div class="order-body">
          <div class="order-items">
            ${itemsHTML}
          </div>

          <!-- Timeline Section -->
          <div class="tracking-timeline-container">
            <div class="timeline-title">
              <span>Order Tracking Status</span>
              <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-light);">Est. Delivery: ${order.estimatedDelivery || '3-5 Days'}</span>
            </div>
            
            <div class="tracking-timeline">
              <div class="timeline-progress" style="width: ${timelineWidth};"></div>
              
              <div class="timeline-step ${step1Class}">
                <div class="step-dot"><i class="fas fa-shopping-basket"></i></div>
                <div class="step-label">Ordered</div>
              </div>
              
              <div class="timeline-step ${step2Class}">
                <div class="step-dot"><i class="fas fa-cog"></i></div>
                <div class="step-label">Processing</div>
              </div>
              
              <div class="timeline-step ${step3Class}">
                <div class="step-dot"><i class="fas fa-truck"></i></div>
                <div class="step-label">Shipped</div>
              </div>
              
              <div class="timeline-step ${step4Class}">
                <div class="step-dot"><i class="fas fa-check-circle"></i></div>
                <div class="step-label">Delivered</div>
              </div>
            </div>

            ${trackingInfoHTML}
          </div>
        </div>
      </div>
    `;
  }
});
