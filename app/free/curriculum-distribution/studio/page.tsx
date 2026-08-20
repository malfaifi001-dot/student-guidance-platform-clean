import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function PublicCurriculumDistributionStudio({
  searchParams,
}: PageProps) {
  const source = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const key of ["stageId", "gradeId", "semesterId", "subjectId", "ref", "variant"]) {
    const value = first(source[key]);
    if (value) query.set(key, value.slice(0, 120));
  }
  query.set("variant", "curriculum-distribution");
  query.set("public", "1");
  if (first(source.print) === "1" || first(source.mode) === "print") {
    query.set("print", "1");
  }

  redirect(`/print/curriculum-distribution?${query.toString()}`);
}
