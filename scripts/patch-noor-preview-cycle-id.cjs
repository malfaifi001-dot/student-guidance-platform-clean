const fs = require("fs");

const filePath = "app/api/dashboard/data-center/noor-import/preview/route.ts";

if (!fs.existsSync(filePath)) {
  throw new Error("لم يتم العثور على preview route");
}

let content = fs.readFileSync(filePath, "utf8");

if (!content.includes('const cycleId = String(formData.get("cycleId") || "").trim() || null;')) {
  content = content.replace(
    'const term = String(formData.get("term") || "").trim() || null;',
    'const term = String(formData.get("term") || "").trim() || null;\n    const cycleId = String(formData.get("cycleId") || "").trim() || null;'
  );
}

if (!content.includes('cycleId,')) {
  content = content.replace(
    'schoolAccountId: context.schoolAccountId,',
    'schoolAccountId: context.schoolAccountId,\n          cycleId,'
  );
}

if (!content.includes('NOOR_PREVIEW_CYCLE_UPDATE_MARKER')) {
  content = content.replace(
    'await writeNoorImportActivity({',
    `if (cycleId) {
      await prisma.noorImportCycle.update({
        where: {
          id: cycleId,
        },
        data: {
          status: "REVIEW_PENDING",
          latestSessionId: session.id,
          totalSessions: {
            increment: 1,
          },
          pendingSessions: {
            increment: 1,
          },
        },
      }).catch(() => null);
    }

    // NOOR_PREVIEW_CYCLE_UPDATE_MARKER
    await writeNoorImportActivity({`
  );
}

fs.writeFileSync(filePath, content, "utf8");
console.log("تم ربط Preview ببطاقة بيانات نور.");
