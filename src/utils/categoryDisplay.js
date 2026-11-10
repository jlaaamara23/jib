/** All store categories, in display order. Must match the backend StoreCategory enum. */
export const STORE_CATEGORIES = [
  'WOMEN',
  'MEN',
  'KIDS',
  'KITCHEN',
  'SPICES',
  'GROCERY',
  'CLOTHING',
  'SHOES',
  'WOMEN_UNDERWEAR',
  'KIDS_UNDERWEAR',
  'CHILD_GAME',
  'ELECTRONICS',
  'BEAUTY',
  'HOME_DECOR',
  'LUGGAGE',
  'SPORTS',
  'PETS',
  'HEALTH',
  'TOOLS',
  'OFFICE',
]

export const CATEGORY_EMOJI = {
  ALL: '🏠',
  WOMEN: '👗',
  MEN: '🤵',
  KIDS: '🧸',
  KITCHEN: '🍳',
  SPICES: '🌶️',
  GROCERY: '🛒',
  CLOTHING: '👕',
  WOMEN_UNDERWEAR: '👗',
  KIDS_UNDERWEAR: '🧒',
  CHILD_GAME: '🧸',
  ELECTRONICS: '📱',
  BEAUTY: '💄',
  HOME_DECOR: '🏡',
  SPORTS: '⚽',
  PETS: '🐾',
  HEALTH: '💊',
  TOOLS: '🔧',
  OFFICE: '📎',
  SHOES: '👞',
  LUGGAGE: '🧳',
}

export const FEATURED_CATEGORIES = [
  'WOMEN',
  'MEN',
  'LUGGAGE',
  'KITCHEN',
  'CLOTHING',
  'CHILD_GAME',
  'GROCERY',
  'HOME_DECOR',
  'BEAUTY',
]

/** Departments are shown by their translated name; other stores by their own name. */
export const DEPARTMENTS = ['WOMEN', 'MEN', 'KIDS', 'HOME_DECOR', 'BEAUTY', 'SPICES', 'LUGGAGE']

export function storeDisplayName(store, t) {
  if (store && DEPARTMENTS.includes(store.category)) {
    const label = t('category.' + store.category)
    if (label && label !== 'category.' + store.category) return label
  }
  return store?.name || ''
}

export function categoryEmoji(category) {
  return CATEGORY_EMOJI[category] || '📦'
}
