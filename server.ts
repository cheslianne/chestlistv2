import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PRIMARY_MODEL_NAME = (process.env.GEMINI_MODEL || '').trim() || 'gemini-3.1-flash-lite';
const SECONDARY_MODEL_NAME =
  PRIMARY_MODEL_NAME === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PRIMARY_HEDGE_DELAY_MS = 3500;
const DEFAULT_TOTAL_TIMEOUT_MS = 7800;
const RETRY_TOTAL_TIMEOUT_MS = 11600;
const NOTE_ATTEMPT_TIMEOUT_MS = 10000;
const SERVER_DAILY_HIGH_HEDGE_THRESHOLD = 80;
const SERVER_RPM_HIGH_HEDGE_THRESHOLD = 4;

const CATEGORIZE_SYSTEM_PROMPT = `Classify one Philippine personal expense using ONLY the provided category and subcategory keys (English, Tagalog, Taglish, local food/brands/places/apps). Angkas/JoyRide/Move It/Grab/InDrive/Lalamove are 'transport' if present ('motor_taxi' for Angkas/JoyRide/Move It, 'grab_taxi' for Grab/InDrive, else null). Use amount as a hint if given (e.g., ~PHP 900 for 'bicol express' points to train 'transport' rather than a single meal). Use the amount only as a hint. If the amount does not fit a specific subcategory (for example a large amount for a short city fare), return subcategory null instead of guessing. Report honest confidence. Use 0.9 or higher only when the expense clearly belongs to one category. Use 0.6 to 0.8 when the text is ambiguous or could belong to two categories (for example a name that is both a dish and a transport line like 'bicol express', a general store, or a single vague word). If the text could reasonably belong to two or more categories, cap category_confidence at 0.8, even when an amount is given. Use below 0.5 when you are guessing. If the text is vague or generic (such as 'misc', 'stuff', 'item', 'others') so you cannot tell what was actually bought, set category_confidence below 0.5 even when returning 'others'. If the primary category is clear but no subcategory fits, set subcategory to null and subcategory_confidence to 0. Do not give the same confidence to every answer. Reply with JSON only, no explanations.`;

interface SubcategoryPayload {
  key: string;
  label: string;
}

interface CategoryPayload {
  key: string;
  label: string;
  subcategories?: SubcategoryPayload[];
}

interface CategorizeRequestBody {
  description?: string;
  merchant?: string | null;
  amountCentavos?: number | null;
  useSubcategories?: boolean;
  isRetry?: boolean;
  disableHedge?: boolean;
  categories?: CategoryPayload[];
}

type ServerAiErrorCode =
  | 'missing_api_key'
  | 'invalid_key'
  | 'invalid_model'
  | 'quota_exceeded'
  | 'timeout'
  | 'bad_response'
  | 'server_error';

let cachedAiClient: GoogleGenAI | null = null;
let cachedAiKey: string | null = null;

function isGeminiKeyConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim().length > 0);
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    cachedAiClient = null;
    cachedAiKey = null;
    return null;
  }
  const trimmed = apiKey.trim();
  if (!cachedAiClient || cachedAiKey !== trimmed) {
    cachedAiKey = trimmed;
    cachedAiClient = new GoogleGenAI({
      apiKey: trimmed,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        retryOptions: {
          attempts: 1,
        },
      },
    });
  }
  return cachedAiClient;
}

