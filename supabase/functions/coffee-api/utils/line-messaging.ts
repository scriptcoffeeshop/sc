import {
  LINE_MESSAGING_API_BASE_URL,
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
} from "./config.ts";
import { asJsonRecord, tryParseJsonRecord } from "./json.ts";

type PushMessageResult =
  | { success: true }
  | { success: false; error: string };

function buildLineApiError(status: number, responseText: string): string {
  let detail = responseText;
  const parsed = tryParseJsonRecord(responseText);
  if (parsed) {
    const baseMessage = String(parsed?.message || "").trim();
    const details = Array.isArray(parsed?.details)
      ? parsed.details.filter((item: unknown) =>
        item && typeof item === "object"
      )
      : [];
    const detailText = details.map((item: unknown) => {
      const row = asJsonRecord(item);
      const property = String(row.property || "").trim();
      const message = String(row.message || "").trim();
      if (property && message) return `${property}: ${message}`;
      return property || message;
    }).filter(Boolean).join("；");

    detail = baseMessage || detail || "未知錯誤";
    if (detailText) detail += `（${detailText}）`;
  } else {
    detail = detail || "未知錯誤";
  }
  return `LINE 推播失敗（HTTP ${status}）：${detail}`;
}

export async function pushLineFlexMessage(
  to: string,
  flexMessage: Record<string, unknown>,
  accessTokenOverride?: string,
): Promise<PushMessageResult> {
  const token = String(
    accessTokenOverride || LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
  ).trim();
  if (!token) {
    return {
      success: false,
      error:
        "尚未設定 LINE Messaging Channel Access Token（LINE_MESSAGING_CHANNEL_ACCESS_TOKEN / 覆寫 token）",
    };
  }

  const target = String(to || "").trim();
  if (!target) return { success: false, error: "缺少 LINE 目標 ID" };

  const endpoint = `${LINE_MESSAGING_API_BASE_URL}/v2/bot/message/push`;
  const payload = {
    to: target,
    messages: [flexMessage],
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    if (!response.ok) {
      return {
        success: false,
        error: buildLineApiError(response.status, responseText),
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `LINE 推播請求失敗：${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
