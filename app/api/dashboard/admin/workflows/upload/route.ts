import { NextResponse } from "next/server";
import { parseWorkflowExcel } from "@/lib/workflow-upload/workflow-excel-parser";
import { uploadWorkflowForService } from "@/engine/workflow-upload/workflow-upload-engine";
import { dashboardServices } from "@/lib/constants/services";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { normalizeWorkflowType } from "@/lib/workflows/workflow-types";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";

export const runtime = "nodejs";

const MAX_WORKFLOW_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_WORKFLOW_FILE_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "",
]);

function hasExcelExtension(fileName: string) {
  return /\.(xlsx|xls)$/i.test(fileName);
}

function validateWorkflowFile(file: File) {
  if (file.size <= 0) {
    return "ملف Workflow فارغ.";
  }

  if (file.size > MAX_WORKFLOW_FILE_SIZE) {
    return "حجم ملف Workflow يجب ألا يتجاوز 5MB.";
  }

  if (!hasExcelExtension(file.name)) {
    return "صيغة ملف Workflow غير مدعومة. استخدم xlsx أو xls.";
  }

  if (!ALLOWED_WORKFLOW_FILE_TYPES.has(file.type)) {
    return "نوع ملف Workflow غير مسموح.";
  }

  return null;
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const admin = current?.user;

  try {
    const formData = await request.formData();

    const serviceSlug = String(formData.get("serviceSlug") ?? "").trim();
    const workflowType = normalizeWorkflowType(
      String(formData.get("workflowType") ?? "")
    );

    const file = formData.get("file");

    if (!serviceSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "serviceSlug مطلوب.",
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "ملف Excel مطلوب.",
        },
        { status: 400 }
      );
    }

    const validationError = validateWorkflowFile(file);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 }
      );
    }

    const serviceConfig = dashboardServices.find(
      (service) => service.slug === serviceSlug
    );

    if (!serviceConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "الخدمة غير معروفة.",
        },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = await parseWorkflowExcel(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على صفوف Workflow صالحة داخل الملف.",
        },
        { status: 400 }
      );
    }

    const result = await uploadWorkflowForService({
      serviceSlug,
      serviceName: serviceConfig.title,
      rows,
      workflowType,
    });

    await logAdminActivity({
      actorUserId: admin?.id || null,
      schoolAccountId: admin?.schoolAccountId || null,
      category: "WORKFLOW",
      action: "workflow-uploaded",
      severity: "SUCCESS",
      title: `تم رفع Workflow للخدمة ${serviceConfig.title}`,
      details: {
        serviceSlug,
        workflowType,
        fileName: file.name,
        fileSize: file.size,
        rowsCount: rows.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم رفع Workflow وتفعيله بنجاح.",
      result,
    });
  } catch (error) {
    await logAdminActivity({
      actorUserId: admin?.id || null,
      schoolAccountId: admin?.schoolAccountId || null,
      category: "WORKFLOW",
      action: "workflow-upload-failed",
      severity: "ERROR",
      title: "فشل رفع Workflow",
      details: {
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء رفع Workflow.",
      },
      { status: 400 }
    );
  }
}
