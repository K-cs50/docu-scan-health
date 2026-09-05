// Server-only Lovable AI Gateway (Gemini) helper. Never imported by client code.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const EXTRACTION_MODEL = "google/gemini-3.7-flash";
export const SUMMARY_MODEL = "google/gemini-3.7-flash";

export class GatewayError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export async function callGemini(opts: {
  model: string;
  system: string;
  content: ContentBlock[] | string;
}): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    throw new GatewayError(401, "AI is not configured for this project (missing API key).");
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.content },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? body;
    } catch {
      /* keep raw body */
    }
    throw new GatewayError(res.status, message.slice(0, 400) || `AI request failed (${res.status})`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new GatewayError(502, "AI returned an empty response.");
  return text;
}

export function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const body = fence ? fence[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return body;
  return body.slice(start, end + 1);
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
