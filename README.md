# Qbranch Uganda Limited — Digital Profiles

Built by **AutoMinds Africa**. A reusable frontend derived from the approved Namanya Obed Collins experience.

## Current state

- Two staff records exist as **drafts in Neon**, without photographs: Kiseera Brian Peter and Himbisa Alex Tumushabe.
- The Qbranch logo is reused from the existing repository. The four approved Collins CSS layers are copied and a shared override adds circular portraits.
- Static frontend source is designed for GitHub Pages; serverless API source is in netlify/functions/profile.mjs.
- **Not yet deployed or published.** Set up the Netlify API, a server-only DATABASE_URL, and the frontend's qbranch-api-base meta URL before publishing.
- The API only returns published records with portrait URLs. No Neon secrets should be checked into the repository.
- Do not change the separate Mdanson27/collin-card repository.

## Public routes

Once GitHub Pages is configured and the serverless API deployed:

- /Qbranch/p/kiseera-brian-peter/
- /Qbranch/p/himbisa-alex-tumushabe/

Routes above are **planned, not yet live**.

## Deployment

1. Deploy this repository to Netlify for the serverless function (or another secure Functions host).
2. Add the pooled Neon DATABASE_URL as a **secret server-side environment variable** on the API host, with access to the qbranch_profiles database; never add it to GitHub Pages HTML/JS.
3. Configure the GitHub Pages frontend meta tag "qbranch-api-base" with the HTTPS serverless endpoint ending in /.netlify/functions/profile.
4. Create all 5 verified portrait assets, assign each image URL in Neon, validate staff data and only then set status to published.
5. Enable GitHub Pages from main, test each URL, vCard, QR destination, contacts, mobile, accessibility and loading/error states.

## Database

Project: Qbranch Digital Profiles — AutoMinds Africa (Neon)
Database: qbranch_profiles
Tables: companies, profiles, profile_experience, profile_links, profile_audit_log.

All initial staff details live exclusively in Neon. Additional staff can be added as separate profile records.
