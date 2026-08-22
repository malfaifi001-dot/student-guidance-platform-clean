import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 100 },
    { duration: "10s", target: 250 },
    { duration: "10s", target: 500 },
    { duration: "15s", target: 750 },
    { duration: "15s", target: 1000 },
    { duration: "30s", target: 1000 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const res = http.get("http://localhost:3000");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response under 1.5s": (r) => r.timings.duration < 1500,
  });

  sleep(1);
}