function getThinkingConfigForModel(model: string) {
  if (model === 'gemini-3.1-flash-lite') {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  return { thinkingLevel: ThinkingLevel.LOW };
}

function getMaxOutputTokensForCategorize(model: string): number {
  return model === 'gemini-3.1-flash-lite' ? 120 : 240;
}

function classifyGeminiError(err: any): {
  status: number;
  code: ServerAiErrorCode;
  message: string;
} {
  const rawMsg = err instanceof Error ? err.message : String(err || '');
  const lower = rawMsg.toLowerCase();
  const rawStatus =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.code === 'number'
      ? err.code
      : undefined;

  if (
    err?.name === 'AbortError' ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('deadline_exceeded') ||
    rawStatus === 504
  ) {
    return {
      status: 504,
      code: 'timeout',
      message: 'AI request timed out.',
    };
  }

  if (
    rawStatus === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return {
      status: 429,
      code: 'quota_exceeded',
      message: 'AI rate limit or quota exceeded.',
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('api key expired') ||
    lower.includes('permission_denied') ||
    rawStatus === 401 ||
    rawStatus === 403
  ) {
    return {
      status: 403,
      code: 'invalid_key',
      message: 'Gemini API key is invalid or unauthorized.',
    };
  }

  if (
    rawStatus === 404 ||
    lower.includes('not_found') ||
    lower.includes('is not found for api version') ||
    (lower.includes('model') &&
      (lower.includes('not found') ||
        lower.includes('unsupported') ||
        lower.includes('not supported') ||
        lower.includes('invalid')))
  ) {
    return {
      status: 502,
      code: 'invalid_model',
      message: 'Requested Gemini model is unavailable or unsupported.',
    };
  }

  return {
    status: 502,
    code: 'server_error',
    message: 'AI categorization service failed.',
  };
}

const DEFAULT_DEV_CATEGORIES: CategoryPayload[] = [
  {
    key: 'food',
    label: 'Food',
    subcategories: [
      { key: 'breakfast', label: 'Breakfast' },
      { key: 'lunch', label: 'Lunch' },
      { key: 'dinner', label: 'Dinner' },
      { key: 'merienda', label: 'Merienda' },
      { key: 'eating_out', label: 'Eating out' },
      { key: 'beverages', label: 'Beverages' },
      { key: 'cravings', label: 'Cravings' },
      { key: 'groceries', label: 'Groceries' },
    ],
  },
  {
    key: 'social_life',
    label: 'Social Life',
    subcategories: [
      { key: 'friends', label: 'Friends' },
      { key: 'family', label: 'Family' },
      { key: 'org_fellowship', label: 'Org / Fellowship' },
      { key: 'dates', label: 'Dates' },
      { key: 'treats', label: 'Treats (libre)' },
    ],
  },
  {
    key: 'pets',
    label: 'Pets',
    subcategories: [
      { key: 'pet_food', label: 'Pet food' },
      { key: 'vet', label: 'Vet' },
      { key: 'grooming', label: 'Grooming' },
      { key: 'supplies', label: 'Supplies' },
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    subcategories: [
      { key: 'jeep', label: 'Jeep' },
      { key: 'bus', label: 'Bus' },
      { key: 'tricycle', label: 'Tricycle' },
      { key: 'mrt_lrt', label: 'MRT / LRT' },
      { key: 'grab_taxi', label: 'Grab / Taxi' },
      { key: 'motor_taxi', label: 'Motor taxi' },
      { key: 'e_trike', label: 'E-trike' },
      { key: 'gas', label: 'Gas' },
      { key: 'parking', label: 'Parking' },
      { key: 'beep_card', label: 'Beep card' },
    ],
  },
  {
    key: 'culture',
    label: 'Culture',
    subcategories: [
      { key: 'movies', label: 'Movies' },
      { key: 'music', label: 'Music' },
      { key: 'books', label: 'Books' },
      { key: 'games', label: 'Games' },
      { key: 'apps_subscriptions', label: 'Apps & subscriptions' },
      { key: 'events', label: 'Events' },
    ],
  },
  {
    key: 'household',
    label: 'Household',
    subcategories: [
      { key: 'appliances', label: 'Appliances' },
      { key: 'furniture', label: 'Furniture' },
      { key: 'kitchen', label: 'Kitchen' },
      { key: 'toiletries', label: 'Toiletries' },
      { key: 'laundry', label: 'Laundry' },
      { key: 'dues', label: 'Dues' },
      { key: 'repairs', label: 'Repairs' },
    ],
  },
  {
    key: 'apparel',
    label: 'Apparel',
    subcategories: [
      { key: 'clothing', label: 'Clothing' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'accessories', label: 'Accessories' },
    ],
  },
  {
    key: 'beauty',
    label: 'Beauty',
    subcategories: [
      { key: 'cosmetics', label: 'Cosmetics' },
      { key: 'skincare', label: 'Skincare' },
      { key: 'salon', label: 'Salon' },
    ],
  },
  {
    key: 'health',
    label: 'Health',
    subcategories: [
      { key: 'medicine', label: 'Medicine' },
      { key: 'vitamins', label: 'Vitamins' },
      { key: 'hygiene', label: 'Hygiene' },
      { key: 'clinic_hospital', label: 'Clinic / Hospital' },
      { key: 'dental', label: 'Dental' },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    subcategories: [
      { key: 'tuition', label: 'Tuition' },
      { key: 'school_supplies', label: 'School supplies' },
      { key: 'printing', label: 'Printing' },
      { key: 'textbooks', label: 'Textbooks' },
      { key: 'projects', label: 'Projects' },
      { key: 'thesis', label: 'Thesis' },
    ],
  },
  {
    key: 'bills',
    label: 'Bills',
    subcategories: [
      { key: 'load', label: 'Load' },
      { key: 'internet', label: 'Internet' },
      { key: 'electricity', label: 'Electricity' },
      { key: 'water', label: 'Water' },
      { key: 'rent', label: 'Rent' },
    ],
  },
  {
    key: 'gift',
    label: 'Gift',
    subcategories: [
      { key: 'birthday', label: 'Birthday' },
      { key: 'holiday', label: 'Holiday' },
      { key: 'other_gifts', label: 'Other gifts' },
    ],
  },
  {
    key: 'others',
    label: 'Others',
    subcategories: [],
  },
];

type ModelRole = 'primary' | 'fallback';

function logAiRequest(entry: {
  feature: 'categorize_expense' | 'analyze_note';
  modelUsed: ModelRole | 'none';
  ttfbMs: number | null;
  latencyMs: number;
  status: string;
  hedgeFired: boolean;
  saw429: boolean;
  retried: boolean;
}) {
  console.info('[Chestlist][AI]', entry);
}

class AiGenerationFailure extends Error {
  causeError: unknown;
  hedgeFired: boolean;
  saw429: boolean;

  constructor(causeError: unknown, hedgeFired: boolean, saw429: boolean) {
    super(causeError instanceof Error ? causeError.message : String(causeError || 'AI failure'));
    this.name = 'AiGenerationFailure';
    this.causeError = causeError;
    this.hedgeFired = hedgeFired;
    this.saw429 = saw429;
  }
}

const recentAiCallTimestamps: number[] = [];
let serverAiDailyDate = '';
let serverAiDailyCount = 0;
let hedge429CooldownUntil = 0;

function getManilaDateKey(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function recordServerAiCallAndCheckHighUsage(options?: { suppressOnRpm?: boolean }): boolean {
  const now = Date.now();
  const today = getManilaDateKey();
  if (serverAiDailyDate !== today) {
    serverAiDailyDate = today;
    serverAiDailyCount = 0;
  }
  while (recentAiCallTimestamps.length > 0 && now - recentAiCallTimestamps[0] >= 60_000) {
    recentAiCallTimestamps.shift();
  }
  const suppressOnRpm = options?.suppressOnRpm === true;
  const isHighUsage =
    serverAiDailyCount >= SERVER_DAILY_HIGH_HEDGE_THRESHOLD ||
    (suppressOnRpm && recentAiCallTimestamps.length >= SERVER_RPM_HIGH_HEDGE_THRESHOLD) ||
    now < hedge429CooldownUntil;
  serverAiDailyCount += 1;
  recentAiCallTimestamps.push(now);
  return isHighUsage;
}

function setDevAiHeaders(
  res: Response,
  headers: Record<string, string | number | boolean | null | undefined>
) {
  if (IS_PRODUCTION) return;
  for (const [key, value] of Object.entries(headers)) {
    if (value !== null && value !== undefined) {
      res.setHeader(key, String(value));
    }
  }
}

async function generateWithTimeoutAndFallback(
  ai: GoogleGenAI,
  buildParams: (
    model: string,
    abortSignal: AbortSignal
  ) => Parameters<GoogleGenAI['models']['generateContentStream']>[0],
  res?: Response,
  options?: {
    totalTimeoutMs?: number;
    hedgeDelayMs?: number;
    allowHedge?: boolean;
    hedgeSamePrimaryModel?: boolean;
  }
) {
  const totalTimeoutMs = options?.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const hedgeDelayMs = options?.hedgeDelayMs ?? PRIMARY_HEDGE_DELAY_MS;
  const hedgeSamePrimary = Boolean(options?.hedgeSamePrimaryModel);
  const canModelFallback = SECONDARY_MODEL_NAME !== PRIMARY_MODEL_NAME;
  const canHedge =
    options?.allowHedge !== false && (hedgeSamePrimary || canModelFallback);

  return new Promise<{
    text: string;
    model: string;
    modelUsed: ModelRole;
    ttfbMs: number;
    hedgeFired: boolean;
    saw429: boolean;
  }>((resolve, reject) => {
    let settled = false;
    let clientClosed = false;
    let totalTimedOut = false;

    const controllers = new Set<AbortController>();
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;
    let totalTimer: ReturnType<typeof setTimeout> | null = null;

    let inFlightCount = 1;
    let hedgeStarted = false;
    let secondaryModelTried = false;
    let primaryError: any = null;
    let secondaryError: any = null;
    let saw429 = false;

    const cleanup = () => {
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
      if (totalTimer) {
        clearTimeout(totalTimer);
        totalTimer = null;
      }
      res?.off('close', onClose);
      for (const ctrl of controllers) {
        if (!ctrl.signal.aborted) {
          ctrl.abort();
        }
      }
      controllers.clear();
    };

    const finishSuccess = (text: string, model: string, ttfbMs: number) => {
      if (settled) return;
      settled = true;
      const hedgeFired = hedgeStarted;
      cleanup();
      resolve({
        text,
        model,
        modelUsed: model === PRIMARY_MODEL_NAME ? 'primary' : 'fallback',
        ttfbMs,
        hedgeFired,
        saw429,
      });
    };

    const finishError = (err: any) => {
      if (settled) return;
      settled = true;
      const hedgeFired = hedgeStarted;
      cleanup();
      reject(new AiGenerationFailure(err, hedgeFired, saw429));
    };

    const pickBothFailedError = () => {
      if (primaryError && secondaryError) {
        const pClass = classifyGeminiError(primaryError);
        const fClass = classifyGeminiError(secondaryError);
        if (pClass.code === 'quota_exceeded') return primaryError;
        if (fClass.code === 'quota_exceeded') return secondaryError;
        return secondaryError;
      }
      return primaryError || secondaryError;
    };

    const onClose = () => {
      if (res && !res.writableEnded) {
        clientClosed = true;
        const closeErr = new Error('Client disconnected');
        closeErr.name = 'AbortError';
        finishError(closeErr);
      }
    };
    res?.on('close', onClose);

    totalTimer = setTimeout(() => {
      totalTimedOut = true;
      const timeoutErr = new Error('AI request timed out');
      timeoutErr.name = 'AbortError';
      finishError(timeoutErr);
    }, totalTimeoutMs);

    const launchModel = async (
      model: string
    ): Promise<{ ok: true; text: string; ttfbMs: number } | { ok: false; err: any }> => {
      const ctrl = new AbortController();
      controllers.add(ctrl);
      const attemptStartedAt = Date.now();
      let ttfbMs: number | null = null;
      try {
        const stream = await ai.models.generateContentStream(buildParams(model, ctrl.signal));
        let text = '';
        for await (const chunk of stream) {
          if (ttfbMs === null) {
            ttfbMs = Date.now() - attemptStartedAt;
          }
          if (chunk.text) {
            text += chunk.text;
          }
        }
        return {
          ok: true as const,
          text,
          ttfbMs: ttfbMs ?? Date.now() - attemptStartedAt,
        };
      } catch (err) {
        return { ok: false as const, err };
      } finally {
        controllers.delete(ctrl);
      }
    };

    const launchAdditional = (targetModel: string) => {
      if (settled || clientClosed || totalTimedOut) return;
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
      if (targetModel === SECONDARY_MODEL_NAME) {
        secondaryModelTried = true;
      }
      inFlightCount += 1;
      void launchModel(targetModel).then((result) => {
        inFlightCount -= 1;
        if (settled) return;
        if (result.ok) {
          finishSuccess(result.text, targetModel, result.ttfbMs);
          return;
        }
        const classified = classifyGeminiError(result.err);
        if (classified.code === 'quota_exceeded') {
          saw429 = true;
          hedge429CooldownUntil = Date.now() + 60_000;
          // If a 429 occurs on either model, immediately stop all calls for that text
          finishError(result.err);
          return;
        }
        secondaryError = result.err;
        if (inFlightCount === 0) {
          finishError(pickBothFailedError());
        }
      });
    };

    if (canHedge && hedgeDelayMs > 0 && hedgeDelayMs < totalTimeoutMs) {
      hedgeTimer = setTimeout(() => {
        if (!hedgeStarted && !settled && !clientClosed && !totalTimedOut) {
          hedgeStarted = true;
          launchAdditional(hedgeSamePrimary ? PRIMARY_MODEL_NAME : SECONDARY_MODEL_NAME);
        }
      }, hedgeDelayMs);
    }

    void launchModel(PRIMARY_MODEL_NAME).then((result) => {
      inFlightCount -= 1;
      if (settled) return;
      if (result.ok) {
        finishSuccess(result.text, PRIMARY_MODEL_NAME, result.ttfbMs);
        return;
      }
      primaryError = result.err;
      const classified = classifyGeminiError(primaryError);
      if (classified.code === 'quota_exceeded') {
        saw429 = true;
        hedge429CooldownUntil = Date.now() + 60_000;
        // Stop all calls immediately on 429 without hedging
        finishError(primaryError);
        return;
      }
      if (classified.code === 'invalid_key') {
        finishError(primaryError);
        return;
      }
      if (classified.code === 'invalid_model' && canModelFallback && !secondaryModelTried) {
        hedgeStarted = true;
        launchAdditional(SECONDARY_MODEL_NAME);
        return;
      }
      if (canHedge && !hedgeStarted) {
        hedgeStarted = true;
        launchAdditional(hedgeSamePrimary ? PRIMARY_MODEL_NAME : SECONDARY_MODEL_NAME);
        return;
      }
      if (inFlightCount === 0) {
        finishError(pickBothFailedError());
      }
    });
  });
}

function clampAiConfidence(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(0.95, num));
}

function buildCategorizePromptAndSchema(
  description: string,
  merchant: string,
  amountCentavos: number | null,
  useSubcategories: boolean,
  categories: Array<{
    key: string;
    label: string;
    subcategories: Array<{ key: string; label: string }>;
  }>
) {
  const categoryKeys = categories.map((c) => c.key);

  const categoryListText = categories
    .map((c) => {
      if (!useSubcategories || c.subcategories.length === 0) {
        return c.key;
      }
      return `${c.key}: ${c.subcategories.map((s) => s.key).join(',')}`;
    })
    .join('\n');

  const promptParts: string[] = [`Desc: ${description}`];
  if (merchant) {
    promptParts.push(`Merchant: ${merchant}`);
  }
  if (amountCentavos !== null && amountCentavos > 0) {
    promptParts.push(`PHP ${(amountCentavos / 100).toFixed(2)}`);
  }
  if (!useSubcategories) {
    promptParts.push('Subcategories: off');
  }
  promptParts.push(categoryListText);

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: categoryKeys,
      },
      category_confidence: {
        type: Type.NUMBER,
      },
      subcategory: {
        type: Type.STRING,
        nullable: true,
      },
      subcategory_confidence: {
        type: Type.NUMBER,
      },
    },
    required: [
      'category',
      'category_confidence',
      'subcategory',
      'subcategory_confidence',
    ],
  };

  return { contents: promptParts.join('\n'), responseSchema };
}

function parseCategorizeResponse(
  rawText: string,
  useSubcategories: boolean,
  categories: Array<{
    key: string;
    label: string;
    subcategories: Array<{ key: string; label: string }>;
  }>
) {
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false as const, reason: 'bad_response' as const };
  }

  const rawCat = typeof parsed.category === 'string' ? parsed.category.trim() : '';
  const matchedCat =
    categories.find((c) => c.key.toLowerCase() === rawCat.toLowerCase()) ||
    categories.find((c) => c.label.toLowerCase() === rawCat.toLowerCase());

  if (!matchedCat) {
    return {
      ok: true as const,
      matched: false as const,
      payload: {
        category: null,
        category_confidence: 0,
        subcategory: null,
        subcategory_confidence: 0,
        new_subcategory_suggestion: null,
        source: 'ai' as const,
      },
    };
  }

  const categoryConfidence = clampAiConfidence(parsed.category_confidence);
  let validatedSubcategoryKey: string | null = null;
  let subcategoryConfidence = 0;

  if (useSubcategories) {
    const rawSub = typeof parsed.subcategory === 'string' ? parsed.subcategory.trim() : '';
    if (rawSub && rawSub.toLowerCase() !== 'null') {
      const matchedSub =
        matchedCat.subcategories.find((s) => s.key.toLowerCase() === rawSub.toLowerCase()) ||
        matchedCat.subcategories.find((s) => s.label.toLowerCase() === rawSub.toLowerCase());
      if (matchedSub) {
        validatedSubcategoryKey = matchedSub.key;
        subcategoryConfidence = clampAiConfidence(parsed.subcategory_confidence);
      }
    }
  }

  return {
    ok: true as const,
    matched: true as const,
    payload: {
      category: matchedCat.key,
      category_confidence: categoryConfidence,
      subcategory: validatedSubcategoryKey,
      subcategory_confidence: subcategoryConfidence,
      new_subcategory_suggestion: null,
      source: 'ai' as const,
    },
  };
}

