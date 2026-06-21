import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { CustomReportWorkspace } from "@/components/custom-report/custom-report-workspace";

type PageProps = {
  searchParams?: Promise<{
    templateId?: string;
  }>;
};

export default async function CustomReportNewPage({ searchParams }: PageProps) {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <CustomReportWorkspace
      userName={current.user.officialName || current.user.name}
      userRole={current.user.role}
      initialTemplateId={resolvedSearchParams.templateId || null}
    />
  );
}