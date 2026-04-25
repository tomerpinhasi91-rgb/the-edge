export const DEMO_EMAIL = 'demo@theedge.app'
export const isDemoUser = (user) => user?.email === DEMO_EMAIL
export const getDemoKey = (name) => (name || '').toLowerCase().trim()
export const delay = (ms) => new Promise(r => setTimeout(r, ms))

export const DEMO_RESEARCH = {
  'apex protein co': {
    score: 87,
    name: 'Apex Protein Co',
    industry: 'Food Manufacturing – Protein & Sports Nutrition',
    location: 'Norwood, Adelaide SA',
    size: '45–80 employees',
    website: 'https://apexprotein.com.au',
    description: 'One of South Australia fastest growing sports nutrition manufacturers, producing protein bars, powders and RTD products for Chemist Warehouse and Coles nationally. Founded 2016 by former Olympic swimmer Dean Hartley.',
    signals: [
      { priority: 'urgent', title: 'New $4.2M facility opening March 2026', body: 'Apex confirmed a $4.2M production expansion in Norwood creating 22 jobs. New facility triples cold storage and adds a dedicated RTD line.', action: 'Call Dean Hartley this week — new facility means new supplier contracts opening now.', source_url: '' },
      { priority: 'watch', title: 'Chemist Warehouse national listing confirmed — 520 stores', body: 'Apex Protein confirmed for national Chemist Warehouse rollout April 2026. Significant volume increase means new logistics requirements.', action: 'Position solution around scaling to meet national retail volumes.', source_url: '' },
      { priority: 'intel', title: 'CEO Dean Hartley — EY Entrepreneur of the Year 2025 SA Finalist', body: 'Dean Hartley recognised as SA finalist for EY Entrepreneur of the Year 2025.', action: 'Reference the award in outreach — shows you follow their progress.', source_url: '' }
    ],
    contacts: [
      { name: 'Dean Hartley', title: 'CEO & Founder', linkedin: 'https://linkedin.com/in/dean-hartley-apex', why_relevant: 'Economic buyer and founder. Responds to precision and performance narratives.' },
      { name: 'Michelle Okafor', title: 'Head of Operations', linkedin: '', why_relevant: 'Key decision maker on production equipment and logistics.' },
      { name: 'James Tran', title: 'Procurement Manager', linkedin: '', why_relevant: 'Manages all supplier contracts. Direct contact for commercial discussions.' }
    ],
    talking_points: [
      'Your $4.2M Norwood expansion and the Chemist Warehouse national rollout happening simultaneously is a rare inflection point — how are you thinking about scaling supplier relationships to match the new volumes?',
      'Dean, your background as an Olympic athlete must inform how you think about operational precision — are there areas in your supply chain where the standards still feel like they are catching up to your product quality?',
      'With 22 new roles coming online in March and a national retail rollout in April, what does your current operational readiness look like for the RTD line specifically?'
    ]
  },
  'bluecrest logistics': {
    score: 82,
    name: 'BlueCrest Logistics',
    industry: 'Cold Chain Logistics & Warehousing',
    location: 'Bibra Lake, Perth WA',
    size: '85 employees',
    website: 'https://bluecrestlogistics.com.au',
    description: 'BlueCrest operates 3 temperature-controlled warehouses across Perth servicing seafood, dairy and pharmaceutical sectors. $28M revenue, growing 18% YoY.',
    signals: [
      { priority: 'urgent', title: 'CFO meeting Thursday — ROI case needed', body: 'CFO Marcus Webb confirmed for Thursday proposal review. Known to be sceptical of tech spend without hard payback data.', action: 'Send ROI calculator to Ryan TODAY for preview before Thursday.', source_url: '' },
      { priority: 'grant', title: 'WA Digital Adaptation grant Round 3 open — up to $15K', body: 'WA government Round 3 open for Small Business Digital Adaptation grant covering up to $15,000 for eligible implementations.', action: 'Include grant info in proposal — reduces net investment by $15K.', source_url: 'https://smallbusiness.wa.gov.au' }
    ],
    contacts: [
      { name: 'Ryan Callister', title: 'Operations Manager', linkedin: 'https://linkedin.com/in/ryan-callister-perth', why_relevant: 'Champion. Frustrated with manual processes. Needs help selling to CFO.' },
      { name: 'Marcus Webb', title: 'CFO', linkedin: '', why_relevant: 'Economic buyer. Requires ROI under 18 months. Thursday is first meeting.' }
    ],
    talking_points: [
      'Marcus, Ryan quantified your team spends roughly 16 hours per week on manual temperature logging — at current labour rates that is roughly $47,000 per year just in admin cost. Our system automates 90% of that.',
      'With the WA Digital Adaptation grant Round 3 open, BlueCrest could offset up to $15,000 — bringing your net investment to roughly $170K with ROI under 14 months.',
      'Toll Group announced a competing WA cold chain product targeting mid-market operators — the window to move first may be shorter than expected.'
    ]
  },
  'summit packaging solutions': {
    score: 91,
    name: 'Summit Packaging Solutions',
    industry: 'Sustainable Packaging Manufacturing',
    location: 'Murarrie, Brisbane QLD',
    size: '210 employees',
    website: 'https://summitpackaging.com.au',
    description: 'Summit Packaging manufactures compostable food service packaging for major QSR and FMCG brands. $67M revenue. AIPIA Sustainable Innovation of the Year 2025 winner.',
    signals: [
      { priority: 'intel', title: 'AIPIA Sustainable Innovation Award 2025 winner', body: 'Summit won AIPIA Sustainable Innovation of the Year 2025 for compostable cold cup liner technology, boosting brand profile and inbound enquiries significantly.', action: 'Reference at signing — they are growing fast and need systems that scale.', source_url: '' },
      { priority: 'watch', title: 'WA and VIC expansion confirmed H2 2026', body: 'CEO Paul Drummond confirmed WA and VIC distribution centres opening H2 2026, adding 60+ employees nationally.', action: 'Plant Phase 2 upsell seed at Monday contract signing.', source_url: '' }
    ],
    contacts: [
      { name: 'Alicia Drummond', title: 'COO', linkedin: 'https://linkedin.com/in/alicia-drummond-summit', why_relevant: 'Champion and economic buyer. Daughter of CEO. Drives all decisions.' },
      { name: 'Paul Drummond', title: 'CEO & Founder', linkedin: '', why_relevant: 'Signed off verbally. Needs to countersign Monday.' },
      { name: 'Brett Finucane', title: 'General Counsel', linkedin: '', why_relevant: 'Blocker — legal review is the last gate. Known to be slow on IP clauses.' }
    ],
    talking_points: [
      'Alicia, given WA and VIC expansion confirmed for H2, it is worth discussing at Monday signing how we extend the platform to those facilities at marginal cost — a Phase 2 conversation worth having now.',
      'The AIPIA award is driving strong inbound — does your current inventory system have visibility to handle a major volume spike if a new QSR chain comes on board this quarter?',
      'For Brett — our standard enterprise IP clause has been accepted by 40+ ASX-listed companies. Happy to send him the legal summary directly to speed his review.'
    ]
  },
  'harvest ridge foods': {
    score: 78,
    name: 'Harvest Ridge Foods',
    industry: 'Food Processing & Distribution – Fresh Produce',
    location: 'Dandenong South, Melbourne VIC',
    size: '120–180 employees',
    website: 'https://harvestridge.com.au',
    description: 'Harvest Ridge processes and distributes fresh-cut vegetables and ready-meal components to QSR chains, airlines and supermarket private label brands. Key customers include Qantas Catering and Woolworths.',
    signals: [
      { priority: 'urgent', title: 'Qantas Catering contract renewal Q2 2026 — competitor pitching', body: 'The $3.8M annual Qantas Catering supply contract comes up for renewal in Q2 2026. Pacific Fresh reportedly pitching aggressively.', action: 'Position your solution around contract renewal differentiation.', source_url: '' },
      { priority: 'watch', title: 'FSANZ digital temperature logging required by July 2026', body: 'FSANZ updated cold chain compliance requirements effective July 2026, requiring digital temperature logging across all fresh produce supply chains.', action: 'Lead with compliance angle — July deadline creates immediate urgency.', source_url: 'https://foodstandards.gov.au' }
    ],
    contacts: [
      { name: 'Sandra Voronova', title: 'Managing Director', linkedin: 'https://linkedin.com/in/sandra-voronova', why_relevant: 'Economic buyer. Incredibly direct, responds to hard ROI numbers only.' },
      { name: 'Patrick Nguyen', title: 'Supply Chain Director', linkedin: '', why_relevant: 'Driving the FSANZ compliance project. Keen to find a solution fast.' }
    ],
    talking_points: [
      'Sandra, with the Qantas contract renewal coming in Q2 and Pacific Fresh pitching, what is your strategy to differentiate on service reliability beyond just price?',
      'The new FSANZ digital temperature logging requirement by July 2026 is catching a lot of processors off-guard — where are you currently at with your compliance roadmap?',
      'Your spread across QSR, airline catering and supermarket private label is unusual — how do you manage the operational complexity of three very different service level requirements simultaneously?'
    ]
  }
}

