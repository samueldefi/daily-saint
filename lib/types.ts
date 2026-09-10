export type Quote = {
  text: string;
  saint: string;
};

export type PreviewItem = {
  filename: string;
  url: string;
};

export type GenerateInput = {
  quote: string;
  saintName: string;
  background: CanvasImageSource | null;
  solidColor: string | null;
  grayscale: boolean;
  quoteFont: string;
  attrFont: string;
  grain: HTMLCanvasElement | null;
  grainIntensity: number;
};
