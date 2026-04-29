export const DEMO_EMAIL = 'demo@theedge.app'
export const isDemoUser = (user) => user?.email === DEMO_EMAIL
export const getDemoKey = (name) => (name || '').toLowerCase().trim()
export const delay = (ms) => new Promise(r => setTimeout(r, ms))

export const DEMO_RESEARCH = {
  'rivalea foods': {
    score: 89,
    name: 'Rivalea Foods',
    industry: 'Meat Processing – Pork & Value-Added Proteins',
    location: 'Corowa, NSW',
    size: '1,800+ employees',
    website: 'https://rivalea.com.au',
    description: 'Australia\'s largest integrated pork producer and processor, acquired by JBS Australia in 2022. Produces fresh pork, smallgoods and value-added products for Woolworths, Coles and ALDI nationally. Annual revenue ~$680M. JBS investment cycle is driving automation upgrades across all facilities.',
    signals: [
      { priority: 'urgent', title: 'JBS capital program — $12M automation budget approved for Corowa FY26', body: 'JBS Australia approved a $12M capital investment program for Rivalea\'s Corowa facility focused on reducing manual handling and increasing throughput on fresh pork tray-sealing lines. Engineering team has been tasked with RFQ preparation beginning Q2 2026.', action: 'Contact Peter Nguyen (Engineering Manager) this week — the RFQ shortlist is being built now, before it closes to new vendors.', source_url: '' },
      { priority: 'watch', title: 'ALDI private label contract — tray-packed pork volume increasing 35% from July', body: 'Rivalea confirmed a new ALDI private label fresh pork contract adding approximately 35% volume to their retail tray lines from July 2026. Current tray seal throughput will not support the uplift without additional capacity.', action: 'Lead with throughput per hour — they need more lines, not just faster lines. Quantify the gap before the call.', source_url: '' },
      { priority: 'intel', title: 'SQF audit flagged manual seal integrity as Category 2 finding', body: 'Rivalea\'s most recent SQF food safety audit flagged manual tray seal integrity variation as a Category 2 finding. A follow-up third-party audit is scheduled for Q3 2026.', action: 'Position automated tray sealing as food safety risk mitigation, not just efficiency — the audit finding gives your business case an urgency and compliance angle that resonates with the board.', source_url: '' }
    ],
    contacts: [
      { name: 'Peter Nguyen', title: 'Engineering & Projects Manager', linkedin: 'https://linkedin.com/in/peter-nguyen-rivalea', why_relevant: 'Technical champion and project sponsor for the JBS automation investment. Controls the vendor shortlist and RFQ process.' },
      { name: 'Diane Kowalski', title: 'Operations Director', linkedin: '', why_relevant: 'Economic buyer. Signs all capex above $200K. Responds to throughput data and labour cost reduction arguments.' },
      { name: 'Craig Mallory', title: 'Procurement Manager', linkedin: '', why_relevant: 'Manages vendor evaluation and commercial terms. Requires minimum 3 vendors in RFQ — confirm your inclusion.' }
    ],
    talking_points: [
      'Peter, with the JBS capex approved and the ALDI volume starting in July, you\'re running two clocks at once — what\'s the commissioning timeline pressure on getting new tray seal capacity online before the volume hits?',
      'The SQF seal integrity finding is exactly the problem automated tray sealing eliminates — every seal verified, every cycle logged, zero variation. How is that audit finding shaping the internal business case for the capex?',
      'We\'ve commissioned tray seal lines for Baiada and Hilton Food at similar throughput requirements — happy to arrange a reference call with their engineering managers if that would help your evaluation.'
    ]
  },
  'beak & johnston': {
    score: 93,
    name: 'Beak & Johnston',
    industry: 'Ready Meals & Value-Added Proteins',
    location: 'Emu Plains, NSW',
    size: '320 employees',
    website: 'https://beakandjohnston.com.au',
    description: 'Leading Australian manufacturer of fresh ready meals, marinated proteins and sous vide products. Supplies Woolworths, Coles, Costco and major food service operators. PE-backed, growing 28% YoY. Their product profile and customer base closely mirrors Select Equip\'s existing customers — My Muscle Chef, LiteNEasy and YouFoodz.',
    signals: [
      { priority: 'urgent', title: 'Woolworths Macro organic range — MAP tray seal line required by October 2026', body: 'B&J confirmed as preferred supplier for the Woolworths Macro organic ready meal range launching October 2026. New SKUs require modified atmosphere packaging (MAP) tray sealing. Current equipment cannot run modified atmosphere — a new line must be commissioned within 5 months.', action: 'Live requirement, hard deadline. Call Shane Donoghue (Head of Operations) this week — this is exactly what we installed for My Muscle Chef.', source_url: '' },
      { priority: 'watch', title: 'PE investor EBITDA target — $1.2M improvement program, labour cost in focus', body: 'Private equity backer set a $1.2M EBITDA improvement target for FY27. Operations is evaluating automation across all packing lines. Labour on tray sealing and portioning is the largest variable cost opportunity.', action: 'Build the ROI case around FTE reduction — they need hard numbers to take to the PE board. A fully automated line at 3 shifts saves 4-6 FTEs.', source_url: '' },
      { priority: 'grant', title: 'NSW Food & Agribusiness Automation Grant — up to $500K, closes September 2026', body: 'NSW Food and Agribusiness Network automation grant Round 2 is open. Up to $500K for eligible manufacturers investing in processing automation. B&J would qualify based on revenue and product category.', action: 'Include the grant in the proposal — $500K offset dramatically improves the business case and can accelerate their internal approval timeline.', source_url: 'https://foodagribusiness.org.au' }
    ],
    contacts: [
      { name: 'Shane Donoghue', title: 'Head of Operations', linkedin: 'https://linkedin.com/in/shane-donoghue-bj', why_relevant: 'Champion and technical decision maker. Driving the Woolworths Macro project. The October deadline is real and he knows it.' },
      { name: 'Rachel Beak', title: 'CEO', linkedin: '', why_relevant: 'Economic buyer. Third-generation family owner operating under PE pressure. Relationship-driven but needs hard ROI data for the board.' },
      { name: 'Tim Garlick', title: 'CFO', linkedin: '', why_relevant: 'Controls capex sign-off. Needs the ROI model to satisfy PE board reporting requirements. Focus on payback period, not total cost.' }
    ],
    talking_points: [
      'Shane, a MAP tray seal line commissioned in 5 months for a Woolworths launch — that\'s a tight window. We did exactly this for My Muscle Chef and LiteNEasy at comparable scale. Who else on your shortlist has that reference?',
      'The PE board EBITDA target is actually a tailwind for this conversation — a fully automated MAP line running 3 shifts eliminates 4-6 FTEs. At current labour rates in Emu Plains, that\'s $380-520K annually. Payback under 3 years without the grant, under 2 with it.',
      'With the NSW automation grant closing September and the October launch date, the decision timeline lines up perfectly — you apply now, equipment order August, commissioned before launch.'
    ]
  },
  'patties foods group': {
    score: 81,
    name: 'Patties Foods Group',
    industry: 'Frozen & Chilled Food Manufacturing',
    location: 'Bairnsdale, VIC',
    size: '450 employees',
    website: 'https://pattiesfoods.com.au',
    description: 'Iconic Australian food manufacturer producing Four\'N Twenty pies, Nanna\'s pastries and Farmers Union products. Supplies supermarkets, convenience and food service nationally. Turnover ~$250M. Primary HFFS line approaching end of OEM support — board has approved $3.5M capex for replacement.',
    signals: [
      { priority: 'urgent', title: 'Primary HFFS line — OEM parts support ends December 2026', body: 'Patties\' main HFFS production line (2011 vintage) reaches end of OEM parts and service support in December 2026. The production manager has formally flagged the replacement risk to the board. A failure on this line during peak season (Easter, football finals) would be catastrophic.', action: 'This is a compliance-driven hard deadline with board-level visibility. They are already evaluating options — get in front of the Engineering Manager now before the shortlist closes.', source_url: '' },
      { priority: 'watch', title: 'New premium pie range — individual flow wrap required for Coles pilot April 2026', body: 'Patties confirmed a premium Four\'N Twenty range pilot with Coles from April 2026, requiring individual flow wrap packaging. Current equipment runs bulk trays only — the pilot is running on manual packaging, which is not scalable.', action: 'Lead with flow wrap capability alongside HFFS replacement — this is a new capability requirement, not just replacement budget, which broadens the commercial conversation.', source_url: '' },
      { priority: 'intel', title: 'Board approved $3.5M capex for production line upgrade FY26', body: 'Board approved $3.5M capital allocation for production line upgrades in FY26. Engineering team is currently scoping requirements and evaluating vendors.', action: 'Budget is confirmed and allocated — this is a live buying cycle with a real deadline. Prioritise getting on the vendor shortlist immediately.', source_url: '' }
    ],
    contacts: [
      { name: 'Mark Saliba', title: 'Production Manager', linkedin: '', why_relevant: 'Technical champion. Flagged the OEM support risk to the board. Wants a solution he can trust to run 3 shifts at peak season.' },
      { name: 'Julie Anstee', title: 'General Manager Operations', linkedin: 'https://linkedin.com/in/julie-anstee-patties', why_relevant: 'Economic buyer. Controls the $3.5M capex. Practical, experienced, expects suppliers to demonstrate deep food manufacturing knowledge.' },
      { name: 'Scott Morant', title: 'Engineering Manager', linkedin: '', why_relevant: 'Technical evaluator. Will assess machine specs, FAT process, integration with existing lines and spare parts availability.' }
    ],
    talking_points: [
      'Mark, an HFFS line with no OEM support and no replacement plan is a production continuity risk sitting right in front of peak season — if it goes down at Easter with no parts available, what\'s the plan? That question tends to sharpen the internal timeline significantly.',
      'The Coles premium flow wrap pilot and the HFFS replacement are actually the same conversation — the right new line handles both requirements within the $3.5M capex. What\'s the risk if the Coles pilot succeeds but you\'re not able to scale it?',
      'Scott, for the FAT process — we have a test facility in Melbourne where you can run your own products on the line before commissioning. That\'s how we reduce your risk on the integration. Would a site visit be useful this month?'
    ]
  },
  'hazeldenes chicken farm': {
    score: 77,
    name: 'Hazeldene\'s Chicken Farm',
    industry: 'Poultry Processing & Distribution',
    location: 'Bendigo, VIC',
    size: '600 employees',
    website: 'https://hazeldenes.com.au',
    description: 'Family-owned Victorian poultry processor supplying fresh chicken to Woolworths, IGA and food service. Third-generation business. Vertically integrated from farm to retail. Strong Victorian provenance story and animal welfare focus. New CEO took over in 2025 — first major capital review underway.',
    signals: [
      { priority: 'watch', title: 'Export licence approved — Singapore and Hong Kong entry Q3 2026 requires MAP capability', body: 'Hazeldene\'s received DAFF export licence approval for chilled poultry to Singapore and Hong Kong from Q3 2026. Export packaging requires MAP tray sealing for 21-day shelf life — significantly longer than their current domestic fresh-pack specification.', action: 'This is new budget, not replacement budget. Export MAP requirements are a separate project from their domestic lines — frame it that way.', source_url: '' },
      { priority: 'watch', title: 'Woolworths private label uplift 20% from June — current throughput under pressure', body: 'Hazeldene\'s Woolworths private label fresh chicken volume increased 20% from June 2026 following a competitor supply disruption. Existing tray seal lines are running at capacity and throughput is being managed by adding weekend shifts.', action: 'Weekend shift overtime is expensive and unsustainable — quantify the labour cost of the current workaround before the first call. That\'s the business case.', source_url: '' },
      { priority: 'intel', title: 'New CEO David Hazeldene — first capital review underway, fresh supplier relationships open', body: 'David Hazeldene took over as CEO in late 2025. New leadership typically reviews key supplier relationships and capital investment priorities in the first year — this is the ideal window to establish a relationship before the next budget cycle locks in.', action: 'Request a meeting framed around the export opportunity — it\'s growth-focused and gives you a reason to be there that isn\'t just "selling equipment."', source_url: '' }
    ],
    contacts: [
      { name: 'David Hazeldene', title: 'CEO', linkedin: 'https://linkedin.com/in/david-hazeldene', why_relevant: 'Economic buyer and new CEO in first year. Open to evaluating new suppliers and investment priorities, especially export growth opportunities.' },
      { name: 'Karen Stretch', title: 'Operations Manager', linkedin: '', why_relevant: 'Technical decision maker. Has managed the Woolworths relationship for 8 years. Highly commercially aware — responds to data, not features.' },
      { name: 'Brett Cummins', title: 'Export & Sales Manager', linkedin: '', why_relevant: 'Driving the Singapore/HK export project. Needs MAP capability confirmed before he can commit the export timeline to buyers.' }
    ],
    talking_points: [
      'Brett, the Singapore and Hong Kong export approval is a real milestone — what\'s the current plan for the MAP packaging requirement? The 21-day shelf life threshold is the difference between a viable export program and one that doesn\'t stack up commercially.',
      'Karen, a 20% Woolworths volume uplift running on weekend overtime is expensive and fragile — if they come back with another uplift request next quarter, what does that look like? We should be talking about a permanent throughput solution, not managing it shift by shift.',
      'David, we supply tray sealing equipment to Baiada and Hilton Food — companies at a similar scale to where Hazeldene\'s is heading. Happy to set up a conversation with their operations teams if that would help you understand how others have approached this investment.'
    ]
  }
}

