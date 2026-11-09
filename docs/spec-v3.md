# Travelian Super Admin Dashboard Specification v3.0 (Final Draft)

Nov 4, 2026 · @Travelian

This document fixes the 14 menus, their submenus, the cards and filters on every screen, and the reason for each, so mockups can be designed screen by screen from it.

## 1. Decisions and principles

These decisions come from v2.0 and from our discussion since. Every card, filter and submenu below traces back to one of them.

| # | Decision | Why |
| --- | --- | --- |
| D1 | Exactly 14 main menus; Overview and Finance Dashboard are the menu homepages, not submenus | Keeps navigation short and stops duplicate screens with conflicting numbers |
| D2 | One dashboard UI for every user (staff, agencies, B2C); permissions change what is visible | One codebase to build and test; no separate customer or agent dashboards to maintain |
| D3 | Wallets exist for B2B agencies only (one shared wallet per agency). B2C pays per booking | Agencies prepay and spend; individual customers do not hold balances, which avoids holding customer money |
| D4 | A double-entry ledger is the source of truth for money | Replaces the Excel sheets whose balances disagree with each other today |
| D5 | Each booking carries separate booking, payment, supplier, issuance and servicing statuses | One word like "Pending" hides whether the problem is payment, supplier or ticketing |
| D6 | One provider-account model covers own airline IDs, supplier portal wallets and pay-per-booking suppliers | The three behave alike: calculated balance, verified balance, earmark. One design instead of three |
| D7 | Supplier payment is tied to the booking and its supplier hold deadline (about 30 minutes minimum) | Holds expire quickly; a missed deadline loses the booking, and a paid-but-unissued booking must never be retried blindly |
| D8 | Every sale records its source from a fixed list: own airline ID or a registered supplier | Free-text sources ("HT", "Travel Ustad", "TravelUstad") cannot be reported by airline or source |
| D9 | Refunds start with a recorded quote; payout follows the amount actually received | Amounts differ by airline and tax; GDS refunds take 1 to 2 weeks while own-ID refunds credit at once |
| D10 | B2C refunds are paid by bank transfer after Travelian receives the money, then the customer dashboard is updated | Travelian never pays out before the airline or supplier has paid it |
| D11 | Supplier refunds are either paid to the bank or kept as credit with the supplier and reused | Reflects how you work today; both outcomes must be recorded so balances stay correct |
| D12 | The airline report holds minimal passenger data and can be generated for one airline | Airlines, IATA and GDS judge scope from sales; customers' identity numbers are not needed |
| D13 | Field-level security: agents and customers never see supplier cost, margin or airline IDs | Protects pricing and prevents agents from bypassing you |
| D14 | Passwords and tokens never live in the system's tables or exports; only a reference to a secrets vault | The current spreadsheets hold logins in plain text |
| D15 | Only Travelian's business accounts appear in the company ledger; personal accounts are excluded or marked as owner accounts | Mixed personal and company money cannot be reconciled or reported |
| D16 | Staff may record tickets issued outside the system as manual/offline sales, with evidence and a second check | Staff still issue on portals; missing them breaks reports and balances |
| D17 | History is migrated from Excel with a "migrated" flag and supplier statements used to fill missing ticket data | Airlines judge you on past volume; the sheets lack ticket numbers |
| D18 | Controls marked P0 are built before any live money or ticket issuance | Wrong balances and double issuance are costly and hard to undo |
| D19 | WhatsApp is the primary channel for sign-in codes and for customer and agency notifications. Email carries documents (e-ticket, invoice). SMS or email is the fallback | Most customers do not check email but everyone checks WhatsApp; a fallback is needed when WhatsApp delivery fails |
| D20 | Search prices are indicative. The exact price is known only when the booking is created, and is valid until the hold deadline. The booked price is what the customer or agency pays | Fares change between search and booking; promising the searched price would cause losses and disputes |
| D21 | Finance, approver and Super Admin roles need a second sign-in factor in addition to WhatsApp (proposed, to confirm) | These roles can move money; a hijacked WhatsApp account or SIM must not be enough |
| D22 | The customer chatbot is not part of this specification; it is designed after the dashboard is built | Keeps the first release focused on the money and ticketing controls |

## 2. The 14 menus at a glance

The menu and submenu list is unchanged from v2.0. Everything we added since then lives as a tab, field or card inside an existing submenu, so navigation stays stable.

| # | Menu | Submenus | Why this menu exists |
| --- | --- | --- | --- |
| 01 | Dashboard | Attention Queue; Alerts | One place to see company performance and what needs action now |
| 02 | Search | Flights; Group Ticketing; Hotels; Umrah | Every sale starts with a search; staff, agencies and customers use the same entry |
| 03 | Bookings | All Bookings; Flights; Group Ticketing; Hotels; Umrah; Inquiries & Requests; Quotations | One master register so PNR, payment and ticket status are never split across screens |
| 04 | Customers & Travelers | Customers; Travelers; Communications | Reusable customer and passenger records, kept apart because the payer is not always the traveler |
| 05 | Finance | Wallets; Accounts & Ledgers; Payments & Receipts; Invoices & Notes; Receivables & Payables; Sales & Profit; Expenses; Reconciliation | Replaces the Excel control sheets with a ledger-based system |
| 06 | Flight Operations | Approval & Issuance; Ticketing Queue; PNR Queue; Reissue/Date Change; Refunds; Voids; Cancellations; Failed/Manual Review | The work queues for issuing and servicing tickets, under time pressure |
| 07 | Inventory & Services | Group Ticketing Inventory; Hotel Inventory; Umrah Packages | Stock Travelian owns or controls, which needs its own counts and deadlines |
| 08 | Pricing & Revenue | Flight Pricing & Rules; Deals & Promotions; Fare Simulator | Selling prices and margins in one place, so markups are not scattered across inventory screens |
| 09 | B2B Partners | Agencies; Agency Users; Onboarding & KYC | Agencies, including sub-agents such as Sohail's channel, are managed as customers with wallets and users |
| 10 | Suppliers & Integrations | Flight Providers; Group Ticketing Providers; Hotel Providers; Payment Providers; Integration Health | Registry of airline IDs and suppliers (the fixed source list) and the health of each connection |
| 11 | Users & Access | Users & Staff; Roles & Permissions; Approval Matrix; Audit Log | Controls who can see and do what, and records what they did |
| 12 | Reports | Sales; Bookings; Finance; Suppliers/Airlines; Agents; Customers; Profit & Margin; Refund/Reissue; Export History | Management reports and the airline sales reports used for IATA, GDS and airline applications |
| 13 | Website & CMS | Homepage & Banners; FAQs; Policies & Pages; SEO | Public website content, separate from operational data |
| 14 | System | General Settings; Authentication & Security; Notification Templates; Feature Flags; System Logs & Jobs; Environment Status; Data Import | Platform settings, health and the one-time Excel migration |

**Where the new rules from our discussion live**

| Rule | Where it appears | Why there |
| --- | --- | --- |
| Supplier payment per booking and hold countdown | Dashboard Attention Queue; Flight Operations > Approval & Issuance; Finance > Payments & Receipts | It is an urgent task, a pre-issuance check and a money movement |
| Provider accounts and the airline ID pipeline | Suppliers & Integrations > Flight Providers (setup); Finance > Accounts & Ledgers (balances) | Setup and money are different jobs and different permissions |
| Supplier statement matching | Finance > Reconciliation | Differences are found where balances are checked |
| Refund quote and payout | Flight Operations > Refunds; Finance > Payments & Receipts (payout) | Operations decide; Finance moves the money |
| Airline sales report | Reports > Suppliers/Airlines | It is a report about airlines and suppliers |
| Excel migration | System > Data Import | One-time, super admin only |

## 3. Roles, menu visibility and field visibility

The same sidebar, cards and tables are shown to everyone; the system hides what a role may not see and blocks it again at the API (a direct link returns 403). Reason: hiding buttons alone is not security.

### 3.1 Menu visibility by role

| Menu | Super Admin | Admin / Ops | Branch Manager | Ticketing | Finance | Agency Owner | Agency Staff | B2C Customer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Dashboard | All | All | Branch | Own queue | Finance cards | Own agency | Own | Own trips |
| 02 Search | Yes | Yes | Yes | Yes | No | Yes (agent fares) | Yes | Yes (public fares) |
| 03 Bookings | All | All | Branch | Assigned or branch | Read | Own agency | Own or assigned | Own |
| 04 Customers & Travelers | All | All | Branch | Read | Read | Own agency | Own agency | Own travelers |
| 05 Finance | All | Limited | Branch cash and sales | No | All | Own wallet, statement, payments | Wallet view or use if granted | Own payments, invoices, refund status |
| 06 Flight Operations | All | All | Branch | Yes | Refund payout steps | Submit and track requests | Submit requests | Request refund from booking |
| 07 Inventory & Services | All | All | Read | Read | Read | No | No | No |
| 08 Pricing & Revenue | All | Yes | Read | No | Read | No | No | No |
| 09 B2B Partners | All | All | Branch agencies | No | Credit view | Own profile and sub-agents | No | No |
| 10 Suppliers & Integrations | All | Yes | No | Health only | Payment providers | No | No | No |
| 11 Users & Access | All | Limited | Branch staff | No | No | Own agency users | No | No |
| 12 Reports | All | All | Branch | Own | Finance reports | Own agency only | Own | No |
| 13 Website & CMS | All | Yes | No | No | No | No | No | No |
| 14 System | All | Limited | No | No | No | No | No | Own profile and security |

