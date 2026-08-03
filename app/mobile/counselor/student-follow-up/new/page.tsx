import { MobileNewCaseWorkflowPage } from "@/components/mobile/mobile-new-case-workflow-page";

export default function Page() {
  return (
    <MobileNewCaseWorkflowPage
      serviceSlug="student-follow-up"
      title="متابعة الطلبة والمواقف اليومية الطارئة"
      requiresStudent={true}
    />
  );
}