export const DEMO_SWEEPS = {
  'apex protein co': [
    { priority: 'urgent', title: 'RTD production line equipment RFQ opening April 2026', body: 'Apex Protein is issuing an RFQ for RTD production line equipment as part of the $4.2M Norwood facility expansion. Multiple vendors being evaluated.', action: 'Get on the RFQ list — call James Tran in Procurement this week before shortlist closes.', source: 'Industry Intel', source_url: '' },
    { priority: 'watch', title: 'Chemist Warehouse demanding sustainability reporting from suppliers', body: 'Chemist Warehouse issued new supplier sustainability requirements for all food and nutrition brands from July 2026.', action: 'Position your sustainability reporting tools as part of the Chemist Warehouse compliance solution.', source: 'Retail World AU', source_url: '' },
    { priority: 'grant', title: 'SA Food Innovation grants — Round 4 opens May 2026', body: 'SA Government Food Innovation grants Round 4 opens May 2026 with up to $250,000 available for food manufacturers investing in technology.', action: 'Share grant information with Dean Hartley — positions you as a strategic partner.', source: 'SA Government', source_url: 'https://sa.gov.au' }
  ],
  'bluecrest logistics': [
    { priority: 'urgent', title: 'Toll Group WA cold chain product launching Q3 2026', body: 'Toll Group confirmed their competing WA cold chain management product will launch Q3 2026, targeting mid-market operators in the $20-50M revenue range.', action: 'Accelerate BlueCrest close before Toll launches — create urgency around being first mover.', source: 'Logistics & Materials Handling', source_url: '' },
    { priority: 'grant', title: 'WA Digital Adaptation grant closes 30 May 2026', body: 'Round 3 of the WA Small Business Digital Adaptation grant closes 30 May 2026. Applications take 6-8 weeks to process.', action: 'Help Ryan submit the grant application this week — deadline creates urgency for Thursday.', source: 'WA Small Business', source_url: 'https://smallbusiness.wa.gov.au' }
  ],
  'summit packaging solutions': [
    { priority: 'intel', title: 'Restaurant chain in active vendor evaluation for packaging partner', body: 'A major QSR confirmed they are in vendor evaluation for a new sustainable packaging partner from Q3 2026, looking for compostable solutions.', action: 'Alert Alicia — this is a high-value prospect the AIPIA award positions them to win.', source: 'QSR Media AU', source_url: '' },
    { priority: 'watch', title: 'WA site confirmed — Fremantle industrial estate, 3,200sqm', body: 'Summit Packaging confirmed their WA expansion site in Fremantle, targeting operational by October 2026. Procurement for fit-out beginning now.', action: 'Use WA site confirmation to progress Phase 2 upsell at Monday signing.', source: 'PKN Packaging News', source_url: '' }
  ],
  'harvest ridge foods': [
    { priority: 'urgent', title: 'FSANZ compliance audit notices issued to VIC processors', body: 'FSANZ issued compliance audit notices to 23 Victorian food processors failing to meet updated temperature logging requirements, with penalties up to $50,000 per incident.', action: 'Send Sandra the FSANZ audit notice summary — creates immediate urgency.', source: 'FSANZ', source_url: 'https://foodstandards.gov.au' },
    { priority: 'watch', title: 'Qantas Catering RFP for fresh produce suppliers closing June 2026', body: 'Qantas Catering issued a fresh produce supplier RFP closing June 2026, requiring digital traceability, temperature logging compliance and ESG reporting.', action: 'Help Harvest Ridge build their RFP response — position your platform as the technology differentiator.', source: 'Industry Intel', source_url: '' }
  ]
}

