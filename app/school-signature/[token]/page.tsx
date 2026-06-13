import { PrincipalSignaturePublicForm } from "@/components/settings/principal-signature-public-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SchoolSignaturePage({ params }: PageProps) {
  const { token } = await params;

  return <PrincipalSignaturePublicForm token={token} />;
}