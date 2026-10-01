CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "identityOcrEnabled" BOOLEAN,
    "paymentsEnabled" BOOLEAN,
    "momoEnabled" BOOLEAN,
    "vnpayEnabled" BOOLEAN,
    "bankQrEnabled" BOOLEAN,
    "ticketEmailEnabled" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);
