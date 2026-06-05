const fs = require("fs");

function patchFile(filePath, patcher) {
  const before = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const after = patcher(before);

  if (after !== before) {
    fs.writeFileSync(filePath, after, "utf8");
    console.log(`UPDATED: ${filePath}`);
  } else {
    console.log(`UNCHANGED: ${filePath}`);
  }
}

function ensure(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}

patchFile("prisma/schema.prisma", (text) => {
  if (!text.includes("enum CalendarReminderStatus")) {
    ensure(text, "enum EvidenceType {\n  IMAGE\n  FILE\n  LINK\n}", "لم أجد enum EvidenceType.");

    text = text.replace(
      "enum EvidenceType {\n  IMAGE\n  FILE\n  LINK\n}",
      `enum EvidenceType {
  IMAGE
  FILE
  LINK
}

enum CalendarReminderStatus {
  PENDING
  COMPLETED
  CANCELED
}

enum CalendarReminderPriority {
  NORMAL
  IMPORTANT
  URGENT
}

enum CalendarReminderLinkType {
  GENERAL
  SERVICE
  CASE
  STUDENT
}`
    );
  }

  if (!text.includes("calendarReminders CalendarReminder[]")) {
    text = text.replace(
      "  resultsAnalyses ResultsAnalysis[]\n  createdAt",
      "  resultsAnalyses   ResultsAnalysis[]\n  calendarReminders CalendarReminder[]\n  createdAt"
    );

    text = text.replace(
      "  sessions UserSession[]\n",
      "  sessions          UserSession[]\n  calendarReminders CalendarReminder[]\n"
    );

    text = text.replace(
      "  cases CaseEntry[]\n",
      "  cases             CaseEntry[]\n  calendarReminders CalendarReminder[]\n"
    );

    text = text.replace(
      "  access    ServiceAccess[]\n",
      "  access            ServiceAccess[]\n  calendarReminders CalendarReminder[]\n"
    );

    text = text.replace(
      "  evidences Evidence[]\n",
      "  evidences         Evidence[]\n  calendarReminders CalendarReminder[]\n"
    );
  }

  if (!text.includes("model CalendarReminder")) {
    ensure(text, "model ExportTemplate {", "لم أجد model ExportTemplate.");

    const model = `model CalendarReminder {
  id String @id @default(cuid())

  schoolAccountId String
  schoolAccount   SchoolAccount @relation(fields: [schoolAccountId], references: [id], onDelete: Cascade)

  createdById String?
  createdBy   User?   @relation(fields: [createdById], references: [id])

  title String
  note  String?

  status   CalendarReminderStatus   @default(PENDING)
  priority CalendarReminderPriority @default(NORMAL)
  linkType CalendarReminderLinkType @default(GENERAL)

  scheduledAt         DateTime
  remindBeforeMinutes Int?

  serviceId String?
  service   Service? @relation(fields: [serviceId], references: [id], onDelete: SetNull)

  caseEntryId String?
  caseEntry   CaseEntry? @relation(fields: [caseEntryId], references: [id], onDelete: SetNull)

  studentId String?
  student   Student? @relation(fields: [studentId], references: [id], onDelete: SetNull)

  completedAt  DateTime?
  completedById String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([schoolAccountId])
  @@index([createdById])
  @@index([status])
  @@index([priority])
  @@index([scheduledAt])
  @@index([serviceId])
  @@index([caseEntryId])
  @@index([studentId])
}

`;

    text = text.replace("model ExportTemplate {", `${model}model ExportTemplate {`);
  }

  return text;
});

patchFile("components/layout/dashboard-sidebar.tsx", (text) => {
  if (!text.includes("CalendarDays")) {
    text = text.replace(
      "  BarChart3,\n",
      "  BarChart3,\n  CalendarDays,\n"
    );
  }

  if (!text.includes('href: "/dashboard/calendar"')) {
    text = text.replace(
      'const counselorDailyLinks: SidebarLinkItem[] = [\n  { label: "الرئيسية", href: "/dashboard", icon: Home },',
      'const counselorDailyLinks: SidebarLinkItem[] = [\n  { label: "الرئيسية", href: "/dashboard", icon: Home },\n  { label: "التقويم والتنبيهات", href: "/dashboard/calendar", icon: CalendarDays },'
    );
  }

  return text;
});