interface ServerLedgerTransaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  type: string;
  direction: 'inflow' | 'outflow';
  amountCentavos: number;
  description: string;
  date?: string;
  overdraftConfirmed?: boolean;
  createdAt: number;
}

interface ServerLedgerAccount {
  id: string;
  name: string;
  type: string;
  openingBalanceCentavos: number;
  transactions: ServerLedgerTransaction[];
}

function createDefaultServerLedger(): Map<string, ServerLedgerAccount> {
  const bpiId = 'sample-bpi';
  const gcashId = 'sample-gcash';
  const mayaId = 'sample-maya';
  const gotymeId = 'sample-gotyme';
  const ubId = 'sample-ub';
  const cashId = 'sample-cash';
  const now = Date.now();

  const accounts: ServerLedgerAccount[] = [
    {
      id: bpiId,
      name: 'BPI',
      type: 'Bank',
      openingBalanceCentavos: 715000,
      transactions: [
        {
          id: 'sample-bpi-tx-1',
          accountId: bpiId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 90000,
          description: 'Groceries',
          createdAt: now - 70000,
        },
      ],
    },
    {
      id: gcashId,
      name: 'GCash',
      type: 'E-wallet',
      openingBalanceCentavos: 372000,
      transactions: [
        {
          id: 'sample-gcash-tx-1',
          accountId: gcashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 18000,
          description: 'Sisig',
          createdAt: now - 10000,
        },
        {
          id: 'sample-gcash-tx-2',
          accountId: gcashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 42000,
          description: 'Jeepney and Grab',
          createdAt: now - 30000,
        },
      ],
    },
    {
      id: mayaId,
      name: 'Maya',
      type: 'E-wallet',
      openingBalanceCentavos: 220000,
      transactions: [
        {
          id: 'sample-maya-tx-1',
          accountId: mayaId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 30000,
          description: 'Load',
          createdAt: now - 50000,
        },
        {
          id: 'sample-maya-tx-2',
          accountId: mayaId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 45000,
          description: 'Lip tint',
          createdAt: now - 60000,
        },
      ],
    },
    {
      id: gotymeId,
      name: 'GoTyme',
      type: 'Digital bank',
      openingBalanceCentavos: 300000,
      transactions: [
        {
          id: 'sample-gotyme-tx-1',
          accountId: gotymeId,
          type: 'transfer_in',
          direction: 'inflow',
          amountCentavos: 50000,
          description: 'Interest & Monthly Top-Up',
          createdAt: now - 300000,
        },
      ],
    },
    {
      id: ubId,
      name: 'UnionBank',
      type: 'Bank',
      openingBalanceCentavos: 200000,
      transactions: [
        {
          id: 'sample-ub-tx-1',
          accountId: ubId,
          type: 'transfer_in',
          direction: 'inflow',
          amountCentavos: 200000,
          description: 'Monthly Allowance Transfer',
          createdAt: now - 800000,
        },
      ],
    },
    {
      id: cashId,
      name: 'Cash on hand',
      type: 'Cash stash',
      openingBalanceCentavos: 140000,
      transactions: [
        {
          id: 'sample-cash-tx-1',
          accountId: cashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 12000,
          description: 'Milk tea',
          createdAt: now - 20000,
        },
        {
          id: 'sample-cash-tx-2',
          accountId: cashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 26000,
          description: 'Photocopy',
          createdAt: now - 40000,
        },
        {
          id: 'sample-cash-tx-3',
          accountId: cashId,
          type: 'expense',
          direction: 'outflow',
          amountCentavos: 2000,
          description: 'Movie',
          createdAt: now - 80000,
        },
      ],
    },
  ];

  const map = new Map<string, ServerLedgerAccount>();
  for (const acc of accounts) {
    map.set(acc.id, acc);
  }
  return map;
}

