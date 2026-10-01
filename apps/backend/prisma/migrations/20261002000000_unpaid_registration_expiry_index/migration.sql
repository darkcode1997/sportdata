CREATE INDEX IF NOT EXISTS "EventRegistration_paymentStatus_createdAt_idx"
ON "EventRegistration"("paymentStatus", "createdAt");

UPDATE "PaymentTransaction"
SET
  "expiresAt" = "createdAt" + INTERVAL '30 minutes',
  "status" = CASE
    WHEN "createdAt" + INTERVAL '30 minutes' <= CURRENT_TIMESTAMP
      THEN 'EXPIRED'::"PaymentTransactionStatus"
    ELSE "status"
  END,
  "failureReason" = CASE
    WHEN "createdAt" + INTERVAL '30 minutes' <= CURRENT_TIMESTAMP
      THEN 'Mã thanh toán đã hết hạn sau 30 phút'
    ELSE "failureReason"
  END
WHERE "status" = 'PENDING'
  AND ("expiresAt" IS NULL OR "expiresAt" > "createdAt" + INTERVAL '30 minutes');