Why B2C sees a shorter menu: customers need to search, book, view and pay, not run the business. They get the same layout so there is no second interface to build.

### 3.2 Field visibility (hidden unless granted)

| Field | Who may see it | Why it is restricted |
| --- | --- | --- |
| Supplier cost and billable price | Super Admin, Finance, ticketing staff if granted | Lets agents or customers see your margin and buy direct |
| Gross profit and margin | Super Admin, Finance, Branch Manager (own branch) | Commercially sensitive |
| Airline ID, supplier account and sub-ID | Super Admin, Admin, Finance, ticketing staff if granted | Exposes accounts that hold your money |
| Credential references | Super Admin only | Passwords are never shown; only a vault reference exists |
| Full passport or CNIC number | Granted staff only, every reveal logged | Identity data; masked by default (the current Customers screen shows passports in full) |
| Bank account numbers | Finance, Super Admin | Prevents payment diversion and fraud |
| Customer bank details for refund payout | Finance payout role only | Needed once, for the transfer; high fraud risk |
| Agency wallet balance | That agency, Finance, Super Admin | Staff do not need other agencies' balances |
| Sold-by and issued-by | Staff and branch roles | Needed for staff and branch sales reports |
| Wallet balance chip in the top bar | Agency users only | Under D3 only agencies have wallets; the Super Admin screen currently shows "Wallet PKR 0" |

## 4. Screen standard

Every menu homepage and every submenu screen is built from the same parts, so one component set serves all 70 screens.

| Part | Standard | Why |
| --- | --- | --- |
| Page header | Title, one-line purpose, primary action button (for example Add Agency) on the right | A user should know where they are and what the main action is |
| Menu homepage cards | A row of 4 to 10 cards; each shows a count or amount and one short label | Gives the state of that area in five seconds |
| Card behaviour | Clicking a card opens the table below filtered to that card | Cards must lead to the records, otherwise they are decoration |
| Card visibility | A card that shows money, cost or margin is hidden from roles without that field permission | Same rule as field visibility, applied to summaries |
| Urgent cards | Red styling only for cards needing action now (Unknown Issuance, Low Airline Balance, Overdue) | If everything is red, nothing is |
| Filter bar | Search box plus 3 to 6 filters; the date range filter is always present on list screens | Staff find a record by PNR, name or phone; managers slice by period |
| Standard filters | Date range, Branch, Product, Source or Provider, Status, Agency, Assigned to | The same words and positions on every screen mean less training |
| Saved views | A user can save a filter combination, such as Airblue, last 12 months | Repeated requests (airline reports, daily checks) become one click |
| Primary table | Sortable, paged, with row actions; the first column is the record's key (PNR, booking ID, account name) | Staff look up by key |
| Row actions | View, then only the actions allowed in the record's current state | Prevents invalid actions, for example issuing a ticket twice |
| Time-limited records | Show the expiry as a countdown with the time left, sorted soonest first | Supplier holds last about 30 minutes; a missed hold loses the sale |
| Status chips | Separate chips for booking, payment, supplier, issuance and servicing status | One combined status hides where the problem is (D5) |
| Masked data | Passport, CNIC and bank numbers show only the last digits; a reveal button is logged | Privacy and fraud control |
| Export | Exports follow the same filters, need an export permission and are recorded in Export History | Data leaving the system must be traceable |
| Empty, loading, error | Each screen shows a clear empty state, a loading state and an error message | Staff must tell "no data" from "failed to load" |
| Sample data | Demo or sample records carry a visible "Sample" label and are never mixed with live data | The current build falls back to sample customers when live data fails; this must be obvious |
| Audit | Approvals, overrides, reveals, exports and changes are logged with who, when, old and new values | Needed to investigate errors and to pass an IATA or airline review |

## 5. Menu 01: Dashboard

**Why this menu exists:** managers need company performance and urgent problems on one screen when they sign in. It does not hold records; every card links to the screen that does.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Total Bookings | Booking records created in the period | Volume of demand; counts bookings, not tickets (metric rule) |
| Issued Tickets | Tickets actually issued | Real sales output; differs from bookings because many holds expire |
| Total Sales | Recognised sales in the period (finance only) | Core revenue measure |
| Gross Profit | Sales minus actual supplier cost and discounts (finance only) | Shows whether selling prices cover costs |
| Pending Issuance | Paid or confirmed bookings waiting for a ticket | Money has been taken; the customer is waiting |
| Payment Pending | Active holds not yet paid | Holds expire; follow up before they lapse |
| Unknown Issuance | Supplier did not confirm; ticket status unknown | Money may be paid with no ticket; must not be retried blindly |
| Expiring Holds | Holds ending within a set window | Direct loss of a sale if missed |
| Low Airline Balance | Provider accounts below their minimum (finance only) | A low balance stops issuance on that airline |
| Overdue Agency Credit | Agencies past their credit due date (finance only) | Protects cash flow |
| Provider balances not verified today (added) | Accounts whose portal balance was not checked today | Calculated and portal balances have already disagreed in the Excel sheet |
| Supplier payments awaiting confirmation (added) | Payments sent but supplier has not confirmed receipt or issued | Covers the gap between paying and ticketing |
| Refunds awaiting airline (added) | Submitted refunds not yet received | GDS refunds take 1 to 2 weeks; they must not be forgotten |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Date range | Booking date (default current month) | Every figure depends on the period |
| Branch | One or all branches | Branch managers and head office compare branches |
| Channel | B2C, B2B agency, manual/offline | Channels have different margins and payment rules |
| Product | Flights, group, hotels, Umrah | Products behave differently |
| Provider or source | Airline ID or supplier | Shows which source drives sales or problems (existing screen already filters by provider) |
| Agency | One agency | Agency performance and credit |
| Urgent cases table | Top urgent items from the Attention Queue | Staff should start work here |
| Recent activity widget | Latest bookings, issuances, payments, approvals | Quick check of what just happened; replaces the removed Recent Activity submenu |
| Booking report chart | Bookings and sales over time | Trend is not visible from cards |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Attention Queue | One list of cases needing a person, so nothing relies on memory or chat | Open cases (workload); Due within 30 minutes (hold deadlines); Unknown issuance (money at risk); Unassigned (no owner); SLA overdue (late work) | Case type (focus on one kind); Priority (urgent first); Owner (my cases); Due time (soonest first); Branch (branch teams) | Case type, reference (PNR or booking), provider, time left, owner, priority, next action. Actions: assign, open booking, resolve with note |
| Alerts | Automatic warnings that need acknowledgement, separate from human cases | Low balance; Verification overdue; Credential expiring; Integration failing; Reconciliation variance; Overdue credit (each is a risk named in our review) | Alert type; Severity (critical first); Status (new, acknowledged, resolved); Provider; Date | Alert, source, severity, raised at, status, owner. Actions: acknowledge, assign, resolve with note |

## 6. Menu 02: Search

