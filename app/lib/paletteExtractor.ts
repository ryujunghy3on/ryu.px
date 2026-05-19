/**
 * Palette extraction methods
 */

import type { RGB } from './imageProcessor';

export type PaletteMethod = 'kmeans' | 'medianCut' | 'histogram' | 'hueClustering' | 'saturated' | 'accent' | 'contour';

// Color space conversion helpers
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

function rgbToXyz(rgb: RGB): { x: number; y: number; z: number } {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  return { x, y, z };
}

function xyzToLab(xyz: { x: number; y: number; z: number }): { l: number; a: number; b: number } {
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx = xyz.x / xn > 0.008856 ? Math.pow(xyz.x / xn, 1 / 3) : (7.787 * (xyz.x / xn) + 16 / 116);
  const fy = xyz.y / yn > 0.008856 ? Math.pow(xyz.y / yn, 1 / 3) : (7.787 * (xyz.y / yn) + 16 / 116);
  const fz = xyz.z / zn > 0.008856 ? Math.pow(xyz.z / zn, 1 / 3) : (7.787 * (xyz.z / zn) + 16 / 116);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

function rgbToLab(rgb: RGB): { l: number; a: number; b: number } {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

function labToXyz(lab: { l: number; a: number; b: number }): { x: number; y: number; z: number } {
  const yn = 1.0;
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const xn = 0.95047;
  const zn = 1.08883;

  const xr = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787;
  const yr = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787;
  const zr = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787;

  return {
    x: xr * xn,
    y: yr * yn,
    z: zr * zn,
  };
}

function xyzToRgb(xyz: { x: number; y: number; z: number }): RGB {
  let r = xyz.x * 3.2404542 + xyz.y * -1.5371385 + xyz.z * -0.4985314;
  let g = xyz.x * -0.969266 + xyz.y * 1.8760108 + xyz.z * 0.041556;
  let b = xyz.x * 0.0556434 + xyz.y * -0.2040259 + xyz.z * 1.0572252;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255))),
  };
}

function labToRgb(lab: { l: number; a: number; b: number }): RGB {
  const xyz = labToXyz(lab);
  return xyzToRgb(xyz);
}

function labDistance(lab1: { l: number; a: number; b: number }, lab2: { l: number; a: number; b: number }): number {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function ciede2000(lab1: { l: number; a: number; b: number }, lab2: { l: number; a: number; b: number }): number {
  const L1 = lab1.l;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const L2 = lab2.l;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CMean = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(CMean, 7) / (Math.pow(CMean, 7) + Math.pow(25, 7))));

  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  let h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI);
  let h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI);

  if (h1Prime < 0) h1Prime += 360;
  if (h2Prime < 0) h2Prime += 360;

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltaHPrime = 0;
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h2Prime - h1Prime) <= 180) {
      deltaHPrime = h2Prime - h1Prime;
    } else if (h2Prime - h1Prime > 180) {
      deltaHPrime = h2Prime - h1Prime - 360;
    } else {
      deltaHPrime = h2Prime - h1Prime + 360;
    }
  }
  deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((deltaHPrime * Math.PI) / 360);

  const LMeanPrime = (L1 + L2) / 2;
  const CMeanPrime = (C1Prime + C2Prime) / 2;

  let hMeanPrime = 0;
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h1Prime - h2Prime) <= 180) {
      hMeanPrime = (h1Prime + h2Prime) / 2;
    } else if (Math.abs(h1Prime - h2Prime) > 180 && h1Prime + h2Prime < 360) {
      hMeanPrime = (h1Prime + h2Prime + 360) / 2;
    } else {
      hMeanPrime = (h1Prime + h2Prime - 360) / 2;
    }
  } else {
    hMeanPrime = h1Prime + h2Prime;
  }

  const T =
    1 -
    0.17 * Math.cos((hMeanPrime - 30) * (Math.PI / 180)) +
    0.24 * Math.cos(2 * hMeanPrime * (Math.PI / 180)) +
    0.32 * Math.cos((3 * hMeanPrime + 6) * (Math.PI / 180)) -
    0.2 * Math.cos((4 * hMeanPrime - 63) * (Math.PI / 180));

  const deltaTheta = 30 * Math.exp(-Math.pow((hMeanPrime - 275) / 25, 2));

  const R_C = 2 * Math.sqrt(Math.pow(CMeanPrime, 7) / (Math.pow(CMeanPrime, 7) + Math.pow(25, 7)));

  const R_T = -Math.sin(2 * deltaTheta * (Math.PI / 180)) * R_C;

  const k_L = 1;
  const k_C = 1;
  const k_H = 1;

  const S_L = 1 + (0.015 * Math.pow(LMeanPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LMeanPrime - 50, 2));
  const S_C = 1 + 0.045 * CMeanPrime;
  const S_H = 1 + 0.015 * CMeanPrime * T;

  const deltaE = Math.sqrt(
    Math.pow(deltaLPrime / (k_L * S_L), 2) +
      Math.pow(deltaCPrime / (k_C * S_C), 2) +
      Math.pow(deltaHPrime / (k_H * S_H), 2) +
      R_T * (deltaCPrime / (k_C * S_C)) * (deltaHPrime / (k_H * S_H))
  );

  return deltaE;
}

