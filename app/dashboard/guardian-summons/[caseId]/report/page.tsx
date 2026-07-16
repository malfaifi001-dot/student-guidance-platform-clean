import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function appendSearchParams(searchParams: Record<string, string | string[] | undefined>) {
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

  redirect(
    `/print/guardian-summons/${encodeURIComponent(caseId)}${appendSearchParams(
      query,
    )}`,
  );
}
