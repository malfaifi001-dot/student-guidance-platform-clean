import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewActivityProgramsRedirectPage({
  searchParams,
}: PageProps) {
  const params = searchParams ? await searchParams : {};
  const domain = firstParam(params.domain);

  const target = domain
    ? `/dashboard/activity-leader/programs/new?domain=${encodeURIComponent(domain)}`
    : "/dashboard/activity-leader/programs/new";

  redirect(target);
}