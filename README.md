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
