import {
  NextResponse,
} from "next/server";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  listTimetableHistory,
  redoTimetableHistory,
  undoTimetableHistory,
} from "@/lib/timetable-v3/history/timetable-history-service";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function message(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "HISTORY_CONFLICT") {
    return "تعذر التراجع لأن البيانات تغيرت بعد هذه العملية.";
  }
  if (code === "HISTORY_EMPTY") {
    return "لا توجد عملية متاحة.";
  }
  return "تعذر تنفيذ عملية سجل التعديلات.";
}

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const { projectId } = await context.params;
  try {
    const history = await listTimetableHistory(projectId, access.schoolAccountId!);
    return NextResponse.json({ success: true, ...history });
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action !== "UNDO" && body?.action !== "REDO") {
    return NextResponse.json({ success: false, error: "عملية سجل التعديلات غير صالحة." }, { status: 400 });
  }
  try {
    if (body.action === "UNDO") {
      await undoTimetableHistory(projectId, access.schoolAccountId!);
    } else {
      await redoTimetableHistory(projectId, access.schoolAccountId!);
    }
    const history = await listTimetableHistory(projectId, access.schoolAccountId!);
    return NextResponse.json({ success: true, ...history });
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 409 });
  }
}
