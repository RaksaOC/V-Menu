# Remaining work: every ticket

Generated 2026-11-23 21:35. 5 of 77 done (6%). Essential (P0 path): 5 of 14.

"Essential" = the 6 P0 blockers, the cleanup tickets they depend on, and the final showcase. Order = the order to work in (dependencies first).

| # | Ticket | Title | Priority | Essential | Status | PR | Issue | Depends on | Handoff |
|---|---|---|---|---|---|---|---|---|---|
| 1 | B9 | Issue and PR templates, GitHub issues for every ticket | testing/CI | yes | completed | [#135](https://github.com/RaksaOC/V-Menu/pull/135) | [#132](https://github.com/RaksaOC/V-Menu/issues/132) |  |  |
| 2 | CL-01 | Group the repo into frontend/ and backend/ | P1 | yes | completed | [#136](https://github.com/RaksaOC/V-Menu/pull/136) | [#99](https://github.com/RaksaOC/V-Menu/issues/99) |  |  |
| 3 | CL-02 | One shared backend library: @vmenu/common | P1 | yes | completed | [#139](https://github.com/RaksaOC/V-Menu/pull/139) | [#100](https://github.com/RaksaOC/V-Menu/issues/100) | CL-01 |  |
| 4 | CL-12 | Repo hygiene | P1 |  | not started |  | [#110](https://github.com/RaksaOC/V-Menu/issues/110) | CL-02 | [notes](tickets/CL-12.md) |
| 5 | CL-03 | Enforce the boundaries in CI | P1 |  | not started |  | [#101](https://github.com/RaksaOC/V-Menu/issues/101) | CL-02 | [notes](tickets/CL-03.md) |
| 6 | SEC-09 | Security scanning in the pipeline | P1 |  | not started |  | [#121](https://github.com/RaksaOC/V-Menu/issues/121) | CL-01 | [notes](tickets/SEC-09.md) |
| 7 | B1 | Frontend unit tests | testing/CI | yes | completed | [#140](https://github.com/RaksaOC/V-Menu/pull/140) | [#124](https://github.com/RaksaOC/V-Menu/issues/124) | CL-01 |  |
| 8 | CL-08 | Frontend folders by feature | P1 | yes | completed | [#141](https://github.com/RaksaOC/V-Menu/pull/141) | [#106](https://github.com/RaksaOC/V-Menu/issues/106) | B1 |  |
| 9 | CL-10 | One API client per feature, and one toast helper | P1 | yes | in progress |  | [#108](https://github.com/RaksaOC/V-Menu/issues/108) | CL-08 | [notes](tickets/CL-10.md) |
| 10 | CL-09 | Merge duplicate components and build a small UI kit | P1 | yes | not started |  | [#107](https://github.com/RaksaOC/V-Menu/issues/107) | CL-08 | [notes](tickets/CL-09.md) |
| 11 | VM-01 | Table QR codes do not exist | P0 | yes | not started |  | [#63](https://github.com/RaksaOC/V-Menu/issues/63) | CL-09, B1 | [notes](tickets/VM-01.md) |
| 12 | VM-02 | Adding a menu item with a real photo fails | P0 | yes | not started |  | [#64](https://github.com/RaksaOC/V-Menu/issues/64) | CL-02, CL-09 | [notes](tickets/VM-02.md) |
| 13 | SEC-05 | Make the photo upload safe | P0 (with VM-02) | yes | not started |  | [#117](https://github.com/RaksaOC/V-Menu/issues/117) | VM-02 | [notes](tickets/SEC-05.md) |
| 14 | VM-04 | A closed table tells the customer to scan the QR code | P0 | yes | not started |  | [#66](https://github.com/RaksaOC/V-Menu/issues/66) | CL-08 | [notes](tickets/VM-04.md) |
| 15 | VM-05 | The cart is shared across restaurants and tables | P0 | yes | not started |  | [#67](https://github.com/RaksaOC/V-Menu/issues/67) | CL-08 | [notes](tickets/VM-05.md) |
| 16 | SEC-02 | The web pages send no security headers | P1 |  | not started |  | [#114](https://github.com/RaksaOC/V-Menu/issues/114) | CL-01 | [notes](tickets/SEC-02.md) |
| 17 | CL-04-order | Clean layers inside order-service | P1 |  | not started |  | [#102](https://github.com/RaksaOC/V-Menu/issues/102) | CL-02 | [notes](tickets/CL-04-order.md) |
| 18 | VM-03 | The kitchen screen silently stops updating after one hour | P0 | yes | not started |  | [#65](https://github.com/RaksaOC/V-Menu/issues/65) | CL-10 | [notes](tickets/VM-03.md) |
| 19 | SEC-01 | Security: where the login token is kept (details private) | P1 |  | not started |  | [#113](https://github.com/RaksaOC/V-Menu/issues/113) | VM-03 | [notes](tickets/SEC-01.md) |
| 20 | VM-06 | Every ordering error shows Failed to place order | P1 |  | not started |  | [#68](https://github.com/RaksaOC/V-Menu/issues/68) | CL-10, VM-05 | [notes](tickets/VM-06.md) |
| 21 | VM-08 | A table can end up with two open bills | P1 |  | not started |  | [#70](https://github.com/RaksaOC/V-Menu/issues/70) | CL-04-order | [notes](tickets/VM-08.md) |
| 22 | VM-07 | After ordering, the customer gets no confirmation | P1 |  | not started |  | [#69](https://github.com/RaksaOC/V-Menu/issues/69) | VM-06, CL-04-order | [notes](tickets/VM-07.md) |
| 23 | VM-10 | The kitchen downloads the whole order history every 2 seconds | P1 |  | not started |  | [#72](https://github.com/RaksaOC/V-Menu/issues/72) | CL-04-order | [notes](tickets/VM-10.md) |
| 24 | VM-11 | The cashier's bills don't update until the page is reloaded | P1 |  | not started |  | [#73](https://github.com/RaksaOC/V-Menu/issues/73) | CL-04-order, CL-10 | [notes](tickets/VM-11.md) |
| 25 | SEC-06 | Security: how rate limits identify visitors (details private) | P1 |  | not started |  | [#118](https://github.com/RaksaOC/V-Menu/issues/118) | CL-02 | [notes](tickets/SEC-06.md) |
| 26 | SEC-07 | Access-control test matrix | P1 |  | not started |  | [#119](https://github.com/RaksaOC/V-Menu/issues/119) | CL-02 | [notes](tickets/SEC-07.md) |
| 27 | B3 | Coverage report and minimum | testing/CI |  | not started |  | [#126](https://github.com/RaksaOC/V-Menu/issues/126) | CL-12, B1 | [notes](tickets/B3.md) |
| 28 | SWEEP-1 | Review sweep: open PRs, review comments, conflicts, CI | review |  | not started |  | - |  | [notes](tickets/SWEEP-1.md) |
| 29 | CL-04-menu | Clean layers inside menu-service | P1 |  | not started |  | [#102](https://github.com/RaksaOC/V-Menu/issues/102) | CL-02 | [notes](tickets/CL-04-menu.md) |
| 30 | CL-04-restaurant | Clean layers inside restaurant-service | P1 |  | not started |  | [#102](https://github.com/RaksaOC/V-Menu/issues/102) | CL-02 | [notes](tickets/CL-04-restaurant.md) |
| 31 | CL-05 | Shared contracts with validation: @vmenu/contracts | P1 |  | not started |  | [#103](https://github.com/RaksaOC/V-Menu/issues/103) | CL-04-order, CL-04-menu, CL-04-restaurant | [notes](tickets/CL-05.md) |
| 32 | CL-06 | Name things clearly | P2 |  | not started |  | [#104](https://github.com/RaksaOC/V-Menu/issues/104) | CL-05 | [notes](tickets/CL-06.md) |
| 33 | VM-25 | Menu categories | P1 |  | not started |  | [#87](https://github.com/RaksaOC/V-Menu/issues/87) | CL-04-menu, CL-05 | [notes](tickets/VM-25.md) |
| 34 | VM-27 | Order status: pending, preparing, ready, served, cancelled | P1 |  | not started |  | [#89](https://github.com/RaksaOC/V-Menu/issues/89) | VM-10, CL-05 | [notes](tickets/VM-27.md) |
| 35 | B6 | Firebase Auth emulator in CI | testing/CI |  | not started |  | [#129](https://github.com/RaksaOC/V-Menu/issues/129) | CL-01 | [notes](tickets/B6.md) |
| 36 | VM-13 | Security: staff role check (details private) | P1 |  | not started |  | [#75](https://github.com/RaksaOC/V-Menu/issues/75) | CL-04-restaurant | [notes](tickets/VM-13.md) |
| 37 | VM-12 | Adding a staff member signs the owner's browser in as that staff member | P1 |  | not started |  | [#74](https://github.com/RaksaOC/V-Menu/issues/74) | VM-13, B6 | [notes](tickets/VM-12.md) |
| 38 | VM-14 | There is no Forgot password | P1 |  | not started |  | [#76](https://github.com/RaksaOC/V-Menu/issues/76) | CL-08, B6 | [notes](tickets/VM-14.md) |
| 39 | SEC-03 | Security: staff access after removal (details private) | P1 |  | not started |  | [#115](https://github.com/RaksaOC/V-Menu/issues/115) | CL-04-restaurant | [notes](tickets/SEC-03.md) |
| 40 | SEC-08 | Harden both Firebase projects | P1 |  | not started |  | [#120](https://github.com/RaksaOC/V-Menu/issues/120) | CL-01 | [notes](tickets/SEC-08.md) |
| 41 | VM-09 | The owner's revenue and top sellers are wrong | P1 |  | not started |  | [#71](https://github.com/RaksaOC/V-Menu/issues/71) | CL-04-order | [notes](tickets/VM-09.md) |
| 42 | VM-15 | Renaming or deleting a table breaks its open bill | P1 |  | not started |  | [#77](https://github.com/RaksaOC/V-Menu/issues/77) | CL-04-menu, CL-04-order | [notes](tickets/VM-15.md) |
| 43 | VM-16 | Two tables can get the same name | P1 |  | not started |  | [#78](https://github.com/RaksaOC/V-Menu/issues/78) | CL-04-menu | [notes](tickets/VM-16.md) |
| 44 | VM-17 | Invalid menu edits are silently ignored | P1 |  | not started |  | [#79](https://github.com/RaksaOC/V-Menu/issues/79) | CL-05 | [notes](tickets/VM-17.md) |
| 45 | VM-18 | Changing a staff role can duplicate it | P2 |  | not started |  | [#80](https://github.com/RaksaOC/V-Menu/issues/80) | CL-04-restaurant | [notes](tickets/VM-18.md) |
| 46 | VM-19 | The kitchen has no logout, and staff pages don't check the restaurant | P2 |  | not started |  | [#81](https://github.com/RaksaOC/V-Menu/issues/81) | CL-08 | [notes](tickets/VM-19.md) |
| 47 | VM-20 | The owner header always says John Doe | P2 |  | not started |  | [#82](https://github.com/RaksaOC/V-Menu/issues/82) | CL-08 | [notes](tickets/VM-20.md) |
| 48 | VM-21 | The customer menu shows the restaurant's slug, not its name | P1 |  | not started |  | [#83](https://github.com/RaksaOC/V-Menu/issues/83) | CL-04-restaurant, CL-08 | [notes](tickets/VM-21.md) |
| 49 | VM-22 | Security: protect tables against order abuse (details private) | P1 |  | not started |  | [#84](https://github.com/RaksaOC/V-Menu/issues/84) | CL-04-order | [notes](tickets/VM-22.md) |
| 50 | VM-23 | An order can be saved without being on any bill | P2 |  | not started |  | [#85](https://github.com/RaksaOC/V-Menu/issues/85) | VM-08 | [notes](tickets/VM-23.md) |
| 51 | CL-07 | Money in cents, dates in one format | P2 |  | not started |  | [#105](https://github.com/RaksaOC/V-Menu/issues/105) | CL-05 | [notes](tickets/CL-07.md) |
| 52 | VM-31 | Bill totals worked out on the server | P2 |  | not started |  | [#93](https://github.com/RaksaOC/V-Menu/issues/93) | CL-07 | [notes](tickets/VM-31.md) |
| 53 | VM-24 | The invoice has a placeholder QR image and a hard-coded $ | P2 |  | not started |  | [#86](https://github.com/RaksaOC/V-Menu/issues/86) | CL-07, VM-02, VM-31 | [notes](tickets/VM-24.md) |
| 54 | SWEEP-2 | Review sweep: open PRs, review comments, conflicts, CI | review |  | not started |  | - |  | [notes](tickets/SWEEP-2.md) |
| 55 | VM-26 | Dish descriptions, tags and sold out | P2 |  | not started |  | [#88](https://github.com/RaksaOC/V-Menu/issues/88) | VM-25 | [notes](tickets/VM-26.md) |
| 56 | VM-28 | Notes on order lines | P2 |  | not started |  | [#90](https://github.com/RaksaOC/V-Menu/issues/90) | VM-27 | [notes](tickets/VM-28.md) |
| 57 | VM-29 | Make the kitchen screen work as a kitchen screen | P2 |  | not started |  | [#91](https://github.com/RaksaOC/V-Menu/issues/91) | VM-27 | [notes](tickets/VM-29.md) |
| 58 | VM-30 | Request the bill and Call staff buttons for customers | P2 |  | not started |  | [#92](https://github.com/RaksaOC/V-Menu/issues/92) | CL-04-order | [notes](tickets/VM-30.md) |
| 59 | VM-32 | Remove the template pages | P2 |  | not started |  | [#94](https://github.com/RaksaOC/V-Menu/issues/94) | VM-21 | [notes](tickets/VM-32.md) |
| 60 | SEC-04 | Security: who can order to a table (details private) | P2 |  | not started |  | [#116](https://github.com/RaksaOC/V-Menu/issues/116) | VM-01 | [notes](tickets/SEC-04.md) |
| 61 | SEC-10 | Watch for attacks: log and alert on failed access | P2 |  | not started |  | [#122](https://github.com/RaksaOC/V-Menu/issues/122) | CL-02 | [notes](tickets/SEC-10.md) |
| 62 | SEC-11 | Check each database user can only reach its own databases | P2 |  | not started |  | [#123](https://github.com/RaksaOC/V-Menu/issues/123) | CL-01 | [notes](tickets/SEC-11.md) |
| 63 | B4 | E2E tests for every journey | testing/CI |  | not started |  | [#127](https://github.com/RaksaOC/V-Menu/issues/127) | VM-27, VM-25, VM-07, VM-01 | [notes](tickets/B4.md) |
| 64 | CL-11 | Break up the big files and remove dead code | P2 |  | not started |  | [#109](https://github.com/RaksaOC/V-Menu/issues/109) | CL-09 | [notes](tickets/CL-11.md) |
| 65 | CL-13 | Stricter lint and type checks | P2 |  | not started |  | [#111](https://github.com/RaksaOC/V-Menu/issues/111) | CL-12 | [notes](tickets/CL-13.md) |
| 66 | CL-14 | Shared test helpers and smaller test files | P2 |  | not started |  | [#112](https://github.com/RaksaOC/V-Menu/issues/112) | CL-02 | [notes](tickets/CL-14.md) |
| 67 | B7 | Test staging after every deploy | testing/CI |  | not started |  | [#130](https://github.com/RaksaOC/V-Menu/issues/130) | CL-01 | [notes](tickets/B7.md) |
| 68 | B10 | Metrics for the new features | testing/CI |  | not started |  | [#133](https://github.com/RaksaOC/V-Menu/issues/133) | VM-27 | [notes](tickets/B10.md) |
| 69 | SWEEP-3 | Review sweep: open PRs, review comments, conflicts, CI | review |  | not started |  | - |  | [notes](tickets/SWEEP-3.md) |
| 70 | VM-33 | Customer menu and cart in Deep Lab | P2 |  | not started |  | [#95](https://github.com/RaksaOC/V-Menu/issues/95) | CL-09, VM-25 | [notes](tickets/VM-33.md) |
| 71 | VM-34 | Kitchen screen in Deep Lab | P2 |  | not started |  | [#96](https://github.com/RaksaOC/V-Menu/issues/96) | VM-27, CL-09 | [notes](tickets/VM-34.md) |
| 72 | VM-35 | Cashier and owner dashboards in Deep Lab | P2 |  | not started |  | [#97](https://github.com/RaksaOC/V-Menu/issues/97) | CL-09 | [notes](tickets/VM-35.md) |
| 73 | VM-36 | Accessibility pass | P2 |  | not started |  | [#98](https://github.com/RaksaOC/V-Menu/issues/98) | CL-09 | [notes](tickets/VM-36.md) |
| 74 | B5 | Screenshot and accessibility tests | testing/CI |  | not started |  | [#128](https://github.com/RaksaOC/V-Menu/issues/128) | B4 | [notes](tickets/B5.md) |
| 75 | B8 | Make the new tests required in CI | testing/CI |  | not started |  | [#131](https://github.com/RaksaOC/V-Menu/issues/131) | B4, B5 | [notes](tickets/B8.md) |
| 76 | SWEEP-4 | Final review sweep, plus the B2 audit (one regression test per bug) | review |  | not started |  | - |  | [notes](tickets/SWEEP-4.md) |
| 77 | B11 | Final deliverable: before-and-after showcase | testing/CI | yes | not started |  | [#134](https://github.com/RaksaOC/V-Menu/issues/134) |  | [notes](tickets/B11.md) |