export const DEMO_EMAILS = {
  'apex protein co': {
    emails: [
      { first_name: 'Dean', last_name: 'Hartley', value: 'dean@apexprotein.com.au', position: 'CEO & Founder', confidence: 94, linkedin_url: 'https://linkedin.com/in/dean-hartley-apex' },
      { first_name: 'Michelle', last_name: 'Okafor', value: 'michelle.o@apexprotein.com.au', position: 'Head of Operations', confidence: 88, linkedin_url: '' },
      { first_name: 'James', last_name: 'Tran', value: 'j.tran@apexprotein.com.au', position: 'Procurement Manager', confidence: 82, linkedin_url: '' }
    ],
    pattern: '{first}.{last}', org: 'Apex Protein Co'
  },
  'bluecrest logistics': {
    emails: [
      { first_name: 'Ryan', last_name: 'Callister', value: 'ryan.c@bluecrestlogistics.com.au', position: 'Operations Manager', confidence: 95, linkedin_url: 'https://linkedin.com/in/ryan-callister-perth' },
      { first_name: 'Marcus', last_name: 'Webb', value: 'marcus.webb@bluecrestlogistics.com.au', position: 'CFO', confidence: 88, linkedin_url: '' },
      { first_name: 'Theresa', last_name: 'Poletti', value: 't.poletti@bluecrestlogistics.com.au', position: 'Warehouse Manager', confidence: 79, linkedin_url: '' }
    ],
    pattern: '{first}.{last}', org: 'BlueCrest Logistics'
  },
  'summit packaging solutions': {
    emails: [
      { first_name: 'Alicia', last_name: 'Drummond', value: 'a.drummond@summitpackaging.com.au', position: 'COO', confidence: 99, linkedin_url: 'https://linkedin.com/in/alicia-drummond-summit' },
      { first_name: 'Paul', last_name: 'Drummond', value: 'paul@summitpackaging.com.au', position: 'CEO & Founder', confidence: 92, linkedin_url: '' },
      { first_name: 'Brett', last_name: 'Finucane', value: 'b.finucane@summitpackaging.com.au', position: 'General Counsel', confidence: 78, linkedin_url: '' }
    ],
    pattern: '{first}', org: 'Summit Packaging Solutions'
  },
  'harvest ridge foods': {
    emails: [
      { first_name: 'Sandra', last_name: 'Voronova', value: 'svoronova@harvestridge.com.au', position: 'Managing Director', confidence: 91, linkedin_url: 'https://linkedin.com/in/sandra-voronova' },
      { first_name: 'Patrick', last_name: 'Nguyen', value: 'p.nguyen@harvestridge.com.au', position: 'Supply Chain Director', confidence: 85, linkedin_url: '' }
    ],
    pattern: '{first_initial}{last}', org: 'Harvest Ridge Foods'
  }
}

