# Cashew: competitor UI research, feature gaps and design direction

Accessed 3–4 Nov 2026. Everything below comes from public pages only.

## How this was gathered, and its limits

- **Screenshots:** I captured each public page in headless Chrome at 1280×860 and at a true 390×844 phone viewport, then looked at the images. Only the first screen of each page was captured, roughly 9 seconds after load.
- **Typography:** font names were read from each site's HTML and linked CSS. "Not read" means none were found there.
- **Feature text:** taken from page text. Features are what the vendor claims, not what I tested.
- **No competitor's logged-in product was seen.** Every "UI" note below describes a marketing or product page, not a working dashboard. **All post-login screens are NOT VERIFIED**, including for products with a visible Login button.
- **Demo videos and app store listings: NOT VERIFIED.** Google Play pages returned no usable text. I watched no videos. App existence comes only from links on vendors' own sites.
- **"What it does badly" is partly my judgement.** Each item is tagged **[seen]** (visible on the page) or **[inference]** (my reasoning about a small exporter, not tested with one). None of this replaces the exporter interviews in the Handbook.
- A cookie banner or popup covering a page reflects a first visit with no cookies. A returning user may not see it.

## Corrections to our own docs (check before the pitch)

| Our docs say | What public sources show | Source |
|---|---|---|
| Contour "wound down" (Handbook 9.1) | It announced closure in 2023, was bought by Xalts, then 100% acquired by XDC Ventures in Oct 2025. The site is live with "Join Now" and a stablecoin lab. **Actual transaction activity: NOT VERIFIED.** | [GTR](https://www.gtreview.com/news/digital-trade/xdc-ventures-to-re-energise-contour-after-xalts-sale/), [GTR 2023](https://www.gtreview.com/news/fintech/exclusive-contour-to-shut-down-as-bank-shareholders-pull-funding/), [site](https://www.contour.network) |
| TReDS is "domestic" and "not export-focused" (Technical Master A1, Handbook 9.2) | **Too absolute to say on stage.** RXIL's site is reported as saying it is the only TReDS platform handling "domestic & international" trade finance, and lists RXIL Global IFSC. M1xchange describes M1 NXT as its "international TReDS counterpart". Depth of these offers: NOT VERIFIED. | [RXIL (via search)](https://www.rxil.in/best-treds-platform-india/), [M1xchange](https://www.m1xchange.com) |
| KredX is a "supply chain / invoice fintech" | It now presents itself as an RBI-licensed TReDS platform (DTX), lists "Export Financing" in its signup form, and has a Global Trade Exchange claiming "100+ Countries". | [KredX](https://www.kredx.com) |
| Competitors don't serve regional languages (implied) | Oxyzo offers 11 languages. HDFC has Hindi, Tamil, Telugu, Kannada and Malayalam page paths. Language alone won't set Cashew apart. | [Oxyzo](https://www.oxyzo.in), [HDFC](https://www.hdfc.bank.in/hindi/msme-banking/trade-services) |
| Export financiers are "not neutral" | Still fair for Drip, but it advertises "Fast Non-Recourse Financing", no collateral and 24-hour disbursal. That is a strong speed claim to beat, so don't pitch Cashew as faster than Drip without pilot data. | [Drip](https://www.dripcapital.com/en-in/) |

---

## Step 1: Competitor by competitor

### TReDS platforms

**RXIL** — [rxil.in](https://www.rxil.in) · [FAQs](https://www.rxil.in/faqs) · [brochure](https://www.rxil.in/wp-content/uploads/2023/08/RXIL-Brochure.pdf)
- **For:** MSME sellers, corporate buyers, financiers. Login required for the product.
- **Features (RXIL's site, seen through search results; direct text fetch returned HTTP 444):** multi-financier factoring; the buyer must approve an invoice; invoices need at least 15 days' balance tenor and must not be financed elsewhere; interest plus a transaction charge; "financing is not guaranteed".
- **UI:** top nav with Login and Register. Full-bleed dark photo hero with a two-button CTA, floating social rail. Blue accent. Merriweather Sans / Urbanist. Moderate density. Trust: NSE-SIDBI mark in the logo. Phone: stacks cleanly, hamburger menu.
- **Badly for a small exporter:** the first screen has no path for exporters **[seen]**. Buyer approval is hard to get from an overseas buyer who isn't on the platform **[inference]**. App: NOT VERIFIED.

**M1xchange** — [m1xchange.com](https://www.m1xchange.com)
- **For:** MSMEs, corporates, financiers. Login required.
- **Features:** invoice upload, bids, financier selection; "Without Recourse"; next-day payment; S2S; mobile app; cost calculator; M1 NXT for cross-border.
- **UI:** blue utility bar with a phone number, photo of a garment worker, large stat row (bills, MSMEs, corporates, financiers, cities), floating Help button. Lato / DM Sans. Trust: "India's 1st RBI-Licensed TReDS Platform", ISO 27001. Phone: a popup about PSU mandates covers the first screen.
- **Badly:** the first phone screen is a regulatory message for a different audience **[seen]**. "10 minutes*" onboarding carries "Conditions apply" **[seen]**. The export path sits in a separate product **[seen]**.

**Invoicemart** — [invoicemart.com](https://www.invoicemart.com)
- **For:** MSME suppliers selling to corporates and CPSEs, buyers, financiers. Login required.
- **Features:** competitive bids, payment within 24 hours of bid acceptance, no collateral, up to 180 days, ERP API, Android and iOS apps.
- **UI:** maroon with an image hero, covered on arrival by a modal about CPSE mandates on both desktop and phone. Two nav rows plus a ticker. Fonts not read. Trust: Axis Bank / mjunction JV, RBI approval, named bank partners.
- **Badly:** the arrival modal blocks the first view **[seen]**. Exports aren't mentioned **[seen]**. The pitch is aimed at corporate compliance rather than at a supplier **[inference]**.

**KredX (DTX)** — [kredx.com](https://www.kredx.com)
- **For:** enterprises, SMEs, financiers. Login required.
- **Features:** reverse factoring, factoring, dynamic discounting, TReDS (DTX), collections automation, Global Trade Exchange; "Export Financing" in signup. No fee figures.
- **UI:** dark teal/black with neon teal, scrolling fraud alert, isometric-style illustration, badges row. Montserrat / Open Sans. Trust: RBI-licensed, ISO 27001, GDPR, AICPA badges, named nodal officer. Phone: readable, single CTA, three badges.
- **Badly:** "Zero Collateral, Best Rates" has no number or basis beside it **[seen]**. App links: none on the page **[seen]**. Enterprise products lead the menu **[seen]**.

### Supply-chain finance and invoicing

**Vayana Network** — [vayana.com](https://www.vayana.com)
- **For:** buyers, sellers, banks, MSMEs. Login required.
- **Features:** supply chain finance, GST compliance, AI risk assessment, collections, cross-border trade finance marketplace, APIs.
- **UI:** red-to-purple gradient carousel with isometric buildings and a world map. Very small nav text. Inter. Trust: volume figures, PCI, ISO, SAP, CIN and LEI. Phone: clean stack.
- **Badly:** "Speak to us" is the only first-screen action, with no self-serve path **[seen]**. The word "exports" doesn't appear **[seen]**.

**C2FO** — [c2fo.com](https://c2fo.com)
- **For:** suppliers and large buyers, Global 2000 logos. Login required.
- **Features:** Early Pay, Instant Pay, FinanceIQ, Lending Connections, dynamic discounting.
- **UI:** white with serif headline (Noto Serif / Roboto), portrait photo, right-hand promo slide-in, large cookie panel. Language selector. Phone: consent panel covers most of the first screen.
- **Badly:** a buyer has to be on the network for early pay to apply **[inference from product description]**. No India content beyond the "English (India)" option, no exports, no Indian languages **[seen]**.

**CredAble** — [credable.in](https://credable.in)
- **For:** banks, corporates, SMEs and startups. Login required.
- **Features:** pre- and post-shipment financing platforms, receivables and PO finance, AI credit memo that "flag[s] discrepancies", invoice validation with "Government-Verified Data", ERP connectors.
- **UI:** white with orange-yellow gradient logo shape, large headline, single black CTA, domain warning strip. Satoshi. Trust: RBI NBFC registration number, $21 Bn figure, awards. Phone: the hero area below the menu was blank at capture.
- **Badly:** it speaks mainly to institutions ("Infrastructure for the World") **[seen]**. Phone view blank at 9 seconds; cause not determined **[seen]**.

**Taulia (SAP)** — [taulia.com](https://taulia.com)
- **For:** enterprise treasury and procurement; suppliers join through a buyer's programme. Login required.
- **Features:** supply chain finance, dynamic discounting, virtual cards, inventory finance, 40+ funders; "no registration or hidden fees" for suppliers.
- **UI:** deep blue block, stock photo of a man with a laptop and floating UI tiles. Fonts not read. Trust: enterprise logos, research stats. English and German.
- **Badly:** access depends on a large buyer's programme **[inference from page]**. Not aimed at India or exports **[seen]**.

**Tradeshift** — [tradeshift.com](https://tradeshift.com)
- **For:** large buyers with many ERPs; sellers onboarded through invoices. Login required.
- **Features:** e-invoicing, OCR capture, multi-way matching, audit trail, buyer-seller messaging, compliance in 70+ countries. Trade finance isn't described as a service; a HSBC JV is mentioned.
- **UI:** blue network-graphic hero with mint CTA, large consent modal. ShiftDisplay / Muli.
- **Badly:** it isn't a finance product for a small exporter **[seen]**. Useful as a reference for multi-way matching only.

### Export financier

**Drip Capital** — [dripcapital.com/en-in](https://www.dripcapital.com/en-in/) · [export factoring](https://www.dripcapital.com/en-in/products/export-factoring/)
- **For:** exporters directly (also importers, investors). Portal login required.
- **Features:** post-shipment finance, 60% against POs, "Non-Recourse", no collateral, 24-hour disbursal, limits to $3 million, "as low as 0.7% per month", 80% advance, IEC-based form, Charges Calculator (not opened).
- **UI:** white and dark green with arrow graphic and stat row. Montserrat / Lato. Trust: FCI membership, awards, SSL badge. Phone: consent modal first, then a stacked page. It is the clearest export-first message in this set.
- **Badly:** only its own offer is shown, so there is nothing to compare **[seen]**. "As low as" is a floor, and "20% less our charges" leaves the total unclear on the page **[seen]**. App: NOT VERIFIED.

### General MSME lenders

**Lendingkart** — [lendingkart.com](https://www.lendingkart.com)
- **Visual UI: NOT VERIFIED.** Automated browser received "Access Denied" (403) at both sizes; text came from a fetch.
- **Features:** unsecured to ₹50 lakh, secured, credited within 3 days, Android app, RBI-registered NBFC, ISO.
- **Badly:** the EMI slider example shows 10.9% while the FAQ says rates "start as low as 17.25%" **[seen in text]**. "Just your bank statements" sits alongside a longer FAQ list **[seen in text]**. No exports **[seen]**.

**Indifi** — [indifi.com](https://www.indifi.com)
- **For:** MSMEs. Exporters appear only under "Trading Businesses". Login required.
- **Features:** working capital, term loan, merchant cash advance, up to ₹50 lakh; "1.5% per month" indicative, partner lenders.
- **UI:** dark photo hero with green-bordered lead form on the right, uppercase headline, phone number, caution notice. Montserrat. On phone the form comes first and hero text shows faintly behind it at capture.
- **Badly:** speed claims conflict: 72 hours, 24 hours and 48 hours **[seen]**. Partner counts also conflict: "15+" and "80+" **[seen]**. Asks for contact details before showing any terms **[seen]**.

**Oxyzo** — [oxyzo.in](https://www.oxyzo.in)
- **For:** SMEs to large firms. Login required.
- **Features:** purchase finance, invoice discounting, machinery finance; EMI and GST calculators; **11 languages**; Android and iOS.
- **UI:** white, blue CTAs, teal stat band, industrial photo collage. Noto Sans / Satoshi. Trust: RBI number, A+ rating, AUM.
- **Phone:** the page measured **488px wide in a 390px viewport**, so it scrolls sideways, with the nav and stat band clipped **[measured]**.
- **Badly:** no rates or speed stated **[seen]**; no exports **[seen]**.

**UGRO Capital** — [ugrocapital.com](https://www.ugrocapital.com)
- **For:** small businesses, investors. Login required.
- **Features:** loan against property, embedded finance, machinery finance; GRO Score; schedule of charges linked.
- **UI:** orange and red, seasonal Diwali brand-film carousel, products below, dense investor navigation. Lato / Poppins. Trust: NSE/BSE, ratings, co-lenders.
- **Badly:** the hero was a brand film rather than a task **[seen, seasonal]**. A borrower "score" sits in the top nav, the framing Cashew avoids **[seen]**. No exports **[seen]**.

**FlexiLoans** — [flexiloans.com](https://flexiloans.com)
- **For:** MSMEs. Login required.
- **Features:** term loans, vendor finance, approval in 48 hours, EMI calculator (18% default), Android app.
- **UI:** bright sky blue, hexagon-masked portrait, two CTAs, stat card. Stara / Inter. Phone: counters read "0+" and "₹0+ Cr" at capture, and differed between captures, so they animate.
- **Badly:** trust numbers depend on animation, and read as zero if it hasn't fired **[seen]**. "Approval in 48 Hours" gives no disbursal time **[seen]**. No exports **[seen]**.

**Mintifi** — [mintifi.com](https://www.mintifi.com)
- **For:** distributors and brands. Login required.
- **Features:** inventory finance, WhatsApp banking, Tally-linked collections, EIPP.
- **UI:** white, green CTA, isometric warehouse, greyscale brand logos. Inter / Nunito Sans. The page text carries "00+" stats.
- **Badly:** domestic distribution focus; no exports **[seen]**. Its WhatsApp channel is a good idea to learn from **[seen]**.

### Blockchain trade networks

**Marco Polo** — [fintechfutures](https://www.fintechfutures.com/blockchain-crypto-digital-assets/blockchain-trade-finance-firm-marco-polo-reportedly-enters-insolvency) · [GTR](https://www.gtreview.com/news/fintech/marco-polo-brings-in-liquidators-as-funds-run-dry/)
- Insolvency reported in 2023. The domain I tried, `marcopolo.finance`, returned a Cloudflare DNS error (screenshot) and HTTP 530 (fetch). **UI, features and audience in product: NOT VERIFIED.**

**Contour** — [contour.network](https://www.contour.network)
- **For:** banks, corporates, trade partners.
- **Features:** digital LCs across banks, electronic bills of lading, USDC settlement lab, private XDC subnet.
- **UI:** near-black with orange CTA and a glowing globe; mono eyebrow label; floating glass status cards. A card shows an "LC · Import · Sight" status, a marketing illustration and not a verified product screen. Fonts not read.
- **Badly:** banks must be on the network and LCs are the unit, not a small exporter's open-account invoice **[inference]**. Stablecoin framing adds a question a small exporter doesn't need **[inference]**.

### Bank trade portals

All four require an existing bank relationship and login. **Portal screens are NOT VERIFIED.**

**SBI eTrade / YONO Business** — [page](https://sbi.bank.in/web/business/corporate-banking/technology-offering-yono-business)
- **Features stated:** import LC application online "in under 10 minutes", LC limits, chat, real-time onboarding status, eForex. Onboarding uses one omnibus document and "a single Branch visit". **Export features in eTrade: NOT VERIFIED** (page covers import LC).
- **UI:** very dense: purple utility bar, multi-row nav, long bullet list, floating widgets, Hindi link and English language dropdown. Open Sans.
- **Badly:** a branch visit is still part of onboarding **[seen]**. Shows only SBI **[inference from model]**.

**HDFC TradeOnNet** — [page](https://www.hdfc.bank.in/msme-banking/trade-services/digital-solutions) · [Hindi path](https://www.hdfc.bank.in/hindi/msme-banking/trade-services)
- **Visual UI: NOT VERIFIED** (403 to automated browser). Open Sans from HTML.
- **Features (search excerpts of HDFC pages):** export and import transactions, export bill regularisation, shipping bill handling, document upload, status tracking with SMS/email, maker-checker.
- **Badly:** shows only HDFC **[inference from model]**.

**ICICI Trade Online** — [page](https://www.icici.bank.in/business-banking/trade-service/onlinetrade) · [Trade Emerge coverage](https://yourstory.com/smbstory/icici-bank-launches-trade-emerge-platform-exporters-importers/amp)
- **Features:** stage-wise dashboard, auto-generated regulatory documents, templates, audit trail, no setup cost. Trade Emerge (2021 reports): buyer database, credit bureau reports, logistics, insurance through partners; current status NOT VERIFIED.
- **UI:** strong orange, customer photo with quote, tabbed sub-nav. Muli / Mulish.
- **Badly:** needs an existing trade facility, a board resolution or mandate, and a relationship manager **[seen]**.

**Axis TF Connect** — [page](https://www.axis.bank.in/business-banking/digital-trade-solutions) · [corporate](https://www.axis.bank.in/corporate/neo-by-axis-bank?tab=online-banking)
- **Features:** import-export transactions online, templates, bulk upload, SWIFT copies, tracking; Paperless Imports; Trade APIs ([Qorus entry](https://www.qorusglobal.com/innovations/28525-axis-bank-wholesale-banking-trade-api-proposition)).
- **UI:** maroon, three-row navigation, identical rounded cards with "Know More" buttons, Eng/हिंदी toggle, large cookie panel. Lato.
- **Badly:** organised around bank products, not the exporter's trade **[inference]**. Shows only Axis **[inference from model]**.

---

## Step 2: Feature matrix and gaps

**How to read it.** **Yes / Partial** = stated on a public page. **No** = the product's own stated model rules it out (for example, a single lender can't compare lenders). **NV** = Not verified: absent from public pages or behind login. **NV is not No.** Marco Polo is NV throughout. Rows 4–6 are the claim that matters most, and they rest on public pages only: treat them as "not publicly evident", not "proven absent".

Columns: RX=RXIL, M1=M1xchange, IM=Invoicemart, KX=KredX, VA=Vayana, C2=C2FO, CA=CredAble, TA=Taulia, TS=Tradeshift, DR=Drip, LK=Lendingkart, IN=Indifi, OX=Oxyzo, UG=UGRO, FL=FlexiLoans, MI=Mintifi, MP=Marco Polo, CO=Contour, SB=SBI, HD=HDFC, IC=ICICI, AX=Axis.

| Feature | RX | M1 | IM | KX | VA | C2 | CA | TA | TS | DR | LK | IN | OX | UG | FL | MI | MP | CO | SB | HD | IC | AX |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. Several financiers compete or can be chosen | Yes | Yes | Yes | Yes | Partial | NV | Partial | Partial | NV | No | No | Partial | No | NV | NV | NV | NV | Partial | No | No | No | No |
| 2. Export or cross-border finance named | Partial | Partial | NV | Partial | Partial | NV | Partial | NV | NV | Yes | NV | Partial | NV | NV | NV | NV | NV | Partial | NV | Yes | Yes | Yes |
| 3. Works without the buyer joining | No | NV | NV | NV | NV | NV | NV | No | NV | Yes | Yes | Yes | Yes | Yes | Yes | NV | NV | No | Yes | Yes | Yes | Yes |
| 4. Normalised all-in cost across lenders | NV | Partial | NV | NV | NV | NV | NV | NV | NV | No | No | NV | No | NV | NV | NV | NV | NV | No | No | No | No |
| 5. Hidden or conditions-only fees surfaced | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV |
| 6. Per-check evidence shown to the exporter (source, status, time) | NV | NV | NV | NV | NV | NV | Partial | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV |
| 7. Cross-document consistency check | NV | NV | NV | NV | NV | NV | Partial | NV | Partial | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV |
| 8. Duplicate financing guard across lenders | Partial | NV | NV | NV | NV | NV | Partial | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV |
| 9. Portable, verifiable credential | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV |
| 10. Transaction or shipment status tracking | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | NV | Partial | Partial | Partial | Partial | Partial |
| 11. Android app linked | NV | Yes | Yes | NV | NV | NV | NV | NV | NV | NV | Yes | NV | Yes | NV | Yes | Partial | NV | NV | NV | NV | NV | NV |
| 12. Indian language UI beyond English | NV | NV | NV | NV | NV | No | NV | No | NV | NV | No | NV | Yes | Partial | NV | NV | NV | NV | Yes | Yes | NV | Yes |
| 13. Price figure on a public page | NV | NV | NV | NV | NV | NV | NV | NV | NV | Partial | Yes | Partial | NV | NV | Partial | NV | NV | NV | NV | NV | NV | NV |
| 14. No collateral claimed | Yes | NV | Yes | Yes | NV | NV | NV | NV | NV | Yes | Yes | Yes | NV | NV | Yes | NV | NV | NV | NV | NV | NV | NV |

Basis for rows needing explanation: **3** RXIL requires buyer approval, Taulia and Contour need buyer/bank participation, lenders and banks underwrite the borrower directly. **4** M1xchange = a "TReDS Cost Calculator" link (not opened). **6, 7** CredAble = "Government-Verified Data" and "flag discrepancies", aimed at lenders. **7** Tradeshift = multi-way matching in accounts payable. **8** RXIL = "not financed elsewhere" eligibility rule; CredAble = invoice validation. **10** Banks = transaction status, not shipment milestones; Contour = LC status card in a marketing image. **11** Mintifi = "Customer App" nav and WhatsApp. **12** UGRO = booklet only; C2FO, Taulia, Lendingkart = language selectors or lists without Indian languages. **13** Drip "as low as 0.7%/month"; Lendingkart 17.25%; Indifi 1.5%/month indicative; FlexiLoans calculator default.

### 1. Table stakes
- Collateral-free messaging and a stated speed claim.
- Digital onboarding and document upload.
- Regulatory marks up front (RBI registration, ISO 27001), plus fraud warnings about fake sites.
- Large aggregate volume numbers as the main trust signal.
- Phone-responsive marketing pages.

### 2. Gaps Cashew can own (on public evidence, to be tested)
1. **All-in cost across lenders, with the arithmetic shown.** Nobody publicly normalises cost across competing lenders for an exporter.
2. **Fees found in the conditions text.** Lendingkart's 10.9% slider beside "17.25%" shows why this is needed.
3. **Evidence-level trust:** what was checked, by which source, when, including "Unknown". Everyone shows aggregate volume; nobody publicly shows per-trade evidence to the exporter.
4. **Export trade financed without the overseas buyer onboarding**, with several lenders competing. Drip skips the buyer but is a single lender; TReDS is multi-lender but needs buyer approval.
5. **Duplicate check across lenders without revealing the other lender.**
6. **A verification record the exporter owns and carries to the next lender.**

### 3. Impressive but adds friction for a small exporter
- **AI credit memos and AI-powered labels:** benefit lenders, and a small exporter can't check them.
- **Stablecoin settlement and ledger framing:** raises compliance questions for no daily benefit.
- **ERP connectors and bulk upload:** many small firms won't have an ERP (assumption; confirm in interviews).
- **Reverse auctions with live bids:** adds a decision and time pressure; sealed offers are calmer.
- **Single "score" for the borrower:** invites arguing with a number rather than fixing a document.
- **Count-up stat bands and brand-film carousels:** cost data and attention on poor connections (assumption).
- **Arrival modals:** seen covering first screens at Invoicemart and M1xchange on phone.
- **Maker-checker workflows as a default:** essential for large teams, overhead for a two-person office. Offer it as an option.

---

## Step 3: Design direction, "Manifest"

**Idea:** Cashew should look like a very well-kept shipping file: ruled ledgers, labelled fields, reference numbers, a stamp only where something was really checked. The working surface is the document and the check, not a card with a stat in it.

**Why it won't read as templated.** Competitors lean on photo heroes, gradients, isometric illustrations and stat bands (all seen above). Manifest uses ruled rows, near-square corners, no shadows, and no illustrations at all: real document previews do that job.

### Colour

One accent: **Cargo-label yellow `#F5C400`, always as a fill with ink text.**

Reason, in three parts:
1. It comes from the trade itself: freight tags and handling labels.
2. No product in my captures uses it as its main colour; they mostly use blue, maroon, orange and teal.
3. Ink on this yellow has very high contrast (tested in `tests/proto.test.ts`), which helps on cheap screens in daylight.

Yellow text on white is forbidden, and it marks only the primary action and the current step.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F4F2EA` | Page, like form stock |
| `--sheet` | `#FFFFFF` | Documents and tables |
| `--ink` | `#15181A` | Text, heavy rules |
| `--ink-2` | `#4A4F52` | Secondary text |
| `--ink-3` | `#62676A` | Captions |
| `--rule` | `#D8D4C6` | Hairlines |
| `--accent` / `--accent-press` | `#F5C400` / `#DDB000` | Primary action, current step |
| `--pass` / `--pass-soft` | `#1B6B45` / `#E4F1E8` | Passed |
| `--fail` / `--fail-soft` | `#B3261E` / `#FBE6E3` | Failed, duplicate |
| `--warn` / `--warn-soft` | `#A34E00` / `#FAEBDA` | Needs attention, hidden fee |
| `--unknown` / `--unknown-soft` | `#46586F` / `#E7EBF0` | Unknown, a valid result |
| `--pending` / `--pending-soft` | `#5E5A4E` / `#EDEAE0` | Waiting |

Status is never colour alone: always a glyph and a word.

### Type

**Archivo + IBM Plex Mono**, with **Mukta** (Hindi) and **Mukta Malar** (Tamil).
- Archivo: UI and headings. Its digits support `tnum` (checked in the font file), so money columns align. Note that Libre Franklin and Plex Sans as packaged lost `tnum`, which ruled them out.
- Plex Mono: reference numbers, hashes, and field labels.
- ₹ is in each font's latin-ext file, so both files are bundled.
- Mukta and Mukta Malar download only when those scripts are shown (about 106 KB and 33 KB per weight).

| Style | Size / line | Weight |
|---|---|---|
| Display | 28/32 | 700 |
| H1 | 22/28 | 600 |
| H2 | 17/24 | 600 |
| Body | 15/22 | 400 |
| Table | 14/20 | 400 |
| Label (mono, uppercase in Latin only) | 12/16 | 500 |
| Money large (tabular) | 20/24 | 600 |

Hindi and Tamil get 1.2× line height and no uppercase. Money uses `₹22,31,250` in tables and `₹22.31 lakh` or `₹1.2 crore` in prose, and export values show both currencies and the rate.

### Spacing, shape, icons, motion

- **Spacing:** 4px base: 4, 8, 12, 16, 24, 32, 48. Phone gutter 16. Tap targets at least 44px.
- **Shape:** 2px radius on controls, none on tables. No shadows; separate things with rules. The only exception is a solid 2px ink border on the critical alert.
- **Icons:** lucide line icons at 18px, stroke 2. Only for status and direction, never decoration, and always beside a word. No illustrations, 3D or emoji.
- **Motion:** 120–180ms, ease-out, and only when state changes (row result arriving, drawer opening). No parallax, count-ups or carousels. Numbers are always rendered as text immediately. `prefers-reduced-motion` removes all of it.
- **Low bandwidth and Android:** no images on working screens, skeleton rows rather than spinners, system font fallback, retry on every failure, and nothing lost when a request fails. Phone layouts stack rather than scroll sideways, with the main action in a bottom bar.

### 10 UI strings

| Situation | Do | Don't |
|---|---|---|
| Check failed | Invoice quantity 4,800 does not match Bill of Lading quantity 4,200. | Discrepancy detected in documentation. |
| Unknown result | Unknown. Carrier tracking isn't available yet. We asked your forwarder. | Pending verification… |
| Ranking | Sorted by what each offer costs you. Fees Cashew earns don't change the order. | Our best recommended offer for you! |
| Hidden fee | FX spread of ₹16,065 is stated only in the conditions. We added it to the cost. | Additional charges may apply. |
| Duplicate | This invoice has already been financed through Cashew. We can't share who financed it. | Fraud alert! Your account has been flagged. |
| Possible duplicate | This looks close to an invoice already financed. A reviewer will check it. You can explain the difference. | Duplicate fraud suspected. |
| Network failure | Couldn't load this. Your documents are safe. Try again. | Oops! Something went wrong. |
| Empty | No offers yet. Lenders see your trade after you share it. | Unlock the power of offers! |
| Evidence strength | Evidence strength: Moderate. 3 checks are still open. | Your Cashew Score is 82! |
| Primary action | Share with 3 lenders | Get started seamlessly |

Hindi and Tamil strings in the prototype are my own drafts. **They need review by a native speaker in the trade before anyone relies on them.**
