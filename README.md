# Qbranch Uganda Limited — Digital Profile Manager

An AutoMinds Africa project. Live dashboard: https://mdanson27.github.io/Qbranch/

## Frontend
- GitHub Pages serves the white, protected management dashboard at `/Qbranch/`.
- Overview, Staff profiles, Live links & QR, and Archive & recovery are separate navigation views.
- Public links use `/Qbranch/p/?profile=<staff-slug>`, loaded dynamically from Neon.
- Authorized admins can open the live profile directly, copy its URL, or display its QR code.
- Profile changes are read directly from Neon, bypassing cached REST responses. Open profiles check for changes when focused and periodically.

## Backend
- Dedicated Neon project: `autumn-band-28251766`; database: `qbranch_profiles`.
- Neon Auth: email/password, Google provider, verified allowlisted administrators.
- Neon Data API: JWT authenticated management, anonymous JWT for public published-only reads.
- PostgreSQL RLS controls private draft access, verified admin management, and excludes archived/removed records from public reads.
- `public.qbranch_save_profile` saves a staff member and all experience/social link records in one PostgreSQL transaction.
- Profile freeze is enforced by server-side triggers on profiles, experience, and links.
- Archive uses `status='archived'`, hiding the page while retaining content.
- Remove is a reversible soft deletion (`deleted_at` and archived); restoration returns the profile to private draft. Hard deletes of profile records are blocked by a trigger.
- Removing a profile requires typing the exact full name in a confirmation dialog.
- Profile action changes are recorded through the audit trigger.

## Editor
- Separate, easy-to-edit form inputs for personal details and optimized portrait.
- Individual professional experience rows (organization, role, start/end years, current).
- Individual social account rows: choose a platform and type username, phone number, or full HTTPS URL. Handles are expanded to appropriate social URLs.
- Save a profile while published and public visitors see the new content on their next fetch; public pages periodically check updated_at while open.
- Publish requires a portrait. Freeze a published profile without unpublishing; unfreeze before editing or archiving.
- Up to five active profiles. Archived or removed profiles can be restored within the active limit.

## Current staff (as of 19 November 2026)
- Himbisa Alex Tumushabe — Administrator — published, portrait saved.
- Kiseera Brian Peter — Procurement Officer — draft, portrait saved.
- No changes to these two staff records were made during this dashboard upgrade.

## Deployment testing
- GitHub Pages publishes from `main` at repository root; verify the workflow after merging.
- Source syntax, DOM ID bindings and Neon database grants/RLS are checked before deployment.
- End-to-end admin login, actual profile save/upload, public QR scanning and all physical NFC cards should be tested in a real browser before delivery.
- The original Collins reference repository remains unchanged.

AutoMinds Africa — Work Smarter. Work Faster.

## Directory reliability fix — November 2026
- The previous dashboard fetched profiles under RLS and treated an empty response as an empty team, even when saved staff existed.
- A new administrator-only Neon function, public.qbranch_admin_snapshot(), now returns authorized company and staff data in a single transactionally consistent request.
- Database permissions deny anonymous execution; only approved and verified authenticated administrators may fetch the private snapshot.
- The frontend validates the complete response, retries failed requests and keeps the last valid staff list on refresh failure.
- A connection banner offers a Retry connection button; staff search now separates no search matches from no stored profiles.
- No existing staff records or photos were changed.

## Login and host compatibility — 20 November 2026
- The browser uses the official pinned `@neondatabase/auth@0.7.0-beta` client for email/password, Google OAuth and JWT token retrieval instead of raw `/sign-in` and `/token` calls.
- Google OAuth callbacks now use the active host (`location.origin + location.pathname`) rather than always redirecting to GitHub Pages. The supported Neon SDK processes the one-time `neon_auth_session_verifier` and manages sessions.
- Admin Data API requests check that the returned JWT contains `role=authenticated`; Neon RLS and verified-admin allowlist remain the final authorization gate.
- API 401/403 errors now explain how to recover from a denied or expired session.
- Neon Auth trusts GitHub Pages and `https://qbranch.netlify.app`; Neon Data API CORS was updated to support both environments.
- `netlify.toml` rewrites `/Qbranch/*` asset requests to site-root equivalents so the existing GitHub Pages `<base href="/Qbranch/">` also renders from Netlify.
- Netlify is an independent deployment. Check the Netlify current deploy commit after a GitHub push; if it is stale, let Netlify's Git build finish before testing the Netlify URL.
- Live account login, Google callback and POST permission flows must be verified from an actual logged-in browser before declaring end-to-end sign-in resolved.

## Authentication and profile-save fix — 20 November 2026
- Switched dashboard authentication to the official `@neon/neon-js@0.10.2/auth` SDK module.
- Reproduced `HTTP 404 Not Found` when the prior `@neondatabase/auth@0.7.0-beta` client called `getJWTToken()`. Removed that call.
- Neon Data API JWT now comes from the documented `getSession().data.session.token` with an `authenticated` role check.
- Fixed the `permission denied for schema auth` profile-save failure in Neon by replacing the direct invoker-level call to `auth.user_id()` with `public.qbranch_authenticated_actor()`, a restricted `SECURITY DEFINER` helper.
- Kept `qbranch_save_profile` as `SECURITY INVOKER`; it continues to enforce verified administrator permissions through `is_qbranch_admin()` and PostgreSQL RLS.
- No staff photos, profile data, publication states or existing credentials were changed.
- Tests: original JWT method reproduced HTTP 404, new SDK getSession returned no HTTP error in a no-login test, PostgreSQL authenticated role can run the helper without internal-schema access, and JavaScript syntax checks passed.
- Real administrator sign-in and saving must still be tested from an authenticated browser session.
