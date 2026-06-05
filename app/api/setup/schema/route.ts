import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RUNTIME_SCHEMA_SQL } from "@/lib/database/runtime-schema-sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function splitSqlStatements(sql: string) {
  return sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.json(
      { success: false, message: "غير مصرح." },
      { status: 401 }
    );
  }

  const statements = splitSqlStatements(RUNTIME_SCHEMA_SQL);
  const executed: string[] = [];

  try {
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys=OFF");

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        executed.push(statement.slice(0, 160));
      } catch (error) {
        const message = errorMessage(error);

        if (!message.toLowerCase().includes("already exists")) {
          return NextResponse.json(
            {
              success: false,
              message: "فشل تنفيذ أحد أوامر إنشاء الجداول.",
              failedStatement: statement.slice(0, 800),
              errorMessage: message,
              executedCount: executed.length,
              statementsCount: statements.length,
            },
            { status: 500 }
          );
        }
      }
    }

    await prisma.$executeRawUnsafe("PRAGMA foreign_keys=ON");

    const [users, schools, sessions] = await Promise.all([
      prisma.user.count(),
      prisma.schoolAccount.count(),
      prisma.userSession.count(),
    ]);

    return NextResponse.json({
      success: true,
      message: "تم إنشاء جداول قاعدة البيانات في بيئة التشغيل.",
      statementsCount: statements.length,
      executedCount: executed.length,
      checks: {
        users,
        schools,
        sessions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "فشل تهيئة قاعدة البيانات.",
        errorMessage: errorMessage(error),
      },
      { status: 500 }
    );
  }
}
