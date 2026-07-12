document.addEventListener("DOMContentLoaded", () => {
  // Get product ID from URL query parameters (assuming it's like product.html?id=1)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get("id"));

  if (!productId || isNaN(productId)) return;

  const reviewsSection = document.getElementById("reviews-section");
  if (reviewsSection) reviewsSection.style.display = "block";

  // Elements
  const reviewsList = document.getElementById("reviews-list");
  const reviewsLoader = document.getElementById("reviews-loader");
  const noReviews = document.getElementById("no-reviews");
  const avgRatingDisplay = document.getElementById("avg-rating-display");
  const avgStarsDisplay = document.getElementById("avg-stars-display");
  const avgCountDisplay = document.getElementById("avg-count-display");
  const distributionContainer = document.getElementById("rating-distribution");

  // Form Elements
  const reviewForm = document.getElementById("review-form");
  const reviewLoginPrompt = document.getElementById("review-login-prompt");
  const starPicker = document.getElementById("star-picker");
  const ratingInput = document.getElementById("review-rating-val");
  const reviewTitleInput = document.getElementById("review-title");
  const reviewBodyInput = document.getElementById("review-body");
  const formError = document.getElementById("review-form-error");
  const formSuccess = document.getElementById("review-form-success");

  // Init rating star picker behaviour
  if (starPicker) {
    const stars = starPicker.querySelectorAll(".star-pick");
    stars.forEach(star => {
      // Hover effects
      star.addEventListener("mouseover", () => {
        const val = parseInt(star.getAttribute("data-val"));
        highlightStars(val);
      });
      star.addEventListener("mouseout", () => {
        const currentVal = parseInt(ratingInput.value);
        highlightStars(currentVal);
      });
      // Click selection
      star.addEventListener("click", () => {
        const val = parseInt(star.getAttribute("data-val"));
        ratingInput.value = val;
        highlightStars(val);
      });
    });

    function highlightStars(count) {
      stars.forEach(s => {
        const val = parseInt(s.getAttribute("data-val"));
        if (val <= count) {
          s.style.color = "#FFB800";
        } else {
          s.style.color = "#E2E8F0";
        }
      });
    }
  }

  // Load reviews and summary
  fetchReviewsSummary();
  fetchReviewsList();
  checkLoginStatus();

  function checkLoginStatus() {
    const token = localStorage.getItem("missara_token");
    if (token) {
      if (reviewForm) reviewForm.style.display = "block";
      if (reviewLoginPrompt) reviewLoginPrompt.style.display = "none";
    } else {
      if (reviewForm) reviewForm.style.display = "none";
      if (reviewLoginPrompt) reviewLoginPrompt.style.display = "block";
    }
  }

  async function fetchReviewsSummary() {
    try {
      const res = await fetch(`/api/reviews/${productId}/summary`);
      if (!res.ok) throw new Error("Failed to load review summary");
      const summary = await res.json();

      // Render average
      const avg = summary.avg || 0;
      const count = summary.count || 0;
      if (avgRatingDisplay) avgRatingDisplay.textContent = avg.toFixed(1);
      if (avgCountDisplay) avgCountDisplay.textContent = `Based on ${count} reviews`;
      if (avgStarsDisplay) avgStarsDisplay.innerHTML = generateStarRatingHTML(avg);

      // Render distribution
      if (distributionContainer) {
        let distHTML = "";
        summary.distribution.forEach(d => {
          const pct = count === 0 ? 0 : (d.count / count) * 100;
          distHTML += `
            <div style="display:flex; align-items:center; gap:10px; font-size:0.88rem;">
              <span style="width:50px; display:inline-flex; align-items:center; gap:2px; font-weight:600; color:var(--text-dark);">${d.star} <span style="color:#FFB800;">&#9733;</span></span>
              <div style="flex-grow:1; height:8px; background:#E2E8F0; border-radius:4px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:var(--primary-pink); border-radius:4px; transition: width 0.4s ease;"></div>
              </div>
              <span style="width:40px; text-align:right; color:var(--text-muted); font-size:0.82rem;">${d.count}</span>
            </div>
          `;
        });
        distributionContainer.innerHTML = distHTML;
      }

      // Also update reviews link in page title/header if present
      const detailReviewsText = document.getElementById("detail-reviews-text");
      if (detailReviewsText) {
        detailReviewsText.textContent = `(${count} Customer Reviews)`;
      }
      const detailStarsContainer = document.getElementById("detail-stars-container");
      if (detailStarsContainer) {
        detailStarsContainer.innerHTML = generateStarRatingHTML(avg);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchReviewsList() {
    try {
      if (reviewsLoader) reviewsLoader.style.display = "block";
      if (reviewsList) reviewsList.style.display = "none";
      if (noReviews) noReviews.style.display = "none";

      const res = await fetch(`/api/reviews/${productId}`);
      if (!res.ok) throw new Error("Failed to load reviews");
      const list = await res.json();

      if (reviewsLoader) reviewsLoader.style.display = "none";

      if (list.length === 0) {
        if (noReviews) noReviews.style.display = "block";
        if (reviewsList) reviewsList.innerHTML = "";
      } else {
        if (reviewsList) {
          reviewsList.style.display = "flex";
          reviewsList.innerHTML = list.map(r => `
            <div style="background:#fff; border:1px solid var(--border-light); padding:20px; border-radius:8px;">
              <div style="display:flex; justify-content:between; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; gap:10px;">
                <div>
                  <h4 style="font-weight:700; color:var(--text-dark); font-size:1.05rem; margin-bottom:2px;">${escapeHTML(r.title)}</h4>
                  <div style="color:#FFB800; font-size:0.9rem; display:flex; gap:2px;">
                    ${generateStarRatingHTML(r.rating)}
                  </div>
                </div>
                <div style="margin-left:auto; text-align:right; font-size:0.8rem; color:var(--text-muted);">
                  <div style="font-weight:600; color:var(--text-dark);">${escapeHTML(r.userName)}</div>
                  <div>${r.date}</div>
                </div>
              </div>
              <p style="font-size:0.92rem; color:var(--text-muted); line-height:1.6; white-space:pre-line;">${escapeHTML(r.body)}</p>
            </div>
          `).join("");
        }
      }
    } catch (e) {
      if (reviewsLoader) reviewsLoader.style.display = "none";
      console.error(e);
    }
  }

  // Handle Form Submission
  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (formError) formError.style.display = "none";
      if (formSuccess) formSuccess.style.display = "none";

      const ratingVal = parseInt(ratingInput.value);
      if (ratingVal === 0) {
        showError("Please pick a star rating");
        return;
      }

      const payload = {
        productId,
        rating: ratingVal,
        title: reviewTitleInput.value,
        body: reviewBodyInput.value
      };

      const token = localStorage.getItem("missara_token");
      if (!token) {
        showError("You must be logged in to leave a review");
        return;
      }

      try {
        const btn = document.getElementById("review-submit-btn");
        if (btn) btn.disabled = true;

        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (btn) btn.disabled = false;

        if (data.success) {
          if (formSuccess) {
            formSuccess.textContent = "Thank you! Your review has been submitted successfully.";
            formSuccess.style.display = "block";
          }
          reviewForm.reset();
          ratingInput.value = 0;
          highlightStars(0);
          
          // Reload summary & list after 1 second
          setTimeout(() => {
            fetchReviewsSummary();
            fetchReviewsList();
          }, 1000);
        } else {
          showError(data.message || "Failed to submit review");
        }
      } catch (err) {
        showError("Server error. Please try again later.");
        console.error(err);
      }
    });
  }

  function showError(msg) {
    if (formError) {
      formError.textContent = msg;
      formError.style.display = "block";
    }
  }

  function generateStarRatingHTML(rating) {
    let stars = "";
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= rounded) {
        stars += "&#9733;";
      } else {
        stars += "&#9734;";
      }
    }
    return stars;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
