# CarryGo Brand Assets

Logo concept: **arrow-box negative space**. A rounded squircle (parcel) with a right-pointing arrow carved from it via negative space. Minimal, modern, geometric.

## Files

| File | Use case | Dimensions |
|---|---|---|
| `logo-icon.svg` | App icon, favicon, standalone mark | 1024 × 1024 |
| `logo-icon-mono.svg` | Icon in a single color (follows `currentColor`) | 1024 × 1024 |
| `logo-horizontal.svg` | Site header, email signature, docs | 1600 × 400 |
| `logo-horizontal-mono.svg` | Horizontal lockup, single color (`currentColor`) | 1600 × 400 |
| `logo-stacked.svg` | Narrow spaces, business cards, splash | 800 × 1000 |

## Palette

| Token | Hex | Usage |
|---|---|---|
| Ink | `#0F172A` | Primary mark, "Carry" wordmark text |
| Accent | `#2563EB` | "Go" wordmark text (motion/trust signal) |

Mono variants (`currentColor`) inherit color from the parent element — set `color: #0F172A` (or any brand color) on the containing element.

## Clear space

Reserve a minimum clear space of ¼ of the icon's height on all sides of the logo.

## Minimum size

- Icon: 32 × 32 px (arrow remains legible)
- Horizontal lockup: 160 px wide
- Stacked lockup: 80 px wide

## Don'ts

- Don't recolor the arrow cutout — it's negative space, always transparent.
- Don't rotate or skew the mark.
- Don't apply drop shadows or outer glows.
- Don't change the proportion of the arrow to the box.

## Typography

Wordmark set in **Inter 800** (fallbacks: Helvetica Neue, Arial). Letter-spacing `-0.03em` for the tight modern feel. If you ship a brand font, update the `font-family` in each SVG or convert the text to paths.

## Export notes

To generate PNGs for `app.json` / stores, render each SVG at:
- `icon.png` — 1024 × 1024 from `logo-icon.svg`
- `adaptive-icon.png` — 1024 × 1024 (foreground only) from `logo-icon.svg`
- `splash-logo.png` — 400 × 400 from `logo-icon.svg`
- `favicon.png` — 64 × 64 from `logo-icon.svg`
