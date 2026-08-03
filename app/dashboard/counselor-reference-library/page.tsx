import { ReferenceLibraryPageShell } from "@/components/reference-library/reference-library-page-shell";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import {
  buildReferenceLibraryViewer,
  listVisibleReferenceLibraryItems,
} from "@/lib/reference-library/reference-library-public-service";
import {
  COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
} from "@/lib/reference-library/reference-library-constants";

type PageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CounselorReferenceLibraryPage({
  searchParams,
}: PageProps) {
  const current =
    await requireServiceAccessForCurrentUser(
      COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
    );

  const params = await searchParams;
  const search = String(params.q ?? "").trim();

  const viewer =
    buildReferenceLibraryViewer({
      id: current.user.id,
      role: current.user.role,
      schoolAccountId:
        current.user.schoolAccountId,
    });

  const items =
    (await listVisibleReferenceLibraryItems({
      parentId: null,
      viewer,
      search,
    })) ?? [];

  return (
    <ReferenceLibraryPageShell
      title="مكتبة الموجه الطلابي"
      description="استعرض الحقائب والأدلة والنماذج المهنية، واقرأ الملفات أو حمّلها حسب الصلاحيات."
      items={items}
      breadcrumbs={[]}
      search={search}
    />
  );
}
