# Qbranch Uganda Limited — Digital Profile Manager

Built by AutoMinds Africa.

## Live locations
- Dashboard: https://mdanson27.github.io/Qbranch/
- Dynamic public profiles: https://mdanson27.github.io/Qbranch/p/?profile=staff-slug
- Legacy individual paths for Brian and Himbisa remain available.

## Architecture
- Static GitHub Pages frontend on main branch.
- Neon Auth (managed Better Auth) provides email/password and email OTP verification.
- Neon Data API reads and updates Qbranch records; PostgreSQL row-level security protects private draft data.
- Authorized verified administrator email: automindsafrica@gmail.com.
- Neon PostgreSQL project: Qbranch Digital Profiles — AutoMinds Africa.
- Database: qbranch_profiles. Tables: companies, profiles, profile_experience, profile_links, profile_admins, profile_audit_log.
- Portraits: client-side optimized 640x640 WebP images saved into profiles.portrait_data (350,000-character database limit).
- Planned alternative: Neon object storage bucket qbranch-portraits exists but is not used by the current portrait uploader.
- Public profile pages only retrieve published profiles that have a portrait.
- The existing Collins repository was not modified.

## First-time dashboard use
1. Open the dashboard and enter automindsafrica@gmail.com and a new password (at least eight characters).
2. Select First time? Create administrator account.
3. Neon Auth sends a verification code; enter it to verify the email.
4. Sign in and access staff profiles. Permissions are enforced by Neon RLS and checked in the database.

## Staff workflow
- Two initial drafts: Kiseera Brian Peter and Himbisa Alex Tumushabe.
- Add the remaining three staff profiles from the dashboard.
- Edit personal information, experience, skills, and contacts. Upload portraits.
- Save, then Publish to unlock the profile's live link and unique QR code.
- Unpublish if a record must be hidden.

## Deployment and testing
- Publish the main branch from the repository root in GitHub Pages.
- Check GitHub Actions Pages build and deployment status after changes.
- Browser testing of registration, verification emails, upload, Data API, and QR codes must be completed before distributing physical NFC cards.
- A legacy Netlify function scaffold remains unused and is not wired to the live frontend.

AutoMinds Africa — Work Smarter. Work Faster.
