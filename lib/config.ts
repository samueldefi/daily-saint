export const CONFIG = {
  outputWidth: 1080,
  outputHeight: 1350,
  textColor: "#FFF4EF",
  overlay1: { r: 39, g: 37, b: 36, a: 0.5 },
  overlay2: { r: 0, g: 0, b: 0, a: 0.2 },
  quoteFontPercent: 0.06,
  attributionFontPercent: 0.0315,
  marginLrPercent: 0.242,
  marginTop: 0.054,
  iconScale: 2.55,
  lineSpacing: 1.2,
  jpegQuality: 0.92,
} as const;

export const DEFAULT_QUOTE_FONT = "DailySaintQuote";
export const DEFAULT_ATTR_FONT = "DailySaintAttr";
export const UPLOAD_QUOTE_FONT = "DailySaintQuoteUpload";
export const UPLOAD_ATTR_FONT = "DailySaintAttrUpload";