**Why this menu exists:** every booking, quotation and hold starts with a live search. Staff, agencies and customers use the same search screen; only the fares shown differ by role (public, agent or staff fare).

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Available providers | Suppliers and airline IDs enabled and responding | If a provider is down, results are incomplete and staff must know |
| Search expiry | Selected fares and how long they stay valid | Search prices are indicative; the final price is known only when the booking is created (D20). A stale fare must be revalidated before booking |
| Quotes pending | Quotes drafted but not sent or accepted | Searches that need follow-up before the price expires |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Product tabs | Flights, Group Ticketing, Hotels, Umrah | The four products you sell; matches the public site and current build |
| Trip type | One-way, round-trip, multi-city | Different fare and booking structures |
| Passengers and cabin | Adults, children, infants; economy or other cabin | Fare and availability depend on them |
| From, To, date | Origin, destination, departure and return | Minimum search input |
| Provider (staff only) | Choose or exclude a provider | Staff compare suppliers; customers never see provider names |
| Results table | Fare options with price, baggage, expiry and rule summary | The decision screen before booking |
| Actions | Select, revalidate, hold or book, create quote | A fare must be revalidated before any money is taken |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Result columns and actions |
| --- | --- | --- | --- | --- |
| Flights | Live airline fares from your IDs, GDS and suppliers in one list | Providers responding (completeness); Fare valid until (expiry) | Airline (preferred carrier); Stops (convenience); Departure time; Baggage; Refundable (important given refund complexity); Price range; Provider (staff, cost comparison) | Airline, times, stops, baggage, fare, refundable flag, hold time left, provider (staff only). Actions: view fare rules, revalidate, hold, book, quote |
| Group Ticketing | Group fares are sold from owned and supplier stock with seat limits | Seats available (stock); Hold expires (deadline); Owned vs supplier stock (different hold rules) | Route; Date; Airline; Passenger mix (adult, child, infant); Source (owned or supplier) | Departure, airline, seats left, baggage, price per passenger type, source, hold rule. Actions: hold seats, book, quote |
| Hotels | Room rates and cancellation terms for hotel bookings | Providers connected (the current build shows none configured); Rate valid until (price expiry) | Destination; Dates; Guests and rooms; Star rating; Price; Cancellation terms | Hotel, room type, board, rate, cancellation policy. Actions: hold or book, quote. Hidden until a hotel provider is connected |
| Umrah | Packages combine flights, hotels, transport and visa | Packages valid (expiry); Room sharing options (price driver) | Departure date; Duration (days); Room sharing (double, triple, quad); Hotel category; Price range | Package, dates, Makkah and Madinah hotels, room sharing, inclusions, price, validity. Actions: book, quote |

## 7. Menu 03: Bookings

**Why this menu exists:** one master register for all products and channels, so PNR, payment, supplier and ticket status for a booking are always read from the same record. Product views are filters on this register, not separate databases.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| All Bookings | Total records in the filter | Overall volume |
| Confirmed | Booking confirmed with the supplier | Sold work in hand |
| On Hold | Active holds with a deadline | Holds are the most time-sensitive records |
| Cancelled | Cancelled or expired | Loss tracking; high expiry means follow-up is failing |
| Unpaid | Bookings with no verified payment | Prevents issuing before payment |
| Unknown Issuance | Payment sent, ticket not confirmed | Highest risk; needs manual verification |
| Unassigned | Bookings with no owner | Work nobody is doing |
| Expiring within 2 hours (added) | Holds near their deadline | Catches the commonest loss before it happens |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Search box | Booking ID, PNR, ticket number, passenger, phone | Staff look up from whatever the customer quotes |
| Date range | Created or travel date (switchable) | Daily work uses created date; reports use travel date |
| Status filters | Booking, payment, issuance, supplier status, separately | Each answers a different question (D5) |
| Supplier or source | Own airline ID or supplier | Reconciliation and airline reports |
| Agency and branch | Which agency or branch | Scope for agency users and branch managers |
| Created by, issued by | Staff member | Staff-wise sales and accountability |
| Table columns | PNR, customer or agency, supplier, statuses, amount with payment chip, created at, expiry at, actions (current screen) plus ticket number and source type | Ticket number and source are needed for the airline report |
| Page action | Create manual/offline booking (staff only) | Tickets issued outside the system must still be recorded (D16) |

### Booking detail tabs

| Tab | Shows | Why |
| --- | --- | --- |
| Overview | Statuses, owner, amounts, deadline | Summary for quick decisions |
| Itinerary | Segments, times, baggage | What was booked |
| Passengers | Names, documents (masked) | Needed for ticketing and the airline report |
| Fare | Searched price, booked price and the difference; base, taxes, fees, service charge, discount, billable price | Explains price and margin (cost visible only with permission) |
| Payments | Customer or agency payments, receipts | Proves money received before issuance |
| Supplier payment (added) | Amount due, transfer reference, time sent, confirmation, paid from (bank, supplier wallet, credit) | Links the booking to the money you sent within the hold window |
| Tickets | Ticket numbers, issue time, supplier response | The proof of issuance |
| Servicing | Refund, reissue, void, cancellation cases | One place for after-sales history |
| Audit | Who did what and when | Dispute and error investigation |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| All Bookings | The master register across all products | Statuses as above | All filters above | As above. Actions: view, assign, add note, create manual booking |
| Flights | PNR and ticket work is the largest daily job | Issued today (daily output); Hold deadlines (urgency); Awaiting issuance | Airline; Route; Source (own ID or supplier); Trip type; TTL | PNR, route, travel date, airline, source, statuses, time left. Actions: open, request issuance, hold payment |
| Group Ticketing | Group bookings add seat holds and name-list deadlines | Seat holds active; Name lists due; Deposits payable | Departure; Supplier; Deadline | Departure, seats, manifest status, name-list deadline, supplier. Actions: add passengers, confirm, release hold |
| Hotels | Hotels need vouchers and cancellation deadlines | Cancellation deadlines near; Vouchers pending | Hotel; Check-in date; Supplier | Hotel, rooms, dates, voucher, cancellation date. Actions: send voucher |
| Umrah | Umrah has documents and installments | Documents missing; Installments overdue | Departure; Package; Payment state | Package, travelers, visa status, installments, service status |
| Inquiries & Requests | Booking inquiries and customer requests need an owner and SLA | Open; Unassigned; SLA overdue | Status; Owner; Source (phone, WhatsApp, web); Date | Request, customer, owner, SLA, linked booking. Actions: assign, reply, convert to booking |
| Quotations | Quotes expire; converting without revalidation causes price errors | Draft; Sent; Expiring; Accepted (conversion) | Status; Customer or agency; Expiry | Quote, route or package, price, expiry. Actions: send, revise, convert after revalidation |

## 8. Menu 04: Customers & Travelers

**Why this menu exists:** customers (who pay and contact you) and travelers (who fly) are different people, often in the same booking. Keeping both as reusable records speeds booking and gives clean data for invoices and the airline report.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Total Customers | All customer profiles | Size of the customer base |
| New Customers | Created in the period | Growth and marketing result |
| Saved Travelers | Reusable passenger profiles | Speeds repeat bookings |
| Duplicate Profiles | Suspected duplicate customers | Duplicates split booking history and hide repeat customers |
| Documents expiring (added) | Passports expiring within 6 months | Airlines and countries refuse travel on short validity; staff can warn customers |
| Flagged customers (added) | Customers with a restricted flag | Prevents repeat fraud or non-payment |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Search box | Name, phone, email, passport (matches on masked or full value by permission) | Staff look up by whatever the customer gives; the current screen already supports this |
| Source | B2C web, agency, walk-in, WhatsApp | Shows where customers come from |
| Agency and branch | Which agency or branch owns the record | Agencies must see only their own customers |
| Booking history | Last booking date, number of bookings | Identifies repeat and inactive customers |
| Document validity | Valid, expiring, expired | Prevents booking on invalid documents |
| Flag | Normal or restricted | Fast access to problem accounts |
| Table columns | Name, contact, booking count, last booking, flag. Passport and date of birth masked | The current screen shows passport numbers in full, which exposes identity data |
| Page action | Add Customer | Walk-in and phone customers need records |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Customers | Payers and contacts, with history and notes | Total; New; Duplicates; Flagged (as above) | Source; Agency; Flag; Last booking | Name, phone, email, bookings, notes. Actions: edit, merge duplicates, flag with reason, view bookings |
| Travelers | Passenger records with identity documents | Saved; Expiring documents; Missing details (name, date of birth, nationality) | Nationality; Document expiry; Customer (owner) | Name as on passport, nationality, date of birth, document type and expiry (masked). Actions: edit, attach document, reveal (logged) |
| Communications (P3) | One thread per customer or agency for WhatsApp, email and notes | Unread; Awaiting reply | Channel; Owner; Date | Contact, last message, owner. Message history comes with the notification service; the shared WhatsApp inbox is decided after the dashboard is built |

## 9. Menu 05: Finance

