import {
  DEFAULT_ATTR_FONT,
  DEFAULT_QUOTE_FONT,
  UPLOAD_ATTR_FONT,
  UPLOAD_QUOTE_FONT,
} from "./config";

async function addFace(family: string, source: string | ArrayBuffer) {
  const existing = [...document.fonts].find((face) => face.family === family);
  if (existing) {
    document.fonts.delete(existing);
  }
  const face = new FontFace(family, source);
  await face.load();
  document.fonts.add(face);
}

export async function loadDefaultFonts() {
  await Promise.all([
    addFace(DEFAULT_QUOTE_FONT, "url(/fonts/cormorant-garamond-700.woff)"),
    addFace(DEFAULT_ATTR_FONT, "url(/fonts/cormorant-garamond-300.woff)"),
  ]);
}

export async function loadUploadedFont(
  role: "quote" | "attr",
  file: File,
): Promise<string> {
  const family = role === "quote" ? UPLOAD_QUOTE_FONT : UPLOAD_ATTR_FONT;
  const buffer = await file.arrayBuffer();
  await addFace(family, buffer);
  return family;
}
