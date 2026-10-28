# Asquare Jewellery: e-commerce homepage

A static homepage and checkout for Asquare Jewellery. The palette is Royal Emerald, Champagne Gold, Warm Ivory and Charcoal. Headings use Cormorant Garamond and body text uses Jost. Two motion films were built in [HyperFrames](https://hyperframes.heygen.com), rendered to image sequences, and drawn onto canvases frame by frame as the visitor scrolls.

There is no build step. Serve `site/` from any static host:

```bash
cd site && python3 -m http.server 8000   # open http://localhost:8000
```

## Structure

```
site/
  index.html          homepage
  checkout.html       single-page checkout
  css/                fonts.css (self-hosted), styles.css (design system + homepage), checkout.css
  js/store.js         catalogue, price breakup, bag + wishlist (localStorage)
  js/main.js          frame players, smooth scroll, grid, quick view, drawer, search, carousel
  js/checkout.js      validation, order summary, coupon, confirmation
  vendor/             GSAP 3.14 + ScrollTrigger, Lenis 1.3 (local copies)
  assets/frames/      HyperFrames output, WebP
    hero-l/           144 frames, 1600×900 (desktop / landscape)
    hero-p/           144 frames, 720×1280 (phones)
    craft/            120 frames, 900×900
  assets/img/         product and editorial photography (WebP)
motion/
  hero/               HyperFrames project: index.html (landscape), compositions/portrait.html, film.js, film.css
  craft/              HyperFrames project: diamond solitaire, sketch → facet → set → polish
```

## The motion films

**Hero (6 s at 24 fps).** A gold arch draws itself on emerald, and a 22KT temple necklace is revealed inside it. A band of light passes over the gold and facets glint. The arch then moves aside to make room for the headline. On the site, frames 0–95 play once on load and frames 96–143 are scrubbed by scroll, so the arch opens to a full-bleed shot as you scroll. Phones get a separate portrait render.

**Craft (5 s at 24 fps).** A round brilliant diamond is built from real facet geometry: 57 facets, depth-sorted and lit. Its edges are sketched, the facets fill with light, the gold shank and claws close around the stone, and the stone is polished to a sparkle. Scrolling through the "About Asquare" section scrubs the film, and the four step captions stay in sync with it.

To re-render after editing a composition (requires FFmpeg and `npx hyperframes browser ensure`):

```bash
cd motion/hero
npx hyperframes render --format png-sequence --fps 24 -o /tmp/hero-l
npx hyperframes render -c compositions/portrait.html --format png-sequence --fps 24 -o /tmp/hero-p
ffmpeg -start_number 1 -i /tmp/hero-l/frame_%06d.png -vf scale=1600:900 -c:v libwebp -quality 74 -start_number 0 ../../site/assets/frames/hero-l/%03d.webp
# portrait: scale=720:1280, quality 72 → hero-p/ ; craft: scale=900:900, quality 80 → craft/
```

If you change frame counts, update `HERO` / `CRAFT` at the top of the hero and craft sections in `js/main.js`.

## Behaviour notes

- **Loading.** The hero preloads frame 0 and streams the rest. If a frame hasn't arrived yet, the player draws the nearest loaded one, so playback never stalls. Craft frames start loading one screen before the section.
- **Reduced motion / data saver.** No smooth scroll and no autoplay. The hero and craft sections show a static still and every step caption is visible.
- **Accessibility.** Includes a skip link, visible focus styles, a native `<dialog>` for quick view and search, an `inert`-backed drawer, `aria-pressed` on wishlist and filter buttons, and labelled form errors. Small gold text on emerald uses `--gold-soft` (4.9:1). Gold is never used for text on ivory.
- **Prices.** Each product stores metal value, making charges and stone value. GST (3%) and totals are derived from those numbers, so the quick-view breakup always adds up.

## Before going live

These parts are placeholders and need real data or integrations:

- **Catalogue**: `PRODUCTS` in `js/store.js`. Prices, weights and stone details are illustrative. Replace them with your catalogue or API, and connect live gold rates if pricing follows the day's rate.
- **Payments**: `createOrder()` in `js/checkout.js` simulates success. Connect it to your order API and gateway (Razorpay, PayU, Cashfree) and resolve only after payment succeeds. Validate coupons on the server. `ASQUARE5` is a demo code.
- **Newsletter**: the form validates but doesn't send anything yet. Connect it to your email provider.
- **Copy**: testimonials, address, phone and email are placeholders. So are the Instagram links and footer policy links.
- **Photography**: the photos come from Unsplash (free to use under the [Unsplash License](https://unsplash.com/license)). Swap in Asquare's own product shoots when they're ready, and keep product backgrounds neutral.
