/* Asquare Jewellery — hero film timeline, shared by index.html (1920x1080)
 * and portrait.html (1080x1920). Each page sets window.LAYOUT before loading.
 *
 * 6s @ 24fps = 144 frames. The website uses them in two parts:
 *   0.0 – 4.0s  (frames 0–95)   autoplayed on page load as the intro
 *   4.0 – 6.0s  (frames 96–143) scrubbed by scroll: the arch opens to full-bleed
 */
window.buildHeroFilm = function () {
  const L = window.LAYOUT;
  const { W, H } = L;

  // Deterministic PRNG (seeded LCG) so every render is identical.
  let seed = 20261028;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  // ---- geometry helpers ---------------------------------------------------
  const archPath = (a, pad = 0) => {
    const l = a.x - pad, w = a.w + pad * 2, t = a.top - pad, r = w / 2;
    return `M${l} ${H + 40} V${t + r} A${r} ${r} 0 0 1 ${l + w} ${t + r} V${H + 40}`;
  };
  // The arch window is a real box (rounded top, overflow hidden). Its photo is
  // counter-offset by the same amount so the photograph stays fixed in frame
  // while the window moves over it. Both tweens share duration and ease, so
  // they cancel exactly on every frame.
  const box = (a) => ({
    left: a.x,
    top: a.top,
    width: a.w,
    height: H + 40 - a.top,
    borderTopLeftRadius: a.w / 2,
    borderTopRightRadius: a.w / 2,
  });
  const counter = (a) => ({ left: -a.x, top: -a.top });
  // Camera keys for the photograph (frame coordinates, transform-origin 0 0):
  // k[0] while the arch is centred, k[1] when it rests aside, k[2] full-bleed.
  const K = L.photo.keys;
  // Transform that maps arch A0 onto arch A1 (uniform scale about the SVG origin).
  const mapArch = (a0, a1) => {
    const s = a1.w / a0.w;
    return { scale: s, x: a1.x - a0.x * s, y: a1.top - a0.top * s };
  };

  // ---- build DOM ----------------------------------------------------------
  const photo = document.getElementById("photo");
  photo.style.width = L.photo.width + "px";
  gsap.set(photo, { transformOrigin: "0 0", x: K[0].x - 50, y: K[0].y - 30, scale: 1.06 });

  const svgNS = "http://www.w3.org/2000/svg";
  const frame = document.getElementById("frameGroup");
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(svgNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    parent.appendChild(el);
    return el;
  };
  const outer = mk("path", { d: archPath(L.a0, 14), class: "line" }, frame);
  const inner = mk("path", { d: archPath(L.a0, 28), class: "line inner" }, frame);
  const echoes = document.getElementById("echoGroup");
  [70, 170, 300].forEach((p) => mk("path", { d: archPath(L.a0, p), class: "echo" }, echoes));

  // Keystone: a lozenge-cut gem with the A² monogram, sitting on the crown of the arch.
  const ks = document.getElementById("keystone");
  const kx = L.a0.x + L.a0.w / 2, ky = L.a0.top - 21, g = 30;
  mk("path", { d: `M${kx} ${ky - g} L${kx + g} ${ky} L${kx} ${ky + g} L${kx - g} ${ky} Z`, class: "gem" }, ks);
  mk("path", { d: `M${kx} ${ky - g} L${kx} ${ky + g} M${kx - g} ${ky} L${kx + g} ${ky}`, class: "facet" }, ks);
  const t = mk("text", { x: kx, y: ky + 8, "text-anchor": "middle" }, ks);
  t.textContent = "A²";

  // Glints (four-point stars) placed on real highlights in the photograph.
  const glints = document.getElementById("glints");
  const glintEls = L.glints.map((p) => {
    const el = document.createElement("div");
    el.className = "glint";
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    el.innerHTML =
      '<svg viewBox="-1 -1 2 2"><circle r="0.2"/><path d="M0,-1 C.07,-.07 .07,-.07 1,0 C.07,.07 .07,.07 0,1 C-.07,.07 -.07,.07 -1,0 C-.07,-.07 -.07,-.07 0,-1Z"/></svg>';
    glints.appendChild(el);
    return el;
  });

  // ---- timeline -----------------------------------------------------------
  const tl = gsap.timeline({ paused: true });
  const win = document.getElementById("window");
  gsap.set(win, box(L.a0));
  gsap.set("#reveal", counter(L.a0));
  gsap.set(["#frameGroup", "#echoGroup", "#keystoneMove"], { svgOrigin: "0 0" });
  const moveWindow = (a, at, dur, ease) => {
    tl.to(win, { ...box(a), duration: dur, ease }, at);
    tl.to("#reveal", { ...counter(a), duration: dur, ease }, at);
  };

  // Act 1 (0 – 1.3s): the arch is drawn in gold; the necklace rises inside it.
  [outer, inner].forEach((p, i) => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(p, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, i * 0.14);
  });
  tl.fromTo(".echo", { opacity: 0 }, { opacity: 1, duration: 1.4, stagger: 0.14, ease: "sine.out" }, 0.3);
  // Wipe: the window rises from below while its content is held still.
  const rise = H + 40 - L.a0.top;
  tl.fromTo("#window", { y: rise }, { y: 0, duration: 1.3, ease: "expo.inOut" }, 0.1);
  tl.fromTo("#reveal", { y: -rise }, { y: 0, duration: 1.3, ease: "expo.inOut" }, 0.1);
  tl.to(photo, { x: K[0].x, y: K[0].y, scale: 1, duration: 2.5, ease: "power2.out" }, 0);
  tl.fromTo("#keystone", { opacity: 0, scale: 0.4, rotation: -90, svgOrigin: `${kx} ${ky}` },
    { opacity: 1, scale: 1, rotation: 0, svgOrigin: `${kx} ${ky}`, duration: 0.7, ease: "back.out(1.7)" }, 0.95);

  // Act 2 (1.3 – 2.5s): a band of light passes over the gold; facets catch it.
  tl.fromTo("#sweep", { x: L.sweep[0] }, { x: L.sweep[1], duration: 1.3, ease: "sine.inOut" }, 1.25);

  // Act 3 (2.5 – 4.0s): the arch glides aside, leaving emerald space for the headline.
  const m1 = mapArch(L.a0, L.a1);
  moveWindow(L.a1, 2.5, 1.5, "power3.inOut");
  tl.to(photo, { x: K[1].x, y: K[1].y, duration: 1.5, ease: "power3.inOut" }, 2.5);
  tl.to(["#frameGroup", "#echoGroup"], { ...m1, duration: 1.5, ease: "power3.inOut" }, 2.5);
  tl.to("#keystoneMove", { ...m1, svgOrigin: "0 0", duration: 1.5, ease: "power3.inOut" }, 2.5);
  tl.fromTo("#sweep", { x: L.sweep[2] }, { x: L.sweep[3], duration: 1.1, ease: "sine.inOut", immediateRender: false }, 3.2);

  L.glints.forEach((p, i) => {
    const el = glintEls[i];
    tl.fromTo(el, { scale: 0, rotation: -30, opacity: 0 }, { scale: p.s, rotation: 12, opacity: 1, duration: 0.3, ease: "power2.out" }, p.t);
    tl.to(el, { scale: 0, rotation: 50, opacity: 0, duration: 0.45, ease: "power2.in" }, p.t + 0.3);
  });

  // Act 4 (4.0 – 6.0s, scroll-scrubbed on the site): the arch opens and the viewer steps in.
  const m2 = mapArch(L.a0, L.a2);
  moveWindow(L.a2, 4, 2, "power2.inOut");
  tl.to(["#frameGroup", "#echoGroup"], { ...m2, opacity: 0, duration: 2, ease: "power2.inOut" }, 4);
  tl.to("#keystoneMove", { ...m2, svgOrigin: "0 0", opacity: 0, duration: 1.2, ease: "power2.in" }, 4);
  // power3.out leads the window's inOut, so the photo edge never shows inside the opening.
  tl.to(photo, { x: K[2].x, y: K[2].y, scale: K[2].s, duration: 2, ease: "power3.out" }, 4);
  tl.fromTo("#vignette", { opacity: 0 }, { opacity: 1, duration: 2, ease: "sine.inOut" }, 4);

  // Gold dust drifts upward through all four acts.
  const dust = document.getElementById("dust");
  for (let i = 0; i < L.dust; i++) {
    const d = document.createElement("div");
    d.className = "mote";
    const size = 2 + rand() * 6;
    d.style.width = d.style.height = size + "px";
    d.style.left = rand() * W + "px";
    d.style.top = H * 0.2 + rand() * H * 0.85 + "px";
    dust.appendChild(d);
    const start = rand() * 1.2;
    tl.fromTo(d, { y: 0, x: 0 }, { y: -(120 + rand() * 260), x: (rand() - 0.5) * 80, duration: 6 - start, ease: "none" }, start);
    tl.fromTo(d, { opacity: 0 }, { opacity: 0.3 + rand() * 0.55, duration: 0.9, ease: "sine.out" }, start);
  }

  tl.seek(0);
  return tl;
};
