/**
 * SaveUp — Save Now, Buy Later
 * Embeddable Widget v1.0
 *
 * Usage: Add this to any HTML page:
 *
 * <script src="https://your-saveup-domain.com/widget/saveup.js"></script>
 * <div
 *   data-saveup-widget
 *   data-merchant-key="pk_test_..."
 *   data-product-id="prod_123"
 *   data-product-name="PlayStation 5 Pro"
 *   data-price="499.00"
 * ></div>
 */
(function () {
  "use strict";

  // ── Configuration ──
  // Auto-detect the platform URL from the script's own src attribute
  var scripts = document.querySelectorAll('script[src*="saveup.js"]');
  var scriptSrc = scripts.length > 0 ? scripts[scripts.length - 1].src : "";
  var PLATFORM_URL = scriptSrc
    ? scriptSrc.replace(/\/widget\/saveup\.js.*$/, "")
    : "https://app.saveup.com"; // fallback

  // ── Inject Scoped CSS ──
  var WIDGET_STYLES = [
    ".saveup-widget-container {",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
    "  border: 1px solid #e0e7ff;",
    "  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);",
    "  border-radius: 12px;",
    "  padding: 16px;",
    "  max-width: 380px;",
    "  margin-top: 12px;",
    "  box-sizing: border-box;",
    "}",
    ".saveup-widget-header {",
    "  display: flex;",
    "  justify-content: space-between;",
    "  align-items: center;",
    "  margin-bottom: 12px;",
    "}",
    ".saveup-widget-title {",
    "  font-size: 14px;",
    "  font-weight: 700;",
    "  color: #1e293b;",
    "  margin: 0;",
    "}",
    ".saveup-widget-subtitle {",
    "  font-size: 11px;",
    "  color: #94a3b8;",
    "  margin: 2px 0 0;",
    "}",
    ".saveup-widget-price {",
    "  font-size: 14px;",
    "  font-weight: 700;",
    "  color: #4f46e5;",
    "  text-align: right;",
    "}",
    ".saveup-widget-price-label {",
    "  font-size: 11px;",
    "  color: #94a3b8;",
    "  text-align: right;",
    "  margin-top: 2px;",
    "}",
    ".saveup-widget-btn {",
    "  display: block;",
    "  width: 100%;",
    "  padding: 10px 16px;",
    "  border: none;",
    "  border-radius: 8px;",
    "  background-color: #4f46e5;",
    "  color: #ffffff;",
    "  font-size: 13px;",
    "  font-weight: 600;",
    "  cursor: pointer;",
    "  transition: background-color 0.2s ease;",
    "  text-align: center;",
    "  text-decoration: none;",
    "  box-sizing: border-box;",
    "}",
    ".saveup-widget-btn:hover {",
    "  background-color: #4338ca;",
    "}",
  ].join("\n");

  var styleEl = document.createElement("style");
  styleEl.setAttribute("data-saveup", "true");
  styleEl.textContent = WIDGET_STYLES;
  document.head.appendChild(styleEl);

  // ── Render Widgets ──
  function renderWidgets() {
    var widgets = document.querySelectorAll("[data-saveup-widget]");

    for (var i = 0; i < widgets.length; i++) {
      var el = widgets[i];

      // Skip if already rendered
      if (el.getAttribute("data-saveup-rendered") === "true") continue;

      var merchantKey = el.getAttribute("data-merchant-key") || "";
      var productId = el.getAttribute("data-product-id") || "";
      var productName = el.getAttribute("data-product-name") || "this product";
      var price = el.getAttribute("data-price") || "0.00";

      if (!merchantKey) {
        console.error("[SaveUp] Missing data-merchant-key attribute");
        continue;
      }

      // Build the redirect URL
      var saveUrl =
        PLATFORM_URL +
        "/save?" +
        "merchant=" + encodeURIComponent(merchantKey) +
        "&product=" + encodeURIComponent(productId) +
        "&name=" + encodeURIComponent(productName) +
        "&price=" + encodeURIComponent(price);

      // Build the widget HTML
      el.innerHTML = [
        '<div class="saveup-widget-container">',
        '  <div class="saveup-widget-header">',
        "    <div>",
        '      <p class="saveup-widget-title">Save Now, Buy Later</p>',
        '      <p class="saveup-widget-subtitle">Powered by SaveUp</p>',
        "    </div>",
        "    <div>",
        '      <p class="saveup-widget-price">$' + parseFloat(price).toFixed(2) + "</p>",
        '      <p class="saveup-widget-price-label">Lock in price</p>',
        "    </div>",
        "  </div>",
        '  <a href="' + saveUrl + '" class="saveup-widget-btn">',
        "    Start Saving for " + escapeHtml(productName),
        "  </a>",
        "</div>",
      ].join("\n");

      el.setAttribute("data-saveup-rendered", "true");
    }
  }

  // ── Utility: Escape HTML to prevent XSS ──
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Initialize ──
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderWidgets);
  } else {
    renderWidgets();
  }
})();
