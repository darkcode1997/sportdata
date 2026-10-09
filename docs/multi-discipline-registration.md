# Registering an athlete in multiple disciplines

The public registration form accepts several disciplines for one athlete, with one event category per discipline. It supports individual, assisted and federation submissions. Existing athletes can add disciplines using the same identity profile and documents, and their previous tickets remain accessible in the form.

Disciplines come from the event's configured categories. `NEWAZA` with `GI` (or no uniform) is Gi Jiu-Jitsu; `NEWAZA` with `NO_GI` is No-Gi Jiu-Jitsu. Fighting, Duo and Show are separate disciplines. Contact and Full Contact are grouped together. Categories without a discipline are grouped by sport. Duo and Show use the organizer's category definitions; this change does not implement partner or team selection.

Each discipline registration pays the event's configured fee separately. For example, an athlete entering three disciplines at a fee of 100,000 VND owes 300,000 VND. Disciplines added later receive their own fee and payment status. Gateway and CMS payments confirm only the paid registration after identity verification. Unpaid expiry affects each registration independently. Free events require no payment for any discipline.

The API accepts `athletes[].categoryIds: string[]`. The previous scalar `categoryId` remains supported. Each returned registration includes `categoryId` and `athleteIndex`. Retrying an existing category with a confirmed reuse token returns its existing ticket without another registration or charge. A different category in the same discipline is rejected.

No database migration is required. Deploy both apps together for the new array payload and response fields.

The CMS registrations tab shows one row per registration with athlete, category, documents, seed, source, payment, ticket and status columns. Use the filter icons in the column headers to search or select a filter, then apply or clear it. Filters combine across columns; applying or clearing a filter resets pagination to the first page. The registration status reason is omitted from the table.

The summary above the table shows total athletes, men and women for the current filters across all pages. Each athlete ID counts once even when registered in multiple disciplines; any other gender is listed separately as “Chưa xác định”.

Click a source cell to view its contact name, phone, email, organization, reference code and registration details. Guest and group sources use their submitted contact details; direct SportData registrations use the account holder's details, with athlete details available when no account is linked. Missing contact fields display “Chưa cung cấp”.

Registrations created by admins or games admins through CMS are confirmed immediately after eligibility checks, including newly created athletes and profiles with unverified documents. Their competition entries are created immediately. Payment remains separate: a pending payment stays pending and the A6 ticket is issued only when payment is complete or not required. Document verification states remain unchanged. Public, guest and federation registrations retain their existing review requirements.

Admins and games admins can use the pencil beside a category to edit its discipline and weight class through `PATCH /participant-auth/admin/registrations/:id/category` with `{ "categoryId": "..." }`. The new category must belong to the same event and sport and meet the athlete's gender, age and weight requirements. Existing disciplines (including Contact / Full Contact aliases), country quotas and existing competition entries are checked. Either category having a draw, match, heat or round-robin group blocks the edit until that competition setup is reverted.

Edits preserve the registration ID, payment state, fee and ticket code. The competition entry moves with the registration, retains its ID and bib, and clears its seed. Confirmed registrations remain confirmed; pending or withdrawn registrations retain their status. CMS notifications record the old and new category and the administrator.

Validation:

```sh
npm run build:backend
node tests/regression/multi-discipline-registration.mjs
node tests/regression/cms-registration-category.mjs
npm run lint --workspace=@sportdata/frontend
npm run build:frontend
```

The regression script uses an in-memory database adapter and calls the registration and payment services. It covers six disciplines, separate fees and payment states, identity/media reuse, retries, later additions, duplicate discipline rejection, category eligibility, group ticket mapping, gateway and CMS payments, free events and independent unpaid expiry. It does not verify PostgreSQL locking or browser interaction.

The CMS regression covers category and discipline edits, competition-entry synchronization, payment/ticket preservation, eligibility, duplicates, country quotas, competition locks, discipline keys and immediate CMS approval for new and existing athletes across free, paid and pending payments. It uses an in-memory adapter and does not verify PostgreSQL locking or browser interaction.
