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

## Client revisions — 10 November 2026

- `groups.json` is a dated snapshot of the 30 published PJR programs tagged `boleto_aereo`, retrieved through the same public catalogue used by https://www.pjrtravel.com/gruposconboletoaereo/. Includes only public trip facts, locally optimized images and paraphrased inclusion summaries. It is not a live availability feed. Confirm fares, origin, room basis, hotels and terms before reservation. Update this snapshot deliberately when PJR changes its catalogue.
- `GroupExplorer` replaces the inspiration cards at `#destinos`. Country, departure month/year, earliest departure date and numeric sorting combine. Cards open a native modal, preserving the page and filters; Escape/backdrop/close restore normal navigation. Group-specific WhatsApp links are prepared without sending anything.
- PDF summaries supplied by Luxury should be stored under `public/luxury/programs/` and referenced using each record's `pdf` field. Null means **request PDF**, never a fake download. Exact domestic group dates, prices and programs still await the agency; domestic custom-trip inquiries are available in the meantime.
- `HeroGallery` uses five manual, swipeable slides: Greece; a US collage; Europe; Turkey/Egypt/Japan; South Africa/Morocco/Peru. No autoplay. Native scroll snapping supports touch and trackpads, with labelled buttons, indicators and reduced-motion behavior.
- Extra destination photographs: Unsplash public images `photo-1485871981521-5b1fd3805eee` (New York), `photo-1514214246283-d427a95c5d2f` (Miami), `photo-1575089776834-8be34696ffb9` (Orlando), `photo-1600616366660-ba86bf0b3dfc` (Las Vegas, David Vives), `photo-1526392060635-9d6019884377` (Peru), `photo-1663192365262-ae9f884ac8b6` (Egypt, 2H Media), `photo-1513635269975-59663e0ac1ad` (London), `photo-1489749798305-4fea3ae63d43` (Morocco). All are optimized local WebP files.
- `LanguageSelector` loads Google's automatic translation widget only on opening the language control. Spanish is the source/default. Offered targets: English, French, Hindi, Japanese, Portuguese, German, Korean, simplified Chinese and Italian. This depends on Google's third-party service and browser content-blocking policies; it is not an editorial translation. A script error leaves Spanish intact and offers contacting the agency. Do not describe this as native translated content or guaranteed availability.
- Office hours and TravelAgency JSON-LD: Monday–Saturday 10:00–18:00, Sunday 10:00–16:00, online attention 24 hours; out-of-hours physical reception by prior consultation. Pickup service hours are independent and retain existing confirmed terms.
- DMC positioning: inbound and outbound agency in the United States and Cuba. Existing administration metadata, favicon, contact details and other tenants remain intact.
