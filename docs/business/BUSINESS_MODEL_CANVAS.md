# StashFlow — Business Model Canvas

> Framework: Osterwalder & Pigneur, *Business Model Generation* (2010)
> Methodology: Lean Startup — each block flags the **Leap-of-Faith Assumptions (LoFAs)** to be tested.
> Owner: Product & Marketing
> Last updated: 2026-05-14
> Status: **MVP hypothesis stage** — assumptions unvalidated until public beta data available

---

## Canvas Overview

```
┌─────────────────┬──────────────┬──────────────┬──────────────┬──────────────────────┐
│  KEY PARTNERS   │   KEY        │    VALUE     │  CUSTOMER    │  CUSTOMER            │
│                 │  ACTIVITIES  │ PROPOSITIONS │ RELATIONSHIPS│  SEGMENTS            │
│                 ├──────────────┤              ├──────────────┤                      │
│                 │   KEY        │              │              │                      │
│                 │  RESOURCES   │              │   CHANNELS   │                      │
├─────────────────┴──────────────┴──────────────┴──────────────┴──────────────────────┤
│                   COST STRUCTURE              │          REVENUE STREAMS             │
└───────────────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 1. Customer Segments

> *Who are we creating value for? Who are our most important customers?*

### Primary Segment — The Multi-Currency Professional

**Profile:** Adults earning, spending, or borrowing across 2+ currencies simultaneously.

| Sub-Segment | Description | Size Signal |
|-------------|-------------|-------------|
| **OFW (Overseas Filipino Workers)** | Filipinos remitting to PH while living in US/SG/AU/UK. Managing PH loans + foreign income. | ~1.96M registered OFWs in US alone (2023 PSA) |
| **Filipino-American / Filipino-Singaporean** | Second/third-gen holding dual financial ties. PH property loans + foreign salary. | ~4M Filipino diaspora in US |
| **US/SG Expats in PH** | Foreign nationals earning USD/SGD, paying PH-peso expenses + utility bills. | Estimated 250K US citizens resident in PH |
| **Digital Nomads** | Location-independent workers with income in one currency, expenses in multiple. | Global market ~35M (2023, MBO Partners) |
| **High-complexity debt holders** | Any individual managing 3+ loans across types (amortizing, add-on, interest-only) in multiple currencies. | Addressable within all above segments |

### Secondary Segment — The Financially Anxious Millennial (Single Currency)

Solo earners in PH/US/SG who feel overwhelmed by budgeting apps that don't understand local nuance (PH SSS/Pag-IBIG deductions, SG CPF, US 401k contribution logic). Willing to pay for calm, intelligent structure.

### Non-Customer (Explicit Exclusion)

- Businesses / SMBs — out of scope (no invoicing, payroll, tax filing)
- High-net-worth investors needing portfolio tracking — out of scope (no stock/bond module)
- Users needing bank feed aggregation today — not yet served (post-MVP backlog)

---

### LoFAs — Customer Segments

| # | Assumption | Test method | Signal |
|---|------------|-------------|--------|
| CS-1 | OFWs/diaspora experience enough pain with existing tools to switch | Qualitative interviews (n=15+); intercept survey on r/phinvest, r/buhayofw | >60% cite multi-currency tracking as top frustration |
| CS-2 | Digital nomads will adopt despite lack of bank feed | Activation funnel data post-beta | Upload + manual entry retention ≥ 30-day D30 |
| CS-3 | Secondary segment (single-currency, PH/SG/US locals) is large enough to sustain growth | Waitlist segmentation; self-reported currency count at signup | >30% of signups are single-currency |

---

## 2. Value Propositions

> *What value do we deliver? Which customer problems do we solve?*

### Core Promise

> **"A calm financial command center that makes multi-currency financial complexity feel manageable — powered by invisible intelligence."**

### Jobs-to-be-Done (Osterwalder's JTBD lens)

| Job | Pain today | StashFlow solution |
|-----|-----------|-------------------|
| **Track net worth across currencies** | Spreadsheet hell; manual FX conversion; stale rates | Live FX feed (Frankfurter); real-time base-currency conversion; Net Worth card |
| **Understand true cost of a loan** | Add-on vs amortizing confusion; lenders obscure EIR | AI inference engine detects loan structure; shows Effective Interest Rate (EIR) automatically |
| **Extract loan terms from documents** | Manually reading 40-page bank contracts | AI document parser (PDF.js → regex → Vision OCR → Groq/Gemini) auto-extracts fields |
| **Know if debt load is healthy** | No tool gives region-aware DTI context | DTI engine with PH (40%), US (36%), SG (55%) thresholds; colored health indicator |
| **Budget within regional financial rules** | Generic budget apps ignore SSS, Pag-IBIG, CPF, 401k | Regional strategy pattern bakes local rules into budget recommendations |
| **Spot anomalies without effort** | Requires manual review of every transaction | AI anomaly detection surfaces only notable deviations — calm UX, no noise |
| **Get macro financial perspective** | Requires subscribing to financial newsletters + manual interpretation | `macro-financial-advisor` edge function provides weekly AI macro insights in plain language |

### Gain Creators

- Invisible AI: insights surface without prompting — no chatbot interface
- Progressive disclosure: complexity hidden until user needs it
- Cryptographic ledger integrity: HMAC-SHA256 signed records — user data is tamper-evident
- Zero-trust RLS: every row isolated by user JWT — data never leaks across accounts

### Pain Relievers

- Document upload → automatic loan entry — eliminates manual data entry barrier
- Confidence scoring on AI extractions — user always knows when to verify
- Multi-currency amortization schedules — removes spreadsheet dependency for debt tracking

---

### LoFAs — Value Propositions

| # | Assumption | Test method | Signal |
|---|------------|-------------|--------|
| VP-1 | Document upload is the primary activation trigger (reduces setup friction enough to drive D7 retention) | Funnel analysis: compare D7 retention, upload vs. manual-only users | Upload cohort D7 retention ≥ 2× manual-only |
| VP-2 | "Invisible AI" resonates — users prefer surfaced insights over a chatbot | A/B: insight feed vs. chat interface (post-MVP) | Engagement rate (clicks/opens per session) |
| VP-3 | EIR display on add-on loans is a meaningful differentiator vs. competitor apps | Feature usage tracking; qualitative feedback | >40% of loan users interact with EIR card |
| VP-4 | Region-aware financial rules are noticed and valued (not ignored) | In-app feedback prompt after first DTI score display | NPS delta between regional users and generic users |

---

## 3. Channels

> *How do we reach our Customer Segments? Through which channels do they want to be reached?*

### Awareness

| Channel | Segment | Rationale |
|---------|---------|-----------|
| Reddit (r/phinvest, r/personalfinancephilippines, r/buhayofw, r/financialindependence) | OFW, PH primary | High-trust community; organic product discussions |
| Twitter/X (Filipino fintech discourse, OFW content creators) | Diaspora | Influencer seeding; #OFW #PersonalFinancePH hashtag clusters |
| Facebook Groups (OFW communities, PH expat groups in US/SG) | OFW diaspora | Largest OFW digital gathering point |
| LinkedIn (finance professionals, expat groups) | Digital nomad, expat | Professional credibility channel |
| SEO content ("add-on loan EIR calculator PH", "OFW budget tracker multi-currency") | All | Captures high-intent search |

### Acquisition

| Channel | Mechanism |
|---------|-----------|
| **Waitlist + referral loop** | Pre-beta invite-only; each signup gets a referral link; unlocks early access |
| **Product Hunt launch** | One-time spike; targets tech-adjacent early adopters |
| **App Store (post-MVP)** | Expo mobile app; ASO targeting "OFW budget", "multi-currency finance" |
| **Fintech influencer partnerships** | Micro-influencers (10K–100K) in PH/OFW finance niche; performance-based |

### Delivery

- **Web app** (`apps/web` — Next.js 16, App Router) — primary delivery channel today
- **Mobile app** (`apps/mobile` — Expo SDK 55) — post-MVP; critical for OFW segment (mobile-first behavior)
- **Email** (Supabase Auth transactional + Resend for product emails) — onboarding sequences, weekly digest

### Retention

- In-app intelligence feed — reason to return weekly
- Monthly financial health summary email
- Proactive anomaly alerts (push notifications, post-mobile-launch)

---

## 4. Customer Relationships

> *What type of relationship does each Customer Segment expect?*

### Relationship Model: **Automated Personal Service**

Self-serve product + AI intelligence that feels personal — no human support required for core value delivery.

| Relationship Type | Implementation |
|-------------------|---------------|
| **Self-serve onboarding** | Document upload → auto-populated loan card; no wizard required |
| **Automated personal service** | Intelligence feed generates personalized insights from user's actual data |
| **Community (future)** | r/StashFlow or Discord — OFW peer community for financial tips |
| **Co-creation (future)** | User feedback on AI extraction quality → training signal |

### Trust Architecture

Critical for financial data. Three layers:

1. **Transparency:** Every AI-generated insight shows provenance (which model, what data, what confidence)
2. **Control:** User can override any AI inference; manual edit always wins
3. **Security signaling:** RLS isolation, HMAC ledger, session anomaly detection — visible in Settings > Security

---

### LoFAs — Customer Relationships

| # | Assumption | Test method | Signal |
|---|------------|-------------|--------|
| CR-1 | Users trust an AI system with financial documents without a human in the loop | CSAT survey at 7 days post-upload; churn analysis | Upload completion rate ≥ 70%; churn spike < 5% post-upload |
| CR-2 | Self-serve onboarding is sufficient — no in-app chat or live support needed at MVP | Support ticket volume; drop-off at each onboarding step | Onboarding completion ≥ 60% without support contact |

---

## 5. Revenue Streams

> *For what value are our customers really willing to pay?*

### Model: Freemium → Subscription

| Tier | Price (USD/mo) | Limits | Target |
|------|----------------|--------|--------|
| **Free** | $0 | 1 currency; 3 loans; 50 transactions/mo; no AI document parsing | Acquisition funnel; single-currency locals |
| **Plus** | $7 | Unlimited currencies; 10 loans; 500 transactions/mo; 5 AI parses/mo | OFW core segment |
| **Pro** | $14 | Unlimited everything; priority AI parsing; API access (future); multi-device sync | Power users; digital nomads |
| **Family** | $20 | 3 seats on Pro; shared budget categories | OFW families tracking remittances together |

> **Pricing rationale:** OFW segment spends $10–20/mo on remittance fees without hesitation. $7 is below the threshold of deliberation for someone managing ₱2M+ in PH loans from abroad.

### Secondary Revenue (Post-MVP)

| Stream | Mechanism | Timeline |
|--------|-----------|----------|
| **Bank feed integration** | Revenue share or flat fee with aggregator (e.g., Plaid US, Salt Edge EU) | Post-MVP |
| **Affiliate / referral** | Loan refinancing referrals to partner lenders (PH: BDO, BPI; US: LendingClub) | Post-MVP |
| **Data insights (anonymized, aggregated)** | Macro trend reports sold to financial institutions — NEVER individual data | Long-term; requires legal entity + DPA compliance |

### Unit Economics Targets (Year 1)

| Metric | Target |
|--------|--------|
| Free → Plus conversion | ≥ 8% |
| Monthly churn (Plus) | ≤ 3% |
| LTV:CAC ratio | ≥ 3:1 |
| Average Revenue Per User (ARPU) | $9/mo blended |

---

### LoFAs — Revenue

| # | Assumption | Test method | Signal |
|---|------------|-------------|--------|
| R-1 | OFW segment will pay $7/mo for unlimited multi-currency tracking | Paywall experiment at Plus limit; measure conversion | ≥ 8% free→paid conversion within 30 days of hitting limit |
| R-2 | "5 AI parses/month" on free tier is generous enough not to block activation but tight enough to drive upgrades | Usage analytics on parse volume; churn on parse-blocked users | < 20% of free users hit the limit in month 1 |
| R-3 | Family plan at $20 unlocks shared-household OFW use case | Feature request tracking; waitlist survey | ≥ 15% of Plus subscribers express family interest |

---

## 6. Key Resources

> *What key resources does our value proposition require?*

### Intellectual

| Resource | Description |
|----------|-------------|
| **`@stashflow/core`** | Zero-dependency financial logic engine — amortization, DTI, inference, regional rules. Core moat. |
| **AI document parsing pipeline** | PDF.js → regex → Vision OCR → Groq → Gemini cascade; structured error handling; confidence scoring |
| **Loan inference engine** | `inferLoanStructure` — detects loan type from numbers alone; `computeAddOnEIR` Newton-Raphson solver |
| **Regional financial rules** | PH/US/SG DTI thresholds, budget rules, currency behaviors — encoded in `regional/strategies/` |

### Technological

| Resource | Role |
|----------|------|
| **Supabase** | Postgres + Auth + Storage + Edge Functions + RLS |
| **Vercel** | Web app hosting + CDN + preview deployments |
| **Groq API** | Fast LLM inference for document parsing (primary AI) |
| **Google Gemini / Vision** | Fallback AI parsing + OCR for low-confidence documents |
| **Frankfurter API** | Live FX rates — free, no API key |
| **Sentry / GlitchTip** | Error observability — production reliability |

### Human

| Resource | Role |
|----------|------|
| **Full-stack engineer(s)** | Core product development (TypeScript, Deno, SQL) |
| **Financial domain expert** | PH/US/SG regulatory accuracy; loan product knowledge |
| **Designer (contract/part-time)** | Pixel-perfect UI spec adherence; mobile UX |

### Financial

- Pre-revenue: bootstrapped or pre-seed angel capital
- Burn driven by: Supabase hosting, AI API costs, Vercel, developer time

---

## 7. Key Activities

> *What key activities does our value proposition require?*

| Activity | Description | Cadence |
|----------|-------------|---------|
| **Product development** | Feature delivery against roadmap (P3, P4, mobile launch) | Continuous |
| **AI pipeline maintenance** | Model version updates; fallback chain tuning; confidence threshold calibration | Per AI provider release |
| **Financial rule updates** | Sync PH/US/SG regulatory changes (DTI limits, tax rules, compliance requirements) | Quarterly or triggered by regulation change |
| **Security & compliance** | RLS policy audits, pgTAP tests, GDPR/PDPA data requests, CODEOWNERS review | Monthly + event-driven |
| **User research** | Qualitative interviews, LoFA validation experiments, NPS collection | Bi-weekly at MVP stage |
| **Content / community** | SEO articles, Reddit presence, OFW community engagement | Weekly |
| **Customer support** | Bug triage, onboarding help (self-serve tooling → Intercom post-scale) | Daily at launch |

---

## 8. Key Partnerships

> *Who are our key partners and suppliers? What resources do we acquire from partners?*

| Partner | Type | What they provide | Dependency risk |
|---------|------|-------------------|-----------------|
| **Supabase** | Infrastructure | Auth, DB, Storage, Edge runtime, RLS | High — single DB vendor; mitigate with standard Postgres compatibility |
| **Groq** | AI inference | Fast LLM for document parsing | Medium — fallback chain to Gemini exists |
| **Google Cloud (Vision + Gemini)** | AI fallback | OCR + LLM for low-confidence parses | Medium — requires billing enablement before production |
| **Frankfurter** | FX data | Live exchange rates (free, open-source) | Low — free; fallback: Open Exchange Rates |
| **Vercel** | Hosting | Web app CDN + serverless | Medium — Next.js vendor alignment; mitigate with Docker-buildable app |
| **Expo / React Native** | Mobile runtime | Cross-platform mobile app | Low — post-MVP; standard ecosystem |
| **Future: Bank aggregator** | Data access | Bank feed connectivity (Plaid, Salt Edge, Brankas PH) | Strategic — required for killer feature; regulatory compliance needed first |
| **Future: Lender partners** | Revenue | Loan refinancing referral revenue | Post-MVP; requires legal entity |

---

## 9. Cost Structure

> *What are the most important costs inherent in our business model?*

### Model: **Value-driven with cost awareness**

Optimize for product quality and trust (financial data context demands it); control AI API costs aggressively via caching and cascade design.

### Fixed Costs

| Item | Estimated monthly (MVP) |
|------|------------------------|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| GlitchTip (Sentry OSS) | $0–$9 |
| Domain + email (Resend) | ~$10 |
| **Fixed total** | **~$55–65/mo** |

### Variable Costs (per active user)

| Item | Driver | Cost estimate |
|------|--------|---------------|
| Groq API | Per document parse (~1K tokens) | ~$0.001/parse |
| Google Vision OCR | Per page (gated, confidence < 0.70) | ~$0.0015/page |
| Google Gemini | Per fallback parse (~4K tokens) | ~$0.004/parse |
| Supabase storage | Per uploaded document | ~$0.021/GB |
| Frankfurter | Free | $0 |

**AI cost per user per month (modeled at 5 parses/mo free tier):**
Best case (all PDF.js): ~$0.00 | Worst case (all Gemini): ~$0.02

**Cost moat:** The cascade pipeline means 80%+ of parses resolve free (PDF.js + regex). AI costs only trigger on genuinely ambiguous documents. Cache layer (`ai_insights_cache` — 24h TTL, keyed by `region+currency+data_version_hash`) prevents redundant AI calls for intelligence feed.

### Cost Priorities

1. Developer time (largest cost at pre-revenue stage)
2. AI API costs (variable; well-controlled by pipeline design)
3. Infrastructure (fixed; low at MVP scale)

---

## Lean Startup — Master Assumption Register

Consolidated LoFAs across all blocks, ranked by risk:

| Rank | ID | Block | Assumption | Test | Kill signal |
|------|----|-------|------------|------|-------------|
| 1 | CS-1 | Segments | OFW/diaspora experience enough pain to switch | 15 qualitative interviews | < 50% cite multi-currency as top-3 pain |
| 2 | VP-1 | Value Prop | Document upload drives D7 retention | Funnel cohort analysis | Upload cohort D7 < 1.5× manual cohort |
| 3 | R-1 | Revenue | $7/mo paywall converts at ≥ 8% | Paywall experiment | < 5% conversion in 60-day window |
| 4 | CR-1 | Relationships | Users trust AI with financial documents | CSAT at day 7 post-upload | Upload completion < 60% OR churn spike > 5% |
| 5 | VP-2 | Value Prop | Invisible AI preferred over chatbot | Engagement rate comparison | Insight feed CTR < 10% per session |
| 6 | CS-2 | Segments | Digital nomads adopt without bank feed | D30 retention analysis | D30 < 20% for nomad-identified users |
| 7 | R-2 | Revenue | 5 parses/mo free is the right paywall threshold | Parse usage analytics | > 30% of free users hit limit in month 1 |
| 8 | VP-3 | Value Prop | EIR display is a valued differentiator | Feature interaction tracking | < 25% of loan users interact with EIR |

---

## Unfair Advantages

> *What do we have that cannot be easily copied or bought?*

1. **`@stashflow/core` — region-specific financial logic depth.** PH add-on loan EIR calculation, SG CPF-aware budgeting, US DTI convention — this is not a prompt, it is encoded math. Competitors need months of domain expertise to replicate.
2. **OFW community trust.** Early community relationships in Filipino diaspora spaces are relationship capital — not replicable with money alone.
3. **Cascade AI pipeline with confidence scoring.** Competitors who build document parsing will face the same cost trap; the cascade design + free-first philosophy is a structural cost advantage.
4. **Calm UX philosophy.** Most fintech apps are anxiety-inducing dashboards. "Invisible intelligence + progressive disclosure" is a product design moat that takes years of iteration to achieve.

---

## Next Actions (Validation Sprint)

| Action | Owner | Timeline |
|--------|-------|----------|
| Conduct 15 OFW/diaspora qualitative interviews — validate CS-1 | Product | 2 weeks |
| Launch waitlist page with segment survey (currency count, loan complexity) | Marketing | 1 week |
| Instrument upload funnel + D7 retention cohort split | Engineering | 1 week |
| Define free tier limits and implement paywall gating | Engineering | 2 weeks |
| Draft pricing page copy and test with 5 target users | Product | 2 weeks |

---

*This document is a living artifact. Update assumptions as evidence is collected. Validated assumptions should be marked ✅ and moved to a "Validated" subsection. Invalidated assumptions should trigger a pivot decision logged in `docs/reference/DECISIONS.md`.*
