import "server-only";
import { notFound } from "next/navigation";
import type { CurrentUser } from "./auth";

export type TenantScopedEntity = {
  tenantId?: string | null;
  schoolId?: string | null;
};

export function assertTenantAccess(user: CurrentUser, entity: TenantScopedEntity) {
  if (entity.tenantId && entity.tenantId !== user.tenantId) {
    notFound();
  }

  if (entity.schoolId && entity.schoolId !== user.schoolId) {
    notFound();
  }
}

export function tenantWhere(user: CurrentUser) {
  return {
    tenantId: user.tenantId,
    schoolId: user.schoolId,
  };
}