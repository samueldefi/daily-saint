import JSZip from "jszip";

export async function zipImages(
  files: { filename: string; blob: Blob }[],
): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, file.blob);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
