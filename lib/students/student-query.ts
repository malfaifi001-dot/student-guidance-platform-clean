export function activeStudentWhere<T extends Record<string, unknown>>(
  schoolAccountId: string,
  additional: T = {} as T,
) {
  return {
    schoolAccountId,
    isActive: true,
    ...additional,
  };
}