const serverLedgerByScope = new Map<string, Map<string, ServerLedgerAccount>>();
serverLedgerByScope.set('default', createDefaultServerLedger());

function getLedgerScope(rawScope?: unknown): Map<string, ServerLedgerAccount> {
  const key =
    typeof rawScope === 'string' && rawScope.trim() ? rawScope.trim().slice(0, 128) : 'default';
  let store = serverLedgerByScope.get(key);
  if (!store) {
    store = createDefaultServerLedger();
    serverLedgerByScope.set(key, store);
  }
  return store;
}

function findLedgerAccount(
  store: Map<string, ServerLedgerAccount>,
  ref?: unknown
): ServerLedgerAccount | undefined {
  if (typeof ref !== 'string' || !ref.trim()) return undefined;
  const trimmed = ref.trim();
  const byId = store.get(trimmed);
  if (byId) return byId;
  const lower = trimmed.toLowerCase();
  for (const acc of store.values()) {
    if (acc.name.trim().toLowerCase() === lower) {
      return acc;
    }
  }
  return undefined;
}

function computeLedgerBalanceCentavos(
  acc: ServerLedgerAccount,
  options?: { excludeTransactionId?: string; sameSaveInflowIds?: Set<string> }
): number {
  let balance = Math.round(Number(acc.openingBalanceCentavos || 0));
  for (const tx of acc.transactions || []) {
    if (options?.excludeTransactionId && tx.id === options.excludeTransactionId) {
      continue;
    }
    if (options?.sameSaveInflowIds && tx.direction === 'inflow' && options.sameSaveInflowIds.has(tx.id)) {
      continue;
    }
    const amt = Math.abs(Math.round(Number(tx.amountCentavos || 0)));
    if (tx.direction === 'inflow') {
      balance += amt;
    } else if (tx.direction === 'outflow') {
      balance -= amt;
    }
  }
  return balance;
}

function parseIntCentavos(body: Record<string, any>, fallback = 0): number {
  const raw =
    body.amountCentavos ??
    body.amount_centavos ??
    (typeof body.amount === 'number' ? Math.round(body.amount * 100) : undefined);
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.abs(Math.round(raw));
  }
  return fallback;
}

function isAllowOverdraft(body: Record<string, any>): boolean {
  return Boolean(body.allow_overdraft === true || body.allowOverdraft === true);
}

function upsertSnapshotAccount(
  store: Map<string, ServerLedgerAccount>,
  snapshot: any
): ServerLedgerAccount | undefined {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.id || !snapshot.name) return undefined;
  const normalized: ServerLedgerAccount = {
    id: String(snapshot.id),
    name: String(snapshot.name),
    type: String(snapshot.type || 'Bank'),
    openingBalanceCentavos: Math.round(Number(snapshot.openingBalanceCentavos || 0)),
    transactions: Array.isArray(snapshot.transactions)
      ? snapshot.transactions.map((t: any) => ({
          id: String(t.id),
          accountId: String(t.accountId || snapshot.id),
          toAccountId: t.toAccountId ? String(t.toAccountId) : undefined,
          type: String(t.type || 'expense'),
          direction: t.direction === 'inflow' ? 'inflow' : 'outflow',
          amountCentavos: Math.abs(Math.round(Number(t.amountCentavos || 0))),
          description: String(t.description || ''),
          date: typeof t.date === 'string' ? t.date : undefined,
          overdraftConfirmed: Boolean(t.overdraftConfirmed ?? t.overdraft_confirmed),
          createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        }))
      : [],
  };
  store.set(normalized.id, normalized);
  return normalized;
}

