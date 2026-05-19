/**
 * Image bitmap conversion logic
 */

import { extractPalette, type PaletteMethod } from './paletteExtractor';

export type { PaletteMethod };

export interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ProcessImageParams {
  image: HTMLImageElement;
  canvas: HTMLCanvasElement;
  gridCount: number;
  isGrayscale: boolean;
  threshold: number;
  paletteMethod?: PaletteMethod;
  paletteColors?: RGB[];
  rotation?: number; // Rotation in degrees (0, 90, 180, 270)
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
  paletteMethod,
  paletteColors,
  rotation = 0,
}: ProcessImageParams): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Disable anti-aliasing for crisp 8-bit style
  ctx.imageSmoothingEnabled = false;

  // Calculate rotated dimensions (original image dimensions)
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const originalWidth = isRotated90or270 ? image.height : image.width;
  const originalHeight = isRotated90or270 ? image.width : image.height;

  // Calculate square cell size (based on smaller dimension of original image)
  const minDimension = Math.min(image.width, image.height);
  const baseCellSize = minDimension / gridCount;

  // Calculate desired number of cells (round to nearest integer)
  const desiredCols = Math.round(originalWidth / baseCellSize);
  const desiredRows = Math.round(originalHeight / baseCellSize);

  // Calculate integer cell sizes that ensure perfect alignment (no gaps)
  // This ensures cell size is an integer and canvas is a multiple of it
  const actualCellSizeX = Math.max(1, Math.floor(originalWidth / desiredCols));
  const actualCellSizeY = Math.max(1, Math.floor(originalHeight / desiredRows));

  // Recalculate exact number of cells that fit with integer cell size
  // This ensures canvas = cols * actualCellSizeX (perfect multiple, no gaps)
  const cols = Math.floor(originalWidth / actualCellSizeX);
  const rows = Math.floor(originalHeight / actualCellSizeY);

  // Quantize canvas size to be exactly cols * actualCellSizeX (guaranteed integer, no gaps)
  // Since actualCellSizeX/Y are integers and cols/rows are integers, result is integer
  const quantizedCanvasWidth = cols * actualCellSizeX;
  const quantizedCanvasHeight = rows * actualCellSizeY;

  // Set canvas size to quantized dimensions (integers)
  canvas.width = quantizedCanvasWidth;
  canvas.height = quantizedCanvasHeight;

  // Draw original image on temporary canvas with rotation
  // Use quantized dimensions to match the final canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = quantizedCanvasWidth;
  tempCanvas.height = quantizedCanvasHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  // Disable anti-aliasing on temporary canvas as well
  tempCtx.imageSmoothingEnabled = false;
  
  // Apply rotation transformation
  tempCtx.save();
  tempCtx.translate(quantizedCanvasWidth / 2, quantizedCanvasHeight / 2);
  tempCtx.rotate((rotation * Math.PI) / 180);
  tempCtx.drawImage(image, -image.width / 2, -image.height / 2);
  tempCtx.restore();

  // Use provided palette (should always be provided from page.tsx)
  const palette: RGB[] | null = !isGrayscale && paletteColors && paletteColors.length > 0 ? paletteColors : null;

  // Get full image data once (much more efficient than calling getImageData for each cell)
  const fullImageData = tempCtx.getImageData(0, 0, quantizedCanvasWidth, quantizedCanvasHeight);
  const fullPixels = fullImageData.data;
  const fullWidth = quantizedCanvasWidth;

  // Render regular grid with square pixels
  renderRegularGrid({
    ctx,
    fullPixels,
    fullWidth,
    rows,
    cols,
    actualCellSizeX,
    actualCellSizeY,
    isGrayscale,
    threshold,
    palette,
  });
}

/**
 * Render regular grid with square pixels
 */
function renderRegularGrid({
  ctx,
  fullPixels,
  fullWidth,
  rows,
  cols,
  actualCellSizeX,
  actualCellSizeY,
  isGrayscale,
  threshold,
  palette,
}: {
  ctx: CanvasRenderingContext2D;
  fullPixels: Uint8ClampedArray;
  fullWidth: number;
  rows: number;
  cols: number;
  actualCellSizeX: number;
  actualCellSizeY: number;
  isGrayscale: boolean;
  threshold: number;
  palette: RGB[] | null;
}): void {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * actualCellSizeX;
      const y = row * actualCellSizeY;

      // Calculate average color directly from full image data
      const avgColor = calculateAverageColorFromRegion(
        fullPixels,
        fullWidth,
        x,
        y,
        actualCellSizeX,
        actualCellSizeY
      );

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
      } else if (palette && palette.length > 0) {
        // Map to nearest palette color
        const avgRGB: RGB = { r: avgColor.r, g: avgColor.g, b: avgColor.b };
        const nearestPaletteColor = findNearestPaletteColor(avgRGB, palette);
        finalColor = {
          r: nearestPaletteColor.r,
          g: nearestPaletteColor.g,
          b: nearestPaletteColor.b,
          a: avgColor.a,
        };
      }

      // Render square pixel
      ctx.fillStyle = `rgba(${finalColor.r}, ${finalColor.g}, ${finalColor.b}, ${finalColor.a / 255})`;
      ctx.fillRect(x, y, actualCellSizeX, actualCellSizeY);
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
 * Calculate luminance from RGB (normalized to 0..1)
 */
