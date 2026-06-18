import {
  renderCertificateDocumentHtml,
  type CertificateRenderRecord,
  type CertificateRenderOptions,
} from "@/lib/certificates/certificate-renderer";

export type BatchCertificateRenderRecord = CertificateRenderRecord & {
  batchOrder?: number | null;
};

function extractHead(fullHtml: string) {
  const match = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);

  return match?.[1] || "";
}

function extractBody(fullHtml: string) {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return match?.[1] || fullHtml;
}

export function renderCertificatesBatchDocumentHtml(
  certificates: BatchCertificateRenderRecord[],
  options: CertificateRenderOptions = {},
) {
  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  if (!safeCertificates.length) {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>دفعة شهادات</title>
</head>
<body>
  <p>لا توجد شهادات في هذه الدفعة.</p>
</body>
</html>`;
  }

  const rendered = safeCertificates.map((certificate, index) => {
    const html = renderCertificateDocumentHtml(certificate, options);
    const body = extractBody(html);

    return body.replace(
      'class="certificate-shell"',
      `class="certificate-shell batch-certificate-page${index === safeCertificates.length - 1 ? " last" : ""}"`,
    );
  });

  const firstHtml = renderCertificateDocumentHtml(safeCertificates[0], options);
  const head = extractHead(firstHtml);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
${head}
<style>
  .batch-certificate-page {
    page-break-after: always;
    break-after: page;
  }

  .batch-certificate-page.last {
    page-break-after: auto;
    break-after: auto;
  }
</style>
</head>
<body>
${rendered.join("\n")}
</body>
</html>`;
}