function extractPixels(imageData: ImageData): RGB[] {
  const pixels: RGB[] = [];
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    pixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    });
  }

  return pixels;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

function labChroma(lab: { l: number; a: number; b: number }): number {
  return Math.sqrt(lab.a * lab.a + lab.b * lab.b);
}

function getCandidateColors(imageData: ImageData, maxCandidates: number = 256): Array<{ color: RGB; frequency: number; lab: { l: number; a: number; b: number } }> {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) return [];

  const binBits = 6;
  const binsPerChannel = 1 << binBits;
  const binSize = 256 / binsPerChannel;
  const histogram = new Map<number, RGB[]>();

  for (const pixel of pixels) {
    const rBin = Math.floor(pixel.r / binSize);
    const gBin = Math.floor(pixel.g / binSize);
    const bBin = Math.floor(pixel.b / binSize);
    const binIndex = (rBin << (binBits * 2)) | (gBin << binBits) | bBin;

    if (!histogram.has(binIndex)) {
      histogram.set(binIndex, []);
    }
    histogram.get(binIndex)!.push(pixel);
  }

  const candidates: Array<{ color: RGB; frequency: number; lab: { l: number; a: number; b: number } }> = [];
  for (const [_, binPixels] of histogram.entries()) {
    if (binPixels.length === 0) continue;

    const avgColor = {
      r: Math.round(binPixels.reduce((sum, p) => sum + p.r, 0) / binPixels.length),
      g: Math.round(binPixels.reduce((sum, p) => sum + p.g, 0) / binPixels.length),
      b: Math.round(binPixels.reduce((sum, p) => sum + p.b, 0) / binPixels.length),
    };

    candidates.push({
      color: avgColor,
      frequency: binPixels.length,
      lab: rgbToLab(avgColor),
    });
  }

  candidates.sort((a, b) => b.frequency - a.frequency);
  return candidates.slice(0, maxCandidates);
}

