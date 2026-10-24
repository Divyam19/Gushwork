import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

export const MODEL = () => process.env.OPENAI_MODEL || 'gpt-4o-mini';

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI());

export const usage = { prompt: 0, completion: 0, calls: 0 };

export async function callStructured<T extends z.ZodTypeAny>(opts: {
  schema: T;
  name: string;
  system: string;
  user: string;
  model?: string;
}): Promise<z.infer<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai().chat.completions.parse({
        model: opts.model ?? MODEL(),
        temperature: 0.2,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        response_format: zodResponseFormat(opts.schema, opts.name),
      });
      usage.calls++;
      usage.prompt += res.usage?.prompt_tokens ?? 0;
      usage.completion += res.usage?.completion_tokens ?? 0;
      const parsed = res.choices[0]?.message.parsed;
      if (!parsed) throw new Error(res.choices[0]?.message.refusal ?? 'empty LLM response');
      return parsed as z.infer<T>;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