**Why this menu exists:** your money is tracked today in separate Excel sheets whose balances disagree (airline ID balances, bank accounts, ticket sales, top-ups). Finance replaces them with one ledger, so every balance can be traced to a transaction and checked against the airline, supplier or bank.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Bank / Cash | Balance of Travelian's business bank and cash accounts (personal accounts excluded) | Real cash position (D15) |
| Airline ID Balance | Calculated balance across own airline IDs | Money prepaid and available for ticketing |
| Supplier Balance | Prepaid balances and credits held with suppliers | Money tied up with suppliers, including reused refund credits |
| Agency Wallet Liability | Total agency wallet balances | Money you hold for agencies and owe back |
| Receivables | Money owed to you by agencies | Cash coming in and credit risk |
| Payables | Money owed to suppliers | Cash going out |
| Unallocated Receipts | Bank money with no matched owner | Must be resolved before it can be used or counted |
| Pending Verification | Payments awaiting finance check | No payment counts until verified |
| Balance variance (added) | Accounts where calculated and verified balances differ | The Excel sheet already shows two balances for the same airline ID |
| Supplier payments in transit (added) | Sent to suppliers, not yet confirmed | Covers the hold-window payment gap (D7) |
| Refunds receivable (added) | Refunds accepted by airlines but not received | GDS refunds take 1 to 2 weeks (D9) |
| Customer payouts pending (added) | B2C refunds received but not yet paid out | Customers are waiting for the transfer (D10) |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Date range | Transaction date | Every figure is period-based |
| Branch | Branch | Branch cash and results |
| Currency | PKR or foreign | Umrah costs and some accounts use other currencies |
| Account | Bank, airline ID, supplier | Drill into one account |
| Agency | One agency | Agency statements and exposure |
| Status | Pending, verified, posted, reversed | Money states must stay visible |
| Table | Recent transactions register with links to the booking | Every number must drill down to its source |
| Approval queue | Items needing a second approver | Maker-checker control (D18) |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Wallets | Agency-only prepaid wallets (D3) | Total wallet liability; Available; Reserved (held for bookings); Low-balance agencies; Pending deposits | Agency (one wallet per agency); Status; Date | Agency, ledger balance, reserved, available, credit limit if approved, last deposit. Actions: record deposit, statement, adjustment with approval |
| Accounts & Ledgers | Chart of accounts, all provider accounts, bank and cash, and the general ledger | Provider accounts; Balance variance; Below minimum; Unposted entries | Account type (own ID, supplier wallet, pay-per-booking, bank, cash); Provider; Currency; Branch; Date | Provider, funding mode, currency, calculated balance, earmarked, available, verified portal balance, variance, last verified by and when, minimum balance. Tabs: chart of accounts, provider accounts, bank and cash book, general ledger, manual journals (approval). Actions: record verification, request top-up, adjust |
| Payments & Receipts | All money in and out, with proof | Pending verification; Supplier payments awaiting confirmation; Unallocated receipts; Top-ups in transit; Refund payouts pending | Type; Status; Bank account; Agency or supplier; Date; Reference (finds duplicates) | Reference, type, party, amount, bank, bank reference, time sent, proof, status, booking. Tabs: incoming, supplier payments (per booking), top-up requests, refund payouts, unallocated. Actions: verify, reject with reason, allocate, confirm supplier receipt, approve payout |
| Invoices & Notes | Documents for customers and agencies, with sequence control | Issued; Unpaid; Credit notes; Notes awaiting approval | Type; Customer or agency; Date; Branch; Status | Number, booking, party, amount, tax fields (pending accountant), status. Actions: issue, create credit or debit note, download PDF |
| Receivables & Payables | Who owes you and whom you owe, including refunds and supplier credits | Total receivable; Overdue; Payable to suppliers; Refunds due; Supplier credits held | Party; Age bucket (0 to 30, 31 to 60 and so on); Due date; Supplier | Party, amount, age, due date, last follow-up. Tabs: agency receivables, supplier payables, refunds receivable, supplier credits. Actions: add follow-up, record settlement |
| Sales & Profit | Ledger-linked sale records for accountants; Reports > Sales is for analysis | Sales; Cost; Profit; Received; Due (a sale must reconcile to cash) | Date; Source (own ID or supplier); Airline; Agency; Branch; Staff; Channel; Payment state | Ticket, PNR, source, supplier cost, selling price, discount, received, due, gross profit, status. Replaces the Ticket Sales sheet |
| Expenses | Operating costs by branch, needed for net result | This month; Awaiting approval; By category | Category; Branch; Vendor; Paid-from account; Status | Date, category, vendor, amount, account, receipt, status. Actions: add, approve, attach receipt |
| Reconciliation | Finds differences before they become losses | Open variances; Unmatched statement lines; Last reconciled date; Accounts not verified today | Type; Provider or bank; Period; Status | Item, expected, actual, difference, owner, status. Tabs: airline portal vs ledger, supplier statement vs ledger (for example the Sooperfare report), bank vs ledger, gateway vs receipts, wallet total vs control account. Actions: import statement, match, open case, approve write-off |

## 10. Menu 06: Flight Operations

**Why this menu exists:** issuing and servicing tickets is time-limited work with money at stake (supplier holds last about 30 minutes; refunds take days). Operations run as queues with owners and deadlines, not as bookings inside a list. All queues are saved views over one shared service-request record, so a case can never exist in two places.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Awaiting Approval | Bookings ready for the approval check | The next action before any ticket is issued |
| TTL Near | Holds near their deadline | A lapsed hold loses the sale |
| Unknown Issuance | Supplier response unclear | Possible payment without a ticket; blind retries could double-charge |
| Refund Pending | Refund cases not completed | Customers waiting; money owed from airlines |
| Schedule Changes | Airline-changed flights needing action | Customers must be told and options offered |
| Paid, not issued (added) | Supplier payment sent but no ticket | The specific risk of paying inside the hold window (D7) |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Source or provider | Own airline ID or supplier | Each has a different process and deadline |
| Airline | Carrier | Rules and refund timing differ by airline |
| Time left | Countdown to deadline | Work the most urgent first |
| Funds status | Verified, reserved, missing | Issuance needs funds; blocks unsafe issuing |
| Assigned to | Staff member | Individual workload |
| Ticket status | Queued to unknown | Matches the five-axis status model |
| Case SLA | On time, at risk, late | Keeps servicing from being forgotten |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Approval & Issuance | The last check before money is spent: fare, deadline, payment, provider account, approver | Awaiting approval; Time under 30 minutes; Funds not ready; Needs second approver | Source; Airline; Time left; Channel; Approver | Booking, PNR, airline, source, time left, payment state, funds, provider account, approver. Actions: approve, reject, issue (one request only), hold |
| Ticketing Queue | Tracks every issuance request to a result | Queued; Processing; Issued today; Failed; Unknown | Status; Provider; Airline; Staff; Date | Booking, PNR, ticket numbers, supplier response, time, user. Actions: view response, send to manual review |
| PNR Queue | Unissued PNRs can expire or incur airline penalties (ADM risk) | Active unissued; TTL near; Expired; Schedule changes | Airline; GDS or non-GDS (different rules); Time left; Owner | PNR, airline, route, deadline, cancellation owner. Actions: cancel PNR, assign, record schedule change |
| Reissue/Date Change | Date changes need fare difference and penalty agreed first | Open; Awaiting payment; Awaiting supplier; Completed | Airline; Source; Status; Date | Ticket, new date, fare difference, penalty, approval, new ticket. Actions: quote, approve, collect, submit |
| Refunds | Refund amounts and timing vary by airline and tax, so each case starts with a quote (D9) | Requested; Quote sent; Submitted, waiting (GDS 1 to 2 weeks); Received, payout due; Variance to review; Completed | Channel (own ID or GDS); Airline; Source; Stage; Expected date; B2C or B2B | Ticket, airline, channel, quoted refund, penalty, refundable taxes, Travelian fee, expected date, received amount, variance, stage. Actions: record quote, send to customer, submit, record receipt (bank or credit), approve payout |
| Voids | Void is possible only inside a short window | Eligible now; Window closing; Completed | Airline; Issue time; Status | Ticket, issue time, window ends, supplier response. Actions: void, reverse ledger entries |
| Cancellations | Cancelling a PNR or booking releases holds and records penalties | Open; Awaiting supplier; Penalties | Product; Airline; Status | Booking, PNR, penalty, supplier confirmation. Actions: cancel, release hold |
| Failed/Manual Review | Where unclear outcomes are resolved safely | Unknown; API errors; Duplicate-risk; Resolved today | Type; Provider; Age; Owner | Booking, provider, response, age, owner, resolution. Retry is blocked until the supplier confirms the real status. Actions: verify with supplier, mark issued or failed, release funds |

## 11. Menu 07: Inventory & Services

