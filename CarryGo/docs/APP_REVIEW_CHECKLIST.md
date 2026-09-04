# App Review Checklist

## Reviewer access
- Use the reviewer account details configured in your secure release environment.
- Ensure the reviewer flow is enabled only for review builds.
- Verify login, matching, chat, payment hold/release, and delivery confirmation paths before submission.

## Compliance-critical checks
- Account deletion is available in-app at: Profile -> Delete Account.
- Privacy policy is available in-app at: Legal -> Privacy Policy.
- iOS privacy manifest is configured in `app.json` under `expo.ios.privacyManifests`.
- Permission usage descriptions are configured in `app.json` under `expo.ios.infoPlist`.

## Pre-submit
- Run the compliance guard and metadata audit from the app-store-compliance playbook.
- Block release if any critical issue remains.
