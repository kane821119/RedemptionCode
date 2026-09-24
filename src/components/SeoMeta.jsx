import { useEffect } from 'react';
import { useLanguageStore } from '../i18n/languageStore';

const DEFAULT_TITLE = 'RedemptionCode';

const setMetaTag = (attribute, name, value) => {
  if (!value) return;

  const selector = attribute === 'name'
    ? `meta[name="${name}"]`
    : `meta[property="${name}"]`;

  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', value);
};

const setCanonicalLink = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }

  link.setAttribute('href', href);
};

export default function SeoMeta({ title, description, path = '/', type = 'website', image = '/og-image.svg' }) {
  const { t, locale } = useLanguageStore();

  useEffect(() => {
    const siteName = t('seoSiteName') || DEFAULT_TITLE;
    const fallbackTitle = t('seoHomeTitle') || DEFAULT_TITLE;
    const fallbackDescription = t('seoHomeDescription') || 'Manage and discover redemption codes in one convenient place.';

    const pageTitle = title ? `${title} | ${siteName}` : fallbackTitle;
    const pageDescription = description || fallbackDescription;
    const canonicalUrl = new URL(path, window.location.origin).toString();
    const imageUrl = /^https?:\/\//.test(image)
      ? image
      : new URL(image, window.location.origin).toString();

    document.title = pageTitle;
    setMetaTag('name', 'description', pageDescription);
    setMetaTag('name', 'theme-color', '#0f172a');

    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', pageDescription);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', imageUrl);
    setMetaTag('property', 'og:image:alt', pageTitle);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', pageDescription);
    setMetaTag('name', 'twitter:image', imageUrl);

    setCanonicalLink(canonicalUrl);
    document.documentElement.lang = locale || 'zh-TW';
  }, [title, description, path, type, image, t, locale]);

  return null;
}
