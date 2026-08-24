# PM Daily Summary — Cover Pro Painting

A password-protected daily handoff form for the Project Manager. On submit, it emails a formatted summary to both Nina and Alex.

## Environment Variables (set these in Vercel)

| Name | Value |
|------|-------|
| `FORM_PASSWORD` | Whatever password you want Terran to use to open the form |
| `EMAIL_TO` | `nina@coverpropainting.com,alex@coverpropainting.com` (comma-separated, no space needed) |
| `EMAIL_USER` | The Gmail address sending the emails |
| `EMAIL_PASSWORD` | A Gmail **App Password** for that account (not the regular login password) |

## Deploy

1. Push this folder to a new GitHub repository
2. Import that repo into Vercel
3. Add the 4 environment variables above
4. Deploy

## Local testing (optional)

```
npm install
npx vercel dev
```
