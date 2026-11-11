# DREAMZ Product Passports

Permanent first product URL: https://dreamzfashion.dreamz-gc.com/p/DRZ-000001

The QR contains only this URL. Keep it permanent when updating the story, care or photographs. DRZ-000001 identifies the first documented footwear record, VANITY FLEX. Do not reuse its QR for other physical products. One pair shares a record; label the shoes with -L and -R where needed. Create further pieces in /admin/passports; the database allocates numbers across all categories.

Unauthenticated visitors see a branded invitation and links to the storefront and existing account flow. Verified customers can read product stories. Dream notes and support tickets are scoped to the authenticated customer on every server request. Saving a passport is not ownership. Admins issue a random, single-use private code; only its SHA-256 hash is stored. An atomic conditional update prevents claiming an already-owned item. Never print this private code in the public QR.

Admin: /admin/passports (owner or operations role, existing admin key also supported). Edit story, category, collection, care, materials, lifespan, production status and approved Media Library image path. Customer details must never be put in the shared story. Admin support responses are shown in the customer's passport; email alerts and photo attachments are not implemented in this release. Final photographs/materials and wear-based life estimates await production data; the UI labels these honestly.

Customers: /account/passports lists saved and owned records. They can add/update a private dream, claim ownership, submit support requests, and return for staff replies. Existing email verification is preserved. Signup currently also requires name, phone and password as on the existing site. If email confirmation opens in a different browser and loses the return path, rescan the QR after verifying.

Testing: tests/passports.test.ts applies repository migrations to an in-memory Postgres and tests unauthenticated rejection, two-customer privacy, one-time claims, origin checks, admin gating and sequence allocation. Existing authentication tests cover verified Identity sessions. Local tests without a Netlify environment need a dummy NETLIFY_DB_URL for legacy catalogue imports; tests do not connect to that dummy database. Production applies the two additive migrations during deploy.
