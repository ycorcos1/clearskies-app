import type { Firestore, FieldValue } from "firebase-admin/firestore";

import type {
  AIRescheduleResponse,
  AIRescheduleSuggestion,
  TrainingLevel,
} from "../types";

const TRAINING_LABEL: Record<TrainingLevel, string> = {
  student: "Student Pilot",
  private: "Private Pilot",
  instrument: "Instrument Rated Pilot",
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export type AiReschedulerErrorCode =
  | "api_error"
  | "parse_error"
  | "validation_error";

export class AiReschedulerError extends Error {
  public readonly code: AiReschedulerErrorCode;

  public readonly causeValue?: unknown;

  constructor(message: string, code: AiReschedulerErrorCode, cause?: unknown) {
    super(message);
    this.name = "AiReschedulerError";
    this.code = code;
    this.causeValue = cause;
  }
}

export interface GenerateAIRescheduleParams {
  bookingId: string;
  studentName: string;
  trainingLevel: TrainingLevel;
  scheduledDate: string;
  scheduledTime: string;
  locationName: string;
  violations: string[];
}

export interface GenerateAIRescheduleOptions {
  db: Firestore;
  serverTimestamp: () => FieldValue;
  apiKey: string;
  model: string;
  promptVersion: string;
  requestTimeoutMs?: number;
}

const ensureThreeUniqueSuggestions = (
  response: unknown
): AIRescheduleResponse => {
  if (
    typeof response !== "object" ||
    response === null ||
    Array.isArray(response)
  ) {
    throw new AiReschedulerError(
      "AI response is not a JSON object",
      "parse_error"
    );
  }

  const explanation = (response as Record<string, unknown>)
    .explanation as unknown;
  const suggestions = (response as Record<string, unknown>)
    .suggestions as unknown;

  if (typeof explanation !== "string" || !explanation.trim()) {
    throw new AiReschedulerError(
      "AI response missing explanation string",
      "parse_error"
    );
  }

  if (!Array.isArray(suggestions)) {
    throw new AiReschedulerError(
      "AI response missing suggestions array",
      "parse_error"
    );
  }

  if (suggestions.length !== 3) {
    throw new AiReschedulerError(
      `AI response must contain exactly 3 suggestions (received ${suggestions.length})`,
      "parse_error"
    );
  }

  const cleaned: AIRescheduleSuggestion[] = suggestions.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new AiReschedulerError(
        `Suggestion at index ${index} is not an object`,
        "parse_error"
      );
    }

    const date = (entry as Record<string, unknown>).date;
    const time = (entry as Record<string, unknown>).time;
    const reason = (entry as Record<string, unknown>).reason;

    if (typeof date !== "string" || !date.trim()) {
      throw new AiReschedulerError(
        `Suggestion ${index + 1} missing date string`,
        "parse_error"
      );
    }

    if (typeof time !== "string" || !time.trim()) {
      throw new AiReschedulerError(
        `Suggestion ${index + 1} missing time string`,
        "parse_error"
      );
    }

    if (typeof reason !== "string" || !reason.trim()) {
      throw new AiReschedulerError(
        `Suggestion ${index + 1} missing reason string`,
        "parse_error"
      );
    }

    return {
      date: date.trim(),
      time: time.trim(),
      reason: reason.trim(),
    };
  });

  const uniqueSet = new Set(
    cleaned.map((suggestion) => `${suggestion.date}__${suggestion.time}`)
  );

  if (uniqueSet.size !== cleaned.length) {
    throw new AiReschedulerError(
      "AI response suggestions must be unique by date and time",
      "parse_error"
    );
  }

  return {
    explanation: explanation.trim(),
    suggestions: cleaned,
  };
};

const buildPrompt = (params: GenerateAIRescheduleParams): string => {
  const {
    studentName,
    trainingLevel,
    scheduledDate,
    scheduledTime,
    locationName,
    violations,
  } = params;

  const trainingLabel = TRAINING_LABEL[trainingLevel];

  const violationLines =
    violations.length > 0
      ? violations.map((item) => `- ${item}`).join("\n")
      : "- No specific violation details were provided.";

  return [
    "You are a flight scheduling assistant for ClearSkies.",
    "",
    "Flight Details:",
    `- Student: ${studentName} (${trainingLabel})`,
    `- Original Date: ${scheduledDate} at ${scheduledTime}`,
    `- Location: ${locationName}`,
    "",
    "Weather Violations (determined by deterministic safety logic):",
    violationLines,
    "",
    "Task:",
    "1. Provide a brief, professional explanation (2-3 sentences) for why the original flight is unsafe for this pilot level.",
    "2. Suggest exactly 3 alternative date/time options within the next 7 days that would likely offer safer conditions for this training level.",
    "3. For each option, include a concise reason referencing typical weather improvements, mitigation of cited violations, or safer time of day.",
    "",
    "Constraints:",
    "- Return strictly in JSON format without additional commentary.",
    "- Suggestions must have unique combinations of date and time.",
    "- Dates must be in YYYY-MM-DD format. Times must be in HH:MM AM/PM format.",
    "- Keep the explanation and reasons professional, positive, and student-friendly.",
    "",
    "Respond in the following JSON schema:",
    "{",
    "  \"explanation\": \"string\",",
    "  \"suggestions\": [",
    "    { \"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM AM/PM\", \"reason\": \"string\" },",
    "    { \"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM AM/PM\", \"reason\": \"string\" },",
    "    { \"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM AM/PM\", \"reason\": \"string\" }",
    "  ]",
    "}",
  ].join("\n");
};

const requestOpenAi = async (
  prompt: string,
  options: Pick<
    GenerateAIRescheduleOptions,
    "apiKey" | "model" | "requestTimeoutMs"
  >
): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = options.requestTimeoutMs ?? 15000;

  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an aviation scheduling assistant that produces concise, JSON-only responses.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AiReschedulerError(
        `OpenAI API returned HTTP ${response.status}`,
        "api_error",
        errorText
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };

    const content =
      payload.choices?.[0]?.message?.content &&
      payload.choices[0].message.content.trim();

    if (!content) {
      throw new AiReschedulerError(
        "OpenAI API response missing content",
        "api_error",
        payload
      );
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new AiReschedulerError(
        "Failed to parse OpenAI JSON response",
        "parse_error",
        error
      );
    }
  } catch (error) {
    if (error instanceof AiReschedulerError) {
      throw error;
    }

    if ((error as { name?: string }).name === "AbortError") {
      throw new AiReschedulerError(
        "OpenAI request timed out",
        "api_error",
        error
      );
    }

    throw new AiReschedulerError("OpenAI request failed", "api_error", error);
  } finally {
    clearTimeout(timeoutHandle);
  }
};

export const generateAIReschedule = async (
  params: GenerateAIRescheduleParams,
  options: GenerateAIRescheduleOptions
): Promise<AIRescheduleResponse> => {
  const prompt = buildPrompt(params);
  const response = await requestOpenAi(prompt, {
    apiKey: options.apiKey,
    model: options.model,
    requestTimeoutMs: options.requestTimeoutMs,
  });

  const parsed = ensureThreeUniqueSuggestions(response);

  const collectionRef = options.db
    .collection("bookings")
    .doc(params.bookingId)
    .collection("aiReschedules");

  await collectionRef.add({
    explanation: parsed.explanation,
    suggestions: parsed.suggestions,
    model: options.model,
    promptVersion: options.promptVersion,
    createdAt: options.serverTimestamp(),
    trainingLevel: params.trainingLevel,
    violations: params.violations,
  });

  return parsed;
};