export const DEMO_SWEEPS = {
  'rivalea foods': [
    { priority: 'urgent', title: 'RFQ shortlist closes — JBS requiring 3 vendors confirmed by end of April', body: 'JBS procurement process requires a minimum of 3 qualified vendors confirmed before the formal RFQ is issued. Engineering Manager Peter Nguyen has indicated the confirmation deadline is end of April 2026.', action: 'Call Peter Nguyen today — confirm Select Equip\'s inclusion on the shortlist before the window closes.', source: 'Industry Intel', source_url: '' },
    { priority: 'watch', title: 'JBS global automation standard — preferred equipment list may apply', body: 'JBS globally is standardising on specific equipment brands across their facilities. Australian operations may be required to align with the global preferred vendor list, which could affect the open RFQ.', action: 'Confirm with Peter Nguyen whether the JBS global preferred list applies to Corowa — if it does, understanding that list is critical.', source: 'Food Processing Technology', source_url: '' },
    { priority: 'grant', title: 'NSW Agribusiness Automation Fund — Rivalea may qualify for up to $750K', body: 'NSW Government Agribusiness Automation Fund is open to processors with over 100 employees investing in labour-reduction technology. Rivalea\'s Corowa facility would likely qualify based on headcount and investment scale.', action: 'Include grant information in the proposal — a $750K offset on a $12M program is meaningful and shows you understand their financial environment.', source: 'NSW Government', source_url: '' }
  ],
  'beak & johnston': [
    { priority: 'urgent', title: 'Woolworths launch date confirmed — MAP line must be running by 1 October 2026', body: 'Woolworths has confirmed the Macro organic range launch date as 1 October 2026. B&J have contractual obligations to supply from day one. The MAP tray seal line must be fully commissioned and running production by that date.', action: 'The 1 October date is fixed. Work back: commissioning by mid-September, FAT completed August, equipment order no later than May. The clock is running.', source: 'Retail World Australia', source_url: '' },
    { priority: 'watch', title: 'PE investor board review — capex approvals require 36-month payback or better', body: 'B&J\'s PE backer requires all capital investments above $300K to demonstrate a maximum 36-month payback in board submissions. Proposals not structured around this threshold are typically deferred.', action: 'Structure the ROI model to show 36 months or better — with the NSW grant, most tray seal configurations hit this threshold comfortably.', source: 'Market Intel', source_url: '' }
  ],
  'patties foods group': [
    { priority: 'urgent', title: 'OEM confirmed — no parts or service after 31 December 2026', body: 'The HFFS equipment OEM issued formal written notice that parts supply and service contracts for 2011-vintage lines will not be renewed after 31 December 2026. Patties have the letter — it\'s now a board-level issue.', action: 'Ask Mark Saliba for a copy of the OEM notice — understanding the exact scope of what\'s losing support helps you size the replacement specification correctly.', source: 'Industry Intel', source_url: '' },
    { priority: 'watch', title: 'Coles premium range — pilot results positive, scale decision expected May 2026', body: 'The Four\'N Twenty premium individual flow wrap pilot at Coles has received strong early sell-through data. A scale decision is expected in May 2026, which would require full line capability — not manual packaging.', action: 'The May scale decision creates a second urgency point alongside the December OEM deadline. Both point to the same conversation.', source: 'PKN Packaging News', source_url: '' },
    { priority: 'grant', title: 'VIC Food Manufacturing Modernisation Fund — Round 2 opening June 2026', body: 'Victorian Government Food Manufacturing Modernisation Fund Round 2 opens June 2026. Up to $400K for eligible manufacturers. Patties\' Bairnsdale facility is in an eligible regional zone attracting the maximum grant tier.', action: 'Flag the VIC grant to Julie Anstee — regional location gives them the highest grant tier. Include in the proposal.', source: 'Invest Victoria', source_url: 'https://invest.vic.gov.au' }
  ],
  'hazeldenes chicken farm': [
    { priority: 'watch', title: 'Singapore buyer confirmed — chilled chicken purchase order contingent on MAP shelf life', body: 'Hazeldene\'s Singapore distribution partner has issued a purchase order conditional on MAP-verified 21-day shelf life. Brett Cummins is under pressure to confirm packaging capability before the buyer deadline in June 2026.', action: 'The Singapore PO creates a hard deadline for Brett — help him understand the MAP commissioning timeline so he can give his buyer a confirmed date.', source: 'Export Intel', source_url: '' },
    { priority: 'intel', title: 'Woolworths category review — fresh chicken preferred supplier status under annual review', body: 'Woolworths conducts annual preferred supplier reviews in the fresh chicken category. Throughput reliability and packaging consistency are key evaluation criteria alongside price.', action: 'Karen Stretch will know this review is coming. Automated tray sealing directly improves the consistency metrics Woolworths scores on.', source: 'Market Intel', source_url: '' }
  ]
}

