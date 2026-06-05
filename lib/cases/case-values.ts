import { Prisma} from "@prisma/client";

export type SerializableCaseValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, unknown>;

export type RuntimeCaseValues = Record<string, SerializableCaseValue>;

export function serializeCaseValues(values: RuntimeCaseValues) {
  return Object.entries(values).map(([fieldKey, value]) => {
    const isPrimitive =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean";

    const isJsonValue =
      Array.isArray(value) ||
      (typeof value === "object" && value !== null);

    return {
      fieldKey,
      value: isPrimitive ? String(value) : null,
      ...(isJsonValue
        ? { jsonValue: value as Prisma.InputJsonValue }
        : {}),
    };
  });
}