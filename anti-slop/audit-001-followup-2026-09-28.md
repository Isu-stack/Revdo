# Revdo audit 001 follow-up

Date: 2026-09-27

The owner authorized fixes for all findings in `audit-001-2026-09-28.md`.

## Resolution

| Finding | Result | Verification |
| --- | --- | --- |
| 1. Static file traversal | Fixed. Static delivery now allows only `/`, `/admin`, and direct image asset filenames with approved extensions. | Regression test confirms the previously successful encoded traversal now returns 404. Direct requests for server source, admin source, package metadata, data and environment paths return 404. |
| 2. Mobile drawer focus | Fixed in source. The closed drawer is inert; opening moves focus into the menu, Tab stays within it, Escape and close restore focus, and the visible and accessible button labels track state. | Source and inline JavaScript checks pass. A live keyboard/browser check remains unavailable because the browser session cannot reach the local workspace server. |
| 3. Low-contrast labels | Fixed for measured text pairings. Light-page muted text now reaches 4.68:1; footer labels reach 5.56:1 and footer links reach 10.34:1. | Bundled contrast checker passes all three pairings and its 8-case self-test. The hero gained a darker lower scrim; image-area contrast could not be sampled in a live browser. |
| 4. Invalid menu routes | Fixed. Server validation requires exactly one labeled entry for each implemented page. Admin users can edit menu labels without changing route keys. | Regression test submits an unsupported slug and receives HTTP 400. Project check confirms content routes match the five views. |
| 5. Forwarded-IP throttling | Fixed. The server ignores `X-Forwarded-For` unless the socket peer is listed in `TRUSTED_PROXY_IPS`. Expired records are pruned and the map has a size limit. | Regression test sends changing forwarded addresses and still receives HTTP 429 after five failed attempts from the same peer. |
| 6. Placeholder social URLs | Fixed. Instagram and Are.na entries were removed because no verified profile URLs were configured. | Project check rejects placeholder footer destinations. |
| 7. Admin load error state | Fixed. Admin session and content loading now show readable status text and a retry path. | Inline script syntax checks pass. Full dashboard interaction was not available in browser during this pass. |
| 8. Unsafe CMS destinations | Fixed. Server rejects non-HTTPS external destinations, unsupported schemes, and non-local image paths. The public footer also filters unsafe links before rendering and opens HTTPS destinations with safe `rel` attributes. | Regression tests reject a `javascript:` footer link and an external CMS image URL; the approved local logo asset route responds successfully. |

The server also sends MIME-sniffing, framing, referrer and CSP frame restrictions. `npm run check`, `npm test`, the project JSON/asset check and the contrast checks pass.

## Remaining verification limit

The local application could not be opened in the cloud Chrome session, which returned `net::ERR_BLOCKED_BY_CLIENT` for `127.0.0.1`. The browser-only visual checks at phone, tablet and desktop widths, menu keyboard operation, and admin form interaction need a browser that can reach the local server.