export const DEMO_EMAILS = {
  'rivalea foods': {
    emails: [
      { first_name: 'Peter', last_name: 'Nguyen', value: 'peter.nguyen@rivalea.com.au', position: 'Engineering & Projects Manager', confidence: 91, linkedin_url: 'https://linkedin.com/in/peter-nguyen-rivalea' },
      { first_name: 'Diane', last_name: 'Kowalski', value: 'd.kowalski@rivalea.com.au', position: 'Operations Director', confidence: 85, linkedin_url: '' },
      { first_name: 'Craig', last_name: 'Mallory', value: 'c.mallory@rivalea.com.au', position: 'Procurement Manager', confidence: 79, linkedin_url: '' }
    ],
    pattern: '{first}.{last}', org: 'Rivalea Foods'
  },
  'beak & johnston': {
    emails: [
      { first_name: 'Shane', last_name: 'Donoghue', value: 'shane.d@beakandjohnston.com.au', position: 'Head of Operations', confidence: 94, linkedin_url: 'https://linkedin.com/in/shane-donoghue-bj' },
      { first_name: 'Rachel', last_name: 'Beak', value: 'rachel@beakandjohnston.com.au', position: 'CEO', confidence: 89, linkedin_url: '' },
      { first_name: 'Tim', last_name: 'Garlick', value: 't.garlick@beakandjohnston.com.au', position: 'CFO', confidence: 82, linkedin_url: '' }
    ],
    pattern: '{first}.{last}', org: 'Beak & Johnston'
  },
  'patties foods group': {
    emails: [
      { first_name: 'Julie', last_name: 'Anstee', value: 'j.anstee@pattiesfoods.com.au', position: 'GM Operations', confidence: 93, linkedin_url: 'https://linkedin.com/in/julie-anstee-patties' },
      { first_name: 'Mark', last_name: 'Saliba', value: 'm.saliba@pattiesfoods.com.au', position: 'Production Manager', confidence: 86, linkedin_url: '' },
      { first_name: 'Scott', last_name: 'Morant', value: 's.morant@pattiesfoods.com.au', position: 'Engineering Manager', confidence: 78, linkedin_url: '' }
    ],
    pattern: '{first_initial}.{last}', org: 'Patties Foods Group'
  },
  'hazeldenes chicken farm': {
    emails: [
      { first_name: 'David', last_name: 'Hazeldene', value: 'david@hazeldenes.com.au', position: 'CEO', confidence: 97, linkedin_url: 'https://linkedin.com/in/david-hazeldene' },
      { first_name: 'Karen', last_name: 'Stretch', value: 'k.stretch@hazeldenes.com.au', position: 'Operations Manager', confidence: 88, linkedin_url: '' },
      { first_name: 'Brett', last_name: 'Cummins', value: 'b.cummins@hazeldenes.com.au', position: 'Export & Sales Manager', confidence: 81, linkedin_url: '' }
    ],
    pattern: '{first_initial}.{last}', org: 'Hazeldene\'s Chicken Farm'
  }
}