function buildInsufficientFundsResponse(available: number, required: number) {
  return {
    code: 'insufficient_funds' as const,
    message: 'Not enough balance',
    details: {
      available: Math.round(available),
      required: Math.round(required),
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      geminiConfigured: isGeminiKeyConfigured(),
      model: PRIMARY_MODEL_NAME,
      fallbackModel: SECONDARY_MODEL_NAME,
    });
  });

  if (!IS_PRODUCTION) {
    const handleCheckFallback = async (req: Request, res: Response) => {
      const startedAt = Date.now();
      const rawDesc =
        typeof req.query.description === 'string'
          ? req.query.description
          : typeof req.body?.description === 'string'
          ? req.body.description
          : 'sisig';
      const description = rawDesc.trim().slice(0, 240) || 'sisig';
      const ai = getAiClient();
      if (!ai) {
        const latencyMs = Date.now() - startedAt;
        logAiRequest({
          feature: 'categorize_expense',
          modelUsed: 'none',
          ttfbMs: null,
          latencyMs,
          status: 'missing_api_key',
          hedgeFired: false,
          saw429: false,
          retried: false,
        });
        res.status(503).json({
          ok: false,
          fallbackModel: SECONDARY_MODEL_NAME,
          error: 'missing_api_key',
          message: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const categories = DEFAULT_DEV_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label,
        subcategories: c.subcategories || [],
      }));
      const { contents, responseSchema } = buildCategorizePromptAndSchema(
        description,
        '',
        null,
        true,
        categories
      );

      try {
        let ttfbMs: number | null = null;
        let fullText = '';
        const stream = await ai.models.generateContentStream({
          model: SECONDARY_MODEL_NAME,
          contents,
          config: {
            abortSignal: AbortSignal.timeout(RETRY_TOTAL_TIMEOUT_MS),
            systemInstruction: CATEGORIZE_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema,
            thinkingConfig: getThinkingConfigForModel(SECONDARY_MODEL_NAME),
            maxOutputTokens: getMaxOutputTokensForCategorize(SECONDARY_MODEL_NAME),
          },
        });
        for await (const chunk of stream) {
          if (ttfbMs === null) {
            ttfbMs = Date.now() - startedAt;
          }
          if (chunk.text) {
            fullText += chunk.text;
          }
        }
        const latencyMs = Date.now() - startedAt;
        const result = parseCategorizeResponse(fullText.trim(), true, categories);
        if (!result.ok) {
          logAiRequest({
            feature: 'categorize_expense',
            modelUsed: 'fallback',
            ttfbMs,
            latencyMs,
            status: 'bad_response',
            hedgeFired: false,
            saw429: false,
            retried: false,
          });
          res.status(502).json({
            ok: false,
            fallbackModel: SECONDARY_MODEL_NAME,
            error: 'bad_response',
            message: 'Invalid JSON returned from fallback model.',
          });
          return;
        }
        logAiRequest({
          feature: 'categorize_expense',
          modelUsed: 'fallback',
          ttfbMs,
          latencyMs,
          status: result.matched ? 'ok' : 'invalid_category',
          hedgeFired: false,
          saw429: false,
          retried: false,
        });
        res.status(200).json({
          ok: true,
          fallbackModel: SECONDARY_MODEL_NAME,
          modelUsed: 'fallback',
          description,
          ttfbMs,
          latencyMs,
          ...result.payload,
        });
      } catch (err: any) {
        const latencyMs = Date.now() - startedAt;
        const classified = classifyGeminiError(err);
        logAiRequest({
          feature: 'categorize_expense',
          modelUsed: 'none',
          ttfbMs: null,
          latencyMs,
          status: classified.code,
          hedgeFired: false,
          saw429: classified.code === 'quota_exceeded',
          retried: false,
        });
        res.status(classified.status).json({
          ok: false,
          fallbackModel: SECONDARY_MODEL_NAME,
          error: classified.code,
          message: classified.message,
          latencyMs,
        });
      }
    };

    app.get('/api/dev/check-fallback', handleCheckFallback);
    app.post('/api/dev/check-fallback', handleCheckFallback);
  }

  app.post('/api/categorize-expense', async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const body = (req.body || {}) as CategorizeRequestBody;
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 240) : '';
    const merchant = typeof body.merchant === 'string' ? body.merchant.trim().slice(0, 120) : '';
    const amountCentavos =
      typeof body.amountCentavos === 'number' && Number.isFinite(body.amountCentavos)
        ? Math.max(0, Math.round(body.amountCentavos))
        : null;
    const useSubcategories = body.useSubcategories !== false;
    const rawCategories = Array.isArray(body.categories) ? body.categories : [];

    const categories: Array<{
      key: string;
      label: string;
      subcategories: Array<{ key: string; label: string }>;
    }> = rawCategories
      .filter((c) => c && typeof c.key === 'string' && typeof c.label === 'string' && c.key.trim() && c.label.trim())
      .slice(0, 60)
      .map((c) => ({
        key: c.key.trim().slice(0, 64),
        label: c.label.trim().slice(0, 64),
        subcategories: useSubcategories && Array.isArray(c.subcategories)
          ? c.subcategories
              .filter((s) => s && typeof s.key === 'string' && typeof s.label === 'string' && s.key.trim() && s.label.trim())
              .slice(0, 40)
              .map((s) => ({
                key: s.key.trim().slice(0, 64),
                label: s.label.trim().slice(0, 40),
              }))
          : [],
      }));

    const retried = Boolean(body.isRetry);
    if (!description || categories.length === 0) {
      logAiRequest({
        feature: 'categorize_expense',
        modelUsed: 'none',
        ttfbMs: null,
        latencyMs: Date.now() - startedAt,
        status: 'bad_request',
        hedgeFired: false,
        saw429: false,
        retried,
      });
      res.status(400).json({
        error: 'bad_request',
        message: 'Description and categories are required.',
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      logAiRequest({
        feature: 'categorize_expense',
        modelUsed: 'none',
        ttfbMs: null,
        latencyMs: Date.now() - startedAt,
        status: 'missing_api_key',
        hedgeFired: false,
        saw429: false,
        retried,
      });
      res.status(503).json({
        error: 'missing_api_key',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    const { contents, responseSchema } = buildCategorizePromptAndSchema(
      description,
      merchant,
      amountCentavos,
      useSubcategories,
      categories
    );

    const isHighServerUsage = recordServerAiCallAndCheckHighUsage({ suppressOnRpm: false });
    const allowHedge = !body.disableHedge && !isHighServerUsage;

    try {
      const { text: rawResponseText, model: usedModel, modelUsed, ttfbMs, hedgeFired, saw429 } =
        await generateWithTimeoutAndFallback(
          ai,
          (model, abortSignal) => ({
            model,
            contents,
            config: {
              abortSignal,
              systemInstruction: CATEGORIZE_SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              responseSchema,
              thinkingConfig: getThinkingConfigForModel(model),
              maxOutputTokens: getMaxOutputTokensForCategorize(model),
            },
          }),
          res,
          {
            totalTimeoutMs: retried ? RETRY_TOTAL_TIMEOUT_MS : DEFAULT_TOTAL_TIMEOUT_MS,
            hedgeDelayMs: PRIMARY_HEDGE_DELAY_MS,
            allowHedge,
            hedgeSamePrimaryModel: true,
          }
        );

      const latencyMs = Date.now() - startedAt;
      setDevAiHeaders(res, {
        'X-Model-Used': modelUsed,
        'X-Model-Name': usedModel,
        'X-TTFB-Ms': ttfbMs,
        'X-Latency-Ms': latencyMs,
        'X-Hedge-Fired': hedgeFired,
        'X-Saw-429': saw429,
        'X-Retried': retried,
      });

      const rawText = rawResponseText.trim();
      const parsedResult = parseCategorizeResponse(rawText, useSubcategories, categories);

      if (!parsedResult.ok) {
        logAiRequest({
          feature: 'categorize_expense',
          modelUsed,
          ttfbMs,
          latencyMs,
          status: 'bad_response',
          hedgeFired,
          saw429,
          retried,
        });
        res.status(502).json({
          error: 'bad_response',
          message: 'Invalid JSON returned from AI model.',
        });
        return;
      }

      if (!parsedResult.matched) {
        logAiRequest({
          feature: 'categorize_expense',
          modelUsed,
          ttfbMs,
          latencyMs,
          status: 'invalid_category',
          hedgeFired,
          saw429,
          retried,
        });
        res.status(200).json(parsedResult.payload);
        return;
      }

      logAiRequest({
        feature: 'categorize_expense',
        modelUsed,
        ttfbMs,
        latencyMs,
        status: 'ok',
        hedgeFired,
        saw429,
        retried,
      });

      res.status(200).json(parsedResult.payload);
    } catch (err: any) {
      const latencyMs = Date.now() - startedAt;
      const hedgeFired = err instanceof AiGenerationFailure ? err.hedgeFired : false;
      const saw429FromFailure = err instanceof AiGenerationFailure ? err.saw429 : false;
      const cause = err instanceof AiGenerationFailure ? err.causeError : err;
      const classified = classifyGeminiError(cause);
      const saw429 = saw429FromFailure || classified.code === 'quota_exceeded';
      setDevAiHeaders(res, {
        'X-Model-Used': 'none',
        'X-Latency-Ms': latencyMs,
        'X-Hedge-Fired': hedgeFired,
        'X-Saw-429': saw429,
        'X-Retried': retried,
      });
      logAiRequest({
        feature: 'categorize_expense',
        modelUsed: 'none',
        ttfbMs: null,
        latencyMs,
        status: classified.code,
        hedgeFired,
        saw429,
        retried,
      });
      res.status(classified.status).json({
        error: classified.code,
        message: classified.message,
      });
    }
  });

  app.post('/api/analyze-note', async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const body = (req.body || {}) as { content?: string; text?: string };
    const rawContent =
      typeof body.content === 'string'
        ? body.content
        : typeof body.text === 'string'
        ? body.text
        : '';
    const content = rawContent.trim().slice(0, 4000);

    if (!content) {
      logAiRequest({
        feature: 'analyze_note',
        modelUsed: 'none',
        ttfbMs: null,
        latencyMs: Date.now() - startedAt,
        status: 'bad_request',
        hedgeFired: false,
        saw429: false,
        retried: false,
      });
      res.status(400).json({
        error: 'bad_request',
        message: 'Diary note content is required.',
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      logAiRequest({
        feature: 'analyze_note',
        modelUsed: 'none',
        ttfbMs: null,
        latencyMs: Date.now() - startedAt,
        status: 'missing_api_key',
        hedgeFired: false,
        saw429: false,
        retried: false,
      });
      res.status(503).json({
        error: 'missing_api_key',
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    const ALLOWED_MOODS = [
      'Happy',
      'Calm',
      'Excited',
      'Grateful',
      'Inspired',
      'Tired',
      'Anxious',
      'Sad',
      'Frustrated',
      'Yearning',
    ];

    const analyzeSchema = {
      type: Type.OBJECT,
      properties: {
        mood: {
          type: Type.STRING,
          enum: ALLOWED_MOODS,
          description: 'The single primary emotion of the diary entry.',
        },
        language: {
          type: Type.STRING,
          enum: ['English', 'Tagalog', 'Taglish'],
          description: 'Detected language of the entry.',
        },
        summary: {
          type: Type.STRING,
          description: 'Warm, empathetic one-sentence reflection about the entry (max 140 chars).',
        },
        energy: {
          type: Type.STRING,
          enum: ['low', 'medium', 'high'],
          description: 'Overall emotional energy level.',
        },
        themes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1 to 3 short lowercase theme keywords (e.g., midterms, commute, friends).',
        },
      },
      required: ['mood', 'language', 'summary', 'energy', 'themes'],
    };

    const isHighServerUsage = recordServerAiCallAndCheckHighUsage({ suppressOnRpm: true });

    try {
      const { text: rawResponseText, model: usedModel, modelUsed, ttfbMs, hedgeFired, saw429 } =
        await generateWithTimeoutAndFallback(
          ai,
          (model, abortSignal) => ({
            model,
            contents: `Diary entry:\n"${content}"`,
            config: {
              abortSignal,
              systemInstruction:
                'You read a personal diary entry from a Filipino student or young adult (English, Tagalog, or Taglish). Identify the primary mood from the allowed enum, detect the language, estimate energy (low/medium/high), extract 1-3 short themes, and write one warm, concise reflection sentence. Return JSON only.',
              responseMimeType: 'application/json',
              responseSchema: analyzeSchema,
              thinkingConfig: getThinkingConfigForModel(model),
            },
          }),
          res,
          {
            totalTimeoutMs: NOTE_ATTEMPT_TIMEOUT_MS,
            hedgeDelayMs: PRIMARY_HEDGE_DELAY_MS,
            allowHedge: !isHighServerUsage,
          }
        );

      const latencyMs = Date.now() - startedAt;
      setDevAiHeaders(res, {
        'X-Model-Used': modelUsed,
        'X-Model-Name': usedModel,
        'X-TTFB-Ms': ttfbMs,
        'X-Latency-Ms': latencyMs,
        'X-Hedge-Fired': hedgeFired,
        'X-Saw-429': saw429,
      });

      let parsed: any = null;
      try {
        parsed = JSON.parse(rawResponseText.trim() || '{}');
      } catch {
        parsed = null;
      }

      if (!parsed || typeof parsed !== 'object') {
        logAiRequest({
          feature: 'analyze_note',
          modelUsed,
          ttfbMs,
          latencyMs,
          status: 'bad_response',
          hedgeFired,
          saw429,
          retried: false,
        });
        res.status(502).json({
          error: 'bad_response',
          message: 'Invalid JSON returned from AI model.',
        });
        return;
      }

      logAiRequest({
        feature: 'analyze_note',
        modelUsed,
        ttfbMs,
        latencyMs,
        status: 'ok',
        hedgeFired,
        saw429,
        retried: false,
      });

      res.status(200).json({
        mood: ALLOWED_MOODS.includes(parsed?.mood) ? parsed.mood : 'Calm',
        language: ['English', 'Tagalog', 'Taglish'].includes(parsed?.language)
          ? parsed.language
          : 'English',
        summary: typeof parsed?.summary === 'string' ? parsed.summary.trim().slice(0, 180) : '',
        energy: ['low', 'medium', 'high'].includes(parsed?.energy) ? parsed.energy : 'medium',
        themes: Array.isArray(parsed?.themes)
          ? parsed.themes.filter((t: unknown) => typeof t === 'string').slice(0, 3)
          : [],
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startedAt;
      const hedgeFired = err instanceof AiGenerationFailure ? err.hedgeFired : false;
      const saw429FromFailure = err instanceof AiGenerationFailure ? err.saw429 : false;
      const cause = err instanceof AiGenerationFailure ? err.causeError : err;
      const classified = classifyGeminiError(cause);
      const saw429 = saw429FromFailure || classified.code === 'quota_exceeded';
      logAiRequest({
        feature: 'analyze_note',
        modelUsed: 'none',
        ttfbMs: null,
        latencyMs,
        status: classified.code,
        hedgeFired,
        saw429,
        retried: false,
      });
      res.status(classified.status).json({
        error: classified.code,
        message: classified.message,
      });
    }
  });

  app.post('/api/ledger/sync', (req: Request, res: Response) => {
    const body = (req.body || {}) as { userId?: string; accounts?: any[] };
    const scope = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : 'default';
    if (!Array.isArray(body.accounts)) {
      res.status(400).json({ error: 'bad_request', message: 'accounts array is required.' });
      return;
    }
    const nextStore = new Map<string, ServerLedgerAccount>();
    for (const acc of body.accounts) {
      upsertSnapshotAccount(nextStore, acc);
    }
    serverLedgerByScope.set(scope, nextStore);
    // Keep 'default' synced too for unauthenticated/direct API calls
    if (scope !== 'default') {
      serverLedgerByScope.set('default', nextStore);
    }
    res.status(200).json({ ok: true, count: nextStore.size });
  });

  app.get('/api/accounts', (req: Request, res: Response) => {
    const store = getLedgerScope(req.query.userId);
    const list = Array.from(store.values()).map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalanceCentavos: acc.openingBalanceCentavos,
      balanceCentavos: computeLedgerBalanceCentavos(acc),
      transactionsCount: acc.transactions.length,
    }));
    res.status(200).json({ accounts: list });
  });

  app.post('/api/accounts', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'bad_request', message: 'Account name is required.' });
      return;
    }
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `acc-${Date.now()}`;
    const opening = Math.round(
      Number(body.openingBalanceCentavos ?? body.startingBalanceCentavos ?? body.balanceCentavos ?? 0)
    );
    const created: ServerLedgerAccount = {
      id,
      name,
      type: typeof body.type === 'string' ? body.type : 'Bank',
      openingBalanceCentavos: Number.isFinite(opening) ? opening : 0,
      transactions: Array.isArray(body.transactions) ? body.transactions : [],
    };
    store.set(id, created);
    res.status(201).json({
      id: created.id,
      name: created.name,
      type: created.type,
      openingBalanceCentavos: created.openingBalanceCentavos,
      balanceCentavos: computeLedgerBalanceCentavos(created),
    });
  });

  app.patch('/api/accounts/:id/balance', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    const acc = findLedgerAccount(store, req.params.id);
    if (!acc) {
      res.status(404).json({ error: 'not_found', message: 'Account not found.' });
      return;
    }
    const target = Math.round(Number(body.actualBalanceCentavos ?? body.balanceCentavos ?? 0));
    const current = computeLedgerBalanceCentavos(acc);
    const diff = target - current;
    if (diff !== 0) {
      acc.transactions.unshift({
        id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        accountId: acc.id,
        type: 'adjustment',
        direction: diff > 0 ? 'inflow' : 'outflow',
        amountCentavos: Math.abs(diff),
        description: 'Balance adjustment',
        createdAt: Date.now(),
      });
    }
    res.status(200).json({
      id: acc.id,
      name: acc.name,
      balanceCentavos: computeLedgerBalanceCentavos(acc),
    });
  });

  app.post('/api/transactions/validate-outflow', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    if (body.accountSnapshot) {
      upsertSnapshotAccount(store, body.accountSnapshot);
    }

    const accountRef = body.accountId || body.accountName || body.account;
    const acc = findLedgerAccount(store, accountRef);
    const required = parseIntCentavos(body);
    const allowOverdraft = isAllowOverdraft(body);

    if (!acc || required <= 0) {
      res.status(200).json({ ok: true, overdraftConfirmed: false });
      return;
    }

    const excludeTxId = typeof body.excludeTransactionId === 'string' ? body.excludeTransactionId : undefined;
    const existingTx = excludeTxId ? acc.transactions.find((t) => t.id === excludeTxId) : undefined;
    let available = computeLedgerBalanceCentavos(acc, { excludeTransactionId: excludeTxId });

    // If editing an expense on the same account whose tx id wasn't in store yet, honour explicit previousAmountCentavos
    if (
      !existingTx &&
      body.sameAccount === true &&
      typeof body.previousAmountCentavos === 'number' &&
      Number.isFinite(body.previousAmountCentavos)
    ) {
      available += Math.abs(Math.round(body.previousAmountCentavos));
    }

    const prevConfirmed = Boolean(
      body.overdraftConfirmed === true ||
        body.overdraft_confirmed === true ||
        existingTx?.overdraftConfirmed === true
    );
    const prevAmount = existingTx
      ? existingTx.amountCentavos
      : typeof body.previousAmountCentavos === 'number'
      ? Math.abs(Math.round(body.previousAmountCentavos))
      : 0;
    const isSameAccountEdit = Boolean(excludeTxId && body.sameAccount === true);
    const skipConfirmedEdit =
      isSameAccountEdit && prevConfirmed && prevAmount > 0 && required <= prevAmount;

    if (!skipConfirmedEdit && required > available && !allowOverdraft) {
      res.status(409).json(buildInsufficientFundsResponse(available, required));
      return;
    }

    const resultingBalance = available - required;
    const nextOverdraftConfirmed =
      resultingBalance < 0 && (allowOverdraft || skipConfirmedEdit);

    res.status(200).json({
      ok: true,
      available,
      required,
      resultingBalance,
      overdraftConfirmed: nextOverdraftConfirmed,
      overdraft_confirmed: nextOverdraftConfirmed,
    });
  });

  app.post('/api/expenses', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    if (body.accountSnapshot) {
      upsertSnapshotAccount(store, body.accountSnapshot);
    }

    const required = parseIntCentavos(body);
    if (required <= 0) {
      res.status(400).json({ error: 'bad_request', message: 'Amount must be greater than zero.' });
      return;
    }

    const acc = findLedgerAccount(store, body.accountId || body.account);
    const allowOverdraft = isAllowOverdraft(body);
    let available = acc ? computeLedgerBalanceCentavos(acc) : 0;

    if (acc && required > available && !allowOverdraft) {
      res.status(409).json(buildInsufficientFundsResponse(available, required));
      return;
    }

    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const resultingBalance = acc ? available - required : 0;
    const overdraftConfirmed = Boolean(acc && resultingBalance < 0 && (allowOverdraft || body.overdraft_confirmed || body.overdraftConfirmed));

    if (acc) {
      acc.transactions.unshift({
        id,
        accountId: acc.id,
        type: 'expense',
        direction: 'outflow',
        amountCentavos: required,
        description: String(body.title || body.description || 'Expense'),
        date: typeof body.date === 'string' ? body.date : undefined,
        overdraftConfirmed,
        createdAt: Date.now(),
      });
    }

    res.status(201).json({
      id,
      amountCentavos: required,
      accountId: acc?.id || null,
      accountName: acc?.name || body.account || null,
      balanceCentavos: acc ? computeLedgerBalanceCentavos(acc) : null,
      overdraftConfirmed,
      overdraft_confirmed: overdraftConfirmed,
    });
  });

  app.patch('/api/expenses/:id', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    if (body.accountSnapshot) {
      upsertSnapshotAccount(store, body.accountSnapshot);
    }
    const id = req.params.id;
    let prevAccount: ServerLedgerAccount | undefined;
    let prevTx: ServerLedgerTransaction | undefined;
    for (const acc of store.values()) {
      const found = acc.transactions.find((t) => t.id === id);
      if (found) {
        prevAccount = acc;
        prevTx = found;
        break;
      }
    }

    const nextAmount =
      body.amountCentavos !== undefined || body.amount_centavos !== undefined || body.amount !== undefined
        ? parseIntCentavos(body)
        : prevTx?.amountCentavos || 0;
    if (nextAmount <= 0) {
      res.status(400).json({ error: 'bad_request', message: 'Amount must be greater than zero.' });
      return;
    }

    const targetAccountRef = body.accountId ?? body.account;
    const targetAccount =
      targetAccountRef !== undefined
        ? findLedgerAccount(store, targetAccountRef)
        : prevAccount;

    const sameAccount = Boolean(
      targetAccount && prevAccount && targetAccount.id === prevAccount.id
    );
    const allowOverdraft = isAllowOverdraft(body);

    if (targetAccount) {
      let available = computeLedgerBalanceCentavos(targetAccount, {
        excludeTransactionId: sameAccount ? id : undefined,
      });
      if (
        sameAccount &&
        !prevTx &&
        typeof body.previousAmountCentavos === 'number' &&
        Number.isFinite(body.previousAmountCentavos)
      ) {
        available += Math.abs(Math.round(body.previousAmountCentavos));
      }

      const prevConfirmed = Boolean(
        prevTx?.overdraftConfirmed ||
          body.overdraftConfirmed === true ||
          body.overdraft_confirmed === true
      );
      const prevAmt =
        prevTx?.amountCentavos ??
        (typeof body.previousAmountCentavos === 'number'
          ? Math.abs(Math.round(body.previousAmountCentavos))
          : nextAmount);
      const skipConfirmedEdit = sameAccount && prevConfirmed && nextAmount <= prevAmt;

      if (!skipConfirmedEdit && nextAmount > available && !allowOverdraft) {
        res.status(409).json(buildInsufficientFundsResponse(available, nextAmount));
        return;
      }

      const resultingBalance = available - nextAmount;
      const nextOverdraftConfirmed =
        resultingBalance < 0 && (allowOverdraft || skipConfirmedEdit);

      if (prevAccount && !sameAccount && prevTx) {
        prevAccount.transactions = prevAccount.transactions.filter((t) => t.id !== id);
      }

      const updatedTx: ServerLedgerTransaction = {
        id,
        accountId: targetAccount.id,
        type: 'expense',
        direction: 'outflow',
        amountCentavos: nextAmount,
        description: String(body.title ?? body.description ?? prevTx?.description ?? 'Expense'),
        date: typeof body.date === 'string' ? body.date : prevTx?.date,
        overdraftConfirmed: nextOverdraftConfirmed,
        createdAt: prevTx?.createdAt || Date.now(),
      };

      const existingIdx = targetAccount.transactions.findIndex((t) => t.id === id);
      if (existingIdx >= 0) {
        targetAccount.transactions[existingIdx] = updatedTx;
      } else {
        targetAccount.transactions.unshift(updatedTx);
      }

      res.status(200).json({
        id,
        amountCentavos: nextAmount,
        accountId: targetAccount.id,
        balanceCentavos: computeLedgerBalanceCentavos(targetAccount),
        overdraftConfirmed: nextOverdraftConfirmed,
        overdraft_confirmed: nextOverdraftConfirmed,
      });
      return;
    }

    res.status(200).json({ id, amountCentavos: nextAmount, overdraftConfirmed: false, overdraft_confirmed: false });
  });

  app.delete('/api/expenses/:id', (req: Request, res: Response) => {
    const store = getLedgerScope(req.query.userId);
    const id = req.params.id;
    for (const acc of store.values()) {
      acc.transactions = acc.transactions.filter((t) => t.id !== id);
    }
    res.status(200).json({ ok: true, id });
  });

  app.post('/api/transfers', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    if (body.accountSnapshot) {
      upsertSnapshotAccount(store, body.accountSnapshot);
    }
    if (body.destinationSnapshot) {
      upsertSnapshotAccount(store, body.destinationSnapshot);
    }

    const required = parseIntCentavos(body);
    if (required <= 0) {
      res.status(400).json({ error: 'bad_request', message: 'Transfer amount must be greater than zero.' });
      return;
    }

    const sourceAcc = findLedgerAccount(
      store,
      body.fromAccountId || body.sourceAccountId || body.fromAccount || body.accountId || body.account
    );
    if (!sourceAcc) {
      res.status(404).json({ error: 'not_found', message: 'Source account not found.' });
      return;
    }

    const destAcc = findLedgerAccount(
      store,
      body.toAccountId || body.destinationAccountId || body.toAccount || body.backingAccount
    );
    const allowOverdraft = isAllowOverdraft(body);

    // Same-save inflows do not count toward available balance
    const available = computeLedgerBalanceCentavos(sourceAcc);
    if (required > available && !allowOverdraft) {
      res.status(409).json(buildInsufficientFundsResponse(available, required));
      return;
    }

    const txId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `xfer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const resultingBalance = available - required;
    const overdraftConfirmed = Boolean(resultingBalance < 0 && allowOverdraft);

    sourceAcc.transactions.unshift({
      id: txId,
      accountId: sourceAcc.id,
      toAccountId: destAcc?.id,
      type: 'transfer_out',
      direction: 'outflow',
      amountCentavos: required,
      description: String(body.description || `Transfer to ${destAcc?.name || 'account'}`),
      date: typeof body.date === 'string' ? body.date : undefined,
      overdraftConfirmed,
      createdAt: Date.now(),
    });

    if (destAcc && destAcc.id !== sourceAcc.id) {
      destAcc.transactions.unshift({
        id: `${txId}-in`,
        accountId: destAcc.id,
        toAccountId: destAcc.id,
        type: 'transfer_in',
        direction: 'inflow',
        amountCentavos: required,
        description: `Transfer from ${sourceAcc.name}`,
        date: typeof body.date === 'string' ? body.date : undefined,
        createdAt: Date.now(),
      });
    }

    res.status(201).json({
      id: txId,
      fromAccountId: sourceAcc.id,
      toAccountId: destAcc?.id || null,
      amountCentavos: required,
      balanceCentavos: computeLedgerBalanceCentavos(sourceAcc),
      overdraftConfirmed,
      overdraft_confirmed: overdraftConfirmed,
    });
  });

  app.post('/api/savings-deposits', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    if (body.accountSnapshot) {
      upsertSnapshotAccount(store, body.accountSnapshot);
    }

    const required = parseIntCentavos(body);
    if (required <= 0) {
      res.status(400).json({ error: 'bad_request', message: 'Deposit amount must be greater than zero.' });
      return;
    }

    const fromRef = body.fromAccountId || body.fromAccount;
    const backingRef = body.backingAccountId || body.backingAccount;
    const fromAcc = findLedgerAccount(store, fromRef);
    const backingAcc = findLedgerAccount(store, backingRef);

    const isCrossAccountTransfer = Boolean(
      fromAcc &&
        ((backingAcc && fromAcc.id !== backingAcc.id) ||
          (!backingAcc &&
            typeof backingRef === 'string' &&
            fromAcc.name.trim().toLowerCase() !== backingRef.trim().toLowerCase()))
    );

    if (!isCrossAccountTransfer || !fromAcc) {
      // Earmarking inside backing account does not take money out of an account
      res.status(201).json({
        ok: true,
        earmarkOnly: true,
        overdraftConfirmed: false,
        overdraft_confirmed: false,
      });
      return;
    }

    const allowOverdraft = isAllowOverdraft(body);
    const available = computeLedgerBalanceCentavos(fromAcc);
    if (required > available && !allowOverdraft) {
      res.status(409).json(buildInsufficientFundsResponse(available, required));
      return;
    }

    const txId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `sav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const resultingBalance = available - required;
    const overdraftConfirmed = Boolean(resultingBalance < 0 && allowOverdraft);

    fromAcc.transactions.unshift({
      id: txId,
      accountId: fromAcc.id,
      toAccountId: backingAcc?.id,
      type: 'transfer_out',
      direction: 'outflow',
      amountCentavos: required,
      description: String(body.description || `Transfer to ${backingAcc?.name || backingRef || 'goal'}`),
      overdraftConfirmed,
      createdAt: Date.now(),
    });

    if (backingAcc && backingAcc.id !== fromAcc.id) {
      backingAcc.transactions.unshift({
        id: `${txId}-in`,
        accountId: backingAcc.id,
        toAccountId: backingAcc.id,
        type: 'transfer_in',
        direction: 'inflow',
        amountCentavos: required,
        description: `Transfer from ${fromAcc.name}`,
        createdAt: Date.now(),
      });
    }

    res.status(201).json({
      id: txId,
      fromAccountId: fromAcc.id,
      balanceCentavos: computeLedgerBalanceCentavos(fromAcc),
      overdraftConfirmed,
      overdraft_confirmed: overdraftConfirmed,
    });
  });

  app.post('/api/debt-payments', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const store = getLedgerScope(body.userId);
    if (body.accountSnapshot) {
      upsertSnapshotAccount(store, body.accountSnapshot);
    }

    const required = parseIntCentavos(body);
    if (required <= 0) {
      res.status(400).json({ error: 'bad_request', message: 'Payment amount must be greater than zero.' });
      return;
    }

    const acc = findLedgerAccount(store, body.paidFromAccountId || body.paidFromAccount || body.accountId || body.account);
    if (!acc) {
      res.status(201).json({ ok: true, amountCentavos: required, overdraftConfirmed: false, overdraft_confirmed: false });
      return;
    }

    const allowOverdraft = isAllowOverdraft(body);
    const available = computeLedgerBalanceCentavos(acc);
    if (required > available && !allowOverdraft) {
      res.status(409).json(buildInsufficientFundsResponse(available, required));
      return;
    }

    const txId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `debt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const resultingBalance = available - required;
    const overdraftConfirmed = Boolean(resultingBalance < 0 && allowOverdraft);

    acc.transactions.unshift({
      id: txId,
      accountId: acc.id,
      type: 'debt_payment',
      direction: 'outflow',
      amountCentavos: required,
      description: String(body.description || 'Debt payment'),
      overdraftConfirmed,
      createdAt: Date.now(),
    });

    res.status(201).json({
      id: txId,
      accountId: acc.id,
      amountCentavos: required,
      balanceCentavos: computeLedgerBalanceCentavos(acc),
      overdraftConfirmed,
      overdraft_confirmed: overdraftConfirmed,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  getAiClient();

  app.listen(PORT, '0.0.0.0', () => {
    console.info(`[Chestlist] Server listening on port ${PORT}`);
    if (isGeminiKeyConfigured()) {
      void fetch('https://generativelanguage.googleapis.com/', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }
  });
}

startServer().catch((err) => {
  console.error('[Chestlist] Failed to start server', err);
  process.exit(1);
});
