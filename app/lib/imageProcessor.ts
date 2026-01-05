/**
 * Image bitmap conversion logic
 */

interface ProcessImageParams {
  image: HTMLImageElement;
  canvas: HTMLCanvasElement;
  gridCount: number;
  isGrayscale: boolean;
  threshold: number;
}

/**
 * Convert image to bitmap
 */
export function processImageToBitmap({
  image,
  canvas,
  gridCount,
  isGrayscale,
  threshold,
}: ProcessImageParams): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size to match image size
  canvas.width = image.width;
  canvas.height = image.height;

  // Calculate square cell size (based on smaller dimension)
  const minDimension = Math.min(image.width, image.height);
  const cellSize = minDimension / gridCount;

  // Calculate grid columns and rows
  const cols = Math.ceil(image.width / cellSize);
  const rows = Math.ceil(image.height / cellSize);

  // Draw original image on temporary canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  tempCtx.drawImage(image, 0, 0);

  // Calculate average color for each grid cell and convert to bitmap
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;

      // Get image data for cell area
      const imageData = tempCtx.getImageData(
        Math.floor(x),
        Math.floor(y),
        Math.ceil(cellSize),
        Math.ceil(cellSize)
      );

      // Calculate average color
      const avgColor = calculateAverageColor(imageData);

      // Convert to grayscale and apply threshold if in grayscale mode
      let finalColor = avgColor;
      if (isGrayscale) {
        const grayscale = convertToGrayscale(avgColor);
        const thresholded = applyThreshold(grayscale, threshold);
        // Make white (255) transparent
        const isWhite = thresholded.r === 255 && thresholded.g === 255 && thresholded.b === 255;
        finalColor = {
          r: thresholded.r,
          g: thresholded.g,
          b: thresholded.b,
          a: isWhite ? 0 : avgColor.a, // Transparent if white, otherwise keep original alpha
        };
      }

      // Fill square cell with average color
      ctx.fillStyle = `rgba(${finalColor.r}, ${finalColor.g}, ${finalColor.b}, ${finalColor.a / 255})`;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

/**
 * Calculate average color from image data
 */
function calculateAverageColor(imageData: ImageData): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const pixels = imageData.data;
  let r = 0,
    g = 0,
    b = 0,
    a = 0;
  let pixelCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    a += pixels[i + 3];
    pixelCount++;
  }

  if (pixelCount > 0) {
    return {
      r: Math.floor(r / pixelCount),
      g: Math.floor(g / pixelCount),
      b: Math.floor(b / pixelCount),
      a: Math.floor(a / pixelCount),
    };
  }

  return { r: 0, g: 0, b: 0, a: 0 };
}

/**
 * Convert RGB color to grayscale
 */
function convertToGrayscale(color: {
  r: number;
  g: number;
  b: number;
}): { r: number; g: number; b: number } {
  const gray = Math.floor(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
  return { r: gray, g: gray, b: gray };
}

/**
 * Convert RGB to HSV
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6;
    } else if (max === g) {
      h = (b - r) / diff + 2;
    } else {
      h = (r - g) / diff + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : diff / max;
  const v = max;

  return { h, s, v };
}

/**
 * Apply threshold (normalize 0~50 value to 0~255 for binarization)
 * Consider hue-based quantize to determine if color should be quantized based on threshold value
 */
function applyThreshold(
  color: { r: number; g: number; b: number },
  threshold: number
): { r: number; g: number; b: number } {
  // Normalize 0~50 value to 0~255
  const normalizedThreshold = (threshold / 50) * 255;
  
  // Grayscale value (r, g, b are all the same since it's already grayscale)
  const grayValue = color.r;
  
  // If threshold is 0, keep all values as original grayscale (no quantize)
  if (threshold === 0) {
    return { r: grayValue, g: grayValue, b: grayValue };
  }
  
  // Quantize based on threshold value
  // Binarize based on normalizedThreshold
  // White (255) if brightness >= threshold, black (0) otherwise
  const value = grayValue >= normalizedThreshold ? 255 : 0;
  
  return { r: value, g: value, b: value };
}

/**
 * Load image from file
 */
export function loadImageFromFile(
  file: File,
  onLoad: (image: HTMLImageElement, imageUrl: string) => void
): void {
  const reader = new FileReader();
  reader.onload = (event) => {
    const url = event.target?.result as string;
    const img = new Image();
    img.onload = () => {
      onLoad(img, url);
    };
    img.src = url;
  };
  reader.readAsDataURL(file);
}

/**
 * Export canvas to PNG
 */
export function exportToPNG(canvas: HTMLCanvasElement, filename: string = 'bitmap.png'): void {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Export canvas to SVG (optimized by grid cell units)
 */
export function exportToSVG(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  gridCount: number,
  filename: string = 'bitmap.svg'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Calculate square cell size
  const minDimension = Math.min(image.width, image.height);
  const cellSize = minDimension / gridCount;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);

  // Get canvas image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Create SVG rect elements (by grid cell units)
  const rects: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const actualCellSize = Math.min(cellSize, width - x, height - y);

      // Get center pixel color of cell (or first pixel)
      const pixelX = Math.floor(x + actualCellSize / 2);
      const pixelY = Math.floor(y + actualCellSize / 2);
      const index = (pixelY * width + pixelX) * 4;

      if (index < pixels.length) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3] / 255;

        if (a > 0) {
          const color = `rgba(${r},${g},${b},${a})`;
          rects.push(
            `<rect x="${x}" y="${y}" width="${actualCellSize}" height="${actualCellSize}" fill="${color}"/>`
          );
        }
      }
    }
  }

  // Generate SVG string
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${rects.join('\n  ')}
</svg>`;

  // Create blob and download
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
