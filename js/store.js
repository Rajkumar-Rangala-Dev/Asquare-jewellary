/* Asquare Jewellery — catalogue, bag and wishlist state.
 * Shared by index.html and checkout.html. State persists in localStorage.
 * Replace PRODUCTS with your catalogue API when connecting a backend.
 */
(function () {
  "use strict";

  const GST_RATE = 0.03; // GST on jewellery in India

  // Price breakup in INR (before GST). Totals are derived, so they always add up.
  const PRODUCTS = [
    {
      id: "aria-studs",
      name: "Aria Halo Diamond Studs",
      tags: ["diamond"],
      type: "Earrings",
      badge: "Bestseller",
      img: "assets/img/p-studs.webp",
      alt: "Pair of round halo diamond stud earrings in white gold",
      metal: "18KT White Gold",
      weight: "3.12 g",
      stones: "0.62 ct diamonds · EF colour · VVS–VS clarity",
      breakup: { metal: 21400, making: 6800, stones: 55600 },
    },
    {
      id: "noor-pendant",
      name: "Noor Cushion Halo Pendant",
      tags: ["diamond"],
      type: "Pendant",
      img: "assets/img/p-pendant.webp",
      alt: "Cushion-shaped diamond halo pendant on a fine white gold chain",
      metal: "18KT White Gold",
      weight: "4.05 g",
      stones: "0.84 ct diamonds · FG colour · VS clarity",
      breakup: { metal: 27800, making: 8900, stones: 72400 },
    },
    {
      id: "vasundhara-necklace",
      name: "Vasundhara Temple Necklace Set",
      tags: ["gold", "bridal"],
      type: "Necklace Set",
      badge: "Heritage",
      img: "assets/img/p-temple.webp",
      alt: "22 karat temple gold necklace with ruby-red kemp stones and matching earrings",
      metal: "22KT Yellow Gold",
      weight: "48.60 g",
      stones: "Ruby-red kemp stones · matching drop earrings",
      breakup: { metal: 312000, making: 38500, stones: 6200 },
    },
    {
      id: "eternal-bands",
      name: "Eternal Twin Wedding Bands",
      tags: ["gold", "bridal"],
      type: "Couple Rings (Pair)",
      img: "assets/img/p-bands.webp",
      alt: "Pair of polished yellow gold wedding bands",
      metal: "22KT Yellow Gold",
      weight: "9.80 g (pair)",
      stones: "Comfort-fit, high polish",
      sizes: ["10", "12", "14", "16", "18", "20", "22"],
      breakup: { metal: 62900, making: 5800, stones: 0 },
    },
    {
      id: "rani-ring",
      name: "Rani Pink Sapphire Halo Ring",
      tags: ["diamond"],
      type: "Ring",
      badge: "New",
      img: "assets/img/p-sapphire.webp",
      alt: "Rose gold ring with an emerald-cut pink sapphire framed by diamonds",
      metal: "18KT Rose Gold",
      weight: "3.60 g",
      stones: "1.10 ct pink sapphire · 0.28 ct diamonds",
      sizes: ["8", "10", "12", "14", "16"],
      breakup: { metal: 24700, making: 7200, stones: 41000 },
    },
    {
      id: "kanak-bracelet",
      name: "Kanak Interlink Bracelet",
      tags: ["gold"],
      type: "Bracelet",
      img: "assets/img/p-bracelet.webp",
      alt: "Chunky interlinked yellow gold chain bracelet",
      metal: "22KT Yellow Gold",
      weight: "15.20 g",
      stones: "Hand-linked, box clasp",
      breakup: { metal: 97600, making: 9100, stones: 0 },
    },
    {
      id: "celeste-tennis",
      name: "Celeste Diamond Tennis Bracelet",
      tags: ["diamond", "bridal"],
      type: "Bracelet",
      badge: "Bestseller",
      img: "assets/img/p-tennis.webp",
      alt: "Line bracelet of round brilliant diamonds in white gold",
      metal: "18KT White Gold",
      weight: "9.40 g",
      stones: "3.20 ct diamonds · GH colour · VS clarity",
      breakup: { metal: 64500, making: 15800, stones: 158000 },
    },
    {
      id: "sitara-stack",
      name: "Sitara Stacking Rings, Set of 3",
      tags: ["diamond", "gold"],
      type: "Ring Set",
      img: "assets/img/p-stack.webp",
      alt: "Three stacked yellow gold rings set with pavé diamonds",
      metal: "18KT Yellow Gold",
      weight: "6.30 g",
      stones: "0.45 ct pavé diamonds",
      sizes: ["8", "10", "12", "14", "16"],
      breakup: { metal: 43200, making: 9600, stones: 18900 },
    },
  ];

  PRODUCTS.forEach((p) => {
    const b = p.breakup;
    p.subtotal = b.metal + b.making + b.stones;
    p.gst = Math.round(p.subtotal * GST_RATE);
    p.price = p.subtotal + p.gst;
  });

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
    formatINR,
    byId,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    bag: () => bag.map((l) => ({ ...l, product: byId(l.id) })),
    bagCount: () => bag.reduce((n, l) => n + l.qty, 0),
    bagTotals() {
      const lines = Store.bag();
      const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      const gst = lines.reduce((s, l) => s + l.product.gst * l.qty, 0);
      return { total, gst, subtotal: total - gst };
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
