/* Asquare Jewellery — homepage behaviour.
 *  1. Frame-sequence players for the HyperFrames films (hero + craft)
 *  2. Smooth scrolling (Lenis) wired to GSAP ScrollTrigger
 *  3. Catalogue: product grid, filters, wishlist, quick view, bag drawer, search
 *  4. Small UI: header state, mobile nav, testimonials, newsletter, toasts
 */
(function () {
  "use strict";

  const Store = window.AsquareStore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const liteMotion = reduceMotion || saveData;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  document.documentElement.classList.add("js");
  if (liteMotion) document.documentElement.classList.add("lite-motion");

  // ---------------------------------------------------------------------------
  // 1. Frame sequences
  // ---------------------------------------------------------------------------
  /**
   * Draws pre-rendered frames onto a canvas with object-fit: cover behaviour.
   * Frames load progressively; draw() falls back to the nearest loaded frame
   * so playback never stalls on a slow connection.
   */
  class FrameSequence {
    constructor(canvas, { path, count, focusX = 0.5, focusY = 0.5 }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.path = path;
      this.count = count;
      this.focusX = focusX;
      this.focusY = focusY;
      this.frames = new Array(count);
      this.current = -1;
      this.onFirstFrame = null;
      this._resize = this.resize.bind(this);
      window.addEventListener("resize", this._resize, { passive: true });
      this.resize();
    }
    src(i) { return `${this.path}/${String(i).padStart(3, "0")}.webp`; }
    loadOne(i) {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          this.frames[i] = img;
          if (this.current === -1 && i === 0) { this.draw(0); this.onFirstFrame && this.onFirstFrame(); }
          resolve();
        };
        img.onerror = resolve;
        img.src = this.src(i);
      });
    }
    /** Load frames in the given order with limited concurrency. */
    async load(order, concurrency = 6) {
      const queue = order.slice();
      const worker = async () => { while (queue.length) await this.loadOne(queue.shift()); };
      await Promise.all(Array.from({ length: concurrency }, worker));
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        const c = this.current; this.current = -1; if (c >= 0) this.draw(c);
      }
    }
    nearest(i) {
      for (let d = 0; d < this.count; d++) {
        if (this.frames[i - d]) return i - d;
        if (this.frames[i + d]) return i + d;
      }
      return -1;
    }
    draw(index) {
      const i = this.nearest(Math.max(0, Math.min(this.count - 1, Math.round(index))));
      if (i < 0 || i === this.current) return;
      const img = this.frames[i], cw = this.canvas.width, ch = this.canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      this.ctx.drawImage(img, (cw - w) * this.focusX, (ch - h) * this.focusY, w, h);
      this.current = i;
    }
  }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

  // ---------------------------------------------------------------------------
  // 2. Smooth scroll
  // ---------------------------------------------------------------------------
  let lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if (hasGSAP && !liteMotion && typeof window.Lenis === "function") {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const headerH = () => $(".site-header").offsetHeight;
  function scrollToTarget(target) {
    const el = typeof target === "string" ? document.getElementById(decodeURIComponent(target.replace(/^#/, ""))) : target;
    if (!el) return;
    if (el.id === "top") return lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: liteMotion ? "auto" : "smooth" });
    if (lenis) lenis.scrollTo(el, { offset: -headerH() });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerH(), behavior: liteMotion ? "auto" : "smooth" });
  }
  const lockScroll = (on) => { if (lenis) on ? lenis.stop() : lenis.start(); document.documentElement.classList.toggle("scroll-locked", on); };

  // ---------------------------------------------------------------------------
  // Hero: HyperFrames film. Frames 0–95 autoplay (intro), 96–143 scroll-scrubbed.
  // ---------------------------------------------------------------------------
  const HERO = { count: 144, introEnd: 95, fps: 24, copyAt: 72 };
  const hero = $(".hero");
  const heroCanvas = $(".hero-canvas");
  const heroPoster = $(".hero-poster");
  const portrait = () => window.innerWidth / window.innerHeight < 0.8;
  let heroSeq = null;

  function revealHeroCopy(instant) {
    if (hero.classList.contains("copy-in")) return;
    hero.classList.add("copy-in");
    if (!hasGSAP || instant) return;
    gsap.fromTo(".hero-reveal", { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08 });
  }

  function initHero() {
    const orient = portrait() ? "p" : "l";
    heroPoster.src = `assets/frames/hero-${orient}/${String(HERO.introEnd).padStart(3, "0")}.webp`;
    if (liteMotion || !hasGSAP) {
      revealHeroCopy(true);
      return; // poster image is the static final intro frame
    }
    heroSeq = new FrameSequence(heroCanvas, {
      path: `assets/frames/hero-${orient}`,
      count: HERO.count,
      focusX: orient === "l" ? 0.62 : 0.5,
      focusY: 0.5,
    });
    heroSeq.onFirstFrame = () => hero.classList.add("canvas-ready");
    // Intro frames first (in order), then the scroll section.
    heroSeq.load(range(0, HERO.count - 1));

    let introDone = false, scrubbing = false, start = null;
    const playIntro = (t) => {
      if (scrubbing) return;
      if (heroSeq.current < 0) return requestAnimationFrame(playIntro); // wait for frame 0
      if (start === null) start = t;
      const f = Math.min(HERO.introEnd, ((t - start) / 1000) * HERO.fps);
      heroSeq.draw(f);
      if (f >= HERO.copyAt) revealHeroCopy();
      if (f < HERO.introEnd) requestAnimationFrame(playIntro);
      else introDone = true;
    };
    requestAnimationFrame(playIntro);

    ScrollTrigger.create({
      trigger: hero,
      start: () => `top top+=${headerH()}`,
      end: "bottom bottom",
      scrub: true,
      onUpdate(self) {
        if (self.progress > 0.001) {
          if (!introDone) { scrubbing = true; revealHeroCopy(); }
        } else if (!introDone) return;
        heroSeq.draw(HERO.introEnd + self.progress * (HERO.count - 1 - HERO.introEnd));
      },
    });
    gsap.to(".hero-copy", {
      yPercent: -12, opacity: 0.0, ease: "none",
      scrollTrigger: { trigger: hero, start: "55% bottom", end: "bottom top+=20%", scrub: true },
    });
    gsap.to(".scroll-cue", { opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "+=120", scrub: true } });

    // Switch film when the viewport crosses the portrait/landscape boundary.
    let wasPortrait = portrait();
    window.addEventListener("resize", () => {
      if (portrait() === wasPortrait) return;
      wasPortrait = portrait();
      const o = wasPortrait ? "p" : "l";
      heroSeq.path = `assets/frames/hero-${o}`;
      heroSeq.focusX = o === "l" ? 0.62 : 0.5;
      heroSeq.frames = new Array(HERO.count);
      const at = Math.max(heroSeq.current, 0);
      heroSeq.current = -1;
      heroSeq.load([at, ...range(0, HERO.count - 1).filter((i) => i !== at)]).then(() => heroSeq.draw(at));
      heroPoster.src = `assets/frames/hero-${o}/${String(HERO.introEnd).padStart(3, "0")}.webp`;
    }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // Craft: HyperFrames film scrubbed across the section, with synced steps.
  // ---------------------------------------------------------------------------
  const CRAFT = { count: 120, acts: [0, 0.22, 0.48, 0.76] }; // step start points (film: 0s, 1.1s, 2.4s, 3.8s of 5s)
  function initCraft() {
    const section = $(".craft");
    const steps = $$(".craft-steps li");
    const bar = $(".craft-progress span");
    const setStep = (p) => {
      let idx = 0;
      CRAFT.acts.forEach((a, i) => { if (p >= a) idx = i; });
      steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      if (bar) bar.style.transform = `scaleY(${p})`;
    };
    if (liteMotion || !hasGSAP) { section.classList.add("is-static"); steps.forEach((s) => s.classList.add("is-active")); return; }

    const seq = new FrameSequence($(".craft-canvas"), { path: "assets/frames/craft", count: CRAFT.count });
    seq.onFirstFrame = () => section.classList.add("canvas-ready");
    // Load lazily, a screen before the section arrives.
    ScrollTrigger.create({ trigger: section, start: "top bottom+=100%", once: true, onEnter: () => seq.load(range(0, CRAFT.count - 1), 4) });
    ScrollTrigger.create({
      trigger: section,
      start: () => `top top+=${headerH()}`,
      end: "bottom bottom",
      scrub: true,
      onUpdate(self) { seq.draw(self.progress * (CRAFT.count - 1)); setStep(self.progress); },
    });
    setStep(0);
  }

  // ---------------------------------------------------------------------------
  // Section reveals (subtle: opacity + short rise; images unveil like a curtain)
  // ---------------------------------------------------------------------------
  function initReveals() {
    if (liteMotion || !hasGSAP) return;
    gsap.set(".reveal", { opacity: 0, y: 28 });
    ScrollTrigger.batch(".reveal", {
      start: "top 88%",
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.09, overwrite: true }),
    });
    $$(".reveal-img").forEach((el) => {
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
      const img = $("img", el);
      if (img) gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
    $$(".facet-rule").forEach((el) => {
      gsap.fromTo(el, { "--rule": 0 }, { "--rule": 1, duration: 1.3, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Catalogue
  // ---------------------------------------------------------------------------
  const grid = $("#product-grid");
  let activeFilter = "all";

  const heartBtn = (p, cls = "wish-btn") =>
    `<button class="${cls}" data-wish="${p.id}" aria-pressed="${Store.isWished(p.id)}" aria-label="${Store.isWished(p.id) ? "Remove from" : "Add to"} wishlist: ${esc(p.name)}"><svg><use href="#i-heart"/></svg></button>`;

  // Selling price with the MRP struck through and the saving, as Indian shoppers expect.
  const priceHTML = (p) =>
    `${Store.formatINR(p.price)}${p.off ? ` <s aria-label="MRP ${Store.formatINR(p.mrp)}">${Store.formatINR(p.mrp)}</s> <span class="price-off">${p.off}% off</span>` : ""}`;

  function productCard(p) {
    return `<li class="product-card" data-id="${p.id}">
      <div class="product-media">
        <img src="${p.img}" alt="${esc(p.alt)}" loading="lazy" width="800" height="800" />
        ${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ""}
        ${heartBtn(p)}
        <button class="quick-btn" data-quick="${p.id}" aria-label="Quick view: ${esc(p.name)}"><svg><use href="#i-eye"/></svg><span>Quick View</span></button>
      </div>
      <div class="product-info">
        <p class="product-meta">${esc(p.finish)} · ${esc(p.type)}</p>
        <h3 class="product-name"><button data-quick="${p.id}">${esc(p.name)}</button></h3>
        <div class="product-buy">
          <p class="product-price">${priceHTML(p)}</p>
          <button class="add-link" data-add="${p.id}">Add to Bag</button>
        </div>
      </div>
    </li>`;
  }

  function renderGrid() {
    const items = Store.PRODUCTS.filter((p) => activeFilter === "all" || p.tags.includes(activeFilter));
    grid.innerHTML = items.map(productCard).join("");
    if (hasGSAP && !liteMotion) gsap.fromTo($$(".product-card", grid), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.05 });
  }

  function setFilter(f) {
    activeFilter = f;
    $$(".filter-tabs .chip").forEach((c) => {
      const on = c.dataset.filter === f;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", on);
    });
    renderGrid();
  }

  function syncWishButtons() {
    $$("[data-wish]").forEach((b) => {
      const p = Store.byId(b.dataset.wish);
      const on = Store.isWished(p.id);
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", `${on ? "Remove from" : "Add to"} wishlist: ${p.name}`);
    });
  }

  function syncCounts() {
    const set = (key, n) => $$(`[data-count="${key}"]`).forEach((b) => { b.textContent = n; b.hidden = n === 0; });
    set("bag", Store.bagCount());
    set("wishlist", Store.wishlist().length);
  }

  // ---- toast
  let toastTimer;
  function toast(msg, action) {
    const t = $(".toast");
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-open="${action.open}">${esc(action.label)}</button>` : ""}`;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), 3600);
  }

  // ---- quick view
  const qv = $("#quickview");
  function openQuickView(id) {
    const p = Store.byId(id);
    if (!p) return;
    $(".qv-body", qv).innerHTML = `
      <figure class="qv-media"><img src="${p.img}" alt="${esc(p.alt)}" width="800" height="800" /></figure>
      <div class="qv-info">
        <p class="eyebrow">${esc(p.type)}</p>
        <h2 id="qv-title">${esc(p.name)}</h2>
        <p class="qv-price">${priceHTML(p)} <small>incl. GST</small></p>
        <dl class="qv-specs">
          <div><dt>Finish</dt><dd>${esc(p.finish)}</dd></div>
          <div><dt>Base metal</dt><dd>${esc(p.base)}</dd></div>
          <div><dt>Stones</dt><dd>${esc(p.stones)}</dd></div>
          <div><dt>In the box</dt><dd>${esc(p.includes)}</dd></div>
        </dl>
        <details class="qv-breakup">
          <summary>Care &amp; material</summary>
          <p class="qv-care">This is imitation jewellery: ${p.finish.includes("Rolled") ? "a thick layer of gold alloy bonded over" : "a gold-tone plating over"} ${esc(p.base.toLowerCase())}, not solid gold. Keep it away from water, perfume and lotion, wipe it with a soft cloth after wear, and store it in the zip pouch provided.</p>
        </details>
        <form class="qv-form">
          ${p.sizes ? `<label class="field"><span>Size</span><select name="size">${p.sizes.map((s, i) => `<option ${i === Math.floor(p.sizes.length / 2) ? "selected" : ""}>${s}</option>`).join("")}</select></label>` : ""}
          <div class="qv-actions">
            <button type="submit" class="btn btn-emerald"><svg><use href="#i-bag"/></svg>Add to Bag</button>
            ${heartBtn(p, "wish-btn wish-btn-lg")}
          </div>
        </form>
        <ul class="qv-assure">
          <li><svg><use href="#i-hallmark"/></svg>Anti-tarnish coated · skin-friendly finish</li>
          <li><svg><use href="#i-truck"/></svg>Delivery in 3–6 days · Cash on Delivery available</li>
          <li><svg><use href="#i-gem"/></svg>7-day easy returns</li>
        </ul>
      </div>`;
    $(".qv-form", qv).addEventListener("submit", (e) => {
      e.preventDefault();
      const size = e.target.size ? e.target.size.value : null;
      Store.addToBag(p.id, size);
      qv.close();
      toast(`${p.name} added to your bag`, { open: "bag", label: "View bag" });
    });
    lockScroll(true);
    qv.showModal();
  }
  qv.addEventListener("close", () => lockScroll(false));
  qv.addEventListener("click", (e) => { if (e.target === qv) qv.close(); }); // backdrop click

  // ---- drawer (bag + wishlist share one panel)
  const drawer = $("#drawer");
  const scrim = $(".drawer-scrim");
  let drawerMode = "bag";
  let drawerReturnFocus = null;

  function renderDrawer() {
    const body = $(".drawer-body", drawer), foot = $(".drawer-foot", drawer);
    $("#drawer-title").textContent = drawerMode === "bag" ? "Your Bag" : "Your Wishlist";
    if (drawerMode === "bag") {
      const lines = Store.bag();
      if (!lines.length) {
        body.innerHTML = `<div class="drawer-empty"><svg><use href="#mark"/></svg><p>Your bag is waiting for its first treasure.</p><a class="btn btn-emerald" href="#bestsellers" data-close-drawer>Shop Best Sellers</a></div>`;
        foot.innerHTML = "";
        return;
      }
      body.innerHTML = `<ul class="line-items">${lines.map((l) => `
        <li>
          <img src="${l.product.img}" alt="" width="88" height="88" />
          <div>
            <p class="li-name">${esc(l.product.name)}</p>
            <p class="li-meta">${esc(l.product.finish)}${l.size ? ` · Size ${esc(l.size)}` : ""}</p>
            <div class="qty" role="group" aria-label="Quantity for ${esc(l.product.name)}">
              <button data-qty="-1" data-id="${l.id}" data-size="${l.size ?? ""}" aria-label="Decrease quantity">−</button>
              <span aria-live="polite">${l.qty}</span>
              <button data-qty="1" data-id="${l.id}" data-size="${l.size ?? ""}" aria-label="Increase quantity" ${l.qty >= 5 ? "disabled" : ""}>+</button>
            </div>
          </div>
          <div class="li-end">
            <p class="li-price">${Store.formatINR(l.product.price * l.qty)}</p>
            <button class="li-remove" data-remove="${l.id}" data-size="${l.size ?? ""}">Remove</button>
          </div>
        </li>`).join("")}</ul>`;
      const t = Store.bagTotals();
      foot.innerHTML = `
        <dl class="totals">
          <div><dt>Subtotal</dt><dd>${Store.formatINR(t.total)}</dd></div>
          <div><dt>Shipping</dt><dd>${t.shipping ? Store.formatINR(t.shipping) : "Free"}</dd></div>
        </dl>
        <p class="fine">${t.toFree ? `Add ${Store.formatINR(t.toFree)} more for free shipping. ` : ""}Includes ${Store.formatINR(t.gst)} GST. Cash on Delivery available at checkout.</p>
        <a class="btn btn-gold btn-block" href="checkout.html"><svg><use href="#i-lock"/></svg>Secure Checkout</a>`;
    } else {
      const items = Store.wishlist();
      foot.innerHTML = "";
      body.innerHTML = items.length
        ? `<ul class="line-items">${items.map((p) => `
            <li>
              <img src="${p.img}" alt="" width="88" height="88" />
              <div><p class="li-name">${esc(p.name)}</p><p class="li-meta">${esc(p.finish)}</p><p class="li-price">${Store.formatINR(p.price)}</p></div>
              <div class="li-end"><button class="btn btn-emerald btn-sm" data-add="${p.id}">Add to Bag</button><button class="li-remove" data-wish="${p.id}">Remove</button></div>
            </li>`).join("")}</ul>`
        : `<div class="drawer-empty"><svg><use href="#i-heart"/></svg><p>Tap the heart on any piece to save it here.</p></div>`;
    }
  }

  function openDrawer(mode) {
    drawerMode = mode;
    renderDrawer();
    drawerReturnFocus = document.activeElement;
    scrim.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    $$("body > header, body > main, body > footer, .announce").forEach((el) => (el.inert = true));
    requestAnimationFrame(() => { drawer.classList.add("is-open"); scrim.classList.add("is-on"); });
    lockScroll(true);
    drawer.focus();
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    scrim.classList.remove("is-on");
    drawer.setAttribute("aria-hidden", "true");
    $$("body > header, body > main, body > footer, .announce").forEach((el) => (el.inert = false));
    setTimeout(() => (scrim.hidden = true), 400);
    lockScroll(false);
    if (drawerReturnFocus) drawerReturnFocus.focus();
  }
  scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer(); });

  // ---- search
  const search = $("#search");
  const searchInput = $("#search-input");
  const results = $(".search-results", search);
  function renderSearch() {
    const q = searchInput.value.trim().toLowerCase();
    // Every query term must match the start of a word ("ring" finds rings, not earrings).
    const terms = q.split(/\s+/).filter(Boolean);
    const items = q
      ? Store.PRODUCTS.filter((p) => {
          const words = [p.name, p.type, p.finish, p.base, p.stones, ...p.tags, p.tags.includes("ad") ? "american diamond cz" : "", p.tags.includes("onegram") ? "1gm one gram" : ""].join(" ").toLowerCase().split(/[^a-z0-9]+/);
          return terms.every((t) => words.some((w) => w.startsWith(t)));
        })
      : Store.PRODUCTS.slice(0, 4);
    results.innerHTML = items.length
      ? items.map((p) => `<li><button data-quick="${p.id}"><img src="${p.img}" alt="" width="56" height="56"/><span><strong>${esc(p.name)}</strong>${esc(p.finish)} · ${Store.formatINR(p.price)}</span></button></li>`).join("")
      : `<li class="no-results">No pieces match “${esc(q)}”. Try “necklace”, “AD” or “bridal”.</li>`;
  }
  searchInput.addEventListener("input", renderSearch);
  search.addEventListener("close", () => lockScroll(false));
  search.addEventListener("click", (e) => { if (e.target === search) search.close(); });

  // ---- one delegated click handler for the whole page
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;

    if (t.dataset.quick) {
      if (search.open) search.close();
      return openQuickView(t.dataset.quick);
    }
    if (t.dataset.wish) {
      const p = Store.byId(t.dataset.wish);
      const on = Store.toggleWish(p.id);
      t.classList.add("pop");
      setTimeout(() => t.classList.remove("pop"), 450);
      if (!t.classList.contains("li-remove")) toast(on ? `Saved ${p.name} to your wishlist` : `Removed from wishlist`, on ? { open: "wishlist", label: "View" } : null);
      return;
    }
    if (t.dataset.add) {
      const p = Store.byId(t.dataset.add);
      Store.addToBag(p.id);
      toast(`${p.name} added to your bag`, { open: "bag", label: "View bag" });
      return;
    }
    if (t.dataset.qty) {
      const size = t.dataset.size || null;
      const line = Store.bag().find((l) => l.id === t.dataset.id && l.size === size);
      if (line) Store.setQty(line.id, size, line.qty + Number(t.dataset.qty));
      return;
    }
    if (t.dataset.remove) return Store.setQty(t.dataset.remove, t.dataset.size || null, 0);
    if (t.dataset.open === "bag" || t.dataset.open === "wishlist") {
      $(".toast").classList.remove("is-on");
      if (drawer.classList.contains("is-open")) { drawerMode = t.dataset.open; return renderDrawer(); }
      return openDrawer(t.dataset.open);
    }
    if (t.dataset.open === "search") {
      lockScroll(true);
      search.showModal();
      renderSearch();
      return;
    }
    if (t.hasAttribute("data-close")) return t.closest("dialog").close();
    if (t.hasAttribute("data-close-drawer")) {
      closeDrawer();
      if (t.getAttribute("href")) { e.preventDefault(); setTimeout(() => scrollToTarget(t.getAttribute("href")), 50); }
      return;
    }
    if (t.dataset.filter) return setFilter(t.dataset.filter);

    // In-page anchors: smooth scroll; optional filter preset.
    const href = t.getAttribute("href");
    if (href && href.startsWith("#") && href.length > 1) {
      e.preventDefault();
      if (t.dataset.filterLink) setFilter(t.dataset.filterLink);
      closeMobileNav();
      scrollToTarget(href);
      history.replaceState(null, "", href);
    }
  });

  Store.onChange(() => {
    syncCounts();
    syncWishButtons();
    if (drawer.classList.contains("is-open")) renderDrawer();
  });

  // ---------------------------------------------------------------------------
  // 4. Small UI
  // ---------------------------------------------------------------------------
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile nav
  const navToggle = $(".nav-toggle");
  const mobileNav = $("#mobile-nav");
  function closeMobileNav() {
    if (mobileNav.hidden) return;
    mobileNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    setTimeout(() => (mobileNav.hidden = true), 300);
    lockScroll(false);
  }
  navToggle.addEventListener("click", () => {
    if (!mobileNav.hidden) return closeMobileNav();
    mobileNav.hidden = false;
    requestAnimationFrame(() => mobileNav.classList.add("is-open"));
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    lockScroll(true);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMobileNav(); });

  // Testimonials: manual carousel (no autoplay)
  const quotes = $$(".quote");
  const dots = $$(".quote-dots button");
  let qi = 0;
  function showQuote(n) {
    const prev = quotes[qi];
    qi = (n + quotes.length) % quotes.length;
    const next = quotes[qi];
    dots.forEach((d, i) => (i === qi ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
    if (prev === next) return;
    prev.classList.remove("is-active");
    prev.hidden = true;
    next.hidden = false;
    next.classList.add("is-active");
    if (hasGSAP && !liteMotion) gsap.fromTo(next, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" });
  }
  $("[data-quote=prev]").addEventListener("click", () => showQuote(qi - 1));
  $("[data-quote=next]").addEventListener("click", () => showQuote(qi + 1));
  dots.forEach((d, i) => d.addEventListener("click", () => showQuote(i)));
  // Swipe on touch
  let touchX = null;
  const track = $(".quote-track");
  track.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  track.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) showQuote(qi + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // Newsletter (front-end validation; connect to your ESP endpoint here)
  $(".newsletter-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#nl-email"), msg = $(".newsletter-form .form-msg");
    if (!input.checkValidity()) {
      msg.textContent = "Please enter a valid email address.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    msg.textContent = "Welcome to the Asquare Circle. Watch your inbox for our next preview.";
    e.target.reset();
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  renderGrid();
  syncCounts();
  initHero();
  initCraft();
  initReveals();
  if (hasGSAP) {
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (location.hash.length > 1) setTimeout(() => scrollToTarget(location.hash), 200);
  }
})();
