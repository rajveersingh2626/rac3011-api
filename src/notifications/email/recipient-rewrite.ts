export type RewriteInput = {
  to: string;
  subject: string;
  isProduction: boolean;
  allowlist: readonly string[];
};

export type RewriteResult =
  { kind: 'send'; to: string; subject: string } | { kind: 'refuse'; reason: string };

const norm = (v: string): string => v.trim().toLowerCase();

export function rewriteRecipient(input: RewriteInput): RewriteResult {
  if (input.isProduction) return { kind: 'send', to: input.to, subject: input.subject };
  const allowlist = input.allowlist.map(norm).filter(Boolean);
  if (allowlist.length === 0) {
    return {
      kind: 'refuse',
      reason: 'MAIL_ALLOWLIST is empty outside production; refusing to send',
    };
  }
  if (allowlist.includes(norm(input.to))) {
    return { kind: 'send', to: input.to, subject: input.subject };
  }
  return { kind: 'send', to: input.allowlist[0].trim(), subject: `[${input.to}] ${input.subject}` };
}
