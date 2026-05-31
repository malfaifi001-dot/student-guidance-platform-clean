const fs = require("fs");

const path = "prisma/schema.prisma";
let schema = fs.readFileSync(path, "utf8");

if (!schema.includes("planId          String?") && schema.includes("model BankTransferRequest")) {
  schema = schema.replace(
`  receiptUrl      String?
  status          PaymentStatus @default(PENDING)
  adminNote       String?`,
`  receiptUrl      String?
  status          PaymentStatus @default(PENDING)
  adminNote       String?

  planId          String?
  durationDays    Int?
  requesterUserId String?
  billingCycle    String?`
  );
}

fs.writeFileSync(path, schema, "utf8");
console.log("تم إضافة حقول ربط التحويل بالباقة.");
