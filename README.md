# Expert Journal Platform

## Running locally

1. Copy `apps/api/.env.example` to `apps/api/.env` and replace development secrets.
2. Start infrastructure: `docker compose up -d postgres minio`.
3. In `apps/api`: `npm install`, `npx prisma migrate dev`, then `npm run start:dev`.
4. At the repository root: `npm run dev` for the Next.js UI.

The UI routes are `/`, `/author`, and `/editor`. The API runs under `http://localhost:4000/api`.

## Workflow invariants

- Only `DRAFT` articles can be deleted.
- Each replacement file creates a new `ArticleRevision` and increments `Article.currentVersion`.
- Only an editor may transition a submission to `ACCEPTED`, `REJECTED`, or `PUBLISHED`.
- A DOI is assigned only as part of the `PUBLISHED` transition.
- Every transition creates `ActivityLog` and the relevant `Notification` rows.
