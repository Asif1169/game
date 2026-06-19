# Flappy Base — TODO: Image assets

These three images are **required** for your Mini App to render correctly in
the Farcaster / Base App feed. They are NOT included here because they need to
be PNGs of specific sizes, generated with your branding.

## How to generate

Use the Base Asset Generator: **https://build.base.org/assets**

## Files to create (in `public/`)

| File            | Size        | Format | Notes                          |
| --------------- | ----------- | ------ | ------------------------------ |
| `icon.png`      | 1024×1024px | PNG    | App icon; avoid transparent bg |
| `preview.png`   | 1200×630px  | PNG    | Feed embed preview image       |
| `splash.png`    | 200×200px   | PNG    | Loading screen image           |

## After creating

1. Drop the files into `public/`.
2. Deploy to Vercel and get your production HTTPS URL.
3. Update `public/.well-known/farcaster.json` — replace
   `https://REPLACE_WITH_YOUR_DOMAIN` with your real URL everywhere.
4. Generate the `accountAssociation` at
   **https://build.base.org/account-association** (sign with your **Farcaster
   custody wallet**, not regular MetaMask) and paste the `header` / `payload`
   / `signature` into the manifest.
5. Redeploy: `npx vercel --prod`
