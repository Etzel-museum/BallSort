// Collectibles: eggs (one hatches every 10 levels) and cosmetic items.
// Items are either bought with coins (price) or come out of a specific egg (egg: number).
(function (root) {
  'use strict';

  const LEVELS_PER_EGG = 10;

  const RARITY = {
    common: { name: 'רגילה', en: 'Common',    color: '#9fb4c8', coins: 20 },
    rare:   { name: 'נדירה', en: 'Rare',      color: '#4fc3f7', coins: 40 },
    epic:   { name: 'אפית',  en: 'Epic',      color: '#c084fc', coins: 80 },
    legend: { name: 'אגדית', en: 'Legendary', color: '#ffc83d', coins: 150 },
  };

  // Egg N hatches when level N*10 is solved for the first time.
  const EGGS = [
    { name: 'אבטיח',       en: 'Watermelon',   rarity: 'common', base: '#7cc35f', accent: '#2f6b2a', pattern: 'vstripes' },
    { name: 'תות',         en: 'Strawberry',   rarity: 'common', base: '#ef4b5c', accent: '#ffd9de', pattern: 'spots' },
    { name: 'שמיים',       en: 'Sky',          rarity: 'rare',   base: '#5ec8f2', accent: '#e8f8ff', pattern: 'waves' },
    { name: 'לימון',       en: 'Lemon',        rarity: 'common', base: '#ffe14d', accent: '#e59b00', pattern: 'zigzag' },
    { name: 'אוקיינוס',    en: 'Ocean',        rarity: 'epic',   base: '#1e6fd9', accent: '#7fd3ff', pattern: 'scales' },
    { name: 'שזיף',        en: 'Plum',         rarity: 'common', base: '#7b3fa0', accent: '#e2c7f5', pattern: 'dots' },
    { name: 'מנטה',        en: 'Mint',         rarity: 'rare',   base: '#7ee0c3', accent: '#1d8f73', pattern: 'diamonds' },
    { name: 'פרחוני',      en: 'Blossom',      rarity: 'common', base: '#ff9f43', accent: '#fff3c4', pattern: 'stars' },
    { name: 'שוקולד',      en: 'Chocolate',    rarity: 'common', base: '#7a4a2e', accent: '#d7a77a', pattern: 'swirl' },
    { name: 'קשת בענן',    en: 'Rainbow',      rarity: 'legend', base: '#ffffff', accent: '#ffffff', pattern: 'bands' },
    { name: 'ענבים',       en: 'Grape',        rarity: 'common', base: '#a05ad6', accent: '#5b2a86', pattern: 'dots' },
    { name: 'אש',          en: 'Fire',         rarity: 'rare',   base: '#d7261e', accent: '#ffb31a', pattern: 'flames' },
    { name: 'מסטיק',       en: 'Bubblegum',    rarity: 'common', base: '#ff8fc4', accent: '#ffffff', pattern: 'stripes' },
    { name: 'יער',         en: 'Forest',       rarity: 'common', base: '#2f7d4a', accent: '#a6e08a', pattern: 'scales' },
    { name: 'ליל כוכבים',  en: 'Starry Night', rarity: 'epic',   base: '#1b2a6b', accent: '#ffe27a', pattern: 'stars' },
    { name: 'אפרסק',       en: 'Peach',        rarity: 'common', base: '#ffc39e', accent: '#ff8a65', pattern: 'waves' },
    { name: 'חול',         en: 'Sand',         rarity: 'common', base: '#e8cf9a', accent: '#a5814a', pattern: 'spots' },
    { name: 'קרח',         en: 'Ice',          rarity: 'rare',   base: '#cdeeff', accent: '#5fb4e6', pattern: 'diamonds' },
    { name: 'דבש',         en: 'Honey',        rarity: 'common', base: '#f2a516', accent: '#ffe08a', pattern: 'scales' },
    { name: 'דרקון',       en: 'Dragon',       rarity: 'legend', base: '#0f8a5f', accent: '#ffd54a', pattern: 'scales' },
    { name: 'לבנדר',       en: 'Lavender',     rarity: 'common', base: '#b9a3f0', accent: '#6c4fc4', pattern: 'waves' },
    { name: 'אלמוג',       en: 'Coral',        rarity: 'rare',   base: '#ff7a6b', accent: '#fff0e8', pattern: 'zigzag' },
    { name: 'קקאו',        en: 'Cocoa',        rarity: 'common', base: '#4e2f22', accent: '#a9714b', pattern: 'stripes' },
    { name: 'ליים',        en: 'Lime',         rarity: 'common', base: '#b6e04a', accent: '#5a8a12', pattern: 'dots' },
    { name: 'שקיעה',       en: 'Sunset',       rarity: 'epic',   base: '#ffffff', accent: '#ffffff', pattern: 'bands',
      colors: ['#2c1e4a', '#8e3b6e', '#e0607e', '#f07a5a', '#ffb26b', '#ffd98a'] },
    { name: 'טורקיז',      en: 'Turquoise',    rarity: 'common', base: '#19b3b1', accent: '#c8fffb', pattern: 'swirl' },
    { name: 'פנינה',       en: 'Pearl',        rarity: 'rare',   base: '#f3eee6', accent: '#d4c4ad', pattern: 'swirl' },
    { name: 'אבן',         en: 'Stone',        rarity: 'common', base: '#8d949c', accent: '#4c535a', pattern: 'spots' },
    { name: 'דובדבן',      en: 'Cherry',       rarity: 'common', base: '#a3122a', accent: '#ff9aa9', pattern: 'stars' },
    { name: 'זהב מלכותי',  en: 'Royal Gold',   rarity: 'legend', base: '#f5c542', accent: '#9a6b00', pattern: 'diamonds' },
  ];
  // After the 30 named eggs, every further egg is a golden one worth coins.
  const GOLD_EGG = { name: 'ביצת זהב', en: 'Golden Egg', rarity: 'epic', base: '#ffd54a', accent: '#fff6c8', pattern: 'stars' };

  const ITEMS = {
    bg: [
      { id: 'night',  name: 'יער לילי',    en: 'Night Forest',   price: 0 },
      { id: 'canyon', name: 'קניון',       en: 'Canyon',         egg: 2 },
      { id: 'aurora', name: 'זוהר צפוני',  en: 'Northern Lights', egg: 5 },
      { id: 'sunset', name: 'שקיעה',       en: 'Sunset',         price: 150 },
      { id: 'ocean',  name: 'מעמקי הים',   en: 'Deep Sea',       price: 200 },
      { id: 'spring', name: 'אביב',        en: 'Spring',         egg: 10, light: true },
    ],
    tube: [
      { id: 'classic', name: 'קלאסית',  en: 'Classic', price: 0 },
      { id: 'bottle',  name: 'בקבוק',   en: 'Bottle',  egg: 3 },
      { id: 'spiral',  name: 'ספירלה',  en: 'Spiral',  egg: 8 },
      { id: 'gold',    name: 'זהב',     en: 'Gold',    price: 250 },
    ],
    skin: [
      { id: 'glossy',  name: 'שיש',       en: 'Marble',  price: 0 },
      { id: 'eggs',    name: 'ביצים',     en: 'Eggs',    egg: 1 },
      { id: 'flat',    name: 'שטוח',      en: 'Flat',    price: 100 },
      { id: 'symbols', name: 'עם סמלים',  en: 'Symbols', price: 150 },
      { id: 'gems',    name: 'אבני חן',   en: 'Gems',    egg: 7 },
    ],
  };

  function eggDef(n) { return EGGS[n - 1] || GOLD_EGG; }
  // Items that come out of egg n.
  function eggRewards(n) {
    const out = [];
    for (const kind of Object.keys(ITEMS)) for (const it of ITEMS[kind]) if (it.egg === n) out.push({ kind, item: it });
    return out;
  }
  function findItem(kind, id) { return (ITEMS[kind] || []).find(i => i.id === id); }

  root.Catalog = { LEVELS_PER_EGG, RARITY, EGGS, GOLD_EGG, ITEMS, eggDef, eggRewards, findItem };
})(this);
