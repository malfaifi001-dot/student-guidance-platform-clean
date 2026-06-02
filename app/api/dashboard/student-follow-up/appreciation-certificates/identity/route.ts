import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { buildReportIdentityFromCurrentUser } from "@/lib/report-engine/report-identity-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentSession = await getCurrentSessionUser();

    if (!currentSession?.user) {
      return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    }

    const identity = buildIdentityPayload(currentSession.user);

    return NextResponse.json({ identity });
  } catch (error) {
    console.error("APPRECIATION_CERTIFICATE_IDENTITY_ERROR", error);

    return NextResponse.json(
      { error: "تعذر قراءة هوية المدرسة." },
      { status: 500 }
    );
  }
}

function buildIdentityPayload(user: unknown) {
  const identity = buildReportIdentityFromCurrentUser(user as Parameters<typeof buildReportIdentityFromCurrentUser>[0]) as any;

  return {
    ministryName: pickIdentityValue(identity.ministryName, "وزارة التعليم"),
    educationDepartment: pickIdentityValue(identity.educationDepartment, ""),
    educationOffice: pickIdentityValue(identity.educationOffice, ""),
    schoolName: pickIdentityValue(identity.schoolName, ""),
    academicYear: pickIdentityValue(identity.academicYear, ""),

    counselorName: pickIdentityValue(identity.counselorName, ""),
    counselorTitle: pickIdentityValue(identity.counselorTitle, ""),
    counselorGender: pickIdentityValue(
      identity.counselorGender ||
        identity.guideGender ||
        identity.advisorGender ||
        identity.userGender ||
        identity.gender,
      ""
    ),

    schoolLeaderName: pickIdentityValue(
      identity.schoolLeaderName || identity.principalName,
      ""
    ),
    schoolLeaderTitle: pickIdentityValue(
      identity.schoolLeaderTitle || identity.principalTitle,
      ""
    ),
    schoolLeaderGender: pickIdentityValue(
      identity.schoolLeaderGender ||
        identity.principalGender ||
        identity.leaderGender,
      ""
    ),

    ministryLogoUrl: "/uploads/school-logos/MOE.png",
    schoolLogoUrl: pickIdentityValue(identity.schoolLogoUrl, ""),
  };
}

function pickIdentityValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const cleaned = value.trim();

  if (!cleaned || cleaned === "null" || cleaned === "undefined") {
    return fallback;
  }

  return cleaned;
}

