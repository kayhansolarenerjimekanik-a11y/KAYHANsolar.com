<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Runtime mode

Live mode is `supabase` (auth + data both come from Supabase). To run offline / against the demo store, flip both `*_MODE` flags to `demo` in `.env.local` and restart the dev server. Supabase data is not touched — the demo store re-seeds in-memory from `lib/mock/data.ts`.
