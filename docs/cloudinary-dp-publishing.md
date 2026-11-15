# DREAMZ Fashion: customer Dream DP publishing

The DREAMZ DP maker is available inside the Visual Studio review flow after a generated product image has been uploaded and on publicly shared Dream pages.

## Local-first image creation

Customers can combine their own portrait with their saved product design on their device and download a square profile picture or a vertical Story/Status image without creating a public image. The portrait is not uploaded for this option.

## Cloudinary public links (opt-in only)

To enable "Publish My DP Link", configure these Netlify production environment variables with the **Functions** and **Runtime** scopes:

- `CLOUDINARY_CLOUD_NAME` — non-secret cloud/environment name.
- `CLOUDINARY_API_KEY` — API key.
- `CLOUDINARY_API_SECRET` — mark secret; never put it in repository source files or public `VITE_*` variables.

**Do not use `CLOUD_API_KEY` for this integration.** It is a distinct environment variable name that the DP publishing endpoint does not read.

The endpoint is `/api/dream-dp`. GET returns only `{ "available": true|false }` and never returns credentials. POST requires a signed-in customer, explicit publication consent, a validated completed PNG, and rate limiting. The server uses authenticated Cloudinary uploads. The image gets a public share page at `/dp/:id`, with image meta tags for supported social previews.

After changing environment variables, deploy the site again. Then visit the production `/api/dream-dp` endpoint to confirm `available: true` **without** exposing secret values. Perform an actual upload with a signed-in consenting test account, and verify the shared page's image preview on WhatsApp/Facebook. Do not claim uploads are verified until this is complete.

Customers can always use the local download flow if Cloudinary is not configured. Once a photo is published, anyone with its public URL can download it; do not promise that deleting a link removes screenshots or cached social previews.

If an API secret was ever pasted into a chat, ticket, or public document, rotate it in Cloudinary and update the Netlify secret before continued use.
