import { MobileNewCaseWorkflowPage } from "@/components/mobile/mobile-new-case-workflow-page";

export default function Page() {
  return (
    <MobileNewCaseWorkflowPage
      serviceSlug="guidance-programs"
      title="البرامج الإرشادية"
      requiresStudent={false}
    />
  );
}