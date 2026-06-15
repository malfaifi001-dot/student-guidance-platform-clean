type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekChatOptions = {
  messages: DeepSeekMessage[];
  temperature?: number;
  maxTokens?: number;
};

function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

export async function callDeepSeekChat({
  messages,
  temperature = 0.2,
  maxTokens = 180,
}: DeepSeekChatOptions): Promise<string> {
  const config = getDeepSeekConfig();

  if (!config.apiKey) {
    throw new Error("DEEPSEEK_API_KEY is missing.");
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek returned an empty response.");
  }

  return content.trim();
}