const COUNSELOR_COMMITTEE_SERVICE_SLUG = "committees-meetings";

type CounselorCommitteeCandidate = {
  id: string;
  createdById?: string | null;
  status: string;
  service?: { slug?: string | null } | null;
};

export function selectCounselorCommitteeCases<T extends CounselorCommitteeCandidate>(
  cases: T[],
  ownerUserId: string,
) {
  const seen = new Set<string>();

  return cases.filter((caseEntry) => {
    if (caseEntry.createdById !== ownerUserId) return false;
    if (caseEntry.service?.slug !== COUNSELOR_COMMITTEE_SERVICE_SLUG) return false;
    if (caseEntry.status !== "SUBMITTED") return false;
    if (seen.has(caseEntry.id)) return false;

    seen.add(caseEntry.id);
    return true;
  });
}

