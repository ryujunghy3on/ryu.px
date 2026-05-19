'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  processImageToBitmap,
  loadImageFromFile,
  exportToPNG,
  exportToSVG,
  extractPalette,
  rgbToHex,
  hexToRgb,
  type PaletteMethod,
  type RGB,
} from './lib/imageProcessor';

const DEFAULT_EXAMPLE = '/examples/01.png';

const getButtonClasses = (isActive: boolean) =>
  isActive
    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
    : 'bg-white text-black border-black dark:bg-black dark:text-white dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black';

type ProcessingMode = 'bitmap' | 'dither' | 'halftone';

export default function Home() {
  // Processing mode state
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('bitmap');
  
  // Initialize sliders to middle position
  // Size slider: min=5, max=125 → middle = 65
  const [gridSlider, setGridSlider] = useState(65);
  const gridCount = gridSlider * 2;
  const [isGrayscale, setIsGrayscale] = useState(false);
  // Threshold slider: min=0, max=50 → middle = 25
  const [threshold, setThreshold] = useState(25);
  const [paletteMethod, setPaletteMethod] = useState<PaletteMethod>('kmeans');
  const [paletteColors, setPaletteColors] = useState<RGB[]>([]);
  const [rotation, setRotation] = useState(0);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const defaultImg = new Image();
    defaultImg.onload = () => {
      setImage(defaultImg);
      setImageUrl(DEFAULT_EXAMPLE);
      setRotation(0); // Reset rotation when loading default image
    };
    defaultImg.src = DEFAULT_EXAMPLE;
  }, []);

  const loadExampleImage = (exampleNumber: number) => {
    const url = `/examples/${String(exampleNumber).padStart(2, '0')}.png`;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setImageUrl(url);
      setRotation(0); // Reset rotation when loading new image
    };
    img.src = url;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFromFile(file, (img, url) => {
        setImage(img);
        setImageUrl(url);
        setRotation(0); // Reset rotation when loading new image
      });
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportPNG = () => {
    if (canvasRef.current) {
      exportToPNG(canvasRef.current, 'bitmap.png');
    }
  };

  const handleExportSVG = () => {
    if (canvasRef.current && image) {
      exportToSVG(canvasRef.current, image, gridCount, 'bitmap.svg');
    }
  };

  // Function to extract palette from image
  const extractPaletteFromImage = useCallback(
    (colorCount?: number) => {
      if (!image || isGrayscale || !paletteMethod) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(image, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
        // Extract palette with specified color count, or use method-specific default
        const extractedPalette = extractPalette(imageData, paletteMethod, colorCount);
        setPaletteColors(extractedPalette);
      }
    },
    [image, isGrayscale, paletteMethod]
  );

  // Extract palette when image or method changes (only in color mode)
  useEffect(() => {
    if (image && !isGrayscale && paletteMethod) {
      extractPaletteFromImage();
    } else if (isGrayscale) {
      // Clear palette in grayscale mode
      setPaletteColors([]);
    }
  }, [image, paletteMethod, isGrayscale, extractPaletteFromImage]);

  // Memoize palette colors string to avoid dependency array size changes
  const paletteColorsKey = useMemo(() => {
    return paletteColors.map(c => `${c.r},${c.g},${c.b}`).join('|');
  }, [paletteColors]);

  useEffect(() => {
    if (image && canvasRef.current && processingMode === 'bitmap') {
      processImageToBitmap({
        image,
        canvas: canvasRef.current,
        gridCount,
        isGrayscale,
        threshold,
        paletteMethod: !isGrayscale ? paletteMethod : undefined,
        paletteColors: !isGrayscale && paletteColors.length > 0 ? paletteColors : undefined,
        rotation,
      });
    }
    // TODO: Add dither and halftone processing here
  }, [image, gridCount, isGrayscale, threshold, paletteMethod, paletteColorsKey, rotation, processingMode]);

  const handlePaletteColorChange = (index: number, hex: string) => {
    const newColor = hexToRgb(hex);
    const newPalette = [...paletteColors];
    newPalette[index] = newColor;
    setPaletteColors(newPalette);
  };

  const handleDeletePaletteColor = (index: number) => {
    // Calculate new color count (current count - 1)
    const newColorCount = Math.max(1, paletteColors.length - 1);
    // Re-extract palette with the new color count
    extractPaletteFromImage(newColorCount);
  };

  const handleAddPaletteColor = () => {
    // Generate random color
    const newColor: RGB = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    };
    setPaletteColors([...paletteColors, newColor]);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-black">
      {/* Left control panel */}
      <div className="w-80 bg-white dark:bg-black border-r border-black dark:border-white p-6 flex flex-col gap-6 overflow-y-auto">
        {/* Logo */}
        <Image
          src="/logo.svg"
          alt="ryu.px"
          width={70}
          height={32}
          priority
          className="dark:invert"
        />

        {/* Processing Mode Tabs */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black dark:text-white">
            Processing Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setProcessingMode('bitmap')}
              className={`px-4 py-2 border-2 font-medium transition-colors text-sm ${getButtonClasses(processingMode === 'bitmap')}`}
            >
              Bitmap
            </button>
            <button
              onClick={() => setProcessingMode('dither')}
              className={`px-4 py-2 border-2 font-medium transition-colors text-sm ${getButtonClasses(processingMode === 'dither')}`}
            >
              Dither
            </button>
            <button
              onClick={() => setProcessingMode('halftone')}
              className={`px-4 py-2 border-2 font-medium transition-colors text-sm ${getButtonClasses(processingMode === 'halftone')}`}
            >
              Halftone
            </button>
          </div>
        </div>

        {/* Bitmap Mode Settings */}
        {processingMode === 'bitmap' && (
          <>
            {/* Color mode toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">
                Color Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsGrayscale(false)}
                  className={`flex-1 px-4 py-2 border-2 font-medium transition-colors ${getButtonClasses(!isGrayscale)}`}
                >
                  Color
                </button>
                <button
                  onClick={() => setIsGrayscale(true)}
                  className={`flex-1 px-4 py-2 border-2 font-medium transition-colors ${getButtonClasses(isGrayscale)}`}
                >
                  Grayscale
                </button>
              </div>
            </div>

            {/* Palette method selection - only in color mode */}
            {!isGrayscale && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-black dark:text-white">
                  Palette Method
                </label>
                <select
                  value={paletteMethod}
                  onChange={(e) => setPaletteMethod(e.target.value as PaletteMethod)}
                  className="w-full px-4 py-2 border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white font-medium"
                >
                  <option value="kmeans">K-Means</option>
                  <option value="medianCut">Median Cut</option>
                  <option value="histogram">Histogram</option>
                  <option value="hueClustering">Hue Clustering</option>
                  <option value="saturated">Saturated</option>
                  <option value="accent">Accent</option>
                  <option value="contour">Contour</option>
                </select>
              </div>
            )}

            {/* Palette colors display - only in color mode */}
            {!isGrayscale && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-black dark:text-white">
                  Palette Colors
                </label>
                {paletteColors.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {paletteColors.map((color, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border border-black dark:border-white"
                      >
                        <input
                          type="color"
                          value={rgbToHex(color)}
                          onChange={(e) => handlePaletteColorChange(index, e.target.value)}
                          className="w-12 h-12 border-2 border-black dark:border-white cursor-pointer"
                          style={{ backgroundColor: rgbToHex(color) }}
                        />
                        <div className="flex-1 flex flex-col">
                          <span className="text-xs text-black dark:text-white font-mono">
                            {rgbToHex(color)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeletePaletteColor(index)}
                          className="w-6 h-6 flex items-center justify-center border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-black dark:text-white"
                          aria-label="Delete color"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleAddPaletteColor}
                  className={`w-full px-4 py-2 border-2 transition-colors text-sm font-medium ${getButtonClasses(false)}`}
                >
                  Add Color
                </button>
              </div>
            )}

            {/* Threshold slider - only shown in grayscale mode */}
            {isGrayscale && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-black dark:text-white">
                  Threshold: {threshold}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-white dark:bg-black border-2 border-black dark:border-white rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: 'black',
                  }}
                />
                <div className="flex justify-between text-xs text-black dark:text-white">
                  <span>0</span>
                  <span>50</span>
                </div>
              </div>
            )}

            {/* Size slider */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-black dark:text-white">
                Size: {gridCount}
              </label>
              <input
                type="range"
                min="5"
                max="125"
                value={gridSlider}
                onChange={(e) => setGridSlider(Number(e.target.value))}
                className="w-full h-2 bg-white dark:bg-black border-2 border-black dark:border-white rounded-lg appearance-none cursor-pointer"
                style={{
                  accentColor: 'black',
                }}
              />
              <div className="flex justify-between text-xs text-black dark:text-white">
                <span>5</span>
                <span>50</span>
              </div>
            </div>
          </>
        )}

        {/* Dither Mode Settings */}
        {processingMode === 'dither' && (
          <div className="flex flex-col gap-2 text-black dark:text-white">
            <p className="text-sm">Dither settings coming soon...</p>
            {/* TODO: Add dither settings here */}
            {/* - Algorithm selection (Floyd-Steinberg, Ordered, etc.) */}
            {/* - Strength slider */}
            {/* - Size slider */}
          </div>
        )}

        {/* Halftone Mode Settings */}
        {processingMode === 'halftone' && (
          <div className="flex flex-col gap-2 text-black dark:text-white">
            <p className="text-sm">Halftone settings coming soon...</p>
            {/* TODO: Add halftone settings here */}
            {/* - Pattern selection (Dot, Line, etc.) */}
            {/* - Angle slider */}
            {/* - Size slider */}
          </div>
        )}

        {/* Common Settings - Image Upload */}

        {/* Common Settings - Image Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black dark:text-white">
            Image Upload
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full px-4 py-3 border-2 transition-colors font-medium ${getButtonClasses(true)}`}
          >
            Select Image
          </button>
          {imageUrl && (
            <>
              <button
                onClick={handleRemoveImage}
                className={`w-full px-4 py-2 border-2 transition-colors text-sm ${getButtonClasses(false)}`}
              >
                Remove Image
              </button>
              <button
                onClick={handleRotate}
                className={`w-full px-4 py-2 border-2 transition-colors text-sm ${getButtonClasses(false)}`}
              >
                Rotate 90° ({rotation}°)
              </button>
            </>
          )}
        </div>

        {/* Common Settings - Export */}
        {image && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-black dark:text-white">
              Export
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleExportPNG}
                className={`flex-1 px-4 py-2 border-2 transition-colors font-medium text-sm ${getButtonClasses(true)}`}
              >
                PNG
              </button>
              <button
                onClick={handleExportSVG}
                className={`flex-1 px-4 py-2 border-2 transition-colors font-medium text-sm ${getButtonClasses(false)}`}
              >
                SVG
              </button>
            </div>
          </div>
        )}

        {!image && (
          <div className="flex-1 flex items-center justify-center text-black dark:text-white text-sm">
            Please upload an image
          </div>
        )}
      </div>

      {/* Right canvas */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-black p-8 overflow-auto relative">
        {image ? (
          <div className="bg-white dark:bg-black p-4 border-2 border-black dark:border-white inline-block">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[calc(100vh-4rem)]"
              style={{
                display: 'block',
                imageRendering: 'pixelated',
              }}
            />
          </div>
        ) : (
          <div className="text-black dark:text-white text-center">
            <p className="text-lg mb-2">Upload an image to</p>
            <p className="text-sm">convert it to bitmap</p>
          </div>
        )}

        {/* Image selection component - bottom left */}
        <div className="absolute bottom-8 left-8 flex gap-3">
          {[1, 2, 3, 4, 5].map((num) => {
            const exampleUrl = `/examples/${String(num).padStart(2, '0')}.png`;
            return (
              <button
                key={num}
                onClick={() => loadExampleImage(num)}
                className="w-16 h-16 rounded-full overflow-hidden border-2 border-black dark:border-white transition-all hover:scale-110"
                style={{
                  backgroundImage: `url(${exampleUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