function selectColorsGreedyMaxMinOptimized(
  candidates: Array<{ lab: { l: number; a: number; b: number }; rgb: RGB; weight: number }>,
  k: number,
  allPixels: RGB[]
): RGB[] {
  if (candidates.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const selected: typeof candidates = [];
  let rejectionThreshold = 10;

  const sortedByWeight = [...candidates].sort((a, b) => b.weight - a.weight);
  if (sortedByWeight.length > 0) {
    selected.push(sortedByWeight[0]);
  }

  while (selected.length < k && candidates.length > 0) {
    let bestCandidate: typeof candidates[0] | null = null;
    let maxMinDistance = -1;

    for (const candidate of candidates) {
      const isSelected = selected.some(
        (s) =>
          s.rgb.r === candidate.rgb.r &&
          s.rgb.g === candidate.rgb.g &&
          s.rgb.b === candidate.rgb.b
      );
      if (isSelected) continue;

      let minDistance = Infinity;
      for (const s of selected) {
        const dist = ciede2000(candidate.lab, s.lab);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance < rejectionThreshold) continue;

      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate);
    } else {
      if (rejectionThreshold > 6) {
        rejectionThreshold = 6;
        continue;
      } else {
        break;
      }
    }
  }

  while (selected.length < k && candidates.length > 0) {
    let bestCandidate: typeof candidates[0] | null = null;
    let maxMinDistance = -1;

    for (const candidate of candidates) {
      const isSelected = selected.some(
        (s) =>
          s.rgb.r === candidate.rgb.r &&
          s.rgb.g === candidate.rgb.g &&
          s.rgb.b === candidate.rgb.b
      );
      if (isSelected) continue;

      let minDistance = Infinity;
      for (const s of selected) {
        const dist = ciede2000(candidate.lab, s.lab);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance >= rejectionThreshold) {
        if (minDistance > maxMinDistance) {
          maxMinDistance = minDistance;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate);
    } else {
      rejectionThreshold = Math.max(0, rejectionThreshold - 1);
      if (rejectionThreshold < 0) break;
    }
  }

  const selectedRgb: RGB[] = selected.map((c) => {
    const rgb = c.rgb;
    return {
      r: Math.max(0, Math.min(255, Math.round(rgb.r))),
      g: Math.max(0, Math.min(255, Math.round(rgb.g))),
      b: Math.max(0, Math.min(255, Math.round(rgb.b))),
    };
  });

  const pixelAssignments = new Array(selected.length).fill(0);

  for (const pixel of allPixels) {
    const pixelLab = rgbToLab(pixel);
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < selected.length; i++) {
      const distance = ciede2000(pixelLab, selected[i].lab);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    pixelAssignments[nearestIndex]++;
  }

  const weights = pixelAssignments.map((count) => count / allPixels.length);

  const withWeights = selectedRgb.map((color, idx) => ({
    color,
    weight: weights[idx],
  }));
  withWeights.sort((a, b) => b.weight - a.weight);

  return withWeights.map((item) => item.color).slice(0, k);
}

// Palette extraction methods
function kMeansLab(imageData: ImageData, k: number = 5): RGB[] {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const labPixels = pixels.map((p) => rgbToLab(p));
  const totalPixels = labPixels.length;

  const rng = new SeededRandom(42);

  const centroidsLab: { l: number; a: number; b: number }[] = [];
  const usedIndices = new Set<number>();

  const firstIndex = Math.floor(rng.next() * labPixels.length);
  centroidsLab.push({ ...labPixels[firstIndex] });
  usedIndices.add(firstIndex);

  for (let i = 1; i < k; i++) {
    const distances: number[] = [];
    let totalDistance = 0;

    for (let j = 0; j < labPixels.length; j++) {
      if (usedIndices.has(j)) {
        distances.push(0);
        continue;
      }

      let minDistToCentroid = Infinity;
      for (const centroid of centroidsLab) {
        const dist = labDistance(labPixels[j], centroid);
        if (dist < minDistToCentroid) {
          minDistToCentroid = dist;
        }
      }

      const distSq = minDistToCentroid * minDistToCentroid;
      distances.push(distSq);
      totalDistance += distSq;
    }

    let random = rng.next() * totalDistance;
    let selectedIndex = 0;
    for (let j = 0; j < distances.length; j++) {
      random -= distances[j];
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    centroidsLab.push({ ...labPixels[selectedIndex] });
    usedIndices.add(selectedIndex);
  }

  const maxIterations = 50;
  const convergenceThreshold = 0.5;
  let clusters: { l: number; a: number; b: number }[][] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array(k)
      .fill(null)
      .map(() => []);

    for (const pixelLab of labPixels) {
      let minDistance = Infinity;
      let nearestCluster = 0;

      for (let i = 0; i < centroidsLab.length; i++) {
        const distance = labDistance(pixelLab, centroidsLab[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = i;
        }
      }

      clusters[nearestCluster].push(pixelLab);
    }

    let maxMovement = 0;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;

      const newCentroidLab = {
        l: clusters[i].reduce((sum, p) => sum + p.l, 0) / clusters[i].length,
        a: clusters[i].reduce((sum, p) => sum + p.a, 0) / clusters[i].length,
        b: clusters[i].reduce((sum, p) => sum + p.b, 0) / clusters[i].length,
      };

      const movement = labDistance(centroidsLab[i], newCentroidLab);
      if (movement > maxMovement) {
        maxMovement = movement;
      }

      centroidsLab[i] = newCentroidLab;
    }

    if (maxMovement < convergenceThreshold) {
      break;
    }
  }

  const result: Array<{ color: RGB; weight: number }> = [];
  for (let i = 0; i < k; i++) {
    const clusterSize = clusters[i]?.length || 0;
    const weight = clusterSize / totalPixels;
    const rgb = labToRgb(centroidsLab[i]);
    
    const clampedRgb: RGB = {
      r: Math.max(0, Math.min(255, Math.round(rgb.r))),
      g: Math.max(0, Math.min(255, Math.round(rgb.g))),
      b: Math.max(0, Math.min(255, Math.round(rgb.b))),
    };

    result.push({ color: clampedRgb, weight });
  }

  result.sort((a, b) => b.weight - a.weight);

  return result.map((item) => item.color);
}

function medianCut(imageData: ImageData, k: number = 5): RGB[] {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const totalPixels = pixels.length;

  interface ColorBox {
    pixels: RGB[];
  }

  const boxes: ColorBox[] = [{ pixels: [...pixels] }];

  while (boxes.length < k) {
    let chosenBoxIndex = 0;
    let maxPopulation = 0;
    let maxRange = 0;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.pixels.length <= 1) continue;

      let rMin = 255,
        rMax = 0,
        gMin = 255,
        gMax = 0,
        bMin = 255,
        bMax = 0;

      for (const pixel of box.pixels) {
        rMin = Math.min(rMin, pixel.r);
        rMax = Math.max(rMax, pixel.r);
        gMin = Math.min(gMin, pixel.g);
        gMax = Math.max(gMax, pixel.g);
        bMin = Math.min(bMin, pixel.b);
        bMax = Math.max(bMax, pixel.b);
      }

      const rangeR = rMax - rMin;
      const rangeG = gMax - gMin;
      const rangeB = bMax - bMin;
      const maxChannelRange = Math.max(rangeR, rangeG, rangeB);

      if (
        box.pixels.length > maxPopulation ||
        (box.pixels.length === maxPopulation && maxChannelRange > maxRange)
      ) {
        maxPopulation = box.pixels.length;
        maxRange = maxChannelRange;
        chosenBoxIndex = i;
      }
    }

    const boxToSplit = boxes[chosenBoxIndex];
    if (boxToSplit.pixels.length <= 1) break;

    let rMin = 255,
      rMax = 0,
      gMin = 255,
      gMax = 0,
      bMin = 255,
      bMax = 0;

    for (const pixel of boxToSplit.pixels) {
      rMin = Math.min(rMin, pixel.r);
      rMax = Math.max(rMax, pixel.r);
      gMin = Math.min(gMin, pixel.g);
      gMax = Math.max(gMax, pixel.g);
      bMin = Math.min(bMin, pixel.b);
      bMax = Math.max(bMax, pixel.b);
    }

    const rangeR = rMax - rMin;
    const rangeG = gMax - gMin;
    const rangeB = bMax - bMin;

    let splitChannel: 'r' | 'g' | 'b';
    if (rangeR >= rangeG && rangeR >= rangeB) {
      splitChannel = 'r';
    } else if (rangeG >= rangeB) {
      splitChannel = 'g';
    } else {
      splitChannel = 'b';
    }

    boxToSplit.pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);

    const medianIndex = Math.floor(boxToSplit.pixels.length / 2);

    const box1: ColorBox = { pixels: boxToSplit.pixels.slice(0, medianIndex) };
    const box2: ColorBox = { pixels: boxToSplit.pixels.slice(medianIndex) };

    boxes.splice(chosenBoxIndex, 1, box1, box2);
  }

  const result: Array<{ color: RGB; weight: number }> = [];

  for (const box of boxes) {
    if (box.pixels.length === 0) {
      result.push({ color: { r: 0, g: 0, b: 0 }, weight: 0 });
      continue;
    }

    const meanColor: RGB = {
      r: Math.round(box.pixels.reduce((sum, p) => sum + p.r, 0) / box.pixels.length),
      g: Math.round(box.pixels.reduce((sum, p) => sum + p.g, 0) / box.pixels.length),
      b: Math.round(box.pixels.reduce((sum, p) => sum + p.b, 0) / box.pixels.length),
    };

    const weight = box.pixels.length / totalPixels;
    result.push({ color: meanColor, weight });
  }

  result.sort((a, b) => b.weight - a.weight);

  return result.map((item) => item.color).slice(0, k);
}