export const DEMO_PROSPECTS = [
  { name: 'Beak & Johnston', description: 'Leading Australian manufacturer of fresh ready meals, marinated proteins and sous vide products. Supplies Woolworths, Coles and Costco. PE-backed, growing 28% YoY. Confirmed as Woolworths Macro preferred supplier — MAP tray seal line required by October 2026.', website: 'https://beakandjohnston.com.au', type: 'Ready Meals & Value-Added Proteins' },
  { name: 'Rivalea Foods', description: 'Australia\'s largest integrated pork producer and processor. Acquired by JBS Australia. $12M automation capex approved for FY26 — tray seal line RFQ in progress. ALDI contract adding 35% volume from July 2026.', website: 'https://rivalea.com.au', type: 'Meat Processing – Pork & Value-Added Proteins' },
  { name: 'Patties Foods Group', description: 'Iconic Australian manufacturer of Four\'N Twenty, Nanna\'s and Farmers Union products. Primary HFFS line reaching end of OEM support December 2026. Board approved $3.5M capex for replacement.', website: 'https://pattiesfoods.com.au', type: 'Frozen & Chilled Food Manufacturing' },
  { name: 'Hazeldene\'s Chicken Farm', description: 'Family-owned Victorian poultry processor supplying Woolworths and IGA. Export licence approved for Singapore and Hong Kong — MAP packaging required. 20% Woolworths volume uplift creating capacity pressure on existing tray seal lines.', website: 'https://hazeldenes.com.au', type: 'Poultry Processing & Distribution' },
  { name: 'Vesco Foods', description: 'One of Australia\'s largest private label ready meal manufacturers. Produces chilled and frozen meals for major supermarket private label. Multiple tray seal lines across VIC facilities. Active equipment modernisation program.', website: 'https://vescofoods.com.au', type: 'Ready Meals – Private Label Manufacturing' },
  { name: 'Simplot Australia', description: 'Major frozen food manufacturer (Birds Eye, Leggo\'s). Large-scale VFFS and HFFS operations across multiple categories. Multiple manufacturing sites nationally undergoing equipment refresh cycles.', website: 'https://simplot.com.au', type: 'Frozen Food Manufacturing – Multi-Category' }
]