**Why this menu exists:** group seats, hotel rooms and Umrah packages are stock with limits, deadlines and supplier obligations. Counting them separately from live flight search prevents overselling and unpaid supplier blocks.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Available Seats | Group seats open for sale | What can still be sold |
| Held Seats | Seats on active holds | Unpaid holds block stock until they expire |
| Sold Seats | Confirmed seats | Utilisation of purchased blocks |
| Holds Expiring | Holds ending soon | Release or convert before they lapse |
| Name-list Deadlines | Deadlines for passenger names | Missing the deadline can forfeit seats |
| Supplier Payables | Deposits and balances owed to group suppliers | Group blocks carry deposits and payment dates |
| Active Hotels (added) | Hotels enabled for sale | Hotel inventory is empty in the current build |
| Active Umrah Packages (added) | Published packages | Only active packages show on the public site |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Source | Owned or supplier stock | Owned seats can be held in your database; supplier seats follow the supplier's rules |
| Supplier | HT, GT, AG and other group suppliers | Payables and rules are per supplier |
| Route or destination | Sector, city | Sales planning |
| Date | Departure or check-in | Stock is date-specific |
| Utilisation | Percent sold | Shows slow or full departures |
| Expiry | Hold or price expiry | Prevents stale stock |
| Table | Departures, hotels and packages, by selected submenu | Each stock type has its own columns |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Group Ticketing Inventory | Prevents overselling the last seat across B2C, agencies and staff | Available; Held; Sold; Holds expiring; Name lists due; Supplier payable | Source; Supplier; Route; Departure date; Airline; Utilisation | Departure, airline, route, source, capacity, held, sold, available, cost per seat, sale price, hold expiry, name-list deadline, deposit and payable. Actions: add owned departure, sync supplier stock, adjust (approval), release hold. A seat movement log records every hold, sale and release |
| Hotel Inventory | Hotel rooms from APIs (Agoda, Hotelbeds, Booking.com affiliate, Travelport) and manual hotels | API connected (none configured now); Manual hotels; Rooms available; Rates expiring | Hotel; City; Source (API or manual); Status; Dates | Hotel, room types, dates, availability, rate, cancellation terms, status. Tabs: API hotels, manual hotels, room types, availability. Markup Rules and Deals move to Pricing & Revenue so pricing lives in one place |
| Umrah Packages | Umrah combines flights, hotels, transport and visa with a cost sheet | Active; Expiring; Rooms left; Installment plans | Duration; Hotel category; Departure month; Status (draft, active, archived) | Package, dates, Makkah and Madinah hotels, room options, inclusions, SAR or USD cost sheet, price, expiry, status. Actions: add, edit, archive. Drafts stay in admin; only active packages show on the public site |

## 12. Menu 08: Pricing & Revenue

**Why this menu exists:** selling price, markup, discount and service fee must be set in one place so margins can be controlled. This menu is the sale side only. What suppliers charge or give you (cost, commission, incentive) is kept under Suppliers & Integrations so the two are never confused.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Active Rules | Pricing rules currently applied | Shows what is shaping prices today |
| Promotions | Running deals and discounts | Promotions reduce margin and need tracking |
| Margin Exceptions | Sales or rules below the minimum margin | Catches loss-making prices early |
| Expiring Rules | Rules ending soon | A lapsed rule silently changes prices |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Airline | Carrier | Markup often differs by airline |
| Route | Sector | Competitive routes need different prices |
| Provider or source | Supplier or own ID | Cost differs by source |
| Agency tier | Agency group | Agencies get different rates |
| Channel | B2C, B2B, staff | Each channel prices differently |
| Priority and approval | Rule order and approval state | Rules overlap; priority decides which applies |
| Table | Rules with scope, value, validity, status | One place to audit prices |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Flight Pricing & Rules | Controls markup, discounts and fees by airline, route, supplier and agency, with a minimum-margin guard | Active; Below margin; Expiring; Awaiting approval | Airline; Route; Source; Agency tier; Channel; Status | Rule, scope, markup or discount, service fee, validity, priority, status. Tabs: markup rules (including hotel markup moved from Hotel Inventory), service fees (booking, refund and reissue fees used in refund quotes). Actions: create, edit, approve, disable |
| Deals & Promotions | Campaigns need dates, audience and approval | Running; Scheduled; Ended; Performance (sales from the deal) | Channel; Audience; Dates; Product (flights, hotels, Umrah) | Deal, audience, dates, limit, status, sales generated. Actions: create, pause, approve |
| Fare Simulator (P2) | Previews selling price, cost and margin before activating a rule | Not needed at go-live; a preview inside the rule form is enough at first | Airline; Route; Agency tier | Supplier cost, taxes, markup, discount, final price, margin. Deferred so core controls come first |

## 13. Menu 09: B2B Partners

**Why this menu exists:** agencies and sub-agents are a main sales channel with their own wallets, users and credit risk. Channels you currently track outside the main sheet (for example the Sohail panel in the Excel file) become agency records here, so their sales appear in normal reports.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Active Agencies | Agencies allowed to book | Size of the B2B channel |
| Pending KYC | Applications awaiting document checks | Agencies must be verified before they can spend |
| Credit Exposure | Total credit given and used | Money at risk if agencies do not pay |
| Overdue Agencies | Agencies past their due date | Cash flow and the trigger to suspend |
| Low Wallet (added) | Agencies with wallet balance below their threshold | Agencies cannot book when wallets are empty; prompts a top-up request |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Search box | Agency name, owner, phone | Quick lookup |
| Status | Active, pending, suspended | Control who can book |
| KYC state | Pending, verified, rejected | Compliance follow-up |
| Parent agency | Top-level or sub-agency | Hierarchy visibility |
| Assigned branch or owner | Travelian staff responsible | Accountability for each agency |
| Wallet and credit state | Normal, low, overdue | Finds risky agencies |
| Table | Agency, owner, users, wallet, credit, sales, status | Single overview for the account manager |
| Page action | Add Agency | Agencies are onboarded by staff, not self-registered |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Agencies | The agency's full profile, hierarchy and money | Active; Sales this month; Wallet balance; Credit used; Overdue | Status; Parent; Branch; Wallet state; Date | Agency, owner, parent, wallet, credit limit, sales, last booking. Tabs: profile and KYC, parent and sub-agency hierarchy, wallet, credit terms (approved through Finance), sales, statements. Actions: edit, suspend, request credit change |
| Agency Users | Each agency has several staff with limited access | Active users; Pending invites; Disabled | Agency; Role; Status | User, agency, role, last login, status. Actions: invite, assign role, disable. Users see only their own agency (D13) |
| Onboarding & KYC | Verifies an agency before activation | Applications; Awaiting documents; Awaiting approval; Rejected | Status; Submitted date; Owner | Applicant, documents, checks, status. Actions: request documents, approve, reject with reason, activate |

## 14. Menu 10: Suppliers & Integrations

**Why this menu exists:** it is the registry of every airline ID, supplier and connection you sell through. Every sale picks its source from this list (D8), which is what lets reports split sales by airline and by supplier. Money in these accounts is tracked in Finance; this menu holds the setup and the connection status.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Active Providers | Enabled airline IDs, suppliers and GDS | What you can sell through today |
| Failed Integrations | Connections currently failing | Missing results or failed issuance |
| Expired Credentials | Logins or tokens expired or near expiry | An expired login stops sales silently |
| Stale Syncs | Inventory feeds not updated recently | Stale stock is oversold stock |
| Airline IDs in process (added) | IDs applied for but not yet issued | Your Dashboard sheet tracks these with a required deposit each (about 25 lakh in total) |
| Required deposit for pending IDs (added) | Sum of balances needed to activate pending IDs | Planning the cash needed to expand |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Provider type | Own airline ID, supplier, GDS, NDC, LCC | Each type is set up and paid differently |
| Classification | DTS-based or IATA-based airlines | Your sheet separates them; the requirements for each differ |
| Product | Flights, group, hotels | Providers cover different products |
| Status | Enabled, in process, disabled, failing | Quick health view |
| Last success | Time of last good call | Finds silent failures |
| Branch | Branch authorised to use the account | Accounts may be limited by branch |
| Table | Provider, type, accounts, status, last success, errors | One overview of everything connected |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Flight Providers | The master list of airline IDs, suppliers and GDS, and the fixed source list for every sale | Enabled; Own IDs issued; IDs in process; Required deposit; Missing credential reference | Type; DTS or IATA; Status; Branch | Provider, type, funding mode (prepaid wallet or pay per booking), currency, minimum balance, routing priority, status. Tabs: provider list; accounts and booking-only sub-IDs (with assigned staff); ID pipeline (issued, in process, required balance); supplier cost and commission rules; reporting requirements for each airline (what they ask for in applications); credential reference (vault link, never the password). Actions: add provider, enable, disable |
| Group Ticketing Providers | Suppliers differ on whether they allow real-time holds | Providers; Real-time hold support; Last sync; Errors | Provider; Hold support; Status | Provider, sync method, hold rules, deposits, ticket deadlines. Records whether stock is synchronised or entered manually |
| Hotel Providers | Hotel APIs and property mapping | Connected (currently none); Not configured; Errors | Provider; Status | Provider, settlement model, availability, health. Agoda, Hotelbeds, Booking.com affiliate and Travelport hotel are listed but not yet configured |
| Payment Providers | Banks and gateways used for receipts and payouts | Active methods; Failed callbacks; Pending settlement | Provider; Status; Date | Method, account (business only, masked), callback status, settlement status, reconciliation mapping. Personal accounts are excluded (D15) |
| Integration Health | A single place to see failures and respond | Healthy; Failing; Timeouts (unknown issuance risk); Credentials expiring | Provider; Status; Error type; Date | Provider, last success, last error, queue size, owner. Actions: retry safe jobs (never ticket issuance), assign incident |

