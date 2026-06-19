import { MobileNewCaseWorkflowPage } from "@/components/mobile/mobile-new-case-workflow-page";

export default function Page() {
  return (
    <MobileNewCaseWorkflowPage
      serviceSlug="committees-meetings"
      title="اللجان والاجتماعات"
      requiresStudent={false}
    />
  );
}