import { redirect } from "next/navigation";

type TeacherPortfolioPreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeacherPortfolioPreviewPage({
  searchParams,
}: TeacherPortfolioPreviewPageProps) {
  const query = await searchParams;
  const targetParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (key === "print") continue;

    if (Array.isArray(value)) {
      value.forEach((item) => targetParams.append(key, item));
    } else if (value !== undefined) {
      targetParams.append(key, value);
    }
  }

  const queryString = targetParams.toString();
  redirect(`/teacher/portfolio/print${queryString ? `?${queryString}` : ""}`);
}
