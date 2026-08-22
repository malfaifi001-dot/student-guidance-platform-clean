import http from "k6/http";
import { check, sleep, fail } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

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

export function setup() {
  const identifier = __ENV.TEST_IDENTIFIER;
  const password = __ENV.TEST_PASSWORD;

  if (!identifier || !password) {
    fail("TEST_IDENTIFIER and TEST_PASSWORD are required.");
  }

  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      identifier,
      password,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const loginOk = check(loginResponse, {
    "login succeeded": (r) => r.status === 200,
  });

  if (!loginOk) {
    console.error(`Login failed: ${loginResponse.status} ${loginResponse.body}`);
    fail("Unable to authenticate load-test session.");
  }

  const cookieNames = Object.keys(loginResponse.cookies);

  if (cookieNames.length === 0) {
    fail("Login succeeded but no session cookie was returned.");
  }

  const cookieHeader = cookieNames
    .map((name) => `${name}=${loginResponse.cookies[name][0].value}`)
    .join("; ");

  return { cookieHeader };
}

export default function (data) {
  const res = http.get(
    `${BASE_URL}/api/dashboard/admin/activity/metrics`,
    {
      headers: {
        Cookie: data.cookieHeader,
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
    "response under 3 seconds": (r) => r.timings.duration < 3000,
  });

  sleep(1);
}