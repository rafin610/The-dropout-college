This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# The-dropout-college

## Supabase environment

The application reads all dynamic data from the existing Supabase project. Configure these variables in Vercel for **Production**, **Preview**, and **Development**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Use the values from Supabase Dashboard -> Project Settings -> API. The anon key is safe for browser use when Row Level Security is enabled. Never add `SUPABASE_SERVICE_ROLE_KEY` to client code or expose it to the browser.

After saving the variables, redeploy the latest commit. Verify the deployment with:

```text
https://your-domain/api/v1/health
https://your-domain/api/v1/categories
```

The categories endpoint should return a JSON `data` array. An empty array is a valid empty database state; a `503` means the deployment variables are still missing.
