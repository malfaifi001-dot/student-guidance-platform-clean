import "server-only";

import { notFound } from "next/navigation";
import type { CurrentUser } from "./auth";

export type TenantScopedEntity = {
  tenantId?: string | null;
  schoolId?: string | null;
  schoolAccountId?: string | null;
};

function getEntitySchoolAccountId(entity: TenantScopedEntity) {
  return entity.schoolAccountId || entity.schoolId || entity.tenantId || null;
}

export function assertTenantAccess(user: CurrentUser, entity: TenantScopedEntity) {
  if (user.role === "ADMIN") {
    return;
  }

  const userSchoolAccountId = user.schoolAccountId || user.schoolId || user.tenantId;
  const entitySchoolAccountId = getEntitySchoolAccountId(entity);

  if (!userSchoolAccountId || !entitySchoolAccountId) {
    notFound();
  }

  if (entitySchoolAccountId !== userSchoolAccountId) {
    notFound();
  }
}

export function tenantWhere(user: CurrentUser) {
  if (user.role === "ADMIN") {
    return {};
  }

  if (!user.schoolAccountId) {
    return {
      schoolAccountId: "__missing_school_account__",
    };
  }

  return {
    schoolAccountId: user.schoolAccountId,
  };
}

export function legacyTenantWhere(user: CurrentUser) {
  if (user.role === "ADMIN") {
    return {};
  }

  return {
    tenantId: user.schoolAccountId,
    schoolId: user.schoolAccountId,
  };
}
