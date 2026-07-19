import { notFound } from "next/navigation";
import { ReferenceLibraryPageShell } from "@/components/reference-library/reference-library-page-shell";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import {
  buildReferenceLibraryBreadcrumbs,
  buildReferenceLibraryViewer,
  getVisibleReferenceLibraryItem,
  listVisibleReferenceLibraryItems,
} from "@/lib/reference-library/reference-library-public-service";
import {
  COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
} from "@/lib/reference-library/reference-library-constants";

type PageProps = {
  params: Promise<{
    itemId: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CounselorReferenceLibraryFolderPage({
  params,
  searchParams,
}: PageProps) {
  const current =
    await requireServiceAccessForCurrentUser(
      COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
    );

  const { itemId } = await params;
  const query = await searchParams;
  const search = String(query.q ?? "").trim();

  const viewer =
    buildReferenceLibraryViewer({
      id: current.user.id,
      role: current.user.role,
      schoolAccountId:
        current.user.schoolAccountId,
    });

  const folder =
    await getVisibleReferenceLibraryItem({
      itemId,
      viewer,
    }).catch(() => null);

  if (
    !folder ||
    folder.itemType !== "FOLDER"
  ) {
    notFound();
  }

  const [items, breadcrumbs] =
    await Promise.all([
      listVisibleReferenceLibraryItems({
        parentId: folder.id,
        viewer,
        search,
      }),
      buildReferenceLibraryBreadcrumbs(
        folder.id,
      ),
    ]);

  return (
    <ReferenceLibraryPageShell
      title={folder.title}
      description={
        folder.description ||
        "الأقسام والملفات المتاحة داخل هذه الحقيبة."
      }
      items={items ?? []}
      breadcrumbs={breadcrumbs}
      search={search}
    />
  );
}