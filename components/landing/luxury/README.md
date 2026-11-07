# Luxury Travel Point

Travel-first agency landing, selected **only** by the exact host `luxury-travel-point.perlamarketplace.com` in `app/page.tsx`. Other tenants keep their existing landing and metadata. The registered store already has `has_landing=true`; no database mutations are required.

- `LuxuryLanding.tsx`: server-rendered marketing sections, services, shipping rates, pickup, FAQs, contact, JSON-LD and November eligibility by America/New_York calendar month.
- `TravelExplorer.tsx`: client island with regional filters, accessible native inquiry dialog, month/traveler planning and a review step before opening WhatsApp. It does not send messages, create bookings, take payment or claim live availability.
- `content.ts`: destinations, contact, box prices, services and FAQs.
- `luxury.module.css`: scoped styles, responsive layouts and reduced-motion behavior.
- `/design-preview/luxury`: noindex design review route; the production homepage uses the exact tenant host.

## Source of truth

The supplied `Resumen_Ofertas_Noviembre_Luxury_Travel_Point.pdf` takes precedence over flyers for shipping prices, minimum billable weight, office hours, pickup coverage and transit estimates. Shipping prices are dated November 2026. Weekly November promotions disappear after that month; the regular rate label then explicitly becomes a historical reference with a request to confirm current prices. Box prices are explicitly labeled November 2026.

Other supplied flyers inform supplementary services (cruises, flights, passport, remittances, complete boxes and vehicle shipping). Unverified package prices, dates, airline baggage allowances, experience claims, testimonials, automatic booking and a provider integration are deliberately absent. Travel destinations are inspiration with an inquiry flow, not an imported live PJR catalog. The current agency site’s circuits did not load during review. PJR was used for information architecture and visual reference, not copied package data.

## Assets

Logo: supplied agency logo and agency-owned airplane mark at `https://www.luxurytravelpoint.com/images/iconoAvionDorado.png`.

Locally hosted optimized WebP scenic photographs from Unsplash (illustrative, not guarantees of a hotel, ship or booked service):

- `hero.webp`: `photo-1613395877344-13d4a8e0d49e` (Santorini)
- `caribe.webp`: `photo-1519046904884-53103b34b206` (Caribbean beach inspiration)
- `cuba.webp`: `photo-1500759285222-a95626b934cb` (Havana)
- `europa.webp`: `photo-1516483638261-f4dbaf036963` (Cinque Terre)
- `paris.webp`: `photo-1570939274717-7eda259b50ed` (Paris)
- `crucero.webp`: `photo-1548574505-5e239809ee19` (cruise port, not Icon of the Seas)
- `puertorico.webp`: `photo-1500375592092-40eb2168fd21` (ocean inspiration)

Promotional flyers are content references only and are not shipped as page images.

## Verification

`npx tsc --noEmit`

`node --test tests/wfcargo-landing.test.mjs tests/tenant-branding.test.mjs`

Browser QA should cover desktop/mobile, region filters, traveler/month prefill, dialog validation/review/edit/Escape/focus restoration, shipping accordions, contact targets and exact-host isolation.
