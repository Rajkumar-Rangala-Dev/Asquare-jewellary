/* Asquare Jewellery — single-page checkout.
 * Validates inline, shows a live order summary from the bag, and hands off to
 * the payment step. Front-end only: connect createOrder() to your backend and
 * payment gateway (e.g. Razorpay / PayU / Cashfree) before going live.
 */
(function () {
  "use strict";
  const Store = window.AsquareStore;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const form = $("#checkout-form");
  const lines = $(".summary-lines");
  const totalsEl = $(".summary-totals");
  const payLabel = $(".pay-btn span");

  // Demo coupon so the flow can be tested end to end. Validate coupons server-side in production.
  const COUPONS = { ASQUARE5: { pct: 5, cap: 5000, label: "5% off making charges" } };
  let coupon = null;

  function totals() {
    const t = Store.bagTotals();
    const making = Store.bag().reduce((s, l) => s + l.product.breakup.making * l.qty, 0);
    const discount = coupon ? Math.min(coupon.cap, Math.round((making * coupon.pct) / 100)) : 0;
    return { ...t, discount, grand: t.total - discount };
  }

  function renderSummary() {
    const bag = Store.bag();
    if (!bag.length && $(".confirmation").hidden) {
      form.hidden = true;
      $(".order-summary").hidden = true;
      const c = $(".confirmation");
      c.hidden = false;
      $(".eyebrow", c).textContent = "Your bag is empty";
      $(".section-title", c).innerHTML = "Find something <em>to treasure</em>";
      $(".confirm-text", c).textContent = "Explore our best-selling gold, diamond and bridal pieces.";
      return;
    }
    lines.innerHTML = bag.map((l) => `
      <li>
        <span class="thumb"><img src="${l.product.img}" alt="" width="64" height="64" /><b>${l.qty}</b></span>
        <span class="sl-name">${esc(l.product.name)}<small>${esc(l.product.metal)}${l.size ? ` · Size ${esc(l.size)}` : ""}</small></span>
        <span class="sl-price">${Store.formatINR(l.product.price * l.qty)}</span>
      </li>`).join("");
    const t = totals();
    totalsEl.innerHTML = `
      <div><dt>Subtotal</dt><dd>${Store.formatINR(t.total)}</dd></div>
      ${t.discount ? `<div class="discount"><dt>${esc(coupon.label)}</dt><dd>−${Store.formatINR(t.discount)}</dd></div>` : ""}
      <div><dt>Shipping &amp; insurance</dt><dd>Free</dd></div>
      <div class="grand"><dt>Total</dt><dd>${Store.formatINR(t.grand)}</dd></div>
      <p class="fine">Includes ${Store.formatINR(t.gst)} GST (3%).</p>`;
    payLabel.textContent = `Pay ${Store.formatINR(t.grand)} securely`;
  }

  // ---- validation
  const messages = {
    email: "Enter a valid email address.",
    phone: "Enter a 10-digit Indian mobile number.",
    name: "Enter the recipient's full name.",
    line1: "Enter your flat or house number and building.",
    pin: "Enter a valid 6-digit PIN code.",
    city: "Enter your city.",
    state: "Select your state.",
  };
  function validateField(input) {
    const errEl = input.closest(".field")?.querySelector(".err");
    const ok = input.checkValidity() && (input.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value));
    input.setAttribute("aria-invalid", String(!ok));
    if (errEl) {
      errEl.textContent = ok ? "" : messages[input.name] || "This field is required.";
      if (!errEl.id) errEl.id = `err-${input.name}`;
      input.setAttribute("aria-describedby", errEl.id);
    }
    return ok;
  }
  form.querySelectorAll(".field input[required], .field select[required]").forEach((el) => {
    el.addEventListener("blur", () => el.value && validateField(el));
    el.addEventListener("input", () => el.getAttribute("aria-invalid") === "true" && validateField(el));
  });
  form.terms.addEventListener("change", () => { if (form.terms.checked) $(".consent-err").textContent = ""; });
  // Numeric-only fields
  ["phone", "pin"].forEach((n) => form[n].addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, ""))));

  // ---- delivery choice: pickup does not need an address
  const addressFields = ["line1", "pin", "city", "state"];
  form.querySelectorAll('input[name="delivery"]').forEach((r) =>
    r.addEventListener("change", () => {
      const pickup = form.delivery.value === "pickup";
      addressFields.forEach((n) => {
        form[n].required = !pickup;
        form[n].closest(".field").classList.toggle("is-muted", pickup);
        if (pickup) { form[n].removeAttribute("aria-invalid"); form[n].closest(".field").querySelector(".err").textContent = ""; }
      });
    })
  );

  // ---- coupon
  $("#apply-coupon").addEventListener("click", () => {
    const code = $("#coupon").value.trim().toUpperCase();
    const msg = $(".coupon-msg");
    coupon = COUPONS[code] || null;
    msg.textContent = coupon ? `${code} applied: ${coupon.label}.` : code ? "That code isn't valid." : "";
    msg.classList.toggle("is-error", !coupon && !!code);
    renderSummary();
  });

  // ---- submit
  async function createOrder(payload) {
    // TODO(integration): POST payload to your order API, receive a gateway order id,
    // then open the payment gateway's checkout. Resolve only after payment succeeds.
    await new Promise((r) => setTimeout(r, 900));
    return { id: "ASQ" + Date.now().toString().slice(-8) };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll(".field input[required], .field select[required]")];
    const bad = fields.filter((f) => !validateField(f));
    const terms = form.terms.checked;
    $(".consent-err").textContent = terms ? "" : "Please accept the terms to continue.";
    if (bad.length || !terms) {
      (bad[0] || form.terms).focus();
      return;
    }
    const btn = $(".pay-btn");
    btn.disabled = true;
    btn.classList.add("is-busy");
    payLabel.textContent = "Securing your order…";
    const t = totals();
    const order = await createOrder({
      contact: { email: form.email.value, phone: form.phone.value },
      address: { name: form.name.value, line1: form.line1.value, line2: form.line2.value, pin: form.pin.value, city: form.city.value, state: form.state.value },
      delivery: form.delivery.value,
      payment: form.pay.value,
      items: Store.bag().map((l) => ({ id: l.id, size: l.size, qty: l.qty })),
      coupon: coupon ? $("#coupon").value.trim().toUpperCase() : null,
      total: t.grand,
    });
    const first = form.name.value.trim().split(/\s+/)[0];
    const c = $(".confirmation");
    $(".confirm-name", c).textContent = first;
    $(".confirm-text", c).textContent =
      `Order ${order.id} for ${Store.formatINR(t.grand)} is confirmed. ` +
      (form.delivery.value === "pickup" ? "We'll message you when it is ready at the atelier." : `We'll send tracking to ${form.phone.value} once your insured parcel is on its way.`);
    form.hidden = true;
    $(".order-summary").hidden = true;
    c.hidden = false;
    c.focus();
    window.scrollTo(0, 0);
    Store.clearBag();
  });

  Store.onChange(renderSummary);
  renderSummary();
})();