export const DEMO_COACH = {
  approach: {
    'rivalea foods': `## APPROACH STRATEGY — RIVALEA FOODS

**PRIMARY CONTACT: Peter Nguyen (Engineering & Projects Manager)**

Peter is your technical champion and the person building the vendor shortlist for the JBS capex program. He has the authority to include or exclude Select Equip before the formal RFQ is issued. Getting confirmed on that shortlist is the first objective.

**OPENING MESSAGE TO PETER**

"Peter, I understand Rivalea is scoping tray seal line automation as part of the JBS FY26 capex program. Select Equip has commissioned lines for Baiada and Hilton Food at similar throughput requirements — wanted to connect before the RFQ is finalised to understand your specification."

**WHY THIS WORKS**
- References JBS capex specifically — shows you've done your homework
- Name-drops Baiada and Hilton Food immediately — direct competitors/peers that Rivalea knows
- Asks to understand the spec, not to pitch — reduces defensiveness
- Creates urgency around the RFQ timeline

**PATH TO DIANE KOWALSKI (Operations Director)**
Once Peter is engaged, ask him directly: "Is Diane Kowalski involved in the vendor evaluation at this stage, or does that come later in the process?" — this gives you permission to reach out to the economic buyer.

**THE SQF ANGLE**
The food safety audit finding is a powerful second conversation topic — position automated seal integrity verification as compliance infrastructure, not just efficiency. Boards respond to that framing.

**NEXT STEP:** Call Peter Nguyen this week. Confirm Select Equip is on the shortlist. If no answer, email referencing the Baiada and Hilton Food reference sites.`,

    'beak & johnston': `## APPROACH STRATEGY — BEAK & JOHNSTON

**THE SITUATION**
B&J have a live, urgent requirement for MAP tray sealing with a hard 1 October deadline. This is not a prospecting conversation — this is a competitive sales situation where the first credible vendor to respond wins the meeting.

**PRIMARY CONTACT: Shane Donoghue (Head of Operations)**

Shane owns the Woolworths Macro project and the October deadline is his problem. He is your champion.

**OPENING MESSAGE**

"Shane, I heard Beak & Johnston has been confirmed as the Woolworths Macro preferred supplier — congratulations. The MAP tray seal requirement for October is a tight window. We commissioned the same configuration for My Muscle Chef and LiteNEasy. Worth 30 minutes this week?"

**WHY THIS WINS**
- Leads with their win (flattery with purpose)
- Names My Muscle Chef and LiteNEasy — they know these companies, possibly compete with them
- States the solution directly — "same configuration"
- 30 minutes is low commitment, easy yes

**ROI FOR TIM GARLICK (CFO)**
Build the payback model before the meeting:
- Equipment cost: [your price]
- Labour savings: 4-6 FTEs × $85K fully loaded = $340-510K/year
- NSW grant: up to $500K offset
- Payback: almost certainly under 36 months (PE board threshold)

**CLOSE STRATEGY**
The October deadline means there is no time for a slow evaluation. After the first meeting, propose a site visit and FAT demonstration within 2 weeks. Create urgency around the equipment order date.`,

    'patties foods group': `## APPROACH STRATEGY — PATTIES FOODS GROUP

**TWO ANGLES, ONE CONVERSATION**
Patties have two separate equipment needs that can be addressed by the same conversation:
1. HFFS line replacement (OEM support ending December — hard deadline)
2. Flow wrap capability for Coles premium pilot (scale decision May)

This is unusual — most conversations are one need. Position Select Equip as able to solve both within the $3.5M approved capex, which simplifies their procurement process.

**PRIMARY CONTACT: Mark Saliba (Production Manager)**

Mark raised the OEM issue to the board — he owns the problem and the urgency. He is your internal champion.

**OPENING MESSAGE**

"Mark, I understand your current HFFS line is reaching end of OEM support in December. We've replaced the same vintage of equipment for several food manufacturers — want to talk through what a specification and timeline looks like to hit the December deadline comfortably?"

**MOVING TO JULIE ANSTEE (GM Operations)**

Julie controls the $3.5M capex. Once Mark is engaged, ask him: "At what point does Julie Anstee get involved in the vendor selection — is she already across the shortlist or does that come after specs are done?"

**THE FAT OFFER**

Scott Morant (Engineering Manager) will be the technical evaluator. Offer a Factory Acceptance Test at Select Equip's Melbourne facility — running Patties' own products on the line before commissioning. This is a risk-reduction tool that engineering managers value highly and that differentiates Select Equip from competitors who don't offer it locally.

**NEXT STEP:** Call Mark Saliba. Reference the December OEM deadline. Offer a site visit to the Melbourne demo facility.`,

    'hazeldenes chicken farm': `## APPROACH STRATEGY — HAZELDENE'S CHICKEN FARM

**THE RIGHT ENTRY POINT: Brett Cummins (Export & Sales Manager)**

The export project (Singapore/HK) is the freshest pain point and it's Brett's. The MAP capability question is blocking his ability to confirm the export timeline to buyers. He needs an answer quickly and is motivated to solve it.

Starting with the export angle is better than leading with throughput or capacity — it's a growth conversation, not a cost conversation, and new CEO David Hazeldene is thinking about growth.

**OPENING MESSAGE TO BRETT**

"Brett, congratulations on the DAFF export licence for Singapore and Hong Kong — that's a significant milestone. The MAP shelf life requirement for chilled poultry is the packaging piece that makes or breaks the program. Worth a quick call to talk through what that looks like?"

**PATH TO DAVID HAZELDENE (CEO)**

New CEOs in their first year are evaluating their supplier relationships. After establishing rapport with Brett, ask for an introduction to David framed around the export growth story — not the equipment. Nobody wants to meet the equipment sales rep. They do want to meet someone who can help them win in Singapore.

**THE KAREN STRETCH CONVERSATION**

Karen owns the Woolworths relationship and the throughput problem. Her conversation is different — data, consistency metrics, Woolworths supplier scorecard. After the export entry, Karen is the bridge to the domestic capacity investment.

**NEXT STEP:** Email Brett Cummins this week. Lead with the export licence congratulations. Ask for 20 minutes on the MAP packaging requirement. Keep it export-focused.`
  },
  firstcall: {
    'rivalea foods': `## FIRST CALL PREP — RIVALEA FOODS

**CALL WITH: Peter Nguyen (Engineering & Projects Manager)**

**OBJECTIVE OF THIS CALL**
Get confirmed on the RFQ vendor shortlist. Understand the specification requirements and timeline. Establish credibility through reference accounts.

**OPENING (30 seconds)**
"Peter, thanks for the time. I know you're in the middle of scoping the tray seal automation for the Corowa capex program — we've done this configuration for Baiada and Hilton Food and I wanted to understand your specification before the RFQ is finalised."

**KEY QUESTIONS TO ASK**
1. What are the throughput requirements on the fresh pork tray lines — units per hour, how many SKUs, tray formats?
2. Is the SQF audit finding shaping the specification at all — for example, is in-line seal integrity testing a requirement?
3. Who else is on the vendor shortlist at this stage?
4. What does the evaluation process look like from here — RFQ, FAT, site visit?
5. Is Diane Kowalski involved at this stage of vendor selection?

**REFERENCE TO USE**
Baiada — similar throughput, similar product type. Offer a reference call with their Engineering Manager.

**YOUR CLOSE**
"Based on what you've described, I'm confident we have the right configuration. Can I put together a preliminary specification and come to Corowa to walk through it? I'd also like to offer a visit to our Melbourne demo facility — we can run your product formats before you commit to anything."

**WHAT NOT TO DO**
Don't lead with price. Don't present a brochure. Ask questions first — understand the spec before you propose anything.`,

    'beak & johnston': `## FIRST CALL PREP — BEAK & JOHNSTON

**CALL WITH: Shane Donoghue (Head of Operations)**

**THE SITUATION**
Shane has a hard October deadline and knows it. He is not browsing — he is actively solving a problem. Your job in this call is to establish that Select Equip can hit the timeline and has done it before.

**OPENING (20 seconds)**
"Shane, thanks for taking the call. MAP tray seal by 1 October — let me ask you the practical question first: what does your internal approval and procurement timeline look like? Because the commissioning date works back from there and I want to make sure we're realistic."

**WHY THIS OPENING WORKS**
Starting with the timeline question instead of a pitch shows you understand procurement complexity and you're being straight with him. It builds trust immediately.

**KEY QUESTIONS**
1. What are the MAP gas mix requirements for the Woolworths Macro range — CO2/N2 ratio, target residual oxygen?
2. Tray formats — dimensions, depths, lidding film specification?
3. What throughput do you need — packs per minute at launch, and what does scale look like if the range expands?
4. What does your internal capex approval process look like — is the budget already approved or does this need to go to the board?
5. Is the NSW Food & Agribusiness grant on your radar?

**REFERENCE TO USE**
My Muscle Chef and LiteNEasy — same MAP configuration, similar timelines. Offer Shane a call with their Operations Manager.

**YOUR CLOSE**
"I want to get you a preliminary specification and commissioning timeline within 48 hours so you can see whether we fit your window. Can we schedule a site visit to Emu Plains this week or next?"`,

    'patties foods group': `## FIRST CALL PREP — PATTIES FOODS GROUP

**CALL WITH: Mark Saliba (Production Manager)**

**YOUR MINDSET**
Mark has a board-level problem with a December deadline. He is not evaluating options casually — he is looking for someone who can take the problem off his plate reliably. Be direct, be specific, demonstrate you've replaced this vintage of equipment before.

**OPENING**
"Mark, the OEM support ending on the 2011 HFFS line in December — I want to understand the full scope of what's affected before I say anything about solutions. Walk me through the line configuration."

**KEY QUESTIONS**
1. What's the current HFFS line running — throughput, product formats, film types?
2. Is the flow wrap requirement for the Coles premium range being scoped into the same capex, or is that a separate project?
3. What's the maximum acceptable downtime window for the changeover — can you afford a full production shutdown for commissioning or does it need to be staged?
4. Has Scott Morant started the technical specification yet?
5. What's Julie Anstee's involvement at this stage?

**THE FAT OFFER**
"We have a demonstration facility in Melbourne — you can run your product formats on the line before we commission at Bairnsdale. For a December deadline, that de-risks the FAT significantly. Would that be useful to see?"

**YOUR CLOSE**
"I'd like to come to Bairnsdale this month with Scott to look at the existing line and the site. That gives us everything we need to put a realistic spec and timeline together. What does your schedule look like?"`,

    'hazeldenes chicken farm': `## FIRST CALL PREP — HAZELDENE'S CHICKEN FARM

**CALL WITH: Brett Cummins (Export & Sales Manager)**

**OBJECTIVE**
Establish Select Equip as the solution to Brett's MAP capability question. Get introduced to David Hazeldene and Karen Stretch.

**OPENING**
"Brett, the Singapore and Hong Kong export licence is a big deal — congratulations on getting that through DAFF. The MAP shelf life question is the one I wanted to talk through because it's the piece that determines whether your chilled program is viable at the buyer's end."

**KEY QUESTIONS**
1. What shelf life is the Singapore buyer requiring — is 21 days confirmed, or is there flexibility?
2. Are you looking at a dedicated export line or adapting from an existing domestic line?
3. What's the timeline to confirm capability to your Singapore buyer?
4. Is David Hazeldene across the packaging equipment piece or is that staying within operations?
5. What does the existing tray seal setup look like on the domestic lines — are they running at capacity?

**MOVING TO KAREN**
"The throughput question on the domestic Woolworths lines — is Karen Stretch the right person to talk to about that, or does it all sit with you?"

**YOUR CLOSE**
"I'd like to put together a preliminary MAP specification for the Singapore shelf life requirement — it'll take me 48 hours. And I'd love to come to Bendigo with the spec to walk through it with you and Karen together. Would that work this month?"`
  }
}
