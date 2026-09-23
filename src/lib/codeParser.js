export const buildCodePattern = (category = {}) => {
  const rules = [
    category.keep_chinese && '\\u4e00-\\u9fa5',
    category.keep_letters && 'A-Za-z',
    category.keep_numbers && '0-9',
    category.keep_symbols && '\\-[_\\*!@#]'
  ].filter(Boolean);

  if (!rules.length) {
    return /[A-Za-z0-9]+/g;
  }

  return new RegExp(`[${rules.join('')}]+`, 'g');
};

export const normalizeCode = (code, category = {}) => {
  const normalizedCode = code || '';
  return category.force_uppercase ? normalizedCode.toUpperCase() : normalizedCode;
};

export const extractCodes = (input = '', category = {}) => {
  if (!input.trim()) {
    return [];
  }

  const uniqueMatches = new Set(
    (input.match(buildCodePattern(category)) || [])
      .map((code) => normalizeCode(code, category))
      .filter((code) => code.length >= 4)
  );

  return [...uniqueMatches];
};
