# Ultimate Business Clarity Coach — Knowledge Base

## Structure

```
knowledge-base/
├── coaches/          # Content organized by coach/expert
│   ├── hormozi/      # Alex Hormozi — Offers, Leads, Pricing
│   ├── robbins/      # Tony Robbins — Psychology, Breakthroughs
│   ├── wilde/        # Eli Wilde — Sales Language, NLP, Certainty
│   ├── cardone/      # Grant Cardone — 10X, Urgency, Sales Volume
│   ├── brunson/      # Russell Brunson — Funnels, Storytelling
│   ├── kennedy/      # Dan Kennedy — No BS Marketing, Direct Response
│   ├── voss/         # Chris Voss — Negotiation, Tactical Empathy
│   ├── godin/        # Seth Godin — Purple Cow, Differentiation
│   ├── sinek/        # Simon Sinek — Start With Why, Leadership
│   ├── dunford/      # April Dunford — Positioning
│   ├── abraham/      # Jay Abraham — Growth Leverage, Hidden Assets
│   └── burchard/     # Brendon Burchard — High Performance, Execution
├── topics/           # Cross-coach topic bundles
│   ├── offer-creation/
│   ├── sales-mastery/
│   ├── mindset-psychology/
│   ├── funnels-marketing/
│   ├── positioning-brand/
│   ├── negotiation/
│   ├── scaling-growth/
│   └── leadership-vision/
└── frameworks/       # Core framework reference docs (high-priority retrieval)
```

## How Auto-Tagging Works

The ingestion pipeline reads the directory path to auto-tag each chunk:

- `knowledge-base/coaches/hormozi/offers/100m-offers.pdf`
  → coach: `hormozi`, topic: `offers`, source_type: `pdf`

- `knowledge-base/topics/sales-mastery/closing-frameworks.md`
  → coach: `cross-coach`, topic: `sales-mastery`

- `knowledge-base/frameworks/value-equation.md`
  → coach: `framework`, topic: `framework`

## Adding Content

1. Drop files (PDF, DOCX, TXT, MD, MP3, MP4) into the appropriate coach/topic folder
2. Run `npm run ingest` (or `npm run ingest -- --dir knowledge-base`)
3. Content is chunked, embedded, tagged, and stored in Supabase

## Supported File Types

- **Documents:** PDF, DOCX, TXT, MD, CSV
- **Audio:** MP3, WAV, M4A, OGG, FLAC (transcribed via Whisper)
- **Video:** MP4, MOV, AVI, MKV (audio extracted and transcribed)

## Content Guidelines

- Place content under the **primary coach** it most closely aligns with
- Use **topics/** for content that blends multiple coaches' frameworks
- **frameworks/** holds concise, structured reference docs — these get highest retrieval priority
- Name files descriptively: `100m-offers-value-equation.pdf` > `doc1.pdf`