## 15. Menu 11: Users & Access

**Why this menu exists:** one dashboard serves everyone (D2), so access control is the security of the whole system. This menu decides who can open which screen, do which action, see which records and see which fields, and keeps the proof of what happened.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Active Users | Users able to sign in | Account hygiene |
| Pending Invites | Invitations not yet accepted | Stale invitations are an access risk |
| Approval Overrides | Cases where the approval rule was overridden | Overrides are where fraud and errors hide |
| Sensitive Access Events | Reveals of passports, bank details and exports | Shows who looked at protected data |
| Suspended or locked (added) | Disabled or locked accounts | Confirms leavers are cut off |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Role | Staff or agency role | Review access by role |
| Branch | Branch scope | Branch managers see only their staff |
| Agency | Agency scope | Agency owners manage their own users |
| Status | Active, invited, suspended | Account state |
| Last activity | Date of last sign-in | Finds unused accounts |
| Table | User, role, scope, status, last activity | Overview of who has what |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Users & Staff | Single list of staff, agency users and customers' sign-in accounts | Active; Invited; Suspended | Role; Branch; Agency; Status | Name, role, branch or agency, status, last login. Actions: invite, assign role and scope, suspend, view login history. Also the place to set staff access to specific airline IDs and sub-IDs |
| Roles & Permissions | One matrix for menu, action, data scope, record state and field visibility | Roles; Custom roles; Recent changes | Role; Menu | Role by menu by action grid, scope, field flags (supplier cost, margin, airline ID, full identity numbers, bank details, export). Hiding cost, margin and airline IDs from agents is set here |
| Approval Matrix | Defines who approves what and above which amount (maker-checker) | Active rules; Pending approvals; Overrides | Action type; Role; Amount band | Action, threshold, requester role, approver role, same-person rule. Covers refunds and customer payouts, supplier payments above a limit, top-ups, credit limits, expenses, manual journals, manual/offline bookings, resolving unknown issuance, prices below minimum margin, opening balances |
| Audit Log | Evidence of every sensitive change, needed for investigations and airline or IATA review | Events today; Approvals; Reveals; Exports; Failed logins | User; Action; Entity; Date; Severity | Who, when, what, old value, new value, source. Read-only |

## 16. Menu 12: Reports

**Why this menu exists:** managers need to analyse sales, profit and operations, and airlines, IATA and GDS providers ask for sales reports when you apply for IDs, accreditation or APIs. All reports read the same ledger and booking records, so they always agree with the dashboard.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Sales | Recognised sales in the period (finance permission) | Headline result |
| Issued Tickets | Ticket documents issued | Counted separately from bookings |
| Booking Segments | Flight segments in issued or booked tickets | Airlines and IATA count segments |
| Gross Profit | Sale price minus supplier cost and discounts (finance permission) | Margin result |
| Receivables | Amounts agencies owe | Collection control |
| Refunds | Refund cases and amounts | After-sales cost and cash timing |
| Incomplete tickets (added) | Tickets missing PNR, ticket number, route or source | These cannot appear correctly in an airline report; fix before exporting |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Date range | Issue date or travel date | Reports use issue date for sales, travel date for operations |
| Branch | Branch | Branch-wise results |
| Agency and staff | Agency, agency user, Travelian staff | Agency-wise, agency-user-wise and staff-wise sales |
| Product | Flights, group, hotels, Umrah | Product mix |
| Airline | One or several airlines | Airline-wise and single-airline reports |
| Source | Own airline ID or supplier | Splits own-ID sales from supplier sales |
| Payment state | Paid, partial, unpaid | Collected versus outstanding |
| Currency | PKR or foreign | Umrah and foreign accounts |
| Charts and table | Trend and tabular detail with drill-down | Charts show the pattern; table proves it |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Sales | Core sales analysis with saved views | Sales; Tickets; Received; Outstanding | Views: agency-wise, agency-user-wise, staff-wise, branch-wise, customer-wise, airline-wise, supplier-wise, product and channel, manual/offline sales | Booking, PNR, ticket, date, branch, channel, customer or agency, sold by, issued by, source, amount. Each view reconciles to the ledger |
| Bookings | Separates bookings, tickets and segments | Bookings; Tickets; Segments; Cancelled and expired | Date; Status; Channel; Product | Counts by status, channel and product |
| Finance | Statements and balances for accountants | Balances; Top-ups; Expenses; Aged receivables | Account; Date; Branch; Currency | Ledger statements, bank movements, top-ups, expenses, cash, aging |
| Suppliers/Airlines | Volume and cost by airline and supplier; home of the airline sales report (section 20) | Tickets by airline; Cost; Refunds; Own ID versus supplier share | Airline (including one airline); Source; Period | Airline, source, tickets, segments, sales, refunds, voids, supplier cost (restricted). Action: generate airline sales report |
| Agents | Agency and agent performance | Top agencies; Dues; Credit used | Agency; Agent; Period | Agency, agent, sales, bookings, dues, credit, performance |
| Customers | B2C behaviour and repeat business | New; Repeat; Source split | Source; Period | Customer, bookings, spend, last booking. Within permission scope |
| Profit & Margin | Sale-level margin and branch net result | Gross margin; Branch net after expenses; Low-margin sales | Branch; Airline; Source; Period | Sale price, supplier charge, discount, fees, margin, branch expenses |
| Refund/Reissue | After-sales volume, penalties and delays | Requests; Penalties; Refund received; Overdue | Type; Airline; Channel; Status | Case, tickets, penalty, refund received, customer paid, days open |
| Export History | Proof of what left the system | Exports today; By user; Large exports | User; Report; Date; Format | Who, report, filters, time, format, status. Read-only |

## 17. Menu 13: Website & CMS

**Why this menu exists:** the public site (travelian.pk) needs content that marketing can change without a developer. It is kept apart from operational data so that publishing a banner can never change a booking or a price.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Published Pages | Pages live on the public site | What customers see now |
| Drafts | Pages not yet published | Work in progress |
| Active Banners | Banners and announcements showing | The top ticker currently shows demo text, which must be replaced before launch |
| Pending review (added) | Changes waiting for approval | Policy pages (refunds, terms) need a check before they go live |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Content type | Page, banner, FAQ, policy | Different content is edited differently |
| Status | Draft, scheduled, published | Control what is live |
| Last editor | Staff member | Accountability |
| Dates | Publish and expiry dates | Time-limited campaigns |
| Table | Content, type, status, editor, last change | Overview |
| Actions | Preview, publish, revert | Safe publishing with history |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| Homepage & Banners | Controls the public home page sections, featured services and announcements in one place | Live sections; Active banners; Scheduled | Status; Date | Section or banner, audience, dates, status. Actions: edit, preview, publish. Contact details read from the branch master in System |
| FAQs | Answers common questions and cuts support load | Published; Drafts | Category; Status | Category, question, answer, status |
| Policies & Pages | Legal and policy text must match how you work (refund timing, bank payout, no wallet for customers) | Published; Awaiting review | Page type; Status | Terms, privacy, refund policy and other pages. Refund policy wording must follow decisions D9 and D10 |
| SEO (P2) | Search visibility for the public site | Pages missing titles | Page; Status | Page, title, description, indexing. Deferred until core operations are stable |

## 18. Menu 14: System

**Why this menu exists:** company-wide settings that every other menu depends on (branches, currencies, numbering, security, notifications) and the health of the platform. Only a few roles see it, because a wrong setting here affects every screen.

### Homepage cards

| Card | Shows | Why |
| --- | --- | --- |
| Notification Failures | Emails, SMS or WhatsApp messages that failed | Customers miss confirmations and payment requests |
| Job Errors | Background jobs that failed | Failed jobs can leave balances or sync stale |
| Pending Imports | Excel import batches awaiting review | Migration is a controlled, approved process |
| Config Changes | Recent changes to settings | Settings changes explain sudden behaviour changes |

### Homepage filters and table

| Element | Content | Why |
| --- | --- | --- |
| Branch | Branch | Branch-level settings |
| Severity | Info, warning, error | Focus on failures |
| Status | Open, resolved | Track problems to the end |
| Date | Time range | Find when a problem began |
| Table | Recent errors, imports and changes | Overview of platform health |

### Submenus

