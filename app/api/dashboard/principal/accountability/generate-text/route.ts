import { NextResponse } from "next/server";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { generateAccountabilityOfficialText } from "@/lib/accountability/accountability-ai";

export async function POST(request: Request) {
  const access = await requirePrincipalApi();
  if (!access.ok) return access.response;
  const serviceGuard = await requireServiceAccessApi(ACCOUNTABILITY_SERVICE.slug, { allowPrincipal: true });
  if (serviceGuard) return serviceGuard;

  try {
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId || "");
    const typeKey = String(body?.accountabilityType || body?.typeKey || "").trim();
    const values = body?.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values as Record<string, unknown> : {};
    const published = await getRuntimeWorkflowByServiceSlug(ACCOUNTABILITY_SERVICE.slug);
    if (!published || published.workflow.id !== workflowId) throw new Error("ACCOUNTABILITY_WORKFLOW_INVALID");
    const steps = published.workflow.steps.slice().sort((a, b) => a.order - b.order);
    if (steps.length < 3) throw new Error("ACCOUNTABILITY_WORKFLOW_STEPS_INVALID");
    const firstStep = steps[0];
    const typeField = firstStep.fields.find((field) => field.key === "accountability_type");
    if (!typeField || !typeKey || !typeField.options.some((option) => option.value === typeKey)) throw new Error("ACCOUNTABILITY_TYPE_INVALID");
    const allowedKeys = new Set(firstStep.fields.map((field) => field.key));
    if (Object.keys(values).some((key) => !allowedKeys.has(key) && !key.endsWith("__other"))) throw new Error("ACCOUNTABILITY_FIELDS_INVALID");
    const visibleFields = firstStep.fields.filter((field) => isConditionalWorkflowFieldVisible(field, values) && field.key !== "official_text" && field.key !== "officialText" && field.key !== "statement_text" && field.key !== "official_statement");
    for (const field of visibleFields) {
      if (field.isRequired && (values[field.key] === undefined || values[field.key] === null || String(values[field.key]).trim() === "")) throw new Error(`REQUIRED_FIELD:${field.key}`);
    }
    const officialText = await generateAccountabilityOfficialText({ accountabilityType: typeKey, fields: visibleFields, values });
    return NextResponse.json({ success: true, officialText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ACCOUNTABILITY_TEXT_GENERATION_FAILED";
    const safe = message.startsWith("REQUIRED_FIELD:") ? "يرجى استكمال الحقول المطلوبة أولًا." : message.includes("DEEPSEEK") ? "تعذر توليد النص الآن. حاول مرة أخرى." : "تعذر توليد نص المساءلة.";
    return NextResponse.json({ success: false, error: safe }, { status: 400 });
  }
}
