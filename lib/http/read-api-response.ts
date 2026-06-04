export async function readApiResponse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("تعذر قراءة استجابة الخادم بصيغة JSON.");
    }
  }

  if (!response.ok) {
    throw new Error(text?.trim() || `تعذر تنفيذ الطلب. رمز الاستجابة: ${response.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { message: text } as T;
  }
}