function calculateLuminance(r: number, g: number, b: number): number {
  // Normalize RGB to 0..1
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  // L = 0.2126*R + 0.7152*G + 0.0722*B
  return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
}

/**
 * Calculate average color from a region in the full image data (optimized)
 * This avoids calling getImageData for each cell, which is very expensive
 */
function calculateAverageColorFromRegion(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number
): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  let r = 0,
    g = 0,
    b = 0,
    a = 0;
  let pixelCount = 0;

  // Optimize: calculate bounds once
  const endX = x + cellWidth;
  const endY = y + cellHeight;
  const maxIndex = pixels.length - 3;

  // Iterate through the region (optimized bounds checking)
  for (let py = y; py < endY; py++) {
    const rowStart = py * width;
    for (let px = x; px < endX; px++) {
      const index = (rowStart + px) * 4;

      // Bounds check (optimized)
      if (index >= 0 && index < maxIndex) {
        r += pixels[index];
        g += pixels[index + 1];
        b += pixels[index + 2];
        a += pixels[index + 3];
        pixelCount++;
      }
    }
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
 * Apply soft threshold using smoothstep
 * Uses smoothstep: t = clamp((x - (T - w)) / (2*w), 0, 1), y = t*t*(3 - 2*t)
 * @param color Input color
 * @param threshold Threshold value (0~50, normalized to 0~255)
 * @param transitionWidth Transition width for smoothstep (default: 20, range 0~255)
 */
function applyThreshold(
  color: { r: number; g: number; b: number },
  threshold: number,
  transitionWidth: number = 20
): { r: number; g: number; b: number } {
  // threshold가 0이어도 항상 이진화가 되도록, 최소 1로 보정
  const effectiveThreshold = threshold <= 0 ? 1 : threshold;
  const grayValue = color.r;

  // Clamp transition width to reasonable range
  const w = Math.max(1, Math.min(transitionWidth, 127));

  // threshold가 50일 때도 배경(255)이 검정이 되지 않도록 보장
  // transition width를 고려하여 normalizedThreshold의 최대값을 설정
  // 255인 픽셀이 항상 흰색이 되려면: (255 - (T - w)) / (2*w) > 0.5
  // 즉, T < 255 - w 이어야 함
  const maxThreshold = 255 - w - 1; // 여유를 두기 위해 -1 추가
  const normalizedThreshold = Math.min((effectiveThreshold / 50) * 255, maxThreshold);

  // Compute t = clamp((x - (T - w)) / (2*w), 0, 1)
  const t = Math.max(0, Math.min(1, (grayValue - (normalizedThreshold - w)) / (2 * w)));

  // Apply smoothstep: y = t*t*(3 - 2*t)
  const smoothValue = t * t * (3 - 2 * t);

  // Binarize to white/black only (no grayscale): threshold at 0.5
  const value = smoothValue > 0.5 ? 255 : 0;

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
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Convert hex string to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Color space conversion functions moved to paletteExtractor.ts

/**
 * Convert RGB to HSV (kept for findNearestPaletteColor compatibility)
 */
function rgbToHsv(rgb: RGB): { h: number; s: number; v: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/**
 * Convert HSV to RGB
 */
function hsvToRgb(hsv: { h: number; s: number; v: number }): RGB {
  const h = hsv.h / 60;
  const s = hsv.s;
  const v = hsv.v;

  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 1) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 1 && h < 2) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 2 && h < 3) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 3 && h < 4) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 4 && h < 5) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 5 && h < 6) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// Color space conversion functions moved to paletteExtractor.ts

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Find nearest palette color
 */
function findNearestPaletteColor(color: RGB, palette: RGB[]): RGB {
  let minDistance = Infinity;
  let nearestColor = palette[0];

  for (const paletteColor of palette) {
    const distance = colorDistance(color, paletteColor);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = paletteColor;
    }
  }

  return nearestColor;
}

// Palette extraction functions moved to paletteExtractor.ts

// Re-export extractPalette from paletteExtractor
export { extractPalette } from './paletteExtractor';

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
