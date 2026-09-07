export type DeepSeekMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: DeepSeekToolCall[];
};

export type DeepSeekTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type DeepSeekToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type DeepSeekCompletion = {
  content: string | null;
  toolCalls: DeepSeekToolCall[];
};

type DeepSeekChatOptions = {
  messages: DeepSeekMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: "text" | "json_object";
};

export type DeepSeekToolChatOptions = Omit<DeepSeekChatOptions, "responseFormat"> & {
  tools: DeepSeekTool[];
};

function getDeepSeekConfig() {
  const baseUrl =
    process.env.DEEPSEEK_BASE_URL?.trim() ||
    "https://api.deepseek.com";

  return {
    apiKey:
      process.env.DEEPSEEK_API_KEY?.trim() ||
      "",
    apiUrl:
      process.env.DEEPSEEK_API_URL?.trim() ||
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    model:
      process.env.DEEPSEEK_MODEL?.trim() ||
      "deepseek-chat",
  };
}

export async function callDeepSeekChat({
  messages,
  temperature = 0.2,
  maxTokens = 180,
  timeoutMs = 90000,
  responseFormat = "text",
}: DeepSeekChatOptions): Promise<string> {
  const config = getDeepSeekConfig();

  if (!config.apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY is missing.",
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    if (responseFormat === "json_object") {
      requestBody.response_format = {
        type: "json_object",
      };
    }

    const response = await fetch(
      config.apiUrl,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${config.apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
        signal: controller.signal,
      },
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      const providerMessage =
        data &&
        typeof data === "object" &&
        "error" in data &&
        data.error &&
        typeof data.error === "object" &&
        "message" in data.error &&
        typeof data.error.message === "string"
          ? data.error.message
          : "";

      console.error(
        "DEEPSEEK_REQUEST_FAILED",
        {
          status: response.status,
          providerMessage,
        },
      );

      throw new Error(
        `DeepSeek request failed with status ${response.status}.`,
      );
    }

    const content =
      data?.choices?.[0]?.message?.content;

    if (
      !content ||
      typeof content !== "string"
    ) {
      throw new Error(
        "DeepSeek returned an empty response.",
      );
    }

    return content.trim();
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "DEEPSEEK_TIMEOUT",
      );
    }

    if (isNetworkError(error)) {
      console.error("DEEPSEEK_NETWORK_ERROR", {
        code: getNetworkErrorCode(error),
      });
      throw new Error("DEEPSEEK_NETWORK_ERROR");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callDeepSeekWithTools({
  messages,
  tools,
  temperature = 0.2,
  maxTokens = 900,
  timeoutMs = 90000,
}: DeepSeekToolChatOptions): Promise<DeepSeekCompletion> {
  const config = getDeepSeekConfig();
  if (!config.apiKey) throw new Error("DEEPSEEK_API_KEY is missing.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages, tools, tool_choice: "auto", temperature, max_tokens: maxTokens, stream: false }),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`DeepSeek request failed with status ${response.status}.`);
    const message = data?.choices?.[0]?.message;
    if (!message || typeof message !== "object") throw new Error("DeepSeek returned an empty response.");
    return {
      content: typeof message.content === "string" ? message.content.trim() : null,
      toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("DEEPSEEK_TIMEOUT");
    if (isNetworkError(error)) throw new Error("DEEPSEEK_NETWORK_ERROR");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isNetworkError(error: unknown) {
  if (error instanceof TypeError) {
    return true;
  }

  return getNetworkErrorCode(error) !== "";
}

function getNetworkErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const directCode = "code" in error ? error.code : null;
  if (typeof directCode === "string") {
    return directCode;
  }

  const cause = "cause" in error ? error.cause : null;
  if (!cause || typeof cause !== "object" || !("code" in cause)) {
    return "";
  }

  return typeof cause.code === "string" ? cause.code : "";
}
