const FEATURE_TOUR_PREFIX = "feature-tour:";

export function getFeatureTourStorageKey(tourKey: string) {
  return `${FEATURE_TOUR_PREFIX}${tourKey}`;
}

export function isFeatureTourCompleted(tourKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(getFeatureTourStorageKey(tourKey)) === "done";
}

export function completeFeatureTour(tourKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getFeatureTourStorageKey(tourKey), "done");
}
