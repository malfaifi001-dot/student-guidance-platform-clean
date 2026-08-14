import type {
  TimefoldSolveRequestV1,
  TimefoldSolveResultV1,
} from "./timefold-v1-types";

const DEFAULT_TIMEFOLD_URL =
  "http://127.0.0.1:8091";

export class TimefoldV1Error
  extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly payload?: unknown,
  ) {
    super(
      message,
    );

    this.name =
      "TimefoldV1Error";
  }
}

export async function solveWithTimefoldV1(
  request: TimefoldSolveRequestV1,
): Promise<TimefoldSolveResultV1> {
  const baseUrl =
    process.env.TIMEFOLD_SOLVER_URL?.trim() ||
    DEFAULT_TIMEFOLD_URL;

  let response:
    Response;

  try {
    response =
      await fetch(
        `${baseUrl}/api/v1/solve`,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify(
              request,
            ),

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              75_000,
            ),
        },
      );
  }
  catch (error) {
    throw new TimefoldV1Error(
      error instanceof Error
        ? `TIMEFOLD_V1_UNAVAILABLE: ${error.message}`
        : "TIMEFOLD_V1_UNAVAILABLE",
    );
  }

  const payload =
    await response
      .json()
      .catch(
        () =>
          null,
      );

  if (
    !response.ok
  ) {
    throw new TimefoldV1Error(
      "TIMEFOLD_V1_REQUEST_FAILED",
      response.status,
      payload,
    );
  }

  return payload as
    TimefoldSolveResultV1;
}