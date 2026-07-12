(function() {
const widgetHTML = `
  <div class="assistant-widget-container" id="assistant-widget-root" style="bottom: 120px; right: 25px; gap: 12px; display: flex; flex-direction: column; align-items: flex-end;">
    <!-- WhatsApp Direct Button -->
    <a href="https://wa.me/919713962329?text=Hi%20Missara%20Clothing!%20I%20need%20assistance%20with%20my%20order." 
       target="_blank" 
       class="assistant-trigger-btn btn-whatsapp animate-whatsapp-btn" 
       data-tooltip="WhatsApp Support" 
       style="background: #25D366; color: white; text-decoration: none; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 4px 15px rgba(37,211,102,0.3); transition: transform 0.2s;"
       onmouseover="this.style.transform='scale(1.1)'"
       onmouseout="this.style.transform='scale(1)'">
      <i class="fab fa-whatsapp" style="font-size: 1.6rem;"></i>
    </a>
    
    <!-- AI Chatbot Button (Premium circular button with robot icon) -->
    <button class="assistant-trigger-btn btn-ai-chat animate-aichat-btn" 
            id="btn-chat-panel-action" 
            data-tooltip="AI Support Chat" 
            style="background: linear-gradient(135deg, #DB2255, #EC4899); color: white; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(219,34,85,0.3); transition: transform 0.2s;"
            onmouseover="this.style.transform='scale(1.1)'"
            onmouseout="this.style.transform='scale(1)'">
      <i class="fas fa-robot" style="font-size: 1.4rem;"></i>
    </button>
    
    <!-- Direct Call Button -->
    <a href="tel:+919713962329" 
       class="assistant-trigger-btn btn-call animate-call-btn" 
       data-tooltip="Call Support" 
       style="background: #0076FF; color: white; text-decoration: none; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,118,255,0.3); transition: transform 0.2s;"
       onmouseover="this.style.transform='scale(1.1)'"
       onmouseout="this.style.transform='scale(1)'">
      <i class="fas fa-phone-alt" style="font-size: 1.3rem;"></i>
    </a>

  </div>
  
  <!-- AI Chat Agent Panel -->
  <div class="assistant-panel" id="ai-chat-panel">
    <div class="assistant-panel-header header-chat">
      <i class="fas fa-robot"></i>
      <div class="assistant-panel-title">Missara AI Assistant</div>
      <button class="assistant-panel-close" id="chat-panel-close" aria-label="Close Panel">&times;</button>
    </div>
    <div class="chat-messages-container" id="chat-messages-box">
      <div class="chat-bubble bot">
        Namaste! 🙏 Welcome to Missara Clothing customer support. I am your AI assistant. How can I help you today?
      </div>
    </div>
    <form class="chat-input-bar" id="chat-input-form">
      <input type="text" class="chat-input-field" id="chat-user-input" placeholder="Type your query..." autocomplete="off">
      <button type="submit" class="chat-send-btn" aria-label="Send message">
        <i class="fas fa-paper-plane"></i>
      </button>
    </form>
  </div>
`;


const widgetWrapper = document.createElement("div");
widgetWrapper.innerHTML = widgetHTML;
document.body.appendChild(widgetWrapper);

// DOM Selection and logic
const btnChatPanel = document.getElementById("btn-chat-panel-action");
const chatPanel = document.getElementById("ai-chat-panel");
const chatClose = document.getElementById("chat-panel-close");

btnChatPanel.addEventListener("click", () => {
  chatPanel.classList.toggle("open");
});

chatClose.addEventListener("click", () => {
  chatPanel.classList.remove("open");
});

// Chat logic
const chatMessagesBox = document.getElementById("chat-messages-box");
const chatInputForm = document.getElementById("chat-input-form");
const chatUserInput = document.getElementById("chat-user-input");


chatInputForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = chatUserInput.value.trim();
  if (!query) return;

  // Append User message
  appendMessage(query, "user", false);
  chatUserInput.value = "";

  // Show "Typing..." state
  const typingBubble = appendMessage("<span style='font-style: italic; color: #9CA3AF;'>Typing...</span>", "bot", true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: query })
    });

    const data = await response.json();
    typingBubble.remove(); // Remove typing indicator

    if (data.reply) {
      appendMessage(data.reply, "bot", true);
      if (data.products && data.products.length > 0) {
        appendProductsCarousel(data.products);
      }
    } else {
      appendMessage("Sorry, I am facing some trouble understanding that. Please call us directly on +91 9713962329.", "bot", true);
    }
  } catch (err) {
    console.error(err);
    typingBubble.remove();
    appendMessage("Server connection error. Please try again later.", "bot", true);
  }
});

function appendProductsCarousel(products) {
  const carousel = document.createElement("div");
  carousel.className = "chat-products-carousel";
  
  products.forEach(product => {
    const defaultSize = (product.sizes && product.sizes.length)
      ? (product.sizes.includes("M") ? "M" : product.sizes[0])
      : "FS";
      
    const card = document.createElement("div");
    card.className = "chat-product-card";
    card.innerHTML = `
      <div class="chat-product-img-wrapper">
        <img src="${product.image}" class="chat-product-img" alt="${product.title}">
      </div>
      <div class="chat-product-info">
        <h4 class="chat-product-title">${product.title}</h4>
        <div class="chat-product-price-row">
          <span class="chat-product-price">₹${product.price}</span>
          ${product.originalPrice ? `<span class="chat-product-orig-price">₹${product.originalPrice}</span>` : ''}
        </div>
      </div>
      <div class="chat-product-btn-group">
        <a href="product.html?id=${product.id}" class="chat-product-btn chat-product-view-btn">View</a>
        <button class="chat-product-btn chat-product-add-btn">Add</button>
      </div>
    `;
    
    // Bind Add button click
    const addBtn = card.querySelector(".chat-product-add-btn");
    addBtn.addEventListener("click", () => {
      if (typeof window.addToCart === "function") {
        window.addToCart(product.id, defaultSize, 1);
      } else {
        console.error("addToCart is not defined on window");
      }
    });
    
    carousel.appendChild(card);
  });
  
  chatMessagesBox.appendChild(carousel);
  chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
}


function appendMessage(text, sender, isHTML) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  if (isHTML) {
    bubble.innerHTML = text;
  } else {
    // Escape standard text to prevent XSS
    bubble.textContent = text;
  }
  chatMessagesBox.appendChild(bubble);
  chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
  return bubble;
}
})();

