# Jars (`jar-in`)

> Working title — may change. The spec doesn't depend on the name.

Open-source, local-first personal finance app built around a **percentage-based
jar system**: you define your own budget buckets and what share of income flows
into each, instead of being forced into an app's fixed categories. Money is
*tracked*, not moved.

## Why it's different

- Fully user-defined jars and percentages, not preset categories
- Shared + private money per household, at per-jar granularity (personal jars are
  invisible to other members — even their existence)
- AI narration/coaching/projections layered on top of **deterministically
  computed** numbers (the AI never does the math)
- Local-first: works fully offline, data lives on-device first
- Open source and self-hostable

## Status

Pre-implementation. Full spec: [`docs/SPEC.md`](docs/SPEC.md).

## Planned stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, installable PWA |
| Local DB | RxDB (IndexedDB) |
| Backend / sync | Supabase (Postgres, Auth, RLS, RxDB replication) |
| AI | Groq |
| FX rates | Frankfurter / exchangerate.host (free tier) |
| Future bank sync | GoCardless Bank Account Data (EU open banking) |
| Hosting | self-hosted (Hetzner + Coolify) |

## Roadmap

1. Core ledger, single user — wallets, jars (flow/accumulation), income sources,
   manual transactions, local-first storage
2. Multi-currency + sub-categories + withdrawal events + target/progress UI
3. AI layer — onboarding agent, narration, projections (Groq)
4. Household sharing — multi-user sync, contribution rules, personal-jar privacy,
   Supabase RLS
5. Polish + PWA installability — manifest, service worker, offline UX, iOS sync
   behavior, CSV import
6. v2+ — bank sync (GoCardless), richer AI rebalancing, shared analytics

## License

TBD — intended to be open source (choose before first public release).
