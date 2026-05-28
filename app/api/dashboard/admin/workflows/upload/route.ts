import { NextResponse } from "next/server";
import { parseWorkflowExcel } from "@/lib/workflow-upload/workflow-excel-parser";
import { uploadWorkflowForService } from "@/engine/workflow-upload/workflow-upload-engine";
import { dashboardServices } from "@/lib/constants/services";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const serviceSlug = String(formData.get("serviceSlug") ?? "");
    const file = formData.get("file");

    if (!serviceSlug) {
      return NextResponse.json(
        { error: "serviceSlug مطلوب." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "ملف Excel مطلوب." },
        { status: 400 }
      );
    }

    const serviceConfig = dashboardServices.find(
      (service) => service.slug === serviceSlug
    );

    if (!serviceConfig) {
      return NextResponse.json(
        { error: "الخدمة غير معروفة." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = await parseWorkflowExcel(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "لم يتم العثور على صفوف Workflow صالحة داخل الملف." },
        { status: 400 }
      );
    }

    const result = await uploadWorkflowForService({
      serviceSlug,
      serviceName: serviceConfig.title,
      rows,
    });

    return NextResponse.json({
      message: "تم رفع Workflow وتفعيله بنجاح.",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء رفع Workflow.",
      },
      { status: 400 }
    );
  }
}