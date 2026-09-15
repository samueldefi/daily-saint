export type Quote = {
  id: string;
  text: string;
  author: string;
  feastDay: string;
  scripture: string;
  tags: string[];
  used: boolean;
  createdAt: string;
};

export type Photo = {
  id: string;
  filename: string;
  originalName: string;
  mime: string;
  used: boolean;
  createdAt: string;
};

export type Settings = {
  overlayColor: string;
  overlayOpacity: number;
  greyscale: boolean;
  grainIntensity: number;
  quoteFontCustom: boolean;
  authorFontCustom: boolean;
  quoteFontName: string;
  authorFontName: string;
  fontVersion: number;
};

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export const defaultSettings = (): Settings => ({
  overlayColor: "#272524",
  overlayOpacity: 0.55,
  greyscale: true,
  grainIntensity: 0.45,
  quoteFontCustom: false,
  authorFontCustom: false,
  quoteFontName: "Source Serif 4",
  authorFontName: "Source Serif 4",
  fontVersion: 1,
});
