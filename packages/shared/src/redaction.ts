const ABSOLUTE_PATH_PATTERNS = [
  /(?:\/Users\/|\/home\/|\/var\/|\/tmp\/|\/private\/|\/opt\/|\/Applications\/)[^\s'"`]+/g,
  /[A-Za-z]:\\[^\s'"`]+/g,
];

const SECRET_PATTERNS = [
  /\b(?:sk|rk|pk)_[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bsess_[A-Za-z0-9]{16,}\b/g,
  /\b(?:token|secret|password|authorization|api[_-]?key)\b\s*[:=]\s*["']?[^\s"']+/gi,
  /\b(?:Bearer)\s+[A-Za-z0-9._-]{12,}/gi,
];

const SIGNED_URL_PATTERN =
  /https?:\/\/[^\s'"`]+(?:X-Amz-Signature|Signature=|sig=|token=)[^\s'"`]*/gi;

export const TOOL_OUTPUT_LIMIT = 4_000;

function replaceAbsolutePaths(input: string): string {
  return ABSOLUTE_PATH_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '<redacted-path>'),
    input,
  );
}

function replaceSecrets(input: string): string {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '<redacted-secret>'),
    input,
  );
}

function replaceSignedUrls(input: string): string {
  return input.replace(SIGNED_URL_PATTERN, '<redacted-signed-url>');
}

export function redactText(input: string): string {
  return replaceSecrets(replaceSignedUrls(replaceAbsolutePaths(input)));
}

export function truncateText(
  input: string,
  maxLength = TOOL_OUTPUT_LIMIT,
): { text: string; truncated: boolean } {
  if (input.length <= maxLength) {
    return { text: input, truncated: false };
  }

  const head = input.slice(0, Math.floor(maxLength * 0.75));
  const tail = input.slice(-Math.floor(maxLength * 0.15));
  return {
    text: `${head}\n\n… output truncated …\n\n${tail}`,
    truncated: true,
  };
}

export function sanitizeToolOutput(input: string): {
  text: string;
  truncated: boolean;
} {
  return truncateText(redactText(input));
}

export function shouldSkipUserMessage(input: string): boolean {
  const trimmed = input.trimStart();
  return (
    trimmed.startsWith('# AGENTS.md instructions') ||
    trimmed.startsWith('<environment_context>') ||
    trimmed.startsWith('<permissions instructions>')
  );
}