export const DEMO_PROSPECTS = [
  { name: 'Mitolo Family Farms', description: 'Australia largest potato wholesaler and producer. 26 farms across NSW and SA. Majority stake acquired by Ontario Teachers Pension Plan 2023.', website: 'https://mitolofamilyfarms.com.au', type: 'Agriculture – Potato Production' },
  { name: 'Talia Farms', description: 'One of Australia largest table grape enterprises. 961 hectares across Riverland SA. Award-winning sustainable growing practices.', website: 'https://taliafarms.com.au', type: 'Agriculture – Table Grape Production' },
  { name: 'Perfection Fresh', description: 'Leading fresh produce company supplying premium varieties to major Australian retailers. Strong innovation pipeline.', website: 'https://perfectionfresh.com.au', type: 'Fresh Produce – Innovation & Retail' },
  { name: 'Thomas Foods International', description: 'Australia largest family-owned red meat processor. Established 1988, processing facilities in SA and VIC.', website: 'https://thomasfoods.com', type: 'Food Processing – Red Meat' },
  { name: 'Rewards Group', description: 'South Australian food manufacturer producing premium smallgoods, dips and chilled foods for major supermarket retailers nationally.', website: 'https://rewardsgroup.com.au', type: 'Food Manufacturing – Smallgoods' },
  { name: 'Maggie Beer Holdings', description: 'Iconic SA food brand producing premium products across farm shop, retail and export channels. Recent profit turnaround after 2023 restructure.', website: 'https://maggiebeer.com.au', type: 'Food Manufacturing – Premium Specialty' }
]

