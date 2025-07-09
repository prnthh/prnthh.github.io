
export function getImageData(image: HTMLImageElement) {
  // todo: investigate offscreen canvas, or renderBuffers
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get 2D context from canvas.");
  }
  context.drawImage(image, 0, 0);

  return context.getImageData(0, 0, image.width, image.height);
}
