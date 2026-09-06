import "server-only";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import type { RuntimeField } from "@/engine/runtime/runtime-resolver";

export type AccountabilityGenerationInput = {
  accountabilityType: string;
  fields: Pick<RuntimeField, "key" | "label" | "type" | "isRequired" | "options">[];
  values: Record<string, unknown>;
};

function printableValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.map(printableValue).filter(Boolean).join("، ");
  if (typeof value === "object") return "";
  return String(value).trim();
}

export async function generateAccountabilityOfficialText(input: AccountabilityGenerationInput) {
  const facts = input.fields
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: printableValue(input.values[field.key]),
      option: field.options.find((option) => option.value === input.values[field.key])?.label || undefined,
    }))
    .filter((item) => item.value || item.option);

  const content = await callDeepSeekChat({
    temperature: 0.1,
    maxTokens: 220,
    messages: [
      {
        role: "system",
        content: "أنت محرر إداري في مدرسة سعودية. اكتب نص مساءلة رسميًا بالعربية الفصحى وبنبرة مدرسية سعودية رسمية، محايدة وغير اتهامية. اعتمد فقط على الوقائع المنظمة المقدمة. اطلب الإفادة أو التوضيح لاستكمال المتابعة. لا تخترع تاريخًا أو وقتًا أو واقعة، ولا تذكر حكمًا تأديبيًا أو ادعاءً قانونيًا أو توصية بعقوبة. أعد نصًا واحدًا فقط من 2 إلى 5 جمل قصيرة، دون عنوان أو نقاط أو علامات اقتباس.",
      },
      {
        role: "user",
        content: JSON.stringify({ accountabilityType: input.accountabilityType, facts }),
      },
    ],
  });

  return content.replace(/^```(?:text|arabic)?\s*/i, "").replace(/\s*```$/i, "").replace(/^['"“”]+|['"“”]+$/g, "").trim();
}
