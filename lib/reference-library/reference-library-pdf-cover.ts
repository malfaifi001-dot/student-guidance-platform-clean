import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

type SchoolIdentityCoverInput = {
  schoolName: string;
  educationDepartment?: string | null;
  educationOffice?: string | null;
  city?: string | null;
  academicYear?: string | null;
  logoBuffer?: Buffer | null;
  packageTitle?: string | null;
  fileTitle: string;
  description?: string | null;
  counselorName?: string | null;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, length: number) {
  const normalized = value.trim();

  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, length - 1)}…`;
}

async function createCoverPng(
  input: SchoolIdentityCoverInput,
) {
  const logoDataUri = input.logoBuffer
    ? `data:image/png;base64,${input.logoBuffer.toString("base64")}`
    : null;

  const authority = [
    input.educationDepartment,
    input.educationOffice,
  ]
    .filter(Boolean)
    .join(" — ");

  const location = input.city
    ? escapeXml(input.city)
    : "";

  const generatedDate =
    new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());

  const svg = `
<svg
  width="1240"
  height="1754"
  viewBox="0 0 1240 1754"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="coverBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="55%" stop-color="#075985" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow
        dx="0"
        dy="12"
        stdDeviation="18"
        flood-color="#0f172a"
        flood-opacity="0.18"
      />
    </filter>
  </defs>

  <rect width="1240" height="1754" fill="#f8fafc" />
  <rect
    x="0"
    y="0"
    width="1240"
    height="420"
    fill="url(#coverBg)"
  />

  <circle
    cx="1110"
    cy="90"
    r="250"
    fill="#ffffff"
    opacity="0.06"
  />

  <circle
    cx="120"
    cy="360"
    r="180"
    fill="#ffffff"
    opacity="0.05"
  />

  <rect
    x="85"
    y="290"
    width="1070"
    height="1280"
    rx="56"
    fill="#ffffff"
    filter="url(#shadow)"
  />

  ${
    logoDataUri
      ? `
  <rect
    x="500"
    y="350"
    width="240"
    height="190"
    rx="36"
    fill="#f8fafc"
  />
  <image
    href="${logoDataUri}"
    x="530"
    y="375"
    width="180"
    height="140"
    preserveAspectRatio="xMidYMid meet"
  />`
      : `
  <rect
    x="500"
    y="350"
    width="240"
    height="190"
    rx="36"
    fill="#e0f2fe"
  />
  <text
    x="620"
    y="465"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="42"
    font-weight="700"
    fill="#0369a1"
  >هوية المدرسة</text>`
  }

  <text
    x="620"
    y="610"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="48"
    font-weight="700"
    fill="#0f172a"
  >${escapeXml(truncate(input.schoolName, 60))}</text>

  ${
    authority
      ? `
  <text
    x="620"
    y="675"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="28"
    font-weight="600"
    fill="#64748b"
  >${escapeXml(truncate(authority, 90))}</text>`
      : ""
  }

  <rect
    x="180"
    y="760"
    width="880"
    height="5"
    rx="3"
    fill="#e2e8f0"
  />

  ${
    input.packageTitle
      ? `
  <text
    x="620"
    y="865"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="30"
    font-weight="700"
    fill="#0284c7"
  >${escapeXml(truncate(input.packageTitle, 75))}</text>`
      : ""
  }

  <text
    x="620"
    y="1010"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="68"
    font-weight="800"
    fill="#0f172a"
  >${escapeXml(truncate(input.fileTitle, 55))}</text>

  ${
    input.description
      ? `
  <text
    x="620"
    y="1100"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="27"
    font-weight="500"
    fill="#64748b"
  >${escapeXml(truncate(input.description, 110))}</text>`
      : ""
  }

  <rect
    x="190"
    y="1210"
    width="860"
    height="190"
    rx="32"
    fill="#f8fafc"
    stroke="#e2e8f0"
    stroke-width="2"
  />

  <text
    x="980"
    y="1275"
    text-anchor="end"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="25"
    font-weight="700"
    fill="#334155"
  >العام الدراسي: ${escapeXml(input.academicYear || "غير محدد")}</text>

  <text
    x="980"
    y="1335"
    text-anchor="end"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="25"
    font-weight="700"
    fill="#334155"
  >إعداد: ${escapeXml(input.counselorName || "منصة التوجيه الطلابي")}</text>

  <text
    x="260"
    y="1275"
    text-anchor="start"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="25"
    font-weight="700"
    fill="#334155"
  >${location}</text>

  <text
    x="260"
    y="1335"
    text-anchor="start"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="25"
    font-weight="700"
    fill="#334155"
  >${escapeXml(generatedDate)}</text>

  <rect
    x="0"
    y="1640"
    width="1240"
    height="114"
    fill="#0f172a"
  />

  <text
    x="620"
    y="1708"
    text-anchor="middle"
    direction="rtl"
    font-family="Tahoma, Arial, sans-serif"
    font-size="29"
    font-weight="700"
    fill="#ffffff"
  >منصة التوجيه الطلابي</text>
</svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

export async function buildReferenceLibraryPdfWithCover(input: {
  originalPdf: Uint8Array;
  identity: SchoolIdentityCoverInput;
}) {
  const coverPng = await createCoverPng(
    input.identity,
  );

  const finalPdf = await PDFDocument.create();
  const coverImage =
    await finalPdf.embedPng(coverPng);

  const coverPage = finalPdf.addPage([
    595.28,
    841.89,
  ]);

  coverPage.drawImage(coverImage, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  const originalPdf =
    await PDFDocument.load(input.originalPdf, {
      ignoreEncryption: false,
    });

  const pageIndices =
    originalPdf.getPageIndices();

  const copiedPages =
    await finalPdf.copyPages(
      originalPdf,
      pageIndices,
    );

  for (const page of copiedPages) {
    finalPdf.addPage(page);
  }

  return new Uint8Array(
    await finalPdf.save({
      useObjectStreams: true,
    }),
  );
}