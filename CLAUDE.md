# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ragnarok LATAM Build Consultant** — An intelligent web application that serves as a comprehensive build advisor for Ragnarok Online Renewal (bRO/LATAM official server). The system monitors the current meta, analyzes item combinations, and delivers optimized build recommendations for all character classes.

### Core Capabilities
- **Build Recommender**: Suggests optimal equipment, cards, enchantments and skill distribution per class/role
- **Meta Monitor**: Tracks and displays current patch meta, tier lists, and trending builds
- **Item Database**: Full searchable database of weapons, armors, accessories, cards, enchantments
- **Combo Analyzer**: Detects and ranks item set bonuses and synergies
- **Class Guide**: Skill trees, stat allocation, and playstyle recommendations per job
- **MVP/Instance Advisor**: Best build for hunting specific monsters or clearing instances

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (local, via Docker) |
| ORM | Prisma |
| AI/LLM | Anthropic Claude API (`claude-sonnet-4-6`) |
| State | Zustand |
| Auth | NextAuth.js |

## Project Structure

```
LATAM/
├── src/
│   ├── app/                  # Next.js App Router pages and layouts
│   │   ├── (consultant)/     # Build consultant routes
│   │   ├── api/              # API route handlers
│   │   └── layout.tsx
│   ├── components/           # Reusable UI components
│   │   ├── build/            # Build-specific components
│   │   ├── items/            # Item cards, search, filters
│   │   └── ui/               # Base UI primitives
│   ├── lib/
│   │   ├── db/               # Prisma client and query helpers
│   │   ├── ai/               # Claude API integration and prompts
│   │   ├── ro/               # Ragnarok game logic (formulas, stats)
│   │   └── meta/             # Meta scraping and analysis utilities
│   └── types/                # Shared TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed/                 # Seed scripts for game data
├── data/
│   ├── items/                # JSON game data exports (items, cards, skills)
│   ├── classes/              # Job class definitions and skill trees
│   └── meta/                 # Cached meta snapshots
├── docker-compose.yml        # PostgreSQL + pgAdmin
└── .env.local                # API keys and DB connection string
```

## Key Database Entities

- `Item` — All equipment with stats, requirements, slots, type
- `Card` — Card effects and applicable slots
- `Enchantment` — Equipment enchantment tiers and bonuses
- `ItemCombo` — Set bonus definitions and item group synergies
- `Class` / `Job` — Character classes and skill trees
- `Build` — User-saved or AI-recommended builds
- `MetaSnapshot` — Periodic meta state captures with tier lists

## Development Commands

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
npm install

# Apply database migrations
npx prisma migrate dev

# Seed game data
npm run db:seed

# Development server
npm run dev

# Build for production
npm run build

# Lint + type check
npm run lint && npm run typecheck

# Generate Prisma client
npx prisma generate
```

## AI Integration Pattern

The build consultant uses Claude as the reasoning engine. The pattern lives in `src/lib/ai/`:

```typescript
// Build context is assembled from DB then passed to Claude
const buildContext = await assembleBuildContext(classId, targetScenario);
const recommendation = await claude.messages.create({
  model: "claude-sonnet-4-6",
  system: SYSTEM_PROMPT_BUILD_CONSULTANT,
  messages: [{ role: "user", content: buildContext }],
});
```

System prompts are stored in `src/lib/ai/prompts/` and version-controlled. The AI never invents item IDs or stats — it always operates on structured data retrieved from the database.

## Ragnarok Game Data Sources

- **Primary**: [Divine Pride](https://www.divine-pride.net) API — server parameter is `LATAM` (NOT `bRO`, they are separate servers with different databases)
  - API endpoint: `GET /api/database/{Type}/{id}?apiKey=KEY&server=LATAM`
  - Requires API key: register at divine-pride.net forum → profile → request key
  - Supported types: `Item`, `Monster`, `Skill`, `Quest`, `Map`, `Achievement`
  - LATAM changelog: `divine-pride.net/database/history?server=LATAM`
- **Sync route**: `POST /api/items/sync?id={itemId}` or `POST /api/items/sync` with body `{ ids: [...] }`
- **Meta**: manual updates via `POST /api/meta/snapshot` (admin only)

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/ro_latam"
ANTHROPIC_API_KEY="sk-ant-..."
DIVINE_PRIDE_API_KEY="your-key-from-divine-pride-forum-profile"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3003"
```

## Data Freshness Strategy

Meta data is NOT real-time scraped by default (anti-ToS risk). Instead:
1. **Manual snapshots** — Admin triggers meta update via `/api/meta/snapshot`
2. **Versioned patches** — Each bRO patch gets a data version entry
3. **Community contributions** — Users can flag outdated build info
