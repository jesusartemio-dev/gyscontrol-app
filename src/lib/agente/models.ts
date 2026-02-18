// src/lib/agente/models.ts
// Centralized AI model configuration — choose models by task type to optimize cost

export const MODELS = {
  // Sonnet: $3/$15 per M tokens — complex reasoning, chat, TDR analysis
  sonnet: 'claude-sonnet-4-5-20250929',
  // Haiku: $0.80/$4 per M tokens — structured extraction, OCR, simple tasks
  haiku: 'claude-haiku-4-5-20251001',
} as const

export type AITask =
  | 'chat'              // Complex chat: TDR analysis, cotización creation, multi-tool
  | 'chat-simple'       // Simple chat: greetings, short questions, catalog lookups
  | 'excel-extraction'  // Excel CSV → JSON structured data
  | 'pdf-extraction'    // PDF proposal → JSON structured data
  | 'ocr'               // Receipt/invoice OCR → JSON

const TASK_DEFAULTS: Record<AITask, string> = {
  'chat': MODELS.sonnet,
  'chat-simple': MODELS.haiku,
  'excel-extraction': MODELS.haiku,
  'pdf-extraction': MODELS.haiku,
  'ocr': MODELS.haiku,
}

// Environment variable overrides (change model without redeploying)
const ENV_OVERRIDES: Record<AITask, string | undefined> = {
  'chat': process.env.AI_CHAT_MODEL,
  'chat-simple': process.env.AI_CHAT_SIMPLE_MODEL,
  'excel-extraction': process.env.AI_EXTRACT_MODEL,
  'pdf-extraction': process.env.AI_EXTRACT_MODEL,
  'ocr': process.env.AI_OCR_MODEL,
}

/**
 * Returns the appropriate model for a given task.
 * Override via environment variables: AI_CHAT_MODEL, AI_EXTRACT_MODEL, AI_OCR_MODEL
 */
export function getModelForTask(task: AITask): string {
  return ENV_OVERRIDES[task] || TASK_DEFAULTS[task]
}
