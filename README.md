# Qbranch Uganda Limited — Digital Profile Manager

Built by AutoMinds Africa.

## Live locations
- Dashboard: https://mdanson27.github.io/Qbranch/
- Dynamic public profiles: https://mdanson27.github.io/Qbranch/p/?profile=staff-slug
- Legacy individual paths for Brian and Himbisa remain available.

## Architecture
- Static GitHub Pages frontend on main branch.
- Neon Auth (managed Better Auth) provides email/password sign-in and a configured Google OAuth provider. The current Google provider uses shared development credentials; production OAuth should be tested and upgraded to client-specific credentials as needed.
- Neon Data API reads and updates Qbranch records; PostgreSQL row-level security protects private draft data.
- Current verified authorized administrator email: automindsafrica@gmail.com. Additional client administrators can be approved through the `profile_admins` table without changing frontend code.
- Neon PostgreSQL project: Qbranch Digital Profiles — AutoMinds Africa.
- Database: qbranch_profiles. Tables: companies, profiles, profile_experience, profile_links, profile_admins, profile_audit_log.
- Portraits: client-side optimized 640x640 WebP images saved into profiles.portrait_data (350,000-character database limit).
- Planned alternative: Neon object storage bucket qbranch-portraits exists but is not used by the current portrait uploader.
- Public profile pages request a short-lived anonymous JWT from Neon Auth (`/token/anonymous`) before querying Neon Data API; PostgreSQL RLS restricts access to published profiles that have a portrait.
- The existing Collins repository was not modified.

## Administrator sign-in
1. Open the white login page and sign in using the already registered AutoMinds account, or select Continue with Google.
2. Account creation is hidden from the login UI and email/password sign-up is disabled in Neon Auth.
3. After successful authentication, PostgreSQL checks the verified account against `profile_admins` before granting any edit privileges.
4. To authorize a future Qbranch client admin, verify their identity and add their email to `profile_admins` using an authorized Neon administrative operation. Do not store passwords in the app or grant open signup access.

## Staff workflow
- First two profiles: Kiseera Brian Peter (draft, photograph saved) and Himbisa Alex Tumushabe (published, photograph saved), as of 19 Nov 2026.
- Add the remaining three staff profiles from the dashboard.
- Edit personal information, experience, skills, and contacts. Upload portraits.
- Save, then Publish to unlock the profile's live link and unique QR code.
- Unpublish if a record must be hidden.

## Deployment and testing
- Publish the main branch from the repository root in GitHub Pages.
- Check GitHub Actions Pages build and deployment status after changes.
- GitHub Pages build/deployment and static JavaScript syntax checks completed, and anonymous PostgreSQL RLS verified via SQL. End-to-end browser tests of Google OAuth, token retrieval, profile rendering, upload, and QR scanning remain necessary before distributing physical NFC cards.
- A legacy Netlify function scaffold remains unused and is not wired to the live frontend.

AutoMinds Africa — Work Smarter. Work Faster.
