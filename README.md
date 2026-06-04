# MindArena

An AI-powered rhetoric and debate training platform. Practice argumentation against AI opponents, analyze your logical consistency, and improve critical thinking through structured debate.

## Features

- **Live Debate Arena** — real-time transcript with phased debate rounds (Opening, Cross-Examination, Rebuttal, Closing, Verdict), support for 2v2 mode, and an AI judge
- **AI Opponents** — debate against AI agents with adjustable rigor levels from Casual to Elite (Socratic Master)
- **In-Arena Tools** — Fact Check and Logic Audit quick actions during live debates
- **Knowledge Base** — curated philosophical frameworks and rhetorical techniques (Socratic Questioning, Logical Fallacies, Kantian Deontology, Heuristics & Biases, Game Theory, Stoic Resolve, and more)
- **Performance Insights** — Elo rating tracking, win rate, skill balance radar (Logical Consistency, Rhetorical Flair, Evidence Integration, Response Countering, Emotional Intelligence), and AI feedback from the Obsidian Core engine
- **Competition System** — live tournaments with prize pools and global leaderboards
- **Neural Tuning** — calibrate your AI assistance levels for Rhetoric, Extraction, and Empathy

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS v4
- **Animations**: Motion (Framer Motion)
- **Icons**: Lucide React

## Getting Started

**Prerequisites:** [Bun](https://bun.sh)

1. Install dependencies:
   ```
   bun install
   ```

2. Copy the example env file:
   ```
   cp .env.example .env.local
   ```

3. Start the dev server:
   ```
   bun dev
   ```

The app runs on [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `bun dev` | Start development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Type-check with TypeScript |

## Environment Variables

| Variable | Description |
|---|---|
| `APP_URL` | Deployment URL for self-referential links |
| `DATABASE_URL` | Neon Postgres connection string used by Drizzle and the server |

## Neon Database

MindArena now defaults to **Neon Postgres** for the database layer.

1. Create a database in [Neon](https://neon.tech/).
2. Copy its pooled connection string into `.env.local` as `DATABASE_URL`.
3. Run the schema migration commands:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

For email verification in registration, also set:

- `RESEND_API_KEY`
- `EMAIL_FROM`

If those are missing, the server falls back to printing verification codes in the dev log.

The current schema includes:

- user/session tables
- persisted user settings and quotas
- debate templates, stage timers, scorecards, replay highlights, exports/imports
- knowledge documents, chunks, collections, shares, citations, and table cards
- background jobs, audit events, scripted opponent profiles, and tool-call logs
