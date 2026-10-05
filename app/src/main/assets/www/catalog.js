// Collectibles: eggs (one hatches every 10 levels) and cosmetic items.
// Items are either bought with coins (price) or come out of a specific egg (egg: number).
(function (root) {
  'use strict';

  const LEVELS_PER_EGG = 10;

  const RARITY = {
    common: { name: 'רגילה', color: '#9fb4c8', coins: 20 },
    rare:   { name: 'נדירה', color: '#4fc3f7', coins: 40 },
    epic:   { name: 'אפית',  color: '#c084fc', coins: 80 },
    legend: { name: 'אגדית', color: '#ffc83d', coins: 150 },
  };

  // Egg N hatches when level N*10 is solved for the first time.
  const EGGS = [
    { name: 'אבטיח',       rarity: 'common', base: '#7cc35f', accent: '#2f6b2a', pattern: 'vstripes' },
    { name: 'תות',         rarity: 'common', base: '#ef4b5c', accent: '#ffd9de', pattern: 'spots' },
    { name: 'שמיים',       rarity: 'rare',   base: '#5ec8f2', accent: '#e8f8ff', pattern: 'waves' },
    { name: 'לימון',       rarity: 'common', base: '#ffe14d', accent: '#e59b00', pattern: 'zigzag' },
    { name: 'אוקיינוס',    rarity: 'epic',   base: '#1e6fd9', accent: '#7fd3ff', pattern: 'scales' },
    { name: 'שזיף',        rarity: 'common', base: '#7b3fa0', accent: '#e2c7f5', pattern: 'dots' },
    { name: 'מנטה',        rarity: 'rare',   base: '#7ee0c3', accent: '#1d8f73', pattern: 'diamonds' },
    { name: 'פרחוני',      rarity: 'common', base: '#ff9f43', accent: '#fff3c4', pattern: 'stars' },
    { name: 'שוקולד',      rarity: 'common', base: '#7a4a2e', accent: '#d7a77a', pattern: 'swirl' },
    { name: 'קשת בענן',    rarity: 'legend', base: '#ffffff', accent: '#ffffff', pattern: 'bands' },
    { name: 'ענבים',       rarity: 'common', base: '#a05ad6', accent: '#5b2a86', pattern: 'dots' },
    { name: 'אש',          rarity: 'rare',   base: '#d7261e', accent: '#ffb31a', pattern: 'flames' },
    { name: 'מסטיק',       rarity: 'common', base: '#ff8fc4', accent: '#ffffff', pattern: 'stripes' },
    { name: 'יער',         rarity: 'common', base: '#2f7d4a', accent: '#a6e08a', pattern: 'scales' },
    { name: 'ליל כוכבים',  rarity: 'epic',   base: '#1b2a6b', accent: '#ffe27a', pattern: 'stars' },
    { name: 'אפרסק',       rarity: 'common', base: '#ffc39e', accent: '#ff8a65', pattern: 'waves' },
    { name: 'חול',         rarity: 'common', base: '#e8cf9a', accent: '#a5814a', pattern: 'spots' },
    { name: 'קרח',         rarity: 'rare',   base: '#cdeeff', accent: '#5fb4e6', pattern: 'diamonds' },
    { name: 'דבש',         rarity: 'common', base: '#f2a516', accent: '#ffe08a', pattern: 'scales' },
    { name: 'דרקון',       rarity: 'legend', base: '#0f8a5f', accent: '#ffd54a', pattern: 'scales' },
    { name: 'לבנדר',       rarity: 'common', base: '#b9a3f0', accent: '#6c4fc4', pattern: 'waves' },
    { name: 'אלמוג',       rarity: 'rare',   base: '#ff7a6b', accent: '#fff0e8', pattern: 'zigzag' },
    { name: 'קקאו',        rarity: 'common', base: '#4e2f22', accent: '#a9714b', pattern: 'stripes' },
    { name: 'ליים',        rarity: 'common', base: '#b6e04a', accent: '#5a8a12', pattern: 'dots' },
    { name: 'שקיעה',       rarity: 'epic',   base: '#ffffff', accent: '#ffffff', pattern: 'bands',
      colors: ['#2c1e4a', '#8e3b6e', '#e0607e', '#f07a5a', '#ffb26b', '#ffd98a'] },
    { name: 'טורקיז',      rarity: 'common', base: '#19b3b1', accent: '#c8fffb', pattern: 'swirl' },
    { name: 'פנינה',       rarity: 'rare',   base: '#f3eee6', accent: '#d4c4ad', pattern: 'swirl' },
    { name: 'אבן',         rarity: 'common', base: '#8d949c', accent: '#4c535a', pattern: 'spots' },
    { name: 'דובדבן',      rarity: 'common', base: '#a3122a', accent: '#ff9aa9', pattern: 'stars' },
    { name: 'זהב מלכותי',  rarity: 'legend', base: '#f5c542', accent: '#9a6b00', pattern: 'diamonds' },
  ];
  // After the 30 named eggs, every further egg is a golden one worth coins.
  const GOLD_EGG = { name: 'ביצת זהב', rarity: 'epic', base: '#ffd54a', accent: '#fff6c8', pattern: 'stars' };

  const ITEMS = {
    bg: [
      { id: 'night',  name: 'יער לילי',    price: 0 },
      { id: 'canyon', name: 'קניון',       egg: 2 },
      { id: 'aurora', name: 'זוהר צפוני',  egg: 5 },
      { id: 'sunset', name: 'שקיעה',       price: 150 },
      { id: 'ocean',  name: 'מעמקי הים',   price: 200 },
      { id: 'spring', name: 'אביב',        egg: 10, light: true },
    ],
    tube: [
      { id: 'classic', name: 'קלאסית',  price: 0 },
      { id: 'bottle',  name: 'בקבוק',   egg: 3 },
      { id: 'spiral',  name: 'ספירלה',  egg: 8 },
      { id: 'gold',    name: 'זהב',     price: 250 },
    ],
    skin: [
      { id: 'glossy',  name: 'שיש',       price: 0 },
      { id: 'eggs',    name: 'ביצים',     egg: 1 },
      { id: 'flat',    name: 'שטוח',      price: 100 },
      { id: 'symbols', name: 'עם סמלים',  price: 150 },
      { id: 'gems',    name: 'אבני חן',   egg: 7 },
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
