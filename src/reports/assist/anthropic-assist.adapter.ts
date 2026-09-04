import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import type { AssistRequest, AssistResult, AssistSuggestion } from './assist.port';
import { AssistPort } from './assist.port';

function parseSuggestions(text: string): AssistSuggestion[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => ({ message: line.replace(/^[-*]\s+/, '') }));
}

@Injectable()
export class AnthropicAssistAdapter extends AssistPort {
  private readonly logger = new Logger('AnthropicAssist');
  private readonly client = env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    : null;

  async assist(request: AssistRequest): Promise<AssistResult> {
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set; returning empty assist result');
      return { summary: '', suggestions: [] };
    }
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:
        'You help a Rotaract district officer review a monthly club activity report before scoring it. ' +
        'Point out anything missing, inconsistent, or worth a follow-up question. Be terse: a one-paragraph ' +
        'summary followed by a bullet list ("- ...") of concrete suggestions, nothing else.',
      messages: [
        {
          role: 'user',
          content: `Club: ${request.clubName}\nMonth: ${request.month}\nOfficer notes: ${request.notes ?? '(none)'}\n\nReport values:\n${JSON.stringify(request.values, null, 2)}`,
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return { summary: text, suggestions: parseSuggestions(text) };
  }
}
