import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      slug: {
        not: "assessment-center",
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      workflows: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            workflowType: "asc",
          },
          {
            version: "desc",
          },
        ],
        select: {
          id: true,
          name: true,
          version: true,
          workflowType: true,
          status: true,
          isActive: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    services,
  });
}