function histogramPalette(imageData: ImageData, k: number = 5): RGB[] {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const totalPixels = pixels.length;

  interface BinData {
    count: number;
    quantizedR: number;
    quantizedG: number;
    quantizedB: number;
  }

  const histogram = new Map<string, BinData>();

  for (const pixel of pixels) {
    const quantizedR = pixel.r >> 3;
    const quantizedG = pixel.g >> 3;
    const quantizedB = pixel.b >> 3;

    const binKey = `${quantizedR},${quantizedG},${quantizedB}`;

    if (!histogram.has(binKey)) {
      histogram.set(binKey, {
        count: 0,
        quantizedR,
        quantizedG,
        quantizedB,
      });
    }

    histogram.get(binKey)!.count++;
  }

  const bins: Array<BinData & { luminance: number }> = Array.from(histogram.values()).map(
    (bin) => {
      const centerR = bin.quantizedR * 8 + 4;
      const centerG = bin.quantizedG * 8 + 4;
      const centerB = bin.quantizedB * 8 + 4;

      const luminance = 0.2126 * centerR + 0.7152 * centerG + 0.0722 * centerB;

      return {
        ...bin,
        luminance,
      };
    }
  );

  bins.sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }
    return b.luminance - a.luminance;
  });

  const topBins = bins.slice(0, k);

  const result: Array<{ color: RGB; weight: number }> = [];

  for (const bin of topBins) {
    const centerR = bin.quantizedR * 8 + 4;
    const centerG = bin.quantizedG * 8 + 4;
    const centerB = bin.quantizedB * 8 + 4;

    const color: RGB = {
      r: Math.max(0, Math.min(255, centerR)),
      g: Math.max(0, Math.min(255, centerG)),
      b: Math.max(0, Math.min(255, centerB)),
    };

    const weight = bin.count / totalPixels;

    result.push({ color, weight });
  }

  result.sort((a, b) => b.weight - a.weight);

  return result.map((item) => item.color).slice(0, k);
}