| Submenu | Why it exists | Cards (and why) | Filters (and why) | Table columns and actions |
| --- | --- | --- | --- | --- |
| General Settings | The master data other screens read | Branches; Currencies; Pending changes | Section; Branch | Company profile, branch master (name, address, contacts), currencies and exchange rates with effective dates (Umrah and foreign accounts), tax settings (pending accountant), number sequences, time zone |
| Authentication & Security | Protects sign-in for staff, agencies and customers | Failed logins; Locked accounts; Sessions | User; Date | Sign-in rules, WhatsApp sign-in codes with SMS or email fallback, extra factor for finance, approver and Super Admin roles, session length, password policy. One sign-in page for all roles |
| Notification Templates | Messages must be consistent and traceable | Sent; Failed; Templates | Channel; Event; Status | Template, channel (WhatsApp first, email for documents, SMS fallback), trigger (booking confirmed, payment verified, hold expiring, refund status changed), delivery log, customer consent |
| Feature Flags (P3 UI) | Switches unfinished features on and off safely | Enabled; Disabled | Environment; Role | Flag, scope, state. Start with configuration files; a screen can follow later |
| System Logs & Jobs | Lets support trace an error to its cause | Errors today; Failed jobs; Webhook failures | Level; Service; Date; Reference | Time, service, message, correlation reference |
| Environment Status | Read-only view of deployment and connection status | Healthy; Degraded | Service | Service, version, status. Secrets are never shown or edited here; they stay in the cloud secrets store |
| Data Import | The one-time Excel migration, super admin only, removed after cut-over (D17) | Batches; Errors; Unreconciled amounts | Batch; Status; Sheet | Per sheet: Ticket Sales to bookings and sales, Airline Top-Ups to payments, Dashboard balances to opening entries, Sub IDs & Users to provider accounts, Umrah to Umrah records, Discount Sheet (an agency directory) to agencies. Credentials sheets are never imported; only vault references. Supplier statements (such as the Sooperfare report) fill in missing ticket numbers and issue dates. Imported rows carry a "migrated" flag. Opening balances need Finance and Super Admin approval and reconciliation to portal and bank evidence |

## 19. Business rules behind the screens

These rules decide what the cards and filters above mean. Developers should build them once and let every screen read them.

### 19.1 Status model

| Status axis | Values | Why it is separate |
| --- | --- | --- |
| Booking | Draft, On hold (with deadline), Confirmed, Cancelled, Expired | Whether the reservation exists |
| Payment | Unpaid, Pending verification, Paid, Partial, Refund due, Refunded | Whether money is verified, independent of ticketing |
| Supplier | PNR created, PNR active, Time limit near, Supplier cancelled, Schedule changed | What the airline or supplier says |
| Issuance | Not requested, Awaiting approval, Queued, Processing, Issued, Failed, Unknown | Whether a ticket exists; Unknown must freeze funds and block retry |
| Servicing | None, Refund requested, Reissue requested, Void requested, Completed | After-sales state without changing the original booking |

### 19.2 Provider accounts (one model for all)

| Account kind | Funding | How the balance behaves | Why |
| --- | --- | --- | --- |
| Own airline ID (AirSial, AirBlue, Fly Jinnah, Salam Air, Fly Nas, PIA and others) | Prepaid; you top up | Calculated balance falls with each ticket's actual cost; refunds credit it at once | Matches how airline IDs work today |
| Supplier portal wallet (for example Sooperfare, HT, GT, AG) | Optional prepaid deposit | Balance rises with deposits and kept refund credits, falls with tickets paid from it | You can pre-fund wallets on supplier portals |
| Pay-per-booking supplier | None; pay per booking | Account nets to zero; a non-zero balance means an overpayment, short payment or unreceived credit | You transfer within the hold window |

Every account keeps a **calculated balance** (from the ledger), a **verified balance** (read from the portal and entered with who and when), the **variance**, and an **earmark** for tickets in progress. Why: the Excel file already shows two different balances for the same airline ID.

### 19.3 Supplier payment inside the hold window

1. Staff create the booking on the supplier portal or sub-ID; the hold deadline (about 30 minutes minimum) is saved on the booking.
2. The Attention Queue shows a countdown; alerts at 15 and 5 minutes remain.
3. Customer payment is verified (B2C) or agency wallet funds are reserved (B2B) before Travelian's money goes out.
4. Staff transfer the amount to the supplier and record bank, reference, time and proof (or choose supplier wallet balance or a refund credit as the source).
5. Supplier confirms receipt and issues; the ticket number is saved and the booking becomes Issued.
6. If payment was sent and no ticket arrives, the booking becomes Unknown and moves to Failed/Manual Review. Nobody pays again or retries until the supplier confirms the real status.

Why: a hold that expires before the money lands loses the sale, and paying twice is a direct loss.

### 19.4 Refund process

| Channel | When the amount is known | When money arrives | What the customer sees |
| --- | --- | --- | --- |
| Own airline ID | Checked in the ID before the customer is told | Credited to the ID immediately | Quote sent, then payout in progress |
| GDS airline | Estimate only; may change when settled (taxes) | 1 to 2 weeks | Submitted to airline, expected date range |

1. Staff record the quote: refundable amount, airline penalty, refundable taxes, Travelian fee, expected time. The customer sees and accepts it (open: customer accepts on the dashboard, or staff record acceptance).
2. Staff submit the refund to the airline or supplier.
3. When the money arrives, staff record the amount received and compare it with the quote; a difference above tolerance goes to review.
4. Customer payout equals the amount received minus Travelian's fee. A second approver is required above a threshold.
5. Finance transfers to the customer's bank account (account name must match the customer), saves the reference, and the customer dashboard shows Refunded.
6. Supplier refunds are recorded as either paid to Travelian's bank or kept as credit with the supplier for later tickets (both recorded so balances stay correct).

Why: amounts and timing differ by airline, so a fixed promise would be wrong, and paying on the received amount protects cash.

### 19.5 Manual/offline booking

Staff record a ticket issued outside the system with PNR, ticket number, airline, source, passenger, route, travel and issue dates, actual cost, selling price, payment and proof. The system checks for duplicate PNR or ticket, confirms the staff member may use that account, and requires a second approval above a threshold. Why: portal issuance still happens, and unrecorded tickets break balances and the airline report.

### 19.6 Ledger posting rules (to be validated by the accountant)

| Event | Effect | Why |
| --- | --- | --- |
| Agency deposit verified | Bank up; agency wallet liability up; not revenue | Deposits are money owed back until spent |
| Booking paid | Customer or agency funds reserved | Prevents spending the same money twice |
| Ticket issued | Sale recognised; actual supplier cost recorded; provider account reduced once | Margin depends on actual cost, not selling price |
| Airline ID top-up sent | Bank down; top-up in transit; ID credited only after confirmed | A transfer is not a credit until the airline confirms |
| Supplier refund received | Refund receivable cleared; bank or supplier credit up | Tracks money owed by airlines |
| Void or reversal | Linked reversing entries; originals never deleted | Keeps an audit trail |
| Unmatched bank receipt | Held in suspense until ownership proven | Money without an owner must not be spent |

### 19.7 Price changes between search and booking

1. A search price comes from the supplier or airline at search time and is indicative only.
2. The exact price is known when the booking is created with the supplier. It stays valid until the hold deadline.
3. The booking stores the searched price, the booked price and the difference.
4. If the booked price differs from the searched price, the user (staff, agency or customer) sees both and must accept the new price before paying. A difference above a configured limit is flagged for staff review.
5. Payment is requested for the booked price only and must arrive before the hold deadline. After the deadline the hold and its price are gone.
6. A quotation is valid for a stated time; converting it to a booking revalidates the price.

Why: fares change between search and booking, so the customer must agree to the real price, and staff must see how often prices move.

### 19.8 Communication channels and sign-in

| Use | Channel | Why |
| --- | --- | --- |
| Sign-in codes for every role | WhatsApp, with SMS or email as fallback | Everyone checks WhatsApp; a fallback is needed when delivery fails |
| Second factor for finance, approver and Super Admin roles | Authenticator app or equivalent (proposed, to confirm) | These roles move money |
| Hold reminders, payment received, ticket issued, refund status, schedule change | WhatsApp | Fast, and read |
| E-ticket, invoice, receipt | WhatsApp document, plus email copy where an address exists | Customers keep and forward documents |
| Consent | Recorded per phone number | WhatsApp and local rules require agreement to receive messages |

Rules for developers: a sign-in code expires within minutes, works once, has an attempt limit and a request limit per number, and is stored hashed. A change of phone number is verified and written to the Audit Log. WhatsApp message templates must be approved by the provider before use. Every message is recorded in the delivery log under System > Notification Templates. The customer chatbot is outside this specification.

## 20. Airline sales report specification

**Why it exists:** airlines, IATA and GDS providers judge an agency's scope by its sales when it applies for IDs, accreditation or APIs. The report must be complete, traceable and safe to share. It lives in Reports > Suppliers/Airlines and can be generated for one airline.

### 20.1 Columns

