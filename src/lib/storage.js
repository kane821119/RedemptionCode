export const CACHE_KEYS = {
  usedCodes: 'used_codes_pool_v3',
  favorites: 'category_favorites_v2',
  favoritesSwitch: 'only_show_favorites_switch_v2',
  showHiddenItems: 'show_hidden_items_v1',
  actionHistory: 'code_action_history_v1',
  reportThreshold: 'report_threshold_v2',
  pendingCategories: 'pending_categories_queue_v1',
  pendingCategorySupports: 'pending_category_supports_v1',
};

export const normalizePositiveNumber = (value, fallback = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }
  return Math.floor(numericValue);
};

export const resolveReportThreshold = ({ storedValue, fallback = 1 }) => {
  const storedThreshold = normalizePositiveNumber(storedValue, null);
  return storedThreshold ?? fallback;
};

export const readStorage = (key, fallback = null) => {
  const rawValue = localStorage.getItem(key);

  if (rawValue === null) {
    return fallback;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue ?? fallback;
  } catch (error) {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const formatLocalDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const safeJsonParse = (value, fallback = {}) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    return JSON.parse(value) ?? fallback;
  } catch (error) {
    return fallback;
  }
};
