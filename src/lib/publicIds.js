export function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'category';
}

export function createRouteKeyFromId(value = '') {
  if (!value) return 'category';

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return (hash % 1000000).toString(36).padStart(4, '0');
}

export function toPublicRouteKey(category = {}) {
  const slug = slugify(category.name);
  const suffix = createRouteKeyFromId(category.id || '');
  return `${slug}-${suffix}`;
}

export function resolveCategoryIdFromRoute(routeKey, categories = []) {
  if (!routeKey) return null;

  const match = categories.find((category) => {
    if (category.id === routeKey) return true;
    return toPublicRouteKey(category).toLowerCase() === String(routeKey).toLowerCase();
  });

  return match?.id || null;
}
