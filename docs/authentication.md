# Customer authentication

Customer authentication uses `@netlify/identity` and the Identity service attached
to Netlify project `691e9c77-3613-4dd6-b18a-2ace117c6933`. Registration must remain
Open. Email confirmation is required; do not enable automatic confirmation to
bypass verification tests.

The SDK discovers `/.netlify/identity` from the current browser origin, so the
same client works on the DREAMZ custom domain and previews attached to this
project. The Identity service's configured site URL must remain the DREAMZ
custom domain. Email links can return to the homepage: the root auth provider
processes confirmation, recovery, invite, email-change, and OAuth callbacks
before routing to the account or password-setting form.

Passwords are handled by Identity, not by the application database. Customer
profiles are created on the first verified session and linked by the unique
Identity user ID. Privileged customer RPCs validate the request's session against
the project's Identity user API and scope queries to that customer's database ID.
Never replace this with decoded-but-unverified JWT claims, email matching, or a
customer ID supplied by the browser.

Recovery requires three steps: requesting an email, redeeming its callback, and
updating the password through Identity. The callback's authenticated recovery
session is not a substitute for the password-setting form. The non-secret
`reset` URL flag preserves that form when the recovery session is refreshed.

Netlify Identity can accept a repeated signup for an **unverified** email and
send another confirmation email for the same Identity user. That is not a
second account. The interface keeps the verification notice visible and tells
the customer to use the newest email. Duplicate-user errors returned by Identity
are translated into a sign-in/password-reset suggestion.

Authentication and profile initialization do not call TisasNG. Missing rewards
configuration or an unavailable rewards provider must not prevent Identity
signup, login, confirmation, or password recovery.

## Release acceptance

Run `npm test` and `npm run typecheck`. Automated SDK/database mocks verify
application behavior; they are not proof of email delivery or a live account.
Do not publish production until a Deploy Preview containing the repair passes
the following live checks:

- Register a new controlled email using every required field.
- Confirm its Identity user ID appears in this project's Identity Users list.
- Receive and click the newest verification email; check the custom-domain callback.
- Log in, refresh, open private account sections, log out, and log in again.
- Check that one customer profile exists with the correct name and phone.
- Request recovery, receive the email, set a new password, and log in with it.
- Verify duplicate/incorrect-password/network states on desktop and mobile.
- Test with two customers and confirm neither can read the other's data.

These checks need a controlled inbox, authorized Identity Users access, and a
writable database in the deployed runtime. Do not change applied migrations,
grant local database permissions, bypass email verification, or deploy stale
build artifacts to make an acceptance check appear to pass.
