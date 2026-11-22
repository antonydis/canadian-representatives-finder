# InfoCivic mobile UX audit — 2026-11-22

## Scope and methodology
Source review of `web/templates/index.html`, `web/static/css/style.css`, `web/static/js/app.js` and `web/static/js/scar-wizard.js`, plus automated regression testing in `tests/cloudflare-civic-ux.test.js` and `tests/cloudflare-scar.test.js`.

**Important:** This is a code and automated-test audit, **not** a certification based on a physical iPhone or Safari remote-device session. Responsive appearance and OS integration must still be observed in actual mobile browsers.

## Verified code improvements
- **Language switching:** Re-label only the message form's button row, not the separate government-suitability checkpoint. Keep recipient, subject, message and "Choose another representative" labels synchronized.
- **Language selector:** restore focus to the trigger when choosing a language, hide the fixed menu on scroll/resize, keep options keyboard reachable, and connect trigger to menu using ARIA.
- **Edited-email loss:** when the visitor edits the generated email, changing language requires an explicit confirmation; cancel preserves the draft. Switching representatives in the jurisdiction review discloses that a new draft replaces edits and preserves the original until generation succeeds.
- **iPhone keyboard:** the editable message height uses `window.visualViewport.height` when available instead of assuming the entire window is unobscured, with a smaller minimum and a CSS `dvh` limit.
- **Compact touch UI:** existing 44px targets, responsive buttons, word wrapping, safe-area viewport and reduced-motion CSS remain in place.

## Functional matrix to run on real devices
| Device/browser | Test | Expected result | Status |
|---|---|---|---|
| iPhone SE or 375px Safari | Postal search and representative list | No horizontal scrolling; readable contact names, email addresses, CTAs | Not physically tested |
| iPhone 15/16 Safari | Contact selected representative | Header wraps; back action remains accessible; name and postcode displayed | Not physically tested |
| iPhone Safari | Focus full name and reason | Keyboard does not obscure action or cause unexpected page jumps; font stays at 16px+ | Not physically tested |
| iPhone Safari | Generate, edit, copy, open mail | Editing works; copy includes real newlines; mailto has correct recipient/subject/body | Not physically tested |
| iPhone Safari | Switch interface language mid-form | Entered values preserved, labels and buttons update in correct places | Not physically tested |
| iPhone Safari | Generate EN, edit, switch to FR | Warns about replacing edited draft; cancel keeps changes | Not physically tested |
| iPhone Safari | Municipal issue + federal representative | Alert appears only with actionable confidence; can keep recipient or choose municipal | Not physically tested |
| iPhone Safari | Correct federal issue + federal representative | No unnecessary jurisdiction alert | Not physically tested |
| iPhone Safari | Open jurisdiction review | Scroll stays in dialog; bottom of sheet and buttons visible above home indicator; Escape / keyboard focus | Not physically tested |
| Android Chrome | Repeat core contact flow | Responsive layout and keyboard behavior | Not physically tested |
| Safari iOS large-text accessibility | 200% text and VoiceOver | Legible labels, focus order, controls and dialog announcements | Not physically tested |
| Offline/poor mobile signal | Classification and draft failures | Actionable error, ready-made template, no lost user input | Not physically tested |

## Open risks and recommendations
1. A real-device Safari test is required to certify keyboard/scroll behavior, mail-app launch and native clipboard permissions.
2. Browser automation of actual end-to-end flows should be added once a reproducible preview/CI browser environment is available. Current tests are primarily source and module regression checks.
3. The edit warning prevents *silent* loss but is not an undo mechanism. A future enhancement can retain the previous draft in memory during recipient changes, without storing citizen data on a server.
4. The jurisdiction classifier is probabilistic outside the limited deterministic verified rules. No alert should imply legal certainty.
5. Respect the decision not to add accounts, case histories, automatic reminders, notifications, or public analytics.
