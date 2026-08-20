const RULES_HEADER = 'Rules & Guidelines:';
const BENEFITS_HEADER = 'Benefits:';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const trimSection = (value: string): string => value.trim();

export interface ParsedChallengeDescription {
  mainDescription: string;
  rules: string;
  benefits: string;
}

export const parseChallengeDescription = (
  description: string | undefined | null,
  benefitsFromApi?: string | null
): ParsedChallengeDescription => {
  const raw = (description || '').trim();
  if (!raw) {
    return {
      mainDescription: '',
      rules: '',
      benefits: (benefitsFromApi || '').trim(),
    };
  }

  const rulesPattern = new RegExp(`${escapeRegex(RULES_HEADER)}\\s*([\\s\\S]*?)(?=\\n\\s*${escapeRegex(BENEFITS_HEADER)}|$)`, 'i');
  const benefitsPattern = new RegExp(`${escapeRegex(BENEFITS_HEADER)}\\s*([\\s\\S]*)$`, 'i');

  const rulesMatch = raw.match(rulesPattern);
  const benefitsMatch = raw.match(benefitsPattern);

  const withoutRules = raw.replace(rulesPattern, '').trim();
  const mainDescription = withoutRules.replace(benefitsPattern, '').trim();

  return {
    mainDescription,
    rules: trimSection(rulesMatch?.[1] || ''),
    benefits: trimSection(benefitsFromApi || benefitsMatch?.[1] || ''),
  };
};

export const buildChallengeDescription = (
  description: string,
  rules: string,
  benefits?: string
): string => {
  const parsed = parseChallengeDescription(description);
  const main = (parsed.mainDescription || description || '').trim();
  const rulesValue = rules.trim();
  const benefitsValue = (benefits || '').trim();

  const chunks = [main];
  if (rulesValue) {
    chunks.push(`${RULES_HEADER}\n${rulesValue}`);
  }
  if (benefitsValue) {
    chunks.push(`${BENEFITS_HEADER}\n${benefitsValue}`);
  }
  return chunks.filter(Boolean).join('\n\n').trim();
};
