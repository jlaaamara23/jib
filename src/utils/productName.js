// Product name in the visitor's language; falls back to the original name when no translation was entered.
export const productName = (p, lang) => (lang === 'he' && p?.nameHe) || (lang === 'ar' && p?.nameAr) || p?.name || ''

// All names of a product, for search.
export const allProductNames = (p) => [p?.name, p?.nameHe, p?.nameAr].filter(Boolean).join(' ')
