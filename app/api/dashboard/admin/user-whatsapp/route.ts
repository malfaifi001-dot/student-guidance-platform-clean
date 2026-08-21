import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";

export const dynamic = "force-dynamic";

const ROLE_VALUES = new Set(Object.values(UserRole));

export async function GET(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(url.searchParams.get("pageSize") || "25", 10) || 25));
  const search = String(url.searchParams.get("search") || "").trim().slice(0, 100);
  const requestedRole = String(url.searchParams.get("role") || "").trim().toUpperCase();
  const role = ROLE_VALUES.has(requestedRole as UserRole) ? requestedRole as UserRole : null;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { officialName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    } : {}),
  };

  const [users, total, withPhone] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ officialName: "asc" }, { name: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, officialName: true, email: true, role: true, phone: true },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, phone: { not: null } } }),
  ]);

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.officialName || user.name || user.email,
      email: user.email,
      role: user.role,
      phone: user.phone,
    })),
    stats: { total, withPhone, withoutPhone: total - withPhone },
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
