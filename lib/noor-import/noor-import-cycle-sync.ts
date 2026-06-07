type SyncNoorImportCycleArgs = {
  cycleId?: string | null;
  schoolAccountId: string;
};

function computeCycleStatus(args: {
  isArchived?: boolean | null;
  totalSessions: number;
  pendingSessions: number;
  committedSessions: number;
}) {
  if (args.isArchived) {
    return "ARCHIVED";
  }

  if (args.pendingSessions > 0) {
    return "REVIEW_PENDING";
  }

  if (args.committedSessions > 0) {
    return "COMMITTED";
  }

  return "DRAFT";
}

export async function syncNoorImportCycle(db: any, args: SyncNoorImportCycleArgs) {
  if (!args.cycleId) {
    return null;
  }

  const cycle = await db.noorImportCycle.findFirst({
    where: {
      id: args.cycleId,
      schoolAccountId: args.schoolAccountId,
    },
  });

  if (!cycle) {
    return null;
  }

  const sessions = await db.studentImportSession.findMany({
    where: {
      cycleId: args.cycleId,
      schoolAccountId: args.schoolAccountId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalSessions = sessions.length;
  const pendingSessions = sessions.filter((session: any) => session.status !== "COMMITTED").length;
  const committedSessions = sessions.filter((session: any) => session.status === "COMMITTED").length;

  const latestSession = sessions[0] ?? null;
  const latestCommittedSession = sessions.find((session: any) => session.status === "COMMITTED") ?? null;

  const status = computeCycleStatus({
    isArchived: cycle.isArchived,
    totalSessions,
    pendingSessions,
    committedSessions,
  });

  return db.noorImportCycle.update({
    where: {
      id: cycle.id,
    },
    data: {
      status,
      totalSessions,
      pendingSessions,
      committedSessions,
      totalStudents: latestCommittedSession?.totalRows ?? latestSession?.totalRows ?? 0,
      latestSessionId: latestSession?.id ?? null,
      latestCommittedAt: latestCommittedSession?.committedAt ?? null,
    },
  });
}