function hueClusteringPalette(imageData: ImageData, colorCount: number): RGB[] {
  const candidates = getCandidateColors(imageData, 256);
  if (candidates.length === 0) return Array(colorCount).fill({ r: 0, g: 0, b: 0 });

  const candidatesWithHue = candidates.map((c) => {
    const hsv = rgbToHsv(c.color);
    const weight = c.frequency * labChroma(c.lab);
    return {
      ...c,
      hue: hsv.h,
      weight,
      cosH: Math.cos((hsv.h * Math.PI) / 180),
      sinH: Math.sin((hsv.h * Math.PI) / 180),
    };
  });

  const k = colorCount;
  type CandidateWithHue = typeof candidatesWithHue[0];
  const clusters: CandidateWithHue[][] = Array(k)
    .fill(null)
    .map(() => []);

  const hueCentroids: { cos: number; sin: number }[] = [];
  for (let i = 0; i < k; i++) {
    const angle = (i * 360) / k;
    hueCentroids.push({
      cos: Math.cos((angle * Math.PI) / 180),
      sin: Math.sin((angle * Math.PI) / 180),
    });
  }

  for (const candidate of candidatesWithHue) {
    let minDist = Infinity;
    let nearestCluster = 0;

    for (let i = 0; i < k; i++) {
      const dist = Math.sqrt(
        Math.pow(candidate.cosH - hueCentroids[i].cos, 2) +
          Math.pow(candidate.sinH - hueCentroids[i].sin, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearestCluster = i;
      }
    }

    clusters[nearestCluster].push(candidate);
  }

  const palette: RGB[] = [];
  for (const cluster of clusters) {
    if (cluster.length === 0) {
      palette.push({ r: 0, g: 0, b: 0 });
      continue;
    }

    const totalWeight = cluster.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) {
      palette.push(cluster[0].color);
      continue;
    }

    const meanLab = {
      l: cluster.reduce((sum, c) => sum + c.lab.l * c.weight, 0) / totalWeight,
      a: cluster.reduce((sum, c) => sum + c.lab.a * c.weight, 0) / totalWeight,
      b: cluster.reduce((sum, c) => sum + c.lab.b * c.weight, 0) / totalWeight,
    };

    palette.push(labToRgb(meanLab));
  }

  return palette.slice(0, colorCount);
}

