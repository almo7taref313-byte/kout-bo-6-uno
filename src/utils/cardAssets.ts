import { Card, SuitColor, SuitRank } from '../types';

export type CardTheme = 'colored' | 'white';

const THEME_STORAGE_KEY = 'kout_card_theme';

export function getStoredCardTheme(): CardTheme {
  if (typeof window === 'undefined') return 'colored';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'white' || saved === 'colored') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'colored';
}

export function setStoredCardTheme(theme: CardTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent('kout-card-theme-change', { detail: theme }));
  } catch {
    // ignore storage errors
  }
}

const WHITE_CARD_ASSETS: Record<string, string> = {
  // Blue
  'blue_1': '/assets/aistudio/blue_1_72f39580.png',
  'blue_2': '/assets/aistudio/blue_2_6e9b6aed.png',
  'blue_3': '/assets/aistudio/blue_3_c1b70af1.png',
  'blue_4': '/assets/aistudio/blue_4_0ddc3f10.png',
  'blue_5': '/assets/aistudio/blue_5_476a0fe5.png',
  'blue_6': '/assets/aistudio/blue_6_635eb09d.png',
  'blue_7': '/assets/aistudio/blue_7_78f0630f.png',
  'blue_8': '/assets/aistudio/blue_8_d17fe577.png',
  'blue_9': '/assets/aistudio/blue_9_06680b9f.png',
  'blue_0': '/assets/aistudio/blue_10_16808ea6.png',
  'blue_reverse': '/assets/aistudio/blue_reverse_d1970208.png',
  'blue_skip': '/assets/aistudio/blue_skip_0ca1cafc.png',
  'blue_draw2': '/assets/aistudio/blue_draw2_a02e9dbc.png',

  // Green
  'green_1': '/assets/aistudio/green_1_4aa83c0d.png',
  'green_2': '/assets/aistudio/green_2_24942043.png',
  'green_3': '/assets/aistudio/green_3_807fc441.png',
  'green_4': '/assets/aistudio/green_4_dc4ce78d.png',
  'green_5': '/assets/aistudio/green_5_e1c6141e.png',
  'green_6': '/assets/aistudio/green_6_ad08078b.png',
  'green_7': '/assets/aistudio/green_7_ea38204a.png',
  'green_8': '/assets/aistudio/green_8_3f9747aa.png',
  'green_9': '/assets/aistudio/green_9_8a36a92d.png',
  'green_0': '/assets/aistudio/green_10_d6838f19.png',
  'green_reverse': '/assets/aistudio/green_reverse_00c8bddf.png',
  'green_skip': '/assets/aistudio/green_skip_63ae8399.png',
  'green_draw2': '/assets/aistudio/green_draw2_38f8be13.png',

  // Red
  'red_1': '/assets/aistudio/red_1_92db8d7d.png',
  'red_2': '/assets/aistudio/red_2_d4e7ee0e.png',
  'red_3': '/assets/aistudio/red_3_d0c2d7e3.png',
  'red_4': '/assets/aistudio/red_4_863ecf39.png',
  'red_5': '/assets/aistudio/red_5_462c9ce4.png',
  'red_6': '/assets/aistudio/red_6_09e50d8d.png',
  'red_7': '/assets/aistudio/red_7_75a81354.png',
  'red_8': '/assets/aistudio/red_8_3e165922.png',
  'red_9': '/assets/aistudio/red_9_0782c31a.png',
  'red_0': '/assets/aistudio/red_10_8b89ddf5.png',
  'red_reverse': '/assets/aistudio/red_reverse_4fc853f5.png',
  'red_skip': '/assets/aistudio/red_skip_38d5eedd.png',
  'red_draw2': '/assets/aistudio/red_draw2_e74d1820.png',

  // Yellow
  'yellow_1': '/assets/aistudio/yellow_1_41ea2f72.png',
  'yellow_2': '/assets/aistudio/yellow_2_88965ce2.png',
  'yellow_3': '/assets/aistudio/yellow_3_5c318270.png',
  'yellow_4': '/assets/aistudio/yellow_4_3b1508c8.png',
  'yellow_5': '/assets/aistudio/yellow_5_33b9c445.png',
  'yellow_6': '/assets/aistudio/yellow_6_f61eadc1.png',
  'yellow_7': '/assets/aistudio/yellow_7_874b3fe8.png',
  'yellow_8': '/assets/aistudio/yellow_8_02249571.png',
  'yellow_9': '/assets/aistudio/yellow_9_0f868c52.png',
  'yellow_0': '/assets/aistudio/yellow_10_7cd12fe5.png',
  'yellow_reverse': '/assets/aistudio/yellow_reverse_919634aa.png',
  'yellow_skip': '/assets/aistudio/yellow_skip_c734fec7.png',
  'yellow_draw2': '/assets/aistudio/yellow_draw2_18e4b1fb.png',

  // Specials
  'special_wild_draw4': '/assets/aistudio/wild_draw4_167b5feb.png',
  'special_wild_color': '/assets/aistudio/wild_423ae1af.png',
};

export function getWhiteCardImageUrl(card: Pick<Card, 'color' | 'rank' | 'isJoker' | 'isMaker'>): string | null {
  if (card.isJoker || card.rank === 'wild_draw4') {
    return WHITE_CARD_ASSETS['special_wild_draw4'];
  }
  if (card.isMaker || card.rank === 'wild_color') {
    return WHITE_CARD_ASSETS['special_wild_color'];
  }
  const key = `${card.color as SuitColor}_${card.rank as SuitRank}`;
  return WHITE_CARD_ASSETS[key] || null;
}

// Preload all 54 white card images in background when white theme is selected
let hasPreloaded = false;
export function preloadWhiteCardAssets(): void {
  if (hasPreloaded || typeof window === 'undefined') return;
  hasPreloaded = true;
  Object.values(WHITE_CARD_ASSETS).forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}
