import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";

export async function GET(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const page = Math.max(
    1,
    Number(url.searchParams.get("page") || 1),
  );
  const pageSize = 20;

  const where = {
    isActive: true,
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              email: {
                contains: search,
              },
            },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolAccount: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                schoolName: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({
      where,
    }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}