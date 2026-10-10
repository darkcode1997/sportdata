-- Existing confirmed role registrations also receive their official tickets.
-- SDP reference codes double as unique ticket codes in the shared ticket queue.
INSERT INTO "TicketEmailJob" ("id", "to", "ticketCode", "updatedAt")
SELECT 'participation-' || gen_random_uuid()::text, p."contactEmail", p."referenceCode", NOW()
FROM "EventParticipation" p
WHERE p."status" = 'CONFIRMED'
  AND NOT EXISTS (SELECT 1 FROM "TicketEmailJob" j WHERE j."ticketCode" = p."referenceCode");
