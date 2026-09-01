import type {
  DocumentSignature,
} from "@/lib/document-engine/document-types";

type DocumentSignaturesProps = {
  signatures: DocumentSignature[];
};

export function DocumentSignatures({
  signatures,
}: DocumentSignaturesProps) {
  if (!signatures.length) {
    return null;
  }

  const centered =
    signatures.length === 1;

  return (
    <div
      className={[
        "grid gap-8",
        centered
          ? "grid-cols-1 place-items-center"
          : "grid-cols-2",
      ].join(" ")}
      data-document-signatures
    >
      {signatures.map(
        (signature) => (
          <div
            key={signature.id}
            className={[
              "flex min-w-[55mm] flex-col items-center text-center",
              centered
                ? "max-w-[75mm]"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-document-signature
            data-document-signature-role={
              signature.role
            }
          >
            <div className="flex h-[18mm] items-end justify-center">
              {signature.imageUrl ? (
                <img
                  src={
                    signature.imageUrl
                  }
                  alt={
                    signature.name ??
                    signature.role
                  }
                  className="max-h-[17mm] max-w-[55mm] object-contain"
                />
              ) : (
                <div className="w-[42mm] border-b border-dashed border-slate-300" />
              )}
            </div>

            {signature.name ? (
              <div className="mt-2 text-[12px] font-bold text-slate-900">
                {
                  signature.name
                }
              </div>
            ) : null}

            {signature.title ? (
              <div className="mt-0.5 text-[10px] text-slate-500">
                {
                  signature.title
                }
              </div>
            ) : null}

            {!signature.title ? (
              <div className="mt-0.5 text-[10px] text-slate-500">
                {
                  signature.role
                }
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}