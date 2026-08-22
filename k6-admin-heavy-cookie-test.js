import http from "k6/http";
import { check, sleep, fail } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SESSION_COOKIE = __ENV.SESSION_COOKIE;

if (!SESSION_COOKIE) {
  fail("SESSION_COOKIE is required.");
}

export const options = {
  stages: [
    { duration: "10s", target: 50 },
    { duration: "10s", target: 100 },
    { duration: "10s", target: 250 },
    { duration: "15s", target: 500 },
    { duration: "30s", target: 500 },
    { duration: "15s", target: 0 },
  ],

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const res = http.get(
    `${BASE_URL}/api/dashboard/admin/activity/metrics`,
    {
      headers: {
        Cookie: SESSION_COOKIE,
      },
    }
  );

  check(res, {
    "metrics status is 200": (r) => r.status === 200,

    "metrics response is valid": (r) => {
      try {
        const body = r.json();
        return body && typeof body.rangeDays === "number";
      } catch {
        return false;
      }
    },

    "response under 3 seconds": (r) =>
      r.timings.duration < 3000,
  });

  sleep(1);
}