# SportData account registration

All accounts use the same registration, login and `/account` page. Each account selects exactly one type: `ATHLETE`, `REFEREE`, `COACH`, `TEAM_LEADER`, `MEDICAL_STAFF`. CMS manages all accounts and their type at `/cms/accounts`. These types do not grant CMS permissions.

Migration `20261010100000_unified_sportdata_accounts` converts the old `FEDERATION` type to `TEAM_LEADER`, retaining organization, credentials, approval status and registration history. The former organization account URLs redirect to the common account/registration pages. Migration `20261010120000_single_sportdata_account_type` retains each account's existing primary `accountType` and reduces the compatibility array `accountTypes` to that single value. API validation and a database constraint enforce exactly one type, consistent with `accountType`. Event participation roles remain separate. A team leader associated with an organization still needs approval to submit official team registrations. Changes to that organization require approval again.

Personal account registration requires an identity type (`CCCD` or `PASSPORT`) and document number. CCCD accepts 12 digits; Passport accepts 5–20 letters or digits. Passport matching includes the country, following existing athlete identity rules.

Creating an account does not create an `Athlete`. Personal details and the encrypted document number are stored on `ParticipantAccount`. The profile API returns `hasAthleteProfile: false` and a compatibility projection of account details until an athlete is linked; that projection is never persisted as an athlete.

When the document matches exactly one existing athlete, registration links that athlete and uses its existing personal details. Name and date of birth must match before linking. A document already assigned to an account, an athlete already linked to another account, or multiple matching athletes returns a conflict. Existing linked athlete registrations appear in the account's ticket list.

When event registration creates an athlete for an account's document, it links the athlete if name and date of birth also match. Accounts without an athlete upload their event documents in the event registration form.

## Deployment and verification

Apply `20261010090000_participant_account_identity` with `npm run prisma:deploy` before starting the updated backend. Use the existing valid `SETTINGS_ENCRYPTION_KEY` or `JWT_SECRET` for document encryption.

Run `npm run prisma:generate`, `npm run build`, `npm run lint --workspace=@sportdata/frontend`, and `node tests/integration/participant-account-registration.cjs`. The regression script uses service/database doubles and does not modify a database.

Manual checks on a development database:

- Register with a new document: confirm the account opens and the CMS athlete count does not increase.
- Register using an unlinked athlete's document and matching name/date of birth: confirm existing information and tickets appear, with no additional athlete.
- Try missing/invalid documents, a document already linked to an account, and mismatched personal details: confirm validation/conflict messages.
- Submit an event registration with the new account's document: confirm one athlete is created and linked to the account.
