import { CONFIG } from "./config";
import { loadIcon } from "./icon";
import type { GenerateInput } from "./types";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const test = [...current, word].join(" ");
    if (ctx.measureText(test).width <= maxWidth) {
      current.push(word);
    } else {
      if (current.length) lines.push(current.join(" "));
      current = [word];
    }
  }

  if (current.length) lines.push(current.join(" "));
  return lines.length ? lines : [""];
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  grayscale: boolean,
) {
  const width = CONFIG.outputWidth;
  const height = CONFIG.outputHeight;
  const sourceWidth =
    "width" in image ? Number(image.width) : CONFIG.outputWidth;
  const sourceHeight =
    "height" in image ? Number(image.height) : CONFIG.outputHeight;
  const targetRatio = width / height;
  const currentRatio = sourceWidth / sourceHeight;

  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (currentRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  ctx.save();
  if (grayscale) ctx.filter = "grayscale(1)";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  ctx.restore();
}

function applyOverlay(
  ctx: CanvasRenderingContext2D,
  color: { r: number; g: number; b: number; a: number },
) {
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  ctx.fillRect(0, 0, CONFIG.outputWidth, CONFIG.outputHeight);
}

function applySoftLightGrain(
  ctx: CanvasRenderingContext2D,
  grain: HTMLCanvasElement,
  intensity: number,
) {
  const { width, height } = ctx.canvas;
  const base = ctx.getImageData(0, 0, width, height);
  const grainCtx = grain.getContext("2d");
  if (!grainCtx) return;
  const grainData = grainCtx.getImageData(0, 0, width, height);

  let sum = 0;
  const pixelCount = width * height;
  for (let i = 0; i < grainData.data.length; i += 4) {
    sum +=
      (0.299 * grainData.data[i] +
        0.587 * grainData.data[i + 1] +
        0.114 * grainData.data[i + 2]) /
      255;
  }
  const mean = sum / pixelCount;

  const bd = base.data;
  const gd = grainData.data;
  for (let i = 0; i < bd.length; i += 4) {
    const lum =
      (0.299 * gd[i] + 0.587 * gd[i + 1] + 0.114 * gd[i + 2]) / 255;
    const blend = Math.min(1, Math.max(0, 0.5 + (lum - mean) * intensity));
    for (let c = 0; c < 3; c++) {
      const b = bd[i + c] / 255;
      const result =
        blend < 0.5
          ? 2 * b * blend + b * b * (1 - 2 * blend)
          : 2 * b * (1 - blend) +
            Math.sqrt(Math.max(0.0001, b)) * (2 * blend - 1);
      bd[i + c] = Math.min(255, Math.max(0, result * 255));
    }
  }

  ctx.putImageData(base, 0, 0);
}

export async function prepareGrain(
  file: File,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = CONFIG.outputWidth;
  canvas.height = CONFIG.outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create grain canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export function sanitizeFilename(name: string) {
  return name.replace(/ /g, "_").replace(/[.,']/g, "");
}

export async function generateSaintImage(input: GenerateInput): Promise<Blob> {
  const width = CONFIG.outputWidth;
  const height = CONFIG.outputHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas");

  if (input.solidColor) {
    ctx.fillStyle = input.solidColor;
    ctx.fillRect(0, 0, width, height);
  } else if (input.background) {
    drawCoverImage(ctx, input.background, input.grayscale);
    applyOverlay(ctx, CONFIG.overlay1);
    applyOverlay(ctx, CONFIG.overlay2);
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);
  }

  if (input.grain) {
    applySoftLightGrain(ctx, input.grain, input.grainIntensity);
  }

  const quoteFontSize = Math.floor(width * CONFIG.quoteFontPercent);
  const attrFontSize = Math.floor(width * CONFIG.attributionFontPercent);
  const marginLr = Math.floor(width * CONFIG.marginLrPercent);
  const marginTop = Math.floor(height * CONFIG.marginTop);
  const icon = await loadIcon();
  const iconWidth = 21 * CONFIG.iconScale;
  const iconHeight = 28 * CONFIG.iconScale;
  ctx.drawImage(
    icon,
    (width - iconWidth) / 2,
    marginTop,
    iconWidth,
    iconHeight,
  );

  ctx.fillStyle = CONFIG.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `300 ${attrFontSize}px "${input.attrFont}"`;
  const attrHeight = attrFontSize;
  const attrY = height - marginTop - attrHeight;

  ctx.font = `700 ${quoteFontSize}px "${input.quoteFont}"`;
  const maxTextWidth = width - marginLr * 2;
  const lines = wrapText(ctx, input.quote, maxTextWidth);
  const lineHeight = Math.floor(quoteFontSize * CONFIG.lineSpacing);
  const totalTextHeight = lines.length * lineHeight;
  const iconBottom = marginTop + Math.floor(28 * CONFIG.iconScale);
  const availableSpace = attrY - iconBottom;
  const quoteY = iconBottom + Math.floor((availableSpace - totalTextHeight) / 2);

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, quoteY + i * lineHeight);
  }

  ctx.font = `300 ${attrFontSize}px "${input.attrFont}"`;
  ctx.fillText(input.saintName, width / 2, attrY);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Failed to encode JPEG"));
      },
      "image/jpeg",
      CONFIG.jpegQuality,
    );
  });

  return blob;
}
