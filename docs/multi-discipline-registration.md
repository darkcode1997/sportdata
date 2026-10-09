# Registering an athlete in multiple disciplines

The public registration form accepts several disciplines for one athlete, with one event category per discipline. It supports individual, assisted and federation submissions. Existing athletes can add disciplines using the same identity profile and documents, and their previous tickets remain accessible in the form.

Disciplines come from the event's configured categories. `NEWAZA` with `GI` (or no uniform) is Gi Jiu-Jitsu; `NEWAZA` with `NO_GI` is No-Gi Jiu-Jitsu. Fighting, Duo and Show are separate disciplines. Contact and Full Contact are grouped together. Categories without a discipline are grouped by sport. Duo and Show use the organizer's category definitions; this change does not implement partner or team selection.

Each discipline registration pays the event's configured fee separately. For example, an athlete entering three disciplines at a fee of 100,000 VND owes 300,000 VND. Disciplines added later receive their own fee and payment status. Gateway and CMS payments confirm only the paid registration after identity verification. Unpaid expiry affects each registration independently. Free events require no payment for any discipline.

The API accepts `athletes[].categoryIds: string[]`. The previous scalar `categoryId` remains supported. Each returned registration includes `categoryId` and `athleteIndex`. Retrying an existing category with a confirmed reuse token returns its existing ticket without another registration or charge. A different category in the same discipline is rejected.

No database migration is required. Deploy both apps together for the new array payload and response fields.

Validation:

```sh
npm run build:backend
node tests/regression/multi-discipline-registration.mjs
npm run lint --workspace=@sportdata/frontend
npm run build:frontend
```

The regression script uses an in-memory database adapter and calls the registration and payment services. It covers six disciplines, separate fees and payment states, identity/media reuse, retries, later additions, duplicate discipline rejection, category eligibility, group ticket mapping, gateway and CMS payments, free events and independent unpaid expiry. It does not verify PostgreSQL locking or browser interaction.
