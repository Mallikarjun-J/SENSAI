This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your real values:

```bash
cp .env.example .env.local
```

Never commit `.env` or `.env.local` to version control. The `.gitignore` already blocks these files.

## ⚠️ Security

> **If any secret was ever accidentally committed to git history, rotate it immediately.**  
> Git history is permanent — even after deleting the file, the old value is still visible via `git log`.

**What to rotate if previously exposed:**
- Clerk Secret Key → [Clerk Dashboard](https://dashboard.clerk.com) → API Keys → Roll key
- Gemini API Key → [Google AI Studio](https://aistudio.google.com/app/apikey) → Delete & recreate
- LiveKit API Key/Secret → [LiveKit Cloud](https://cloud.livekit.io) → Settings → Keys → Regenerate
- Database password → Neon/Supabase dashboard → Reset credentials
- UploadThing token → [UploadThing](https://uploadthing.com) → API Keys → Regenerate

**Rules followed in this codebase:**
- All secrets are in environment variables only — no hardcoded values in source code
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are server-side only (never `NEXT_PUBLIC_`)
- `CLERK_SECRET_KEY` is server-side only
- Only `NEXT_PUBLIC_LIVEKIT_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are browser-exposed (both are safe by design)
- `.env*` is in `.gitignore`