function saturatedPalette(imageData: ImageData, k: number = 5): RGB[] {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const totalPixels = pixels.length;

  interface Candidate {
    lab: { l: number; a: number; b: number };
    rgb: RGB;
    chroma: number;
    weight: number;
  }

  const allCandidates: Candidate[] = pixels.map((pixel) => {
    const lab = rgbToLab(pixel);
    const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    const weight = (chroma * chroma) * (lab.l / 100);
    return {
      lab,
      rgb: pixel,
      chroma,
      weight,
    };
  });

  const maxSamples = Math.min(20000, allCandidates.length);
  const rng = new SeededRandom(42);
  const sampledIndices = new Set<number>();
  const candidates: Candidate[] = [];

  const step = allCandidates.length / maxSamples;
  for (let i = 0; i < maxSamples; i++) {
    const index = Math.floor(i * step + rng.next() * step);
    if (index < allCandidates.length && !sampledIndices.has(index)) {
      sampledIndices.add(index);
      candidates.push(allCandidates[index]);
    }
  }

  const selected: Candidate[] = [];
  let rejectionThreshold = 8;

  if (candidates.length > 0) {
    const pick1 = candidates.reduce((max, c) => (c.weight > max.weight ? c : max));
    selected.push(pick1);
  }

  while (selected.length < k) {
    let bestCandidate: Candidate | null = null;
    let maxScore = -1;

    for (const candidate of candidates) {
      if (
        selected.some(
          (s) =>
            s.rgb.r === candidate.rgb.r &&
            s.rgb.g === candidate.rgb.g &&
            s.rgb.b === candidate.rgb.b
        )
      ) {
        continue;
      }

      // Optimized: use loop instead of Math.min(...array.map())
      let minDistance = Infinity;
      for (const s of selected) {
        const dist = ciede2000(candidate.lab, s.lab);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance < rejectionThreshold) {
        continue;
      }

      const score = candidate.weight * minDistance;

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate);
    } else {
      if (rejectionThreshold > 6) {
        rejectionThreshold = 6;
        continue;
      } else {
        break;
      }
    }
  }

  while (selected.length < k && candidates.length > selected.length) {
    for (const candidate of candidates) {
      if (
        selected.some(
          (s) =>
            s.rgb.r === candidate.rgb.r &&
            s.rgb.g === candidate.rgb.g &&
            s.rgb.b === candidate.rgb.b
        )
      ) {
        continue;
      }

      // Optimized: use loop instead of Math.min(...array.map())
      let minDistance = Infinity;
      for (const s of selected) {
        const dist = ciede2000(candidate.lab, s.lab);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance >= rejectionThreshold) {
        selected.push(candidate);
        break;
      }
    }

    if (selected.length < k) {
      rejectionThreshold = Math.max(0, rejectionThreshold - 1);
      if (rejectionThreshold < 0) break;
    }
  }

  const selectedRgb: RGB[] = selected.map((c) => {
    const rgb = c.rgb;
    return {
      r: Math.max(0, Math.min(255, Math.round(rgb.r))),
      g: Math.max(0, Math.min(255, Math.round(rgb.g))),
      b: Math.max(0, Math.min(255, Math.round(rgb.b))),
    };
  });

  const pixelAssignments = new Array(k).fill(0);

  for (const pixel of allCandidates) {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < selected.length; i++) {
      const distance = ciede2000(pixel.lab, selected[i].lab);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    pixelAssignments[nearestIndex]++;
  }

  const result: Array<{ color: RGB; weight: number }> = [];
  for (let i = 0; i < selected.length; i++) {
    const weight = pixelAssignments[i] / totalPixels;
    result.push({ color: selectedRgb[i], weight });
  }

  result.sort((a, b) => b.weight - a.weight);

  return result.map((item) => item.color).slice(0, k);
}

