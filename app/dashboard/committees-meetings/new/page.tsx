import { notFound } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { resolveRuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { getServiceRuntimePolicy } from "@/lib/services/service-runtime-policy";

export default async function NewCommitteesMeetingsPage() {
  const result = await resolveRuntimeWorkflow("committees-meetings");

  if (!result) {
    notFound();
  }

  const { service, workflow } = result;
  const runtimePolicy = getServiceRuntimePolicy(service.slug);

  return (
    <DynamicFormRenderer
      workflow={workflow}
      serviceId={service.id}
      requiresStudent={runtimePolicy.requiresStudent}
      title="محضر لجنة أو اجتماع"
    />
  );
}