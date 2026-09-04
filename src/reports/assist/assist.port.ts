export interface AssistSuggestion {
  fieldKey?: string;
  message: string;
}

export interface AssistRequest {
  clubName: string;
  month: string;
  values: unknown;
  notes: string | null;
}

export interface AssistResult {
  summary: string;
  suggestions: AssistSuggestion[];
}

export abstract class AssistPort {
  abstract assist(request: AssistRequest): Promise<AssistResult>;
}