export const DEMO_COACH = {
  approach: {
    'apex protein co': `## APPROACH STRATEGY — APEX PROTEIN CO

**PRIMARY CONTACT: Dean Hartley (CEO & Founder)**

As founder and economic buyer, Dean controls all strategic supplier decisions. The $4.2M facility expansion is his project.

**OPENING MESSAGE**

Lead with the facility expansion:
"Dean, I saw the Norwood facility expansion and the Chemist Warehouse national listing coming in the same quarter. That is a significant operational challenge to execute simultaneously. I work with food manufacturers at exactly this inflection point."

**KEY POSITIONING**
- Connect your solution to the RTD line specifically — that is where the new capacity risk sits
- Reference the EY Entrepreneur award to show you have done your homework
- Position as helping him WIN, not just solve a problem

**NEXT STEP:** Call James Tran (Procurement) first to map the supplier evaluation process, then get an intro to Dean through Michelle Okafor (Operations).`,

    'bluecrest logistics': `## CFO MEETING PREP — MARCUS WEBB (THURSDAY)

**THE ROI ARGUMENT (use these exact numbers)**

Ryan confirmed: 16 hours/week on manual temperature logging
- At $35/hr average labour cost = $29,120/year in admin labour
- Plus compliance risk: FSANZ penalty up to $50,000 per incident
- Total annual risk-adjusted cost: ~$79,000

Your solution: $185,000 net (or $170,000 after WA grant)
ROI: 170,000 / 79,000 = **2.15 years** — present as "under 26 months"

**MARCUS WILL ASK:**
1. Implementation risk? — 3-month timeline, parallel run, Ryan stays in control
2. Why now? — WA grant closes May 30, Toll launches Q3

**YOUR CLOSE:** The question is not whether to invest — it is whether to invest now at $170K with the grant, or wait until Q3 when the competitive landscape has shifted.`,

    'summit packaging solutions': `## CONTRACT CLOSE STRATEGY — SUMMIT PACKAGING

**SITUATION:** Deal is won. Risk = legal delay by Brett Finucane.

**BRETT FINUCANE MANAGEMENT**
1. Email Brett directly (cc Alicia): "Happy to jump on a 20-minute call to walk through the IP clauses"
2. Send him the legal summary PDF before Monday
3. Give a soft deadline: "Alicia is hoping to countersign Monday"

**MONDAY SIGNING AGENDA**
1. Congratulate on AIPIA award (2 minutes)
2. Sign and countersign (10 minutes)
3. Phase 2 conversation: WA and VIC at marginal cost as existing client

**UPSELL FRAMING:** Phase 2 for WA and VIC would be approximately $180K. As an existing client you get priority scheduling and best rate.`,

    'harvest ridge foods': `## APPROACH STRATEGY — HARVEST RIDGE FOODS

**PRIMARY CONTACT: Patrick Nguyen (Supply Chain Director)**

Patrick is driving the FSANZ compliance project and is motivated to find a solution. He is your champion to Sandra.

**OPENING MESSAGE**

"Patrick, I have been tracking the FSANZ updated temperature logging requirements coming into effect July 2026 and noticed Harvest Ridge operates across QSR, airline and supermarket — three of the highest-scrutiny categories. Wanted to connect before the compliance window gets tight."

**PATH TO SANDRA**

Sandra Voronova responds exclusively to ROI data. Before your first call with her:
1. Get Patrick to quantify current manual logging hours per week
2. Build a simple cost calculation
3. Present Sandra with: "Your current compliance process costs $X per year. Here is how we reduce that by 80%."

**NEXT STEP:** Email Patrick today referencing the FSANZ audit notices issued to VIC processors.`
  },
  firstcall: {
    'apex protein co': `## FIRST CALL PREP — APEX PROTEIN CO

**OPENING (30 seconds)**
"Dean, thanks for taking the call. I saw the Norwood facility expansion and the Chemist Warehouse national listing happening in the same quarter. That is a significant challenge and I thought it was worth 15 minutes to see if there is a fit."

**KEY QUESTIONS**
1. Walk me through how the RTD line procurement is being managed — are you evaluating new suppliers as part of the expansion?
2. With 520 Chemist Warehouse stores from April, what does your logistics model look like at that volume?
3. What is your biggest operational concern about the next 6 months?
4. Who else besides yourself is involved in supplier decisions at this scale?

**CLOSE:** "Based on what you have described, I think there is a real fit. Can I come to the Norwood site next week to see the new facility?"`,

    'harvest ridge foods': `## FIRST CALL PREP — HARVEST RIDGE FOODS

**CALL WITH: Patrick Nguyen (Supply Chain Director)**

**OPENING**
"Patrick, I have been tracking the FSANZ cold chain compliance update and given Harvest Ridge exposure across QSR, airline and supermarket supply, I wanted to understand where you are at with the July 2026 requirements before the deadline gets tight."

**KEY QUESTIONS**
1. Where is the FSANZ compliance project currently sitting in your priorities?
2. How are you currently tracking temperature data across the supply chain?
3. What would happen to your Qantas Catering contract if you failed a compliance audit?
4. Is Sandra Voronova involved in the compliance investment decision?

**CLOSE:** "Would it be useful if I put together a compliance readiness assessment specific to Harvest Ridge? I can have something to you within 48 hours."`,

    'bluecrest logistics': `## PRE-MEETING BRIEF — BLUECREST LOGISTICS

**THURSDAY: Ryan Callister + CFO Marcus Webb**

**AGENDA (45 minutes)**
- 00:00 Introductions (5 min)
- 00:05 Problem validation — let Ryan present the compliance challenge (10 min)
- 00:15 Solution overview — focused on ROI, not features (15 min)
- 00:30 ROI and investment discussion with Marcus (10 min)
- 00:40 Next steps and timeline (5 min)

**LET RYAN OPEN** — he has credibility with Marcus. Brief Ryan beforehand: "Start with the manual process cost — 16 hours a week, $29K a year minimum."

**FOR MARCUS**
- Use "$170K net after grant" not "$185K"
- Say "26-month payback" not "under 2 years" — more specific is more credible
- Have the WA grant application ready to show`,

    'summit packaging solutions': `## SIGNING MEETING PREP — SUMMIT PACKAGING

**MONDAY: Alicia Drummond + Paul Drummond**

**YOUR MINDSET:** This meeting is about momentum, not selling. The deal is done.

**BEFORE THE MEETING**
- Confirm Brett has no outstanding legal questions (email him Sunday evening)
- Prepare two copies of the contract
- Prepare the onboarding timeline document to share after signing

**MEETING FLOW**
1. Thank them for the partnership — brief, genuine, move on
2. Walk through any final contract points
3. Sign
4. Immediately open Phase 2: WA and VIC at marginal cost as existing client

**AFTER SIGNING:** Set the onboarding kick-off date before you leave the room.`
  }
}
