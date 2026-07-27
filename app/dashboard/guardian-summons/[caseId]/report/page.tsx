import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function appendSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export default async function GuardianSummonsReportCompatibilityPage({
  params,
  searchParams,
}: PageProps) {
  const [{ caseId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);

  const printRequested =
    query.print === "1" ||
    (Array.isArray(query.print) && query.print.includes("1"));

  redirect(
    printRequested
      ? `/print/guardian-summons/${encodeURIComponent(caseId)}?print=1`
      : `/dashboard/guardian-summons/${encodeURIComponent(caseId)}/preview${appendSearchParams(query)}`,
  );
}
