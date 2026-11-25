// Custom HTML Block "Tokyo Full Width" (script). html: <div></div>  style: :host{display:block;height:0;overflow:hidden}
// Makes the Tokyo workspace use the full page width, and puts the normal width back when you leave it.
(function () {
  const W = window.__tkWide || (window.__tkWide = { touched: [], host: null, hooked: false });
  W.host = root_element.host;
  function restore() {
    W.touched.splice(0).forEach((t) => { t[0].style.maxWidth = t[1]; t[0].style.width = t[2]; });
  }
  function widen() {
    restore();
    let el = W.host && W.host.parentElement;
    while (el && el !== document.body) {
      if (getComputedStyle(el).maxWidth !== "none") {
        W.touched.push([el, el.style.maxWidth, el.style.width]);
        el.style.maxWidth = "none";
        el.style.width = "100%";
      }
      el = el.parentElement;
    }
    window.dispatchEvent(new Event("resize"));
  }
  function check() {
    if (W.host && W.host.isConnected && W.host.getClientRects().length) widen();
    else restore();
  }
  if (!W.hooked && frappe.router && frappe.router.on) {
    W.hooked = true;
    frappe.router.on("change", () => setTimeout(check, 150));
  }
  widen();
  setTimeout(check, 300);
})();