| Column | Status | Why |
| --- | --- | --- |
| PNR | Your requirement | Identifies the booking |
| Passenger name | Your requirement | Shows real passengers |
| Route | Your requirement | Shows sectors sold |
| Travel date | Your requirement | Shows when flown |
| Airline | Proposed, please confirm | Needed to split a combined report and to filter one airline |
| Ticket number | Proposed, please confirm | Proves the ticket was issued; airlines match on it |
| Issue date | Proposed, please confirm | Shows sales over time; travel date alone does not |
| Source (own ID or supplier) | Optional, internal choice | Lets you submit own-ID sales only or all sales |
| Fare or amount | Optional, off by default | Airlines can often compute value; pricing may be private |

CNIC and passport numbers are never included. Columns are selectable for each export, starting from the default, because each airline may ask for something different.

### 20.2 How it works

| Element | Rule | Why |
| --- | --- | --- |
| Choose airline | One airline, several, or all | Applications are made airline by airline |
| Period | Any date range on issue date | Airlines ask for a set history, for example the last 12 months |
| Source filter | All, own airline ID only, supplier only | What you submit depends on what the airline asks |
| Included tickets | Issued tickets; refunds and voids shown so figures can be net | Airlines will ask whether figures are gross or net |
| Header block | Agency name, airline, period, filters, date generated, generated by, totals of tickets and segments | Makes the file credible and repeatable |
| Airline definition | Validating (ticketing) carrier by default | Codeshare and interline tickets otherwise differ; confirm with the accountant or airline |
| Saved presets | For example Airblue, last 12 months, own ID only | Repeat requests become one click |
| Data quality check | List of tickets missing PNR, ticket number, route or source, shown before export | An incomplete report undermines the application |
| Permission and audit | Needs export permission; every export recorded in Export History | Passenger names are personal data |
| Locked versions | A submitted report is stored with its filters and cannot change | You can prove later what you sent |
| Formats | Excel and PDF | Airlines ask for either |
| Migrated history | Rows imported from Excel are marked migrated and filled from supplier statements where possible | Your sheet has no ticket numbers, and entry dates are not issue dates |

### 20.3 Acceptance tests

- A report for one airline contains only that airline's tickets and its totals match the Sales report for the same filters.
- A ticket with a missing PNR or ticket number appears in the data quality list and cannot be exported silently.
- Exports contain no CNIC or passport number by default.
- Every export appears in Export History with its filters and user.

## 21. Open confirmations

These are not assumed. Each needs an answer before the related screen is built.

| # | Question | Who confirms | Affects |
| --- | --- | --- | --- |
| 1 | Does the customer accept a refund quote on the dashboard, or do staff record acceptance after speaking to the customer? | Product owner | Refunds screen, customer dashboard |
| 2 | Add Airline, Ticket number and Issue date to the airline report default columns? | Product owner | Section 20 |
| 3 | Is the airline in a report the validating carrier? | Accountant, airlines | Section 20 |
| 4 | For bookings paid by gateway or card, can the refund go back to the original method instead of a bank transfer? | Payment providers | B2C refund process |
| 5 | IATA or BSP status, ADM and ACM obligations | Travelian, consolidators | PNR Queue, reconciliation |
| 6 | Which airline IDs and supplier accounts use foreign currency, and are IDs shared across branches? | Finance | Provider accounts |
| 7 | For each supplier (Sooperfare, HT, GT, AG, Aeroglobe, TravelUstad): is a portal wallet offered, and what is its hold time? | Operations | Provider accounts, countdown |
| 8 | Can agencies issue tickets themselves or only request issuance? | Product owner | Roles, Approval & Issuance |
| 9 | Invoice taxes, withholding, credit notes, fiscal periods | Accountant | Invoices & Notes, posting rules |
| 10 | Personal bank accounts: exclude from the system or record as owner accounts? | Owner, accountant | Accounts & Ledgers |
| 11 | Full names and details of suppliers HT, GT and AG; is the Sohail panel an agency or a staff channel? | Operations | Provider registry, B2B Partners |
| 12 | Which airline ID balance is correct where the Dashboard sheet shows two figures (for example AirSial and Fly Jinnah)? Verify against each portal before migration | Finance | Data Import opening balances |
| 13 | Which group suppliers expose real-time hold APIs and which are manual? | Integration team | Group inventory |
| 14 | What is actually built today and how do real APIs behave? | Development team | Estimates, phasing |
| 15 | Have the passwords that appeared in the shared spreadsheet been changed? | Owner | Security, immediate |
| 16 | Which WhatsApp Business provider, and how long do business verification and template approval take? | Owner, provider | Sign-in codes, notifications |
| 17 | Which roles need the second factor, and is the fallback SMS or email? | Product owner | Authentication & Security |
| 18 | What price difference between search and booking is accepted without staff review? | Product owner | Booking creation, section 19.7 |

## 22. Build phases and the mockup plan

### 22.1 Phases

| Phase | Scope | Why it comes at this stage | Release gate |
| --- | --- | --- | --- |
| P0 Foundation | Roles and field-level security; approval matrix; booking status model; ledger and chart of accounts; provider accounts with earmarks and verified balances; source registry and mandatory sales source; supplier payment per booking with hold countdown; payment verification; safe issuance and Unknown handling; manual/offline booking; Excel migration; WhatsApp sign-in codes with fallback | Money and tickets cannot move safely without these | Real tickets and payments reconcile; no duplicate issue or posting; no cross-agency data leakage; every ticket has PNR, ticket number and source |
| P1 Operations | Refund quotes, payouts and receivables; void, reissue, cancellation; invoices; receivables and payables; agency onboarding and credit; branch cash close; owned group stock; supplier statement reconciliation; core reports and the airline sales report; WhatsApp notifications and email documents | Needed for full daily operation and for IATA and airline applications | Balances independently verified; airline report totals match Sales report |
| P2 Product breadth | Hotels; Umrah end to end with installments; quotations; schedule changes; Fare Simulator; CMS basics | Products that are not yet configured | Product-specific flows tested |
| P3 Automation | Communications inbox; scheduled reports; automatic reconciliation; feature-flag screen; anomaly alerts | Only valuable once records are reliable | Core records stable |

### 22.2 Changes needed in the current build

| Current screen | Change | Why |
| --- | --- | --- |
| Sidebar (12 groups) | Rename Financial to Finance and Operations to Flight Operations; split Management into B2B Partners, Suppliers & Integrations and Users & Access; Customers becomes Customers & Travelers | Match the 14 approved menus |
| Wallet chip in the top bar | Show for agency users only | Only agencies have wallets (D3) |
| Customers table | Mask passport and date of birth; log reveals | Identity data protection |
| Hotel Inventory | Move Markup Rules and Deals & Promotions to Pricing & Revenue | One place for pricing |
| Bookings table | Add ticket number, source and separate status chips | Needed for reporting and the five-axis model |
| Dashboard cards | Replace with the cards listed in section 5 | Align with the approved card set |
| Demo data | Keep the Sample label and remove demo announcements before launch | Prevents demo text reaching customers |

### 22.3 Mockup order (after you approve this document)

1. Dashboard homepage for Super Admin
2. Bookings list and booking detail with supplier payment tab
3. Flight Operations: Approval & Issuance, then Failed/Manual Review
4. Finance: Accounts & Ledgers (provider accounts), then Payments & Receipts
5. Flight Operations: Refunds case screen
6. Reports: airline sales report generator
7. Suppliers & Integrations: Flight Providers (registry and ID pipeline)
8. Agency owner view (same UI, fewer menus)
9. B2C customer view (no wallet; refund status)
10. Remaining submenu screens, built from the screen standard in section 4

## 23. Decisions added on 6 November 2026

**D23 Field visibility.** The gateway decides what each role receives; hiding a field on the page is never the protection.

- Super Admin and Admin see provider and supplier names, supplier cost and margin.
- Staff do not see them by default. Two permissions can be granted per role or per user: "can see supplier names" and "can see cost and margin".
- Agency, sub-agency and customer roles never see them, and this cannot be granted. The gateway does not return these fields to them at all.
- This applies to Search (Flights, Group Ticketing, Hotels, Umrah), the Dashboard Provider / source filter and the Attention Queue.
- Staff see the Owned or Supplier label on group stock, without the supplier name. Space is kept for owned stock.
- Where this document says "Provider (staff only)", read "Provider (Admin and Super Admin only)".

**D24 Provider failure.** If a provider does not answer, staff see a general notice ("Some results may be missing") with no provider names. Admins receive an integration alert.

**D25 Hotels in Search.** Hotels stays in Search because Travelian also sells manually entered hotels from Hotel Inventory. Provider hotels and manual hotels appear in one list, and the source is shown to Admin and Super Admin only.

**D26 Search results layout.** Flights are shown as one card per flight with several fare options under it, each with fare name, meal, cabin and checked baggage, refund status, price and hold time left. Baggage shows cabin and checked separately.
