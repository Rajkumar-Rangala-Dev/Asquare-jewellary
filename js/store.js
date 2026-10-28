/* Asquare Jewellery — catalogue, bag and wishlist state.
 * Shared by index.html and checkout.html. State persists in localStorage.
 * Replace PRODUCTS with your catalogue API when connecting a backend.
 */
(function () {
  "use strict";

  const GST_RATE = 0.03; // GST on imitation jewellery (HSN 7117) in India
  const FREE_SHIPPING_FROM = 999;
  const SHIPPING_FEE = 79;

  // Prices are what the customer pays (GST included). `mrp` drives the strike-through.
  // Every listing states finish, base metal and stones: these pieces are plated or
  // rolled gold, never solid gold, and the copy must never imply otherwise.
  const PRODUCTS = [
    {
      id: "vasundhara-necklace",
      name: "Vasundhara Temple Necklace Set",
      tags: ["onegram", "bridal"],
      type: "Necklace Set",
      badge: "Bestseller",
      img: "assets/img/p-temple.webp",
      alt: "Temple-style gold-finish necklace with ruby-red kemp stones and matching earrings",
      finish: "1 Gram Gold Plated",
      base: "Brass",
      stones: "Ruby-red kemp stones",
      includes: "Necklace and matching drop earrings",
      price: 3499,
      mrp: 5499,
    },
    {
      id: "aria-studs",
      name: "Aria AD Halo Studs",
      tags: ["ad"],
      type: "Earrings",
      img: "assets/img/p-studs.webp",
      alt: "Pair of round halo stud earrings set with sparkling white AD stones",
      finish: "Rhodium Polish (silver tone)",
      base: "Brass",
      stones: "American diamond (cubic zirconia)",
      includes: "Pair of push-back studs",
      price: 649,
      mrp: 999,
    },
    {
      id: "eternal-bands",
      name: "Eternal Couple Rings",
      tags: ["rolled", "bridal"],
      type: "Couple Rings (Pair)",
      img: "assets/img/p-bands.webp",
      alt: "Pair of polished gold-finish couple bands",
      finish: "Rolled Gold",
      base: "Copper alloy",
      stones: "Plain high-polish band",
      includes: "Two rings, sized individually",
      sizes: ["10", "12", "14", "16", "18", "20", "22"],
      price: 799,
      mrp: 1199,
    },
    {
      id: "noor-pendant",
      name: "Noor AD Cushion Pendant",
      tags: ["ad"],
      type: "Pendant with Chain",
      badge: "New",
      img: "assets/img/p-pendant.webp",
      alt: "Cushion-shaped halo pendant with white AD stones on a fine silver-tone chain",
      finish: "Rhodium Polish (silver tone)",
      base: "Brass",
      stones: "American diamond (cubic zirconia)",
      includes: "Pendant with 18-inch chain",
      price: 899,
      mrp: 1399,
    },
    {
      id: "kanak-bracelet",
      name: "Kanak Rolled Gold Link Bracelet",
      tags: ["rolled"],
      type: "Bracelet",
      img: "assets/img/p-bracelet.webp",
      alt: "Chunky interlinked gold-finish chain bracelet",
      finish: "Rolled Gold",
      base: "Copper alloy",
      stones: "Hand-linked, lobster clasp",
      includes: "Bracelet, 7.5 inch with extender",
      price: 699,
      mrp: 1099,
    },
    {
      id: "celeste-tennis",
      name: "Celeste AD Tennis Bracelet",
      tags: ["ad", "bridal"],
      type: "Bracelet",
      badge: "Bestseller",
      img: "assets/img/p-tennis.webp",
      alt: "Line bracelet of sparkling white AD stones in a silver-tone setting",
      finish: "Rhodium Polish (silver tone)",
      base: "Brass",
      stones: "American diamond (cubic zirconia)",
      includes: "Bracelet with box clasp",
      price: 1299,
      mrp: 1999,
    },
    {
      id: "rani-ring",
      name: "Rani Pink Stone Halo Ring",
      tags: ["ad"],
      type: "Ring",
      img: "assets/img/p-sapphire.webp",
      alt: "Rose gold-finish ring with a pink stone framed by white AD stones",
      finish: "Rose Gold Plated",
      base: "Brass",
      stones: "Pink CZ centre stone with AD halo",
      includes: "Adjustable band, fits sizes 8–16",
      price: 549,
      mrp: 899,
    },
    {
      id: "sitara-stack",
      name: "Sitara Stacking Rings, Set of 3",
      tags: ["onegram", "ad"],
      type: "Ring Set",
      img: "assets/img/p-stack.webp",
      alt: "Three stacked gold-finish rings set with pavé AD stones",
      finish: "1 Gram Gold Plated",
      base: "Brass",
      stones: "Pavé American diamond (cubic zirconia)",
      includes: "Three rings in one size",
      sizes: ["8", "10", "12", "14", "16"],
      price: 899,
      mrp: 1399,
    },
  ];

  PRODUCTS.forEach((p) => {
    p.gst = Math.round(p.price - p.price / (1 + GST_RATE));
    p.off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  });

  const shippingFor = (total) => (total === 0 || total >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const formatINR = (n) => inr.format(n);

  // ---- persistence ------------------------------------------------------
  const KEY = { bag: "asq.bag.v1", wish: "asq.wishlist.v1" };
  const read = (k, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: keep in memory */ }
  };

  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());

  // Bag lines: { id, size, qty }. Unknown ids (e.g. from an old catalogue) are dropped.
  let bag = read(KEY.bag, []).filter((l) => byId(l.id) && l.qty > 0);
  let wish = read(KEY.wish, []).filter((id) => byId(id));

  const Store = {
    PRODUCTS,
    GST_RATE,
    FREE_SHIPPING_FROM,
    formatINR,
    byId,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    bag: () => bag.map((l) => ({ ...l, product: byId(l.id) })),
    bagCount: () => bag.reduce((n, l) => n + l.qty, 0),
    bagTotals() {
      const lines = Store.bag();
      const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      const gst = lines.reduce((s, l) => s + l.product.gst * l.qty, 0);
      const shipping = shippingFor(total);
      return { total, gst, shipping, toFree: total > 0 && !shipping ? 0 : Math.max(0, FREE_SHIPPING_FROM - total) };
    },
    addToBag(id, size = null, qty = 1) {
      const p = byId(id);
      if (!p) return;
      const s = p.sizes ? size || p.sizes[Math.floor(p.sizes.length / 2)] : null;
      const line = bag.find((l) => l.id === id && l.size === s);
      if (line) line.qty = Math.min(5, line.qty + qty);
      else bag.push({ id, size: s, qty: Math.min(5, qty) });
      write(KEY.bag, bag);
      emit();
    },
    setQty(id, size, qty) {
      bag = bag.map((l) => (l.id === id && l.size === size ? { ...l, qty: Math.max(0, Math.min(5, qty)) } : l)).filter((l) => l.qty > 0);
      write(KEY.bag, bag);
      emit();
    },
    clearBag() { bag = []; write(KEY.bag, bag); emit(); },

    wishlist: () => wish.map(byId),
    isWished: (id) => wish.includes(id),
    toggleWish(id) {
      wish = wish.includes(id) ? wish.filter((w) => w !== id) : [...wish, id];
      write(KEY.wish, wish);
      emit();
      return wish.includes(id);
    },
  };

  // Keep tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY.bag) bag = read(KEY.bag, []);
    if (e.key === KEY.wish) wish = read(KEY.wish, []);
    if (e.key === KEY.bag || e.key === KEY.wish) emit();
  });

  window.AsquareStore = Store;
})();
