const MAX_LENGTHS = {
  categoryName: 60,
  webUrl: 200,
  contributor: 40,
  message: 500,
  code: 120,
};

import { getLocaleText } from '../i18n/languageStore';

export const sanitizeText = (value, { maxLength = 200, allowLineBreak = false } = {}) => {
  const normalized = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u001F\u007F]/g, '');

  const trimmed = allowLineBreak ? normalized.trim() : normalized.replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, maxLength);
};

export const validateCategoryName = (value) => {
  const cleaned = sanitizeText(value, { maxLength: MAX_LENGTHS.categoryName });

  if (!cleaned) {
    return { valid: false, error: getLocaleText('categoryNameRequired') };
  }

  if (cleaned.length < 2) {
    return { valid: false, error: getLocaleText('categoryNameMinLength') };
  }

  return { valid: true, value: cleaned };
};

export const validateWebUrl = (value) => {
  const cleaned = sanitizeText(value, { maxLength: MAX_LENGTHS.webUrl });

  if (!cleaned) {
    return { valid: true, value: '' };
  }

  const url = cleaned.trim();
  const isValid = /^https?:\/\/[\w.-]+(?:\.[\w.-]+)+(?:[/?#][^\s]*)?$/i.test(url);

  if (!isValid) {
    return { valid: false, error: getLocaleText('invalidUrlFormat') };
  }

  return { valid: true, value: url };
};

export const validateContributor = (value) => {
  const cleaned = sanitizeText(value, { maxLength: MAX_LENGTHS.contributor });
  return { valid: true, value: cleaned };
};

export const validateMessage = (value) => {
  const cleaned = sanitizeText(value, { maxLength: MAX_LENGTHS.message, allowLineBreak: true });

  if (!cleaned) {
    return { valid: false, error: getLocaleText('messageRequired') };
  }

  if (cleaned.length < 2) {
    return { valid: false, error: getLocaleText('messageTooShort') };
  }

  return { valid: true, value: cleaned };
};

export const validateBulkCodeInput = (value) => {
  const cleaned = sanitizeText(value, { maxLength: 5000, allowLineBreak: true });

  if (!cleaned) {
    return { valid: false, error: getLocaleText('bulkInputRequired') };
  }

  return { valid: true, value: cleaned };
};

export const validateSingleCode = (value) => {
  const cleaned = sanitizeText(value, { maxLength: MAX_LENGTHS.code });

  if (!cleaned) {
    return { valid: false, error: getLocaleText('codeRequired') };
  }

  return { valid: true, value: cleaned };
};