function accentPalette(imageData: ImageData, k: number = 5): RGB[] {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const width = imageData.width;
  const height = imageData.height;
  
  // 1) Resize longer side to 256 px (preserve aspect) - OPTIMIZATION
  let targetWidth = width;
  let targetHeight = height;
  const maxDimension = Math.max(width, height);
  
  if (maxDimension > 256) {
    const scale = 256 / maxDimension;
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }
  
  // Create downscaled image data
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }
  
  // Draw original image to downscaled canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }
  
  const imageDataCopy = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  );
  tempCtx.putImageData(imageDataCopy, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
  
  const downscaledData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const downscaledPixels = extractPixels(downscaledData);
  const totalPixels = downscaledPixels.length;

  interface PixelData {
    lab: { l: number; a: number; b: number };
    rgb: RGB;
    chroma: number;
  }

  const pixelData: PixelData[] = downscaledPixels.map((pixel) => {
    const lab = rgbToLab(pixel);
    const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    return {
      lab,
      rgb: pixel,
      chroma,
    };
  });

  const neutralPool: PixelData[] = [];
  const chromaticPool: PixelData[] = [];

  for (const pixel of pixelData) {
    if (pixel.chroma <= 6) {
      neutralPool.push(pixel);
    } else {
      chromaticPool.push(pixel);
    }
  }

  const selected: PixelData[] = [];

  if (neutralPool.length > 0) {
    const darkNeutral = neutralPool.reduce((min, p) => (p.lab.l < min.lab.l ? p : min));
    selected.push(darkNeutral);

    const lightNeutral = neutralPool.reduce((max, p) => (p.lab.l > max.lab.l ? p : max));
    selected.push(lightNeutral);
  } else {
    const allL = pixelData.map((p) => p.lab.l).sort((a, b) => a - b);
    const l10th = allL[Math.floor(allL.length * 0.1)];
    const l90th = allL[Math.floor(allL.length * 0.9)];

    let darkNeutral: PixelData | null = null;
    let lightNeutral: PixelData | null = null;
    let minDarkDiff = Infinity;
    let minLightDiff = Infinity;

    for (const pixel of pixelData) {
      const darkDiff = Math.abs(pixel.lab.l - l10th);
      const lightDiff = Math.abs(pixel.lab.l - l90th);

      if (darkDiff < minDarkDiff) {
        minDarkDiff = darkDiff;
        darkNeutral = pixel;
      }

      if (lightDiff < minLightDiff) {
        minLightDiff = lightDiff;
        lightNeutral = pixel;
      }
    }

    if (darkNeutral) selected.push(darkNeutral);
    if (lightNeutral) selected.push(lightNeutral);
  }

  let rejectionThreshold = 10;

  if (chromaticPool.length > 0) {
    const accent1 = chromaticPool.reduce((max, p) => (p.chroma > max.chroma ? p : max));
    selected.push(accent1);
  }

  while (selected.length < k && chromaticPool.length > 0) {
    let bestCandidate: PixelData | null = null;
    let maxScore = -1;

    for (const candidate of chromaticPool) {
      if (
        selected.some(
          (s) =>
            s.rgb.r === candidate.rgb.r &&
            s.rgb.g === candidate.rgb.g &&
            s.rgb.b === candidate.rgb.b
        )
      ) {
        continue;
      }

      // Optimized: use loop instead of Math.min(...array.map())
      let minDistance = Infinity;
      for (const s of selected) {
        const dist = ciede2000(candidate.lab, s.lab);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance < rejectionThreshold) {
        continue;
      }

      const score = candidate.chroma * minDistance;

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate);
    } else {
      if (rejectionThreshold > 6) {
        rejectionThreshold = 6;
        continue;
      } else {
        break;
      }
    }
  }

  while (selected.length < k && chromaticPool.length > 0) {
    for (const candidate of chromaticPool) {
      if (
        selected.some(
          (s) =>
            s.rgb.r === candidate.rgb.r &&
            s.rgb.g === candidate.rgb.g &&
            s.rgb.b === candidate.rgb.b
        )
      ) {
        continue;
      }

      // Optimized: use loop instead of Math.min(...array.map())
      let minDistance = Infinity;
      for (const s of selected) {
        const dist = ciede2000(candidate.lab, s.lab);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance >= rejectionThreshold) {
        selected.push(candidate);
        break;
      }
    }

    if (selected.length < k) {
      rejectionThreshold = Math.max(0, rejectionThreshold - 1);
      if (rejectionThreshold < 0) break;
    }
  }

  const selectedRgb: RGB[] = selected.map((c) => {
    const rgb = c.rgb;
    return {
      r: Math.max(0, Math.min(255, Math.round(rgb.r))),
      g: Math.max(0, Math.min(255, Math.round(rgb.g))),
      b: Math.max(0, Math.min(255, Math.round(rgb.b))),
    };
  });

  const pixelAssignments = new Array(k).fill(0);

  for (const pixel of pixelData) {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < selected.length; i++) {
      const distance = ciede2000(pixel.lab, selected[i].lab);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    pixelAssignments[nearestIndex]++;
  }

  const weights = pixelAssignments.map((count) => count / totalPixels);

  const darkNeutralIndex = 0;
  const lightNeutralIndex = 1;
  const accentIndices = [2, 3, 4];

  const accentWithWeights = accentIndices.map((idx) => ({
    index: idx,
    weight: weights[idx],
  }));
  accentWithWeights.sort((a, b) => b.weight - a.weight);

  const result: RGB[] = [];
  result.push(selectedRgb[darkNeutralIndex]);
  result.push(selectedRgb[lightNeutralIndex]);
  for (const accent of accentWithWeights) {
    if (accent.index < selectedRgb.length) {
      result.push(selectedRgb[accent.index]);
    }
  }

  return result.slice(0, k);
}

