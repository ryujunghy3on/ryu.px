'use client';

import { useState, useRef, useEffect } from 'react';
import { processImageToBitmap, loadImageFromFile, exportToPNG, exportToSVG } from './lib/imageProcessor';

export default function Home() {
  const [gridSlider, setGridSlider] = useState(5); // Slider value (5~50)
  const gridCount = gridSlider * 2; // Actual grid count (10~100)
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [threshold, setThreshold] = useState(25);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load default image
  useEffect(() => {
    const defaultImg = new Image();
    defaultImg.onload = () => {
      setImage(defaultImg);
      setImageUrl('/examples/01.jpg');
    };
    defaultImg.src = '/examples/01.jpg';
  }, []);

  const loadExampleImage = (exampleNumber: number) => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setImageUrl(`/examples/${String(exampleNumber).padStart(2, '0')}.jpg`);
    };
    img.src = `/examples/${String(exampleNumber).padStart(2, '0')}.jpg`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFromFile(file, (img, url) => {
        setImage(img);
        setImageUrl(url);
      });
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

  useEffect(() => {
    if (image && canvasRef.current) {
      processImageToBitmap({
        image,
        canvas: canvasRef.current,
        gridCount,
        isGrayscale,
        threshold,
      });
    }
  }, [image, gridCount, isGrayscale, threshold]);

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-black">
      {/* Left control panel */}
      <div className="w-80 bg-white dark:bg-black border-r border-black dark:border-white p-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Design Tool
        </h1>

        {/* Color mode toggle */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black dark:text-white">
            Color Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsGrayscale(false)}
              className={`flex-1 px-4 py-2 border-2 font-medium transition-colors ${
                !isGrayscale
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white text-black border-black dark:bg-black dark:text-white dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              }`}
            >
              Color
            </button>
            <button
              onClick={() => setIsGrayscale(true)}
              className={`flex-1 px-4 py-2 border-2 font-medium transition-colors ${
                isGrayscale
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white text-black border-black dark:bg-black dark:text-white dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              }`}
            >
              Grayscale
            </button>
          </div>
        </div>

        {/* Size slider */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black dark:text-white">
            Size: {gridCount}
          </label>
          <input
            type="range"
            min="5"
            max="50"
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

        {/* Image upload button */}
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
            className="w-full px-4 py-3 bg-black text-white border-2 border-black dark:bg-white dark:text-black dark:border-white hover:bg-white hover:text-black hover:border-black dark:hover:bg-black dark:hover:text-white dark:hover:border-white transition-colors font-medium"
          >
            Select Image
          </button>
          {imageUrl && (
            <button
              onClick={() => {
                setImage(null);
                setImageUrl(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="w-full px-4 py-2 bg-white text-black border-2 border-black dark:bg-black dark:text-white dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-sm"
            >
              Remove Image
            </button>
          )}
        </div>

        {/* Export buttons */}
        {image && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-black dark:text-white">
              Export
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleExportPNG}
                className="flex-1 px-4 py-2 bg-black text-white border-2 border-black dark:bg-white dark:text-black dark:border-white hover:bg-white hover:text-black hover:border-black dark:hover:bg-black dark:hover:text-white dark:hover:border-white transition-colors font-medium text-sm"
              >
                PNG
              </button>
              <button
                onClick={handleExportSVG}
                className="flex-1 px-4 py-2 bg-white text-black border-2 border-black dark:bg-black dark:text-white dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-medium text-sm"
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
              style={{ display: 'block' }}
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
            const exampleUrl = `/examples/${String(num).padStart(2, '0')}.jpg`;
            const isSelected = imageUrl === exampleUrl;
            return (
              <button
                key={num}
                onClick={() => loadExampleImage(num)}
                className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                  isSelected
                    ? 'border-black dark:border-white'
                    : 'border-black dark:border-white'
                }`}
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
