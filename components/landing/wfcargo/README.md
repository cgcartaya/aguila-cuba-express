# WF Cargo landing

Only `wf-cargo.perlamarketplace.com` selects this landing in `app/page.tsx`. All styles are local CSS Modules; no shared tenant styles or database settings are changed.

- `WfCargoLanding.tsx`: section composition, header, footer and contact.
- `content.ts`: slides, images, rates, service prices, branch details, contact and FAQs.
- `PromotionSlider.tsx`: four promotions; automatic 7-second rotation, navigation, pause, reduced-motion support and keyboard focus pause.
- `ShippingCalculator.tsx`: maritime estimate by weight or fixed box; packaging and customs are disclosed separately. Consultation opens WhatsApp.
- `PickupForm.tsx`: validates contact, boxes and preferred date, then prepares a WhatsApp message. It does not create a confirmed booking.
- `ServiceSections.tsx`: independent service grid, procedures, benefits, remittances/travel, other services, branches and FAQs.
- `wfcargo.module.css`: responsive styles and brand palette (navy, yellow, red).
- `/public/wfcargo`: locally hosted optimized assets. The owner-supplied logo and promotional flyers are retained; the shipping photograph is illustrative.

To add a promotion, add an entry to `slides` and an image under `/public/wfcargo`; controls are generated from the array. Reorder sections in `WfCargoLanding.tsx` and retain their IDs for navigation. A future CMS can supply the same content shape without coupling section layouts.

Provider tracking, live availability, legal document requirements and online payments are not fabricated. Confirmed requirements can be added when the agency provides them. Customer-facing content is Spanish in this first implementation.

Checks: `npx tsc --noEmit`; `node --test tests/wfcargo-landing.test.mjs tests/tenant-branding.test.mjs`.
