/** All store categories, in display order. Must match the backend StoreCategory enum. */
export const STORE_CATEGORIES = [
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
  'KITCHEN',
  'CLOTHING',
  'CHILD_GAME',
  'GROCERY',
  'HOME_DECOR',
  'BEAUTY',
]

export function categoryEmoji(category) {
  return CATEGORY_EMOJI[category] || '📦'
}
