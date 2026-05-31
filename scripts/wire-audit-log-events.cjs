const fs = require("fs");

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : null;
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
  console.log(`تم تحديث: ${path}`);
}

function addImport(content, importLine) {
  if (content.includes(importLine)) return content;

  const imports = content.match(/^import .+;$/gm);
  if (!imports || imports.length === 0) return `${importLine}\n${content}`;

  const lastImport = imports[imports.length - 1];
  return content.replace(lastImport, `${lastImport}\n${importLine}`);
}

function patchLogout() {
  const path = "app/api/auth/logout/route.ts";
  let content = read(path);
  if (!content) return console.log(`تجاوز: ${path}`);

  content = addImport(
    content,
    'import { logAuthLogoutEvent } from "@/lib/admin/activity-events";'
  );

  if (content.includes("audit-log:auth-logout")) {
    return console.log(`موجود مسبقًا: ${path}`);
  }

  const marker = `// audit-log:auth-logout
  if (current?.user?.id) {
    await logAuthLogoutEvent({
      userId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      email: current.user.email,
    });
  }
`;

  if (content.includes("await prisma.userSession.updateMany")) {
    content = content.replace(
      /await prisma\.userSession\.updateMany\(\{[\s\S]*?\}\);\s*/m,
      (match) => `${match}\n  ${marker}\n`
    );
  } else if (content.includes("cookies().delete")) {
    content = content.replace(/cookies\(\)\.delete[\s\S]*?;\s*/m, (match) => `${marker}\n  ${match}`);
  } else {
    content = content.replace(
      /(export\s+async\s+function\s+POST\s*\([^)]*\)\s*\{)/m,
      `$1
  ${marker}
`
    );
  }

  write(path, content);
}

function patchRedeemCode() {
  const path = "app/api/dashboard/subscription/redeem-code/route.ts";
  let content = read(path);
  if (!content) return console.log(`تجاوز: ${path}`);

  content = addImport(
    content,
    'import { logActivationCodeRedeemedEvent } from "@/lib/admin/activity-events";'
  );

  if (content.includes("audit-log:redeem-activation-code")) {
    return console.log(`موجود مسبقًا: ${path}`);
  }

  const marker = `// audit-log:redeem-activation-code
    await logActivationCodeRedeemedEvent({
      userId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      code,
    });
`;

  if (content.includes("await redeemActivationCode")) {
    content = content.replace(
      /const\s+result\s*=\s*await\s+redeemActivationCode\([\s\S]*?\);\s*/m,
      (match) => `${match}\n    ${marker}\n`
    );
  } else {
    content = content.replace(
      /(return\s+NextResponse\.json\(\s*\{[\s\S]*?message[\s\S]*?\}\s*\);)/m,
      `${marker}\n    $1`
    );
  }

  write(path, content);
}

function patchSimpleBankTransfer() {
  const path = "app/api/dashboard/subscription/bank-transfer/route.ts";
  let content = read(path);
  if (!content) return console.log(`تجاوز: ${path}`);

  content = addImport(
    content,
    'import { logBankTransferRequestedEvent } from "@/lib/admin/activity-events";'
  );

  if (content.includes("audit-log:bank-transfer-requested")) {
    return console.log(`موجود مسبقًا: ${path}`);
  }

  const marker = `// audit-log:bank-transfer-requested
    await logBankTransferRequestedEvent({
      userId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      amount: Number(amount || 0),
    });
`;

  if (content.includes("prisma.bankTransferRequest.create")) {
    content = content.replace(
      /await\s+prisma\.bankTransferRequest\.create\([\s\S]*?\);\s*/m,
      (match) => `${match}\n    ${marker}\n`
    );
  } else {
    content = content.replace(
      /(return\s+NextResponse\.json\(\s*\{[\s\S]*?message[\s\S]*?\}\s*\);)/m,
      `${marker}\n    $1`
    );
  }

  write(path, content);
}

function patchPlansOrder() {
  const path = "app/api/dashboard/plans/route.ts";
  let content = read(path);
  if (!content) return console.log(`تجاوز: ${path}`);

  content = addImport(
    content,
    'import { logPlanOrderCreatedEvent } from "@/lib/admin/activity-events";'
  );

  if (content.includes("audit-log:plan-order-created")) {
    return console.log(`موجود مسبقًا: ${path}`);
  }

  const marker = `// audit-log:plan-order-created
    await logPlanOrderCreatedEvent({
      userId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      planId: plan.id,
      planName: plan.name,
      billingCycle,
      amount,
    });
`;

  if (content.includes("prisma.bankTransferRequest.create")) {
    content = content.replace(
      /await\s+prisma\.bankTransferRequest\.create\([\s\S]*?\);\s*/m,
      (match) => `${match}\n    ${marker}\n`
    );
  } else if (content.includes("assignPlanToSchool")) {
    content = content.replace(
      /await\s+assignPlanToSchool\([\s\S]*?\);\s*/m,
      (match) => `${match}\n    ${marker}\n`
    );
  } else {
    content = content.replace(
      /(return\s+NextResponse\.json\(\s*\{[\s\S]*?message[\s\S]*?\}\s*\);)/m,
      `${marker}\n    $1`
    );
  }

  write(path, content);
}

function patchApproveTransfer() {
  const path = "app/api/dashboard/admin/activations/bank-transfer/[requestId]/approve/route.ts";
  let content = read(path);
  if (!content) return console.log(`تجاوز: ${path}`);

  content = addImport(
    content,
    'import { logBankTransferReviewedEvent } from "@/lib/admin/activity-events";'
  );

  if (content.includes("audit-log:bank-transfer-approved")) {
    return console.log(`موجود مسبقًا: ${path}`);
  }

  const marker = `// audit-log:bank-transfer-approved
  await logBankTransferReviewedEvent({
    actorUserId: current.user.id,
    schoolAccountId: transferRequest.schoolAccountId,
    requestId: transferRequest.id,
    status: "APPROVED",
    amount: Number(transferRequest.amount || 0),
    note: adminNote || null,
  });
`;

  if (content.includes("return NextResponse.json")) {
    content = content.replace(
      /(return\s+NextResponse\.json\(\s*\{[\s\S]*?message[\s\S]*?\}\s*\);)/m,
      `${marker}\n  $1`
    );
  }

  write(path, content);
}

function patchRejectTransfer() {
  const path = "app/api/dashboard/admin/activations/bank-transfer/[requestId]/reject/route.ts";
  let content = read(path);
  if (!content) return console.log(`تجاوز: ${path}`);

  content = addImport(
    content,
    'import { logBankTransferReviewedEvent } from "@/lib/admin/activity-events";'
  );

  if (content.includes("audit-log:bank-transfer-rejected")) {
    return console.log(`موجود مسبقًا: ${path}`);
  }

  const marker = `// audit-log:bank-transfer-rejected
  await logBankTransferReviewedEvent({
    actorUserId: current.user.id,
    schoolAccountId: transferRequest.schoolAccountId,
    requestId: transferRequest.id,
    status: "REJECTED",
    amount: Number(transferRequest.amount || 0),
    note: reason || adminNote || null,
  });
`;

  if (content.includes("return NextResponse.json")) {
    content = content.replace(
      /(return\s+NextResponse\.json\(\s*\{[\s\S]*?message[\s\S]*?\}\s*\);)/m,
      `${marker}\n  $1`
    );
  }

  write(path, content);
}

patchLogout();
patchRedeemCode();
patchSimpleBankTransfer();
patchPlansOrder();
patchApproveTransfer();
patchRejectTransfer();

console.log("انتهى ربط أحداث Audit Log الأساسية.");