function contourPalette(imageData: ImageData, k: number = 5): RGB[] {
  const pixels = extractPixels(imageData);
  if (pixels.length === 0) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }

  const width = imageData.width;
  const height = imageData.height;
  
  let targetWidth = width;
  let targetHeight = height;
  const maxDimension = Math.max(width, height);
  
  if (maxDimension > 256) {
    const scale = 256 / maxDimension;
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    return Array(k).fill({ r: 0, g: 0, b: 0 });
  }
  
  const imageDataCopy = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  );
  tempCtx.putImageData(imageDataCopy, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
  
  const downscaledData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const downscaledPixels = extractPixels(downscaledData);
  const totalPixels = downscaledPixels.length;

  const luminance: number[] = new Array(totalPixels);
  for (let i = 0; i < downscaledPixels.length; i++) {
    const pixel = downscaledPixels[i];
    luminance[i] = 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
  }

  const gradientMagnitude: number[] = new Array(totalPixels);
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = y * targetWidth + x;
      
      let gx = 0;
      let gy = 0;

      if (y > 0) {
        if (x > 0) gx -= luminance[(y - 1) * targetWidth + (x - 1)];
        if (x < targetWidth - 1) gx += luminance[(y - 1) * targetWidth + (x + 1)];
      }
      if (x > 0) gx -= 2 * luminance[y * targetWidth + (x - 1)];
      if (x < targetWidth - 1) gx += 2 * luminance[y * targetWidth + (x + 1)];
      if (y < targetHeight - 1) {
        if (x > 0) gx -= luminance[(y + 1) * targetWidth + (x - 1)];
        if (x < targetWidth - 1) gx += luminance[(y + 1) * targetWidth + (x + 1)];
      }

      if (x > 0) {
        if (y > 0) gy -= luminance[(y - 1) * targetWidth + (x - 1)];
        if (y < targetHeight - 1) gy += luminance[(y + 1) * targetWidth + (x - 1)];
      }
      if (y > 0) gy -= 2 * luminance[(y - 1) * targetWidth + x];
      if (y < targetHeight - 1) gy += 2 * luminance[(y + 1) * targetWidth + x];
      if (x < targetWidth - 1) {
        if (y > 0) gy -= luminance[(y - 1) * targetWidth + (x + 1)];
        if (y < targetHeight - 1) gy += luminance[(y + 1) * targetWidth + (x + 1)];
      }

      gradientMagnitude[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  const weights: number[] = gradientMagnitude.map((g) => Math.pow(g, 1.5));

  const maxSamples = Math.min(20000, totalPixels);
  const rng = new SeededRandom(42);
  
  const cumulativeWeights: number[] = new Array(totalPixels);
  cumulativeWeights[0] = weights[0];
  for (let i = 1; i < totalPixels; i++) {
    cumulativeWeights[i] = cumulativeWeights[i - 1] + weights[i];
  }
  
  const totalWeight = cumulativeWeights[totalPixels - 1];
  
  if (totalWeight === 0) {
    const candidates: Array<{ lab: { l: number; a: number; b: number }; rgb: RGB; weight: number }> = [];
    const step = totalPixels / maxSamples;
    for (let i = 0; i < maxSamples; i++) {
      const idx = Math.floor(i * step + rng.next() * step);
      if (idx < downscaledPixels.length) {
        const pixel = downscaledPixels[idx];
        candidates.push({
          lab: rgbToLab(pixel),
          rgb: pixel,
          weight: 1.0,
        });
      }
    }
    return selectColorsGreedyMaxMinOptimized(candidates, k, downscaledPixels);
  }

  const candidates: Array<{ lab: { l: number; a: number; b: number }; rgb: RGB; weight: number }> = [];
  const sampledIndices = new Set<number>();

  for (let i = 0; i < maxSamples; i++) {
    const randomValue = rng.next() * totalWeight;
    
    let left = 0;
    let right = totalPixels - 1;
    let selectedIdx = 0;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (cumulativeWeights[mid] < randomValue) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    selectedIdx = left;

    if (!sampledIndices.has(selectedIdx) && selectedIdx < downscaledPixels.length) {
      sampledIndices.add(selectedIdx);
      const pixel = downscaledPixels[selectedIdx];
      candidates.push({
        lab: rgbToLab(pixel),
        rgb: pixel,
        weight: weights[selectedIdx],
      });
    }
  }

  return selectColorsGreedyMaxMinOptimized(candidates, k, downscaledPixels);
}

/**
 * Extract palette from image using specified method
 */
export function extractPalette(
  imageData: ImageData,
  method: PaletteMethod,
  colorCount?: number
): RGB[] {
  const count = colorCount ?? 5;

  switch (method) {
    case 'kmeans':
      return kMeansLab(imageData, count);
    case 'medianCut':
      return medianCut(imageData, count);
    case 'histogram':
      return histogramPalette(imageData, count);
    case 'hueClustering':
      return hueClusteringPalette(imageData, count);
    case 'saturated':
      return saturatedPalette(imageData, count);
    case 'accent':
      return accentPalette(imageData, count);
    case 'contour':
      return contourPalette(imageData, count);
    default:
      return Array(count).fill({ r: 0, g: 0, b: 0 });
  }
}
