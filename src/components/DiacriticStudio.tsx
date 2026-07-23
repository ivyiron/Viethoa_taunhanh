import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as opentype from 'opentype.js';
import { Sliders, Sparkles, Copy, Trash2, ArrowLeftRight, Link, Link2Off, ZoomIn, ZoomOut, RotateCcw, AlertCircle, HelpCircle, Check, Layers, Code, FileCode, Search, X } from 'lucide-react';
import { DiacriticTemplate, AutoPositionRules, FontMetadata } from '../types';
import { getExactBoundingBox, removeDotFromICommands, parseSvgPath, extractPathDataFromSvg, transformCommands, calculateAutoPosition, DEFAULT_DIACRITICS, findCandidateGlyph, extractSvgFromGlyph, VIETNAMESE_RECIPES, composeGlyphPath, getNativeCharSvgPath, getNativeCharFullSvg, extractDiacriticFromSpecificChar, getExtractedDiacriticSvgPathFromChar, formatSvgPathToFullSvg } from '../utils';

// Double Accent Vowel Groups configuration
const DOUBLE_ACCENT_GROUPS = [
  { label: 'Â', name: 'A Nón', uppercase: ['Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'], lowercase: ['ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'] },
  { label: 'Ă', name: 'A Trăng', uppercase: ['Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ'], lowercase: ['ắ', 'ằ', 'ẳ', 'ẵ', 'ặ'] },
  { label: 'Ê', name: 'E Nón', uppercase: ['Ế', 'Ề', 'Ể', 'Ễ', 'Ệ'], lowercase: ['ế', 'ề', 'ể', 'ễ', 'ệ'] },
  { label: 'Ô', name: 'O Nón', uppercase: ['Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ'], lowercase: ['ố', 'ồ', 'ổ', 'ỗ', 'ộ'] },
  { label: 'Ơ', name: 'O Móc', uppercase: ['Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'], lowercase: ['ớ', 'ờ', 'ở', 'ỡ', 'ợ'] },
  { label: 'Ư', name: 'U Móc', uppercase: ['Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự'], lowercase: ['ứ', 'ừ', 'ử', 'ữ', 'ự'] },
];

const TONE_NAMES = ['Sắc (´)', 'Huyền (`)', 'Hỏi (ˀ)', 'Ngã (~)', 'Nặng (.)'];

// Stage canvas component for the large double accent inspector view
const DoubleAccentLargeStageCanvas: React.FC<{
  char: string;
  font: opentype.Font | null;
  fontMetadata: FontMetadata;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
  showGuides: boolean;
  zoomLevel: number;
  viewMode?: 'composed' | 'native' | 'overlay';
  onZoomChange?: (updater: (prev: number) => number) => void;
}> = ({ char, font, fontMetadata, templates, rules, showGuides, zoomLevel, viewMode = 'composed', onZoomChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onZoomChange) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      onZoomChange(prev => Math.min(3.0, Math.max(0.5, Math.round((prev + delta) * 100) / 100)));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [onZoomChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !font) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const recipe = VIETNAMESE_RECIPES.find(r => r.char === char);
    if (!recipe) return;

    const cssWidth = canvas.clientWidth || 320;
    const cssHeight = canvas.clientHeight || 360;
    const dpr = Math.max(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Subtle canvas background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    try {
      const { path, advanceWidth } = composeGlyphPath(font, recipe, templates, rules, undefined, false);

      // Compute exact horizontal bounding box & center of the composed character path
      let xMin = Infinity;
      let xMax = -Infinity;
      if (path && path.commands) {
        path.commands.forEach((cmd: any) => {
          if (cmd.x !== undefined) {
            if (cmd.x < xMin) xMin = cmd.x;
            if (cmd.x > xMax) xMax = cmd.x;
          }
          if (cmd.x1 !== undefined) {
            if (cmd.x1 < xMin) xMin = cmd.x1;
            if (cmd.x1 > xMax) xMax = cmd.x1;
          }
          if (cmd.x2 !== undefined) {
            if (cmd.x2 < xMin) xMin = cmd.x2;
            if (cmd.x2 > xMax) xMax = cmd.x2;
          }
        });
      }
      const glyphCenterX = (xMin !== Infinity && xMax !== -Infinity) ? (xMin + xMax) / 2 : advanceWidth / 2;

      const padding = 24;
      const drawHeight = (cssHeight - padding * 2) * zoomLevel;
      const scaleFactor = drawHeight / Math.max(1, (fontMetadata.ascender - fontMetadata.descender));
      const fontStartX = (cssWidth / 2) - glyphCenterX * scaleFactor;
      const baselineY = (cssHeight / 2) + ((fontMetadata.ascender + fontMetadata.descender) / 2) * scaleFactor;

      // Check native glyph existence
      const targetGlyphIdx = font ? font.charToGlyphIndex(char) : 0;
      const nativeGlyph = targetGlyphIdx > 0 ? font.glyphs.get(targetGlyphIdx) : null;
      const isNativeAvailable = !!(nativeGlyph && nativeGlyph.path && nativeGlyph.path.commands && nativeGlyph.path.commands.length > 0);

      // Draw Guide Lines
      if (showGuides) {
        // Baseline (Emerald solid)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(10, baselineY);
        ctx.lineTo(cssWidth - 10, baselineY);
        ctx.stroke();

        // Cap height / Ascender (Blue dashed)
        const capY = baselineY - fontMetadata.ascender * scaleFactor;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(10, capY);
        ctx.lineTo(cssWidth - 10, capY);
        ctx.stroke();

        // X-Height line (Amber dashed)
        const xHeightY = baselineY - (fontMetadata.ascender * 0.52) * scaleFactor;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(10, xHeightY);
        ctx.lineTo(cssWidth - 10, xHeightY);
        ctx.stroke();

        // Vertical Center line (Red dotted)
        const centerX = cssWidth / 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(centerX, 8);
        ctx.lineTo(centerX, cssHeight - 8);
        ctx.stroke();

        ctx.setLineDash([]); // Reset line dash
      }

      const upm = fontMetadata.unitsPerEm;

      // Render Native Glyph if native or overlay mode
      if ((viewMode === 'native' || viewMode === 'overlay') && isNativeAvailable && nativeGlyph) {
        const nativePath = nativeGlyph.getPath(fontStartX, baselineY, scaleFactor * upm);
        nativePath.fill = viewMode === 'overlay' ? 'rgba(245, 158, 11, 0.35)' : '#0f172a';
        nativePath.stroke = viewMode === 'overlay' ? '#d97706' : '#020617';
        nativePath.lineWidth = 1.5;
        nativePath.draw(ctx);
      }

      // Render Auto-composed Glyph if composed or overlay mode
      if (viewMode === 'composed' || viewMode === 'overlay' || !isNativeAvailable) {
        ctx.beginPath();
        ctx.fillStyle = viewMode === 'overlay' ? 'rgba(15, 23, 42, 0.85)' : '#0f172a';
        ctx.strokeStyle = viewMode === 'overlay' ? '#0f172a' : '#020617';
        ctx.lineWidth = 1.2;

        path.commands.forEach((cmd: any) => {
          if (cmd.type === 'M') {
            ctx.moveTo(fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor);
          } else if (cmd.type === 'L') {
            ctx.lineTo(fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor);
          } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(
              fontStartX + cmd.x1 * scaleFactor, baselineY - cmd.y1 * scaleFactor,
              fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor
            );
          } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(
              fontStartX + cmd.x1 * scaleFactor, baselineY - cmd.y1 * scaleFactor,
              fontStartX + cmd.x2 * scaleFactor, baselineY - cmd.y2 * scaleFactor,
              fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor
            );
          } else if (cmd.type === 'Z') {
            ctx.closePath();
          }
        });
        ctx.fill();
        ctx.stroke();
      }

      // Overlay Legend
      if (viewMode === 'overlay' && isNativeAvailable) {
        const legendText = '🟧 Design gốc font   |   ⬛ Dấu ghép mẫu';
        ctx.font = 'bold 9px sans-serif';
        const textW = ctx.measureText(legendText).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(cssWidth / 2 - textW / 2 - 6, 8, textW + 12, 18);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cssWidth / 2 - textW / 2 - 6, 8, textW + 12, 18);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(legendText, cssWidth / 2 - textW / 2, 20);
      }
    } catch (e) {
      console.error('Failed to render double accent stage canvas', e);
    } finally {
      ctx.restore();
    }
  }, [font, fontMetadata, templates, rules, char, showGuides, zoomLevel, viewMode]);

  return (
    <canvas ref={canvasRef} className="w-full h-80 sm:h-[360px] rounded-xl border border-neutral-200/90 shadow-inner bg-neutral-50 block transition-all" />
  );
};

// Medium Card canvas for gallery selection
const DoubleAccentCardCanvas: React.FC<{
  char: string;
  font: opentype.Font | null;
  fontMetadata: FontMetadata;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
  isSelected: boolean;
  onClick: () => void;
  toneLabel: string;
}> = ({ char, font, fontMetadata, templates, rules, isSelected, onClick, toneLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isNative = useMemo(() => {
    if (!font) return false;
    const idx = font.charToGlyphIndex(char);
    if (idx <= 0) return false;
    const g = font.glyphs.get(idx);
    return !!(g && g.path && g.path.commands && g.path.commands.length > 0);
  }, [font, char]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !font) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const recipe = VIETNAMESE_RECIPES.find(r => r.char === char);
    if (!recipe) return;

    const cssWidth = canvas.clientWidth || 58;
    const cssHeight = canvas.clientHeight || 58;
    const dpr = Math.max(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    try {
      const { path, advanceWidth } = composeGlyphPath(font, recipe, templates, rules, undefined, false);

      let xMin = Infinity;
      let xMax = -Infinity;
      if (path && path.commands) {
        path.commands.forEach((cmd: any) => {
          if (cmd.x !== undefined) {
            if (cmd.x < xMin) xMin = cmd.x;
            if (cmd.x > xMax) xMax = cmd.x;
          }
          if (cmd.x1 !== undefined) {
            if (cmd.x1 < xMin) xMin = cmd.x1;
            if (cmd.x1 > xMax) xMax = cmd.x1;
          }
          if (cmd.x2 !== undefined) {
            if (cmd.x2 < xMin) xMin = cmd.x2;
            if (cmd.x2 > xMax) xMax = cmd.x2;
          }
        });
      }
      const glyphCenterX = (xMin !== Infinity && xMax !== -Infinity) ? (xMin + xMax) / 2 : advanceWidth / 2;

      const padding = 8;
      const drawHeight = cssHeight - padding * 2;
      const scaleFactor = drawHeight / Math.max(1, (fontMetadata.ascender - fontMetadata.descender));
      const fontStartX = (cssWidth / 2) - glyphCenterX * scaleFactor;
      const baselineY = padding + fontMetadata.ascender * scaleFactor;

      // Baseline
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, baselineY);
      ctx.lineTo(cssWidth - 4, baselineY);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = isSelected ? '#000000' : '#1e293b';

      path.commands.forEach((cmd: any) => {
        if (cmd.type === 'M') ctx.moveTo(fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor);
        else if (cmd.type === 'L') ctx.lineTo(fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor);
        else if (cmd.type === 'Q') ctx.quadraticCurveTo(fontStartX + cmd.x1 * scaleFactor, baselineY - cmd.y1 * scaleFactor, fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor);
        else if (cmd.type === 'C') ctx.bezierCurveTo(fontStartX + cmd.x1 * scaleFactor, baselineY - cmd.y1 * scaleFactor, fontStartX + cmd.x2 * scaleFactor, baselineY - cmd.y2 * scaleFactor, fontStartX + cmd.x * scaleFactor, baselineY - cmd.y * scaleFactor);
        else if (cmd.type === 'Z') ctx.closePath();
      });
      ctx.fill();
    } catch (e) {
      console.error('Failed card canvas', e);
    } finally {
      ctx.restore();
    }
  }, [font, fontMetadata, templates, rules, char, isSelected]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center p-1.5 rounded-xl border transition-all text-left ${
        isSelected
          ? 'border-neutral-900 bg-neutral-900/5 ring-2 ring-neutral-900/20 shadow-xs'
          : 'border-neutral-200/80 bg-white hover:border-neutral-400 hover:bg-neutral-50'
      }`}
    >
      {isNative && (
        <span className="absolute top-1 right-1 text-[7px] font-extrabold px-1 py-0.2 bg-amber-100 text-amber-900 rounded-sm" title="Ký tự đã có sẵn trong font gốc">
          Gốc
        </span>
      )}
      <canvas ref={canvasRef} className="w-14 h-14 block rounded-lg bg-white border border-neutral-100" />
      <div className="mt-1 text-center w-full">
        <span className="text-xs font-black text-neutral-950 font-mono block leading-tight">{char}</span>
        <span className="text-[8px] text-neutral-500 font-medium block leading-tight mt-0.5 truncate">{toneLabel}</span>
      </div>
    </button>
  );
};

// Double Accent Liveview Inspector Component
const DoubleAccentLiveviewInspector: React.FC<{
  font: opentype.Font;
  fontMetadata: FontMetadata;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
}> = ({ font, fontMetadata, templates, rules }) => {
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [isUppercase, setIsUppercase] = useState(true);
  const [selectedChar, setSelectedChar] = useState('Ấ');
  const [showGuides, setShowGuides] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'composed' | 'native' | 'overlay'>('composed');

  const currentGroup = DOUBLE_ACCENT_GROUPS[selectedGroupIdx];
  const activeList = isUppercase ? currentGroup.uppercase : currentGroup.lowercase;

  useEffect(() => {
    if (!activeList.includes(selectedChar)) {
      setSelectedChar(activeList[0]);
    }
  }, [selectedGroupIdx, isUppercase, activeList, selectedChar]);

  const activeRecipe = VIETNAMESE_RECIPES.find(r => r.char === selectedChar);

  const isNativeAvailable = useMemo(() => {
    if (!font) return false;
    const idx = font.charToGlyphIndex(selectedChar);
    if (idx <= 0) return false;
    const g = font.glyphs.get(idx);
    return !!(g && g.path && g.path.commands && g.path.commands.length > 0);
  }, [font, selectedChar]);

  return (
    <div className="space-y-3 pt-2">
      {/* Header controls for Inspector */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-neutral-900">
            Xem trước dấu kép trực tiếp:
          </span>
          <span className="text-[10px] bg-neutral-200/80 text-neutral-900 font-mono font-black px-2 py-0.5 rounded-md">
            Mẫu: {selectedChar}
          </span>
        </div>

        {/* Action icons: Toggle Guides & Flexible Zoom */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowGuides(!showGuides)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
              showGuides
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                : 'bg-white text-neutral-600 border-neutral-200 hover:text-neutral-900'
            }`}
            title="Bật/Tắt đường gióng Baseline, Cap-Height và Center"
          >
            {showGuides ? '✓ Đường gióng' : 'Đường gióng'}
          </button>

          {/* Flexible Zoom Control Group */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-1 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
              className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
              title="Thu nhỏ (-0.1x)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-neutral-900 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
              title="Thanh trượt thu phóng linh hoạt (0.5x - 3.0x)"
            />

            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10))}
              className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
              title="Phóng to (+0.1x)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono font-extrabold text-[11px] text-neutral-900 min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                title="Đặt lại zoom về 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Native Glyph Status & View Mode Control Banner */}
      {isNativeAvailable ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 px-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-amber-950">
                Font gốc ĐÃ CÓ SẴN ký tự "{selectedChar}"
              </span>
              <span className="text-[10px] text-amber-800 block">
                Chế độ xem Liveview/Xuất font sẽ giữ nguyên thiết kế gốc này.
              </span>
            </div>
          </div>

          {/* Copy actions & 3-way view toggle */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const pathStr = getNativeCharSvgPath(font, selectedChar);
                if (pathStr) navigator.clipboard.writeText(pathStr);
              }}
              className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 transition flex items-center gap-1 shadow-2xs"
              title={`Copy mã SVG Path d='...' của ký tự '${selectedChar}'`}
            >
              <Copy className="w-2.5 h-2.5 text-amber-800" />
              Copy Path ({selectedChar})
            </button>
            <button
              type="button"
              onClick={() => {
                const extracted = getExtractedDiacriticSvgPathFromChar(font, selectedChar, activeRecipe?.baseChar || 'A');
                if (extracted) navigator.clipboard.writeText(extracted);
              }}
              className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-800 hover:bg-amber-900 text-amber-50 transition flex items-center gap-1 shadow-2xs"
              title={`Bóc tách và copy mã SVG Path d='...' của dấu từ '${selectedChar}'`}
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              Copy SVG Dấu
            </button>

            <div className="flex p-0.5 bg-amber-100/80 rounded-lg border border-amber-300/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('composed')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${viewMode === 'composed' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-amber-900 hover:text-neutral-900'}`}
              >
                Dấu tự ghép
              </button>
              <button
                type="button"
                onClick={() => setViewMode('native')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${viewMode === 'native' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-amber-900 hover:text-neutral-900'}`}
              >
                Thiết kế gốc
              </button>
              <button
                type="button"
                onClick={() => setViewMode('overlay')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${viewMode === 'overlay' ? 'bg-amber-900 text-white shadow-2xs' : 'text-amber-900 hover:text-neutral-900'}`}
              >
                So sánh 2 lớp
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 px-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          <span className="text-neutral-600 font-medium text-[11px]">
            Ký tự <strong className="text-neutral-900">{selectedChar}</strong> chưa có trong font gốc (Sẽ ghép tự động).
          </span>
        </div>
      )}

      {/* Large Vector Inspection Stage */}
      <div className="relative">
        <DoubleAccentLargeStageCanvas
          char={selectedChar}
          font={font}
          fontMetadata={fontMetadata}
          templates={templates}
          rules={rules}
          showGuides={showGuides}
          zoomLevel={zoomLevel}
          viewMode={viewMode}
          onZoomChange={(updater) => setZoomLevel(updater)}
        />

        {/* Legend Overlay on Canvas */}
        {showGuides && (
          <div className="absolute top-2 left-2 flex items-center gap-2 text-[9px] font-mono bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md border border-neutral-200/80 shadow-2xs">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <span className="w-2 h-0.5 bg-emerald-500 inline-block"></span> Baseline
            </span>
            <span className="flex items-center gap-1 text-blue-600 font-bold">
              <span className="w-2 h-0.5 bg-blue-500 border-t border-dashed border-blue-500 inline-block"></span> Cap-Height
            </span>
            <span className="flex items-center gap-1 text-rose-500 font-bold">
              <span className="w-2 h-0.5 bg-rose-500 border-t border-dotted border-rose-500 inline-block"></span> Center
            </span>
          </div>
        )}

        {/* Metadata chip overlay */}
        <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-neutral-900/85 text-white px-2.5 py-1 rounded-md backdrop-blur-xs shadow-2xs flex items-center gap-2">
          <span>Nón: <strong className="text-amber-300">{activeRecipe?.components[0]}</strong></span>
          <span>•</span>
          <span>Thanh: <strong className="text-cyan-300">{activeRecipe?.components[1]}</strong></span>
        </div>
      </div>

      {/* Group selector tabs & Case switch */}
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          {/* Vowel groups */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
            {DOUBLE_ACCENT_GROUPS.map((grp, idx) => (
              <button
                key={grp.label}
                type="button"
                onClick={() => setSelectedGroupIdx(idx)}
                className={`px-2.5 py-1 text-xs font-black rounded-lg border transition ${
                  selectedGroupIdx === idx
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {isUppercase ? grp.uppercase[0].charAt(0) : grp.lowercase[0].charAt(0)} ({grp.label})
              </button>
            ))}
          </div>

          {/* Uppercase / Lowercase toggle */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-[10px] font-bold text-neutral-700 shrink-0">
            <button
              type="button"
              onClick={() => setIsUppercase(true)}
              className={`px-2 py-0.5 rounded-md transition ${isUppercase ? 'bg-white text-neutral-950 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              HOA
            </button>
            <button
              type="button"
              onClick={() => setIsUppercase(false)}
              className={`px-2 py-0.5 rounded-md transition ${!isUppercase ? 'bg-white text-neutral-950 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              thường
            </button>
          </div>
        </div>

        {/* Gallery Cards Row (5 tone variations for active vowel) */}
        <div className="grid grid-cols-5 gap-2 pt-0.5">
          {activeList.map((c, i) => (
            <DoubleAccentCardCanvas
              key={c}
              char={c}
              font={font}
              fontMetadata={fontMetadata}
              templates={templates}
              rules={rules}
              isSelected={selectedChar === c}
              onClick={() => setSelectedChar(c)}
              toneLabel={TONE_NAMES[i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Modal for manually inspecting and copying SVG code of existing diacritics and precomposed glyphs in font
const FontDiacriticsLibraryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  font: opentype.Font;
  templates: Record<string, DiacriticTemplate>;
  onApplySvgToTemplate?: (diaId: string, svgPath: string) => void;
}> = ({ isOpen, onClose, font, templates, onApplySvgToTemplate }) => {
  if (!isOpen || !font) return null;

  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const triggerCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyToast(`Đã sao chép: ${label}`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const VIETNAMESE_CHAR_LIST = [
    { char: 'á', base: 'a', type: 'acute', label: 'a sắc' },
    { char: 'à', base: 'a', type: 'grave', label: 'a huyền' },
    { char: 'ả', base: 'a', type: 'hook', label: 'a hỏi' },
    { char: 'ã', base: 'a', type: 'tilde', label: 'a ngã' },
    { char: 'ạ', base: 'a', type: 'dot_below', label: 'a nặng' },
    { char: 'â', base: 'a', type: 'circumflex', label: 'a nón' },
    { char: 'ấ', base: 'â', type: 'acute', label: 'â sắc' },
    { char: 'ầ', base: 'â', type: 'grave', label: 'â huyền' },
    { char: 'ẩ', base: 'â', type: 'hook', label: 'â hỏi' },
    { char: 'ẫ', base: 'â', type: 'tilde', label: 'â ngã' },
    { char: 'ậ', base: 'â', type: 'dot_below', label: 'â nặng' },
    { char: 'ă', base: 'a', type: 'breve', label: 'a trăng' },
    { char: 'ắ', base: 'ă', type: 'acute', label: 'ă sắc' },
    { char: 'ằ', base: 'ă', type: 'grave', label: 'ă huyền' },
    { char: 'ẳ', base: 'ă', type: 'hook', label: 'ă hỏi' },
    { char: 'ẵ', base: 'ă', type: 'tilde', label: 'ă ngã' },
    { char: 'ặ', base: 'ă', type: 'dot_below', label: 'ă nặng' },
    { char: 'é', base: 'e', type: 'acute', label: 'e sắc' },
    { char: 'è', base: 'e', type: 'grave', label: 'e huyền' },
    { char: 'ẻ', base: 'e', type: 'hook', label: 'e hỏi' },
    { char: 'ẽ', base: 'e', type: 'tilde', label: 'e ngã' },
    { char: 'ẹ', base: 'e', type: 'dot_below', label: 'e nặng' },
    { char: 'ê', base: 'e', type: 'circumflex', label: 'e nón' },
    { char: 'ế', base: 'ê', type: 'acute', label: 'ê sắc' },
    { char: 'ề', base: 'ê', type: 'grave', label: 'ê huyền' },
    { char: 'ể', base: 'ê', type: 'hook', label: 'ê hỏi' },
    { char: 'ễ', base: 'ê', type: 'tilde', label: 'ễ ngã' },
    { char: 'ệ', base: 'ê', type: 'dot_below', label: 'ệ nặng' },
    { char: 'í', base: 'i', type: 'acute', label: 'i sắc' },
    { char: 'ì', base: 'i', type: 'grave', label: 'i huyền' },
    { char: 'ỉ', base: 'i', type: 'hook', label: 'i hỏi' },
    { char: 'ĩ', base: 'i', type: 'tilde', label: 'i ngã' },
    { char: 'ị', base: 'i', type: 'dot_below', label: 'i nặng' },
    { char: 'ó', base: 'o', type: 'acute', label: 'o sắc' },
    { char: 'ò', base: 'o', type: 'grave', label: 'o huyền' },
    { char: 'ỏ', base: 'o', type: 'hook', label: 'o hỏi' },
    { char: 'õ', base: 'o', type: 'tilde', label: 'o ngã' },
    { char: 'ọ', base: 'o', type: 'dot_below', label: 'o nặng' },
    { char: 'ô', base: 'o', type: 'circumflex', label: 'o nón' },
    { char: 'ố', base: 'ô', type: 'acute', label: 'ô sắc' },
    { char: 'ồ', base: 'ô', type: 'grave', label: 'ô huyền' },
    { char: 'ổ', base: 'ô', type: 'hook', label: 'ô hỏi' },
    { char: 'ỗ', base: 'ô', type: 'tilde', label: 'ô ngã' },
    { char: 'ộ', base: 'ô', type: 'dot_below', label: 'ô nặng' },
    { char: 'ơ', base: 'o', type: 'horn', label: 'o móc' },
    { char: 'ớ', base: 'ơ', type: 'acute', label: 'ơ sắc' },
    { char: 'ờ', base: 'ơ', type: 'grave', label: 'ơ huyền' },
    { char: 'ở', base: 'ơ', type: 'hook', label: 'ơ hỏi' },
    { char: 'ỡ', base: 'ơ', type: 'tilde', label: 'ơ ngã' },
    { char: 'ợ', base: 'ơ', type: 'dot_below', label: 'ơ nặng' },
    { char: 'ú', base: 'u', type: 'acute', label: 'u sắc' },
    { char: 'ù', base: 'u', type: 'grave', label: 'u huyền' },
    { char: 'ủ', base: 'u', type: 'hook', label: 'u hỏi' },
    { char: 'ũ', base: 'u', type: 'tilde', label: 'u ngã' },
    { char: 'ụ', base: 'u', type: 'dot_below', label: 'u nặng' },
    { char: 'ư', base: 'u', type: 'horn', label: 'u móc' },
    { char: 'ứ', base: 'ư', type: 'acute', label: 'ư sắc' },
    { char: 'ừ', base: 'ư', type: 'grave', label: 'ư huyền' },
    { char: 'ử', base: 'ư', type: 'hook', label: 'ư hỏi' },
    { char: 'ữ', base: 'ư', type: 'tilde', label: 'ư ngã' },
    { char: 'ự', base: 'ư', type: 'dot_below', label: 'ư nặng' },
    { char: 'ý', base: 'y', type: 'acute', label: 'y sắc' },
    { char: 'ỳ', base: 'y', type: 'grave', label: 'y huyền' },
    { char: 'ỷ', base: 'y', type: 'hook', label: 'y hỏi' },
    { char: 'ỹ', base: 'y', type: 'tilde', label: 'y ngã' },
    { char: 'ỵ', base: 'y', type: 'dot_below', label: 'y nặng' },
    { char: 'đ', base: 'd', type: 'bar', label: 'd gạch' },

    // Uppercase
    { char: 'Á', base: 'A', type: 'acute', label: 'A sắc' },
    { char: 'À', base: 'A', type: 'grave', label: 'A huyền' },
    { char: 'Ả', base: 'A', type: 'hook', label: 'A hỏi' },
    { char: 'Ã', base: 'A', type: 'tilde', label: 'A ngã' },
    { char: 'Ạ', base: 'A', type: 'dot_below', label: 'A nặng' },
    { char: 'Â', base: 'A', type: 'circumflex', label: 'A nón' },
    { char: 'Ấ', base: 'Â', type: 'acute', label: 'Â sắc' },
    { char: 'Ầ', base: 'Â', type: 'grave', label: 'Â huyền' },
    { char: 'Ẩ', base: 'Â', type: 'hook', label: 'Â hỏi' },
    { char: 'Ẫ', base: 'Â', type: 'tilde', label: 'Â ngã' },
    { char: 'Ậ', base: 'Â', type: 'dot_below', label: 'Â nặng' },
    { char: 'Ă', base: 'A', type: 'breve', label: 'A trăng' },
    { char: 'Ắ', base: 'Ă', type: 'acute', label: 'Ă sắc' },
    { char: 'Ằ', base: 'Ă', type: 'grave', label: 'Ă huyền' },
    { char: 'Ẳ', base: 'Ă', type: 'hook', label: 'Ă hỏi' },
    { char: 'Ẵ', base: 'Ă', type: 'tilde', label: 'Ă ngã' },
    { char: 'Ặ', base: 'Ă', type: 'dot_below', label: 'Ă nặng' },
    { char: 'É', base: 'E', type: 'acute', label: 'E sắc' },
    { char: 'È', base: 'E', type: 'grave', label: 'E huyền' },
    { char: 'Ẻ', base: 'E', type: 'hook', label: 'E hỏi' },
    { char: 'Ẽ', base: 'E', type: 'tilde', label: 'E ngã' },
    { char: 'Ẹ', base: 'E', type: 'dot_below', label: 'E nặng' },
    { char: 'Ê', base: 'E', type: 'circumflex', label: 'E nón' },
    { char: 'Ế', base: 'Ê', type: 'acute', label: 'Ê sắc' },
    { char: 'Ề', base: 'Ê', type: 'grave', label: 'Ê huyền' },
    { char: 'Ể', base: 'Ê', type: 'hook', label: 'Ê hỏi' },
    { char: 'Ễ', base: 'Ê', type: 'tilde', label: 'Ễ ngã' },
    { char: 'Ệ', base: 'Ê', type: 'dot_below', label: 'Ê nặng' },
    { char: 'Í', base: 'I', type: 'acute', label: 'I sắc' },
    { char: 'Ì', base: 'I', type: 'grave', label: 'I huyền' },
    { char: 'Ỉ', base: 'I', type: 'hook', label: 'I hỏi' },
    { char: 'Ĩ', base: 'I', type: 'tilde', label: 'I ngã' },
    { char: 'Ị', base: 'I', type: 'dot_below', label: 'I nặng' },
    { char: 'Ó', base: 'O', type: 'acute', label: 'O sắc' },
    { char: 'Ò', base: 'O', type: 'grave', label: 'O huyền' },
    { char: 'Ỏ', base: 'O', type: 'hook', label: 'O hỏi' },
    { char: 'Õ', base: 'O', type: 'tilde', label: 'O ngã' },
    { char: 'Ọ', base: 'O', type: 'dot_below', label: 'O nặng' },
    { char: 'Ô', base: 'O', type: 'circumflex', label: 'O nón' },
    { char: 'Ố', base: 'Ô', type: 'acute', label: 'Ô sắc' },
    { char: 'Ồ', base: 'Ô', type: 'grave', label: 'Ô huyền' },
    { char: 'Ổ', base: 'Ô', type: 'hook', label: 'Ô hỏi' },
    { char: 'Ỗ', base: 'Ô', type: 'tilde', label: 'Ô ngã' },
    { char: 'Ộ', base: 'Ô', type: 'dot_below', label: 'Ô nặng' },
    { char: 'Ơ', base: 'O', type: 'horn', label: 'O móc' },
    { char: 'Ớ', base: 'Ơ', type: 'acute', label: 'Ơ sắc' },
    { char: 'Ờ', base: 'Ơ', type: 'grave', label: 'Ơ huyền' },
    { char: 'Ở', base: 'Ơ', type: 'hook', label: 'Ơ hỏi' },
    { char: 'Ỡ', base: 'Ơ', type: 'tilde', label: 'Ơ ngã' },
    { char: 'Ợ', base: 'Ơ', type: 'dot_below', label: 'Ơ nặng' },
    { char: 'Ú', base: 'U', type: 'acute', label: 'U sắc' },
    { char: 'Ù', base: 'U', type: 'grave', label: 'U huyền' },
    { char: 'Ủ', base: 'U', type: 'hook', label: 'U hỏi' },
    { char: 'Ũ', base: 'U', type: 'tilde', label: 'U ngã' },
    { char: 'Ụ', base: 'U', type: 'dot_below', label: 'U nặng' },
    { char: 'Ư', base: 'U', type: 'horn', label: 'U móc' },
    { char: 'Ứ', base: 'Ư', type: 'acute', label: 'Ư sắc' },
    { char: 'Ừ', base: 'Ư', type: 'grave', label: 'Ư huyền' },
    { char: 'Ử', base: 'Ư', type: 'hook', label: 'Ư hỏi' },
    { char: 'Ữ', base: 'Ư', type: 'tilde', label: 'Ư ngã' },
    { char: 'Ự', base: 'Ư', type: 'dot_below', label: 'Ư nặng' },
    { char: 'Ý', base: 'Y', type: 'acute', label: 'Y sắc' },
    { char: 'Ỳ', base: 'Y', type: 'grave', label: 'Y huyền' },
    { char: 'Ỷ', base: 'Y', type: 'hook', label: 'Y hỏi' },
    { char: 'Ỹ', base: 'Y', type: 'tilde', label: 'Y ngã' },
    { char: 'Ỵ', base: 'Y', type: 'dot_below', label: 'Y nặng' },
    { char: 'Đ', base: 'D', type: 'bar', label: 'D gạch' },
  ];

  const availableItems = useMemo(() => {
    if (!font) return [];
    return VIETNAMESE_CHAR_LIST.filter(item => {
      const idx = font.charToGlyphIndex(item.char);
      if (idx <= 0) return false;
      const g = font.glyphs.get(idx);
      return !!(g && g.path && g.path.commands && g.path.commands.length > 0);
    });
  }, [font]);

  const filteredItems = useMemo(() => {
    return availableItems.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.char.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
      }
      return true;
    });
  }, [availableItems, activeTab, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 px-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">Thư viện Dấu & Ký tự có sẵn trong Font</h3>
              <p className="text-[11px] text-neutral-400">
                Font chữ có <strong>{availableItems.length}</strong> ký tự tiếng Việt có sẵn. Chọn để copy mã SVG dấu bóc tách hoặc mã ký tự gốc.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {copyToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-in slide-in-from-top duration-150 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>{copyToast}</span>
          </div>
        )}

        <div className="p-3 px-6 bg-neutral-50 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            {[
              { id: 'all', label: `Tất cả (${availableItems.length})` },
              { id: 'acute', label: 'Sắc (´)' },
              { id: 'grave', label: 'Huyền (`)' },
              { id: 'hook', label: 'Hỏi (ˀ)' },
              { id: 'tilde', label: 'Ngã (~)' },
              { id: 'dot_below', label: 'Nặng (.)' },
              { id: 'circumflex', label: 'Nón (ˆ)' },
              { id: 'breve', label: 'Trăng (˘)' },
              { id: 'horn', label: 'Móc (˒)' },
              { id: 'bar', label: 'Gạch (-)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm ký tự..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-xs font-medium">Không tìm thấy ký tự tiếng Việt phù hợp trong bộ font này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredItems.map(item => {
                const nativeSvgPath = getNativeCharSvgPath(font, item.char);
                const fullSvg = getNativeCharFullSvg(font, item.char);
                const extractedMarkPath = getExtractedDiacriticSvgPathFromChar(font, item.char, item.base);

                return (
                  <div
                    key={item.char}
                    className="p-3 bg-white rounded-xl border border-neutral-200 shadow-xs hover:border-neutral-400 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl font-black text-neutral-950 font-mono">{item.char}</span>
                        <span className="text-[9px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                          U+{item.char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 font-medium mb-2 truncate">{item.label}</p>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-neutral-100 text-[10px]">
                      {extractedMarkPath ? (
                        <button
                          type="button"
                          onClick={() => triggerCopy(extractedMarkPath, `Mã SVG Path dấu từ '${item.char}'`)}
                          className="w-full py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Copy mã SVG Path d='...' của dấu bóc tách từ ký tự này"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Copy SVG Dấu (Path)</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-neutral-400 italic block text-center py-0.5">Dấu dính liền thân</span>
                      )}

                      <button
                        type="button"
                        onClick={() => triggerCopy(nativeSvgPath, `Mã SVG Path ký tự '${item.char}'`)}
                        className="w-full py-1 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-md font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Copy mã SVG Path d='...' của toàn bộ ký tự này"
                      >
                        <Copy className="w-3 h-3 text-neutral-600 shrink-0" />
                        <span>Copy SVG Ký tự (Path)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerCopy(fullSvg, `Thẻ <svg> đầy đủ của '${item.char}'`)}
                        className="w-full py-1 px-2 bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-md font-mono text-[9px] flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Copy thẻ <svg>...</svg> đầy đủ"
                      >
                        <Code className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span>Copy thẻ &lt;svg&gt;</span>
                      </button>

                      {extractedMarkPath && onApplySvgToTemplate && (
                        <button
                          type="button"
                          onClick={() => {
                            let mappedType = item.type;
                            if (mappedType === 'horn') {
                              mappedType = item.base.toLowerCase() === 'u' ? 'horn_u' : 'horn_o';
                            }
                            onApplySvgToTemplate(mappedType, extractedMarkPath);
                            triggerCopy(extractedMarkPath, `Đã áp dụng dấu từ '${item.char}' vào Studio!`);
                          }}
                          className="w-full py-1 px-2 bg-neutral-900 hover:bg-black text-white rounded-md font-bold text-[9px] flex items-center justify-center gap-1 transition mt-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Dùng làm Dấu mẫu</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 px-6 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-500">
          <span>* Các mã dấu câu đã được bóc tách và chuyển đổi chuẩn hóa SVG Path.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white font-bold rounded-lg hover:bg-black transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

interface DiacriticStudioProps {
  font: opentype.Font;
  fontMetadata: FontMetadata;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
  onUpdateTemplate: (id: string, updated: Partial<DiacriticTemplate>) => void;
  onUpdateRules: (updated: Partial<AutoPositionRules>) => void;
}

export const DiacriticStudio: React.FC<DiacriticStudioProps> = ({
  font,
  fontMetadata,
  templates,
  rules,
  onUpdateTemplate,
  onUpdateRules
}) => {
  const [activeDiaId, setActiveDiaId] = useState<string>('acute');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [showReference, setShowReference] = useState<boolean>(true);
  const [bgOpacity, setBgOpacity] = useState<number>(30);
  const [scaleLinked, setScaleLinked] = useState<boolean>(true);
  const [isCapitalPreview, setIsCapitalPreview] = useState<boolean>(false);
  const [testViewMode, setTestViewMode] = useState<'composed' | 'native' | 'overlay'>('composed');
  const [extractStatus, setExtractStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showGlyphLibrary, setShowGlyphLibrary] = useState<boolean>(false);

  const availableNativeCount = useMemo(() => {
    if (!font) return 0;
    const chars = ['á','à','ả','ã','ạ','â','ấ','ầ','ẩ','ẫ','ậ','ă','ắ','ằ','ẳ','ẵ','ặ','é','è','ẻ','ẽ','ẹ','ê','ế','ề','ể','ễ','ệ','í','ì','ỉ','ĩ','ị','ó','ò','ỏ','õ','ọ','ô','ố','ồ','ổ','ỗ','ộ','ơ','ớ','ờ','ở','ỡ','ợ','ú','ù','ủ','ũ','ụ','ư','ứ','ừ','ử','ữ','ự','ý','ỳ','ỷ','ỹ','ỵ','đ'];
    let count = 0;
    for (const c of chars) {
      const idx = font.charToGlyphIndex(c);
      if (idx > 0) {
        const g = font.glyphs.get(idx);
        if (g && g.path && g.path.commands && g.path.commands.length > 0) count++;
      }
    }
    return count;
  }, [font]);

  const activeTemplate = templates[activeDiaId];

  const APPLICABLE_CHARS: Record<string, string[]> = {
    acute: ['a', 'e', 'i', 'o', 'u', 'y'],
    grave: ['a', 'e', 'i', 'o', 'u', 'y'],
    hook: ['a', 'e', 'i', 'o', 'u', 'y'],
    tilde: ['a', 'e', 'i', 'o', 'u', 'y'],
    dot_below: ['a', 'e', 'i', 'o', 'u', 'y'],
    circumflex: ['a', 'e', 'o'],
    breve: ['a'],
    horn_o: ['o'],
    horn_u: ['u'],
    bar: ['d']
  };

  const [selectedBaseChar, setSelectedBaseChar] = useState<string>('a');

  useEffect(() => {
    const list = APPLICABLE_CHARS[activeDiaId] || ['a'];
    const currentBase = selectedBaseChar.toLowerCase();
    if (!list.includes(currentBase)) {
      setSelectedBaseChar(list[0]);
    }
  }, [activeDiaId]);

  const getReferenceChar = (id: string, isCap: boolean): string => {
    const list = APPLICABLE_CHARS[id] || ['a'];
    const currentBase = list.includes(selectedBaseChar.toLowerCase()) ? selectedBaseChar.toLowerCase() : list[0];
    return isCap ? currentBase.toUpperCase() : currentBase.toLowerCase();
  };

  const refChar = getReferenceChar(activeDiaId, isCapitalPreview);

  // Derive target character in font for active base character & diacritic mark
  const testTargetChar = useMemo(() => {
    const normBase = refChar.toLowerCase();
    const isCap = refChar !== normBase;

    if (activeDiaId === 'bar') return isCap ? 'Đ' : 'đ';
    if (activeDiaId === 'horn_o' || (activeDiaId === 'horn' && normBase === 'o')) return isCap ? 'Ơ' : 'ơ';
    if (activeDiaId === 'horn_u' || (activeDiaId === 'horn' && normBase === 'u')) return isCap ? 'Ư' : 'ư';

    const match = VIETNAMESE_RECIPES.find(r => {
      if (r.baseChar.toLowerCase() !== normBase) return false;
      if (r.components.length !== 1) return false;
      const c = r.components[0];
      if (c === activeDiaId) return true;
      if (activeDiaId === 'horn' && (c === 'horn_o' || c === 'horn_u')) return true;
      return false;
    });

    if (!match) return null;
    return isCap ? match.char.toUpperCase() : match.char.toLowerCase();
  }, [refChar, activeDiaId]);

  const testNativeGlyph = useMemo(() => {
    if (!font || !testTargetChar) return null;
    const idx = font.charToGlyphIndex(testTargetChar);
    if (idx <= 0) return null;
    const g = font.glyphs.get(idx);
    return (g && g.path && g.path.commands && g.path.commands.length > 0) ? g : null;
  }, [font, testTargetChar]);

  const isTestNativeAvailable = !!testNativeGlyph;

  const useCapVariant = activeTemplate?.hasCapVariant && isCapitalPreview;
  const activeSvgPath = useCapVariant && activeTemplate.capSvgPath !== undefined ? activeTemplate.capSvgPath : (activeTemplate?.svgPath || '');
  const activeScaleX = useCapVariant && activeTemplate.capScaleX !== undefined ? activeTemplate.capScaleX : (activeTemplate?.scaleX ?? 1.0);
  const activeScaleY = useCapVariant && activeTemplate.capScaleY !== undefined ? activeTemplate.capScaleY : (activeTemplate?.scaleY ?? 1.0);
  const activeOffsetX = useCapVariant && activeTemplate.capOffsetX !== undefined ? activeTemplate.capOffsetX : (activeTemplate?.offsetX ?? 0);
  const activeOffsetY = useCapVariant && activeTemplate.capOffsetY !== undefined ? activeTemplate.capOffsetY : (activeTemplate?.offsetY ?? 0);
  const activeAutoCenterX = useCapVariant && activeTemplate.capAutoCenterX !== undefined ? activeTemplate.capAutoCenterX : (activeTemplate?.autoCenterX !== false);

  // Helper to resolve viewport coords based on CSS layout size
  const getScaleFactorAndStartX = () => {
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 500;
    const height = canvas?.clientHeight || 500;
    const padding = 60;
    const drawHeight = height - padding * 2;
    const baseScaleFactor = drawHeight / Math.max(1, (fontMetadata.ascender - fontMetadata.descender));
    const scaleFactor = baseScaleFactor * zoom;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Default width of base character or 500
    const baseGlyph = font.charToGlyph(refChar);
    const advanceWidth = baseGlyph ? baseGlyph.advanceWidth : 500;
    
    const fontStartX = centerX - (advanceWidth / 2) * scaleFactor;
    const baselineY = centerY + ((fontMetadata.ascender + fontMetadata.descender) / 2) * scaleFactor;
    return { scaleFactor, fontStartX, baselineY, width, height, advanceWidth };
  };

  // Trigger redraw on window resize or zoom change
  const [resizeCounter, setResizeCounter] = useState(0);
  useEffect(() => {
    const handleResize = () => setResizeCounter(c => c + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw the component live view canvas with HiDPI vector crispness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI Device Pixel Ratio Scaling
    const cssWidth = canvas.clientWidth || 500;
    const cssHeight = canvas.clientHeight || 500;
    const dpr = Math.max(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const { scaleFactor, fontStartX, baselineY, width, height, advanceWidth } = getScaleFactorAndStartX();
    const upm = fontMetadata.unitsPerEm;

    // Subtle grid dots mesh
    ctx.fillStyle = '#cbd5e1';
    for (let x = 15; x < width; x += 25) {
      for (let y = 15; y < height; y += 25) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Reference horizontal guidelines with high contrast & crisp labels
    const drawGuideLine = (yVal: number, label: string, color: string, isDashed = true, isBaseline = false) => {
      const yCanvas = baselineY - yVal * scaleFactor;
      ctx.beginPath();
      if (isDashed) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);
      ctx.strokeStyle = color;
      ctx.lineWidth = isBaseline ? 1.5 : 1;
      ctx.moveTo(10, yCanvas);
      ctx.lineTo(width - 10, yCanvas);
      ctx.stroke();

      // Background label box for razor-sharp readability
      const labelText = `${label} (${Math.round(yVal)})`;
      ctx.font = 'bold 10px sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(12, yCanvas - 13, textWidth + 8, 14);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(12, yCanvas - 13, textWidth + 8, 14);

      ctx.fillStyle = color;
      ctx.fillText(labelText, 16, yCanvas - 2);
    };

    drawGuideLine(fontMetadata.ascender, 'Ascender', '#ef4444', true);
    drawGuideLine(fontMetadata.capHeight, 'Cap Height', '#ea580c', true);
    drawGuideLine(fontMetadata.xHeight, 'x-Height', '#9333ea', true);
    drawGuideLine(0, 'Baseline', '#2563eb', false, true);
    drawGuideLine(fontMetadata.descender, 'Descender', '#ef4444', true);

    // Vertical guides (LSB, RSB)
    const drawVerticalGuide = (xVal: number, label: string, color: string) => {
      const xCanvas = fontStartX + xVal * scaleFactor;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(xCanvas, 15);
      ctx.lineTo(xCanvas, height - 15);
      ctx.stroke();

      const labelText = `${label} (${Math.round(xVal)})`;
      ctx.font = 'bold 10px sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(xCanvas + 2, height - 22, textWidth + 8, 14);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(xCanvas + 2, height - 22, textWidth + 8, 14);

      ctx.fillStyle = color;
      ctx.fillText(labelText, xCanvas + 6, height - 11);
    };

    drawVerticalGuide(0, 'LSB', '#0284c7');
    drawVerticalGuide(advanceWidth, 'RSB', '#0284c7');

    const baseGlyph = font.charToGlyph(refChar);
    let baseBBox = baseGlyph ? baseGlyph.getBoundingBox() : { x1: 50, y1: 0, x2: 450, y2: fontMetadata.xHeight };

    if (refChar === 'i' && baseGlyph) {
      const dotlessCmds = removeDotFromICommands(baseGlyph.path.commands);
      const tightBox = getExactBoundingBox(dotlessCmds);
      baseBBox = {
        x1: tightBox.xMin,
        y1: tightBox.yMin,
        x2: tightBox.xMax,
        y2: tightBox.yMax
      };
    }

    // Render Native Glyph if testViewMode is native or overlay
    if ((testViewMode === 'native' || testViewMode === 'overlay') && isTestNativeAvailable && testNativeGlyph) {
      const nativePath = testNativeGlyph.getPath(fontStartX, baselineY, scaleFactor * upm);
      nativePath.fill = testViewMode === 'overlay' ? 'rgba(245, 158, 11, 0.35)' : '#0f172a';
      nativePath.stroke = testViewMode === 'overlay' ? '#d97706' : '#020617';
      nativePath.lineWidth = 1.5;
      nativePath.draw(ctx);
    }

    // Draw reference letter outline & auto-composed diacritic mark (in composed or overlay mode)
    if (testViewMode === 'composed' || testViewMode === 'overlay' || !isTestNativeAvailable) {
      // Draw reference letter outline
      if (showReference && baseGlyph) {
        ctx.setLineDash([]);
        let fontPath: any;

        if (refChar === 'i') {
          const dotlessCmds = removeDotFromICommands(baseGlyph.path.commands);
          fontPath = new opentype.Path();
          dotlessCmds.forEach((cmd: any) => {
            const xScale = scaleFactor;
            const yScale = scaleFactor;
            if (cmd.type === 'M') {
              fontPath.moveTo(fontStartX + cmd.x * xScale, baselineY - cmd.y * yScale);
            } else if (cmd.type === 'L') {
              fontPath.lineTo(fontStartX + cmd.x * xScale, baselineY - cmd.y * yScale);
            } else if (cmd.type === 'Q') {
              fontPath.quadTo(
                fontStartX + cmd.x1 * xScale, baselineY - cmd.y1 * yScale,
                fontStartX + cmd.x * xScale, baselineY - cmd.y * yScale
              );
            } else if (cmd.type === 'C') {
              fontPath.curveTo(
                fontStartX + cmd.x1 * xScale, baselineY - cmd.y1 * yScale,
                fontStartX + cmd.x2 * xScale, baselineY - cmd.y2 * yScale,
                fontStartX + cmd.x * xScale, baselineY - cmd.y * yScale
              );
            } else if (cmd.type === 'Z') {
              fontPath.closePath();
            }
          });
        } else {
          fontPath = baseGlyph.getPath(fontStartX, baselineY, scaleFactor * upm);
        }

        fontPath.fill = testViewMode === 'overlay' ? `rgba(148, 163, 184, 0.25)` : `rgba(148, 163, 184, ${bgOpacity / 100})`;
        fontPath.stroke = testViewMode === 'overlay' ? `rgba(71, 85, 105, 0.5)` : `rgba(71, 85, 105, ${Math.min(0.95, (bgOpacity + 20) / 100)})`;
        fontPath.lineWidth = 1;
        fontPath.draw(ctx);

        // Reference character center line
        const baseXCenter = (baseBBox.x1 + baseBBox.x2) / 2;
        const baseXCanvas = fontStartX + baseXCenter * scaleFactor;
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(baseXCanvas, 20);
        ctx.lineTo(baseXCanvas, height - 20);
        ctx.stroke();
      }

      // Draw compiled diacritic over reference letter
      if (activeTemplate) {
        const useCapVariant = isCapitalPreview && activeTemplate.hasCapVariant;
        const svgPathToUse = useCapVariant && activeTemplate.capSvgPath ? activeTemplate.capSvgPath : activeTemplate.svgPath;
        const scaleXToUse = useCapVariant && activeTemplate.capScaleX !== undefined ? activeTemplate.capScaleX : activeTemplate.scaleX;
        const scaleYToUse = useCapVariant && activeTemplate.capScaleY !== undefined ? activeTemplate.capScaleY : activeTemplate.scaleY;
        const offsetXToUse = useCapVariant && activeTemplate.capOffsetX !== undefined ? activeTemplate.capOffsetX : activeTemplate.offsetX;
        const offsetYToUse = useCapVariant && activeTemplate.capOffsetY !== undefined ? activeTemplate.capOffsetY : activeTemplate.offsetY;
        const autoCenterXToUse = useCapVariant && activeTemplate.capAutoCenterX !== undefined ? activeTemplate.capAutoCenterX : (activeTemplate.autoCenterX !== false);

        const rawCmds = parseSvgPath(svgPathToUse);
        if (rawCmds.length > 0) {
          // Apply template scale first
          const templateTransformed = transformCommands(
            rawCmds,
            scaleXToUse,
            scaleYToUse,
            0,
            0,
            true // flipY
          );

          const diaBBox = getExactBoundingBox(templateTransformed);
          
          // Calculate auto position values
          const autoPos = calculateAutoPosition(
            activeDiaId,
            baseBBox,
            diaBBox,
            rules,
            isCapitalPreview
          );

          const useAutoCenterX = autoCenterXToUse;
          const finalOffsetX = autoPos.offsetX + (useAutoCenterX ? 0 : offsetXToUse);
          const finalOffsetY = autoPos.offsetY + offsetYToUse;

          // Compute final placement coordinates
          const finalCmds = transformCommands(
            templateTransformed,
            autoPos.scaleX,
            autoPos.scaleY,
            finalOffsetX,
            finalOffsetY,
            false
          );

          // Draw final diacritic path
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.strokeStyle = testViewMode === 'overlay' ? '#0f172a' : '#020617';
          ctx.fillStyle = testViewMode === 'overlay' ? 'rgba(15, 23, 42, 0.85)' : '#0f172a';
          ctx.lineWidth = 1.5;

          finalCmds.forEach(cmd => {
            const cx = fontStartX + cmd.x * scaleFactor;
            const cy = baselineY - cmd.y * scaleFactor;

            if (cmd.type === 'M') {
              ctx.moveTo(cx, cy);
            } else if (cmd.type === 'L') {
              ctx.lineTo(cx, cy);
            } else if (cmd.type === 'Q') {
              const cx1 = fontStartX + cmd.x1 * scaleFactor;
              const cy1 = baselineY - cmd.y1 * scaleFactor;
              ctx.quadraticCurveTo(cx1, cy1, cx, cy);
            } else if (cmd.type === 'C') {
              const cx1 = fontStartX + cmd.x1 * scaleFactor;
              const cy1 = baselineY - cmd.y1 * scaleFactor;
              const cx2 = fontStartX + cmd.x2 * scaleFactor;
              const cy2 = baselineY - cmd.y2 * scaleFactor;
              ctx.bezierCurveTo(cx1, cy1, cx2, cy2, cx, cy);
            } else if (cmd.type === 'Z') {
              ctx.closePath();
            }
          });

          ctx.fill();
          ctx.stroke();

          // Marker for diacritic center
          const finalDiaBBox = getExactBoundingBox(finalCmds);
          const diaCenter = (finalDiaBBox.xMin + finalDiaBBox.xMax) / 2;
          const diaCenterCanvas = fontStartX + diaCenter * scaleFactor;
          
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(diaCenterCanvas, 15);
          ctx.lineTo(diaCenterCanvas, height - 15);
          ctx.stroke();
        }
      }
    }

    // Legend Overlay on Canvas for Overlay mode
    if (testViewMode === 'overlay' && isTestNativeAvailable) {
      const legendText = '🟧 Design gốc font   |   ⬛ Dấu ghép mẫu';
      ctx.font = 'bold 10px sans-serif';
      const textW = ctx.measureText(legendText).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(width / 2 - textW / 2 - 8, 12, textW + 16, 20);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - textW / 2 - 8, 12, textW + 16, 20);

      ctx.fillStyle = '#1e293b';
      ctx.fillText(legendText, width / 2 - textW / 2, 26);
    }

    ctx.restore();
  }, [font, fontMetadata, templates, rules, activeDiaId, zoom, showReference, bgOpacity, isCapitalPreview, selectedBaseChar, resizeCounter, testViewMode, isTestNativeAvailable, testNativeGlyph]);

  const updateActiveValue = (updates: Partial<DiacriticTemplate>) => {
    if (!activeTemplate) return;
    if (activeTemplate.hasCapVariant && isCapitalPreview) {
      // Map normal updates to cap properties
      const capUpdates: Partial<DiacriticTemplate> = {};
      if (updates.svgPath !== undefined) capUpdates.capSvgPath = updates.svgPath;
      if (updates.scaleX !== undefined) capUpdates.capScaleX = updates.scaleX;
      if (updates.scaleY !== undefined) capUpdates.capScaleY = updates.scaleY;
      if (updates.offsetX !== undefined) capUpdates.capOffsetX = updates.offsetX;
      if (updates.offsetY !== undefined) capUpdates.capOffsetY = updates.offsetY;
      if (updates.autoCenterX !== undefined) capUpdates.capAutoCenterX = updates.autoCenterX;
      onUpdateTemplate(activeDiaId, capUpdates);
    } else {
      onUpdateTemplate(activeDiaId, updates);
    }
  };

  const handleVectorPaste = (val: string) => {
    const cleaned = extractPathDataFromSvg(val);
    updateActiveValue({ svgPath: cleaned });
  };

  const handleResetTemplate = () => {
    // Re-assign default
    const originalDefault = DEFAULT_DIACRITICS.find((d: any) => d.id === activeDiaId);
    if (originalDefault) {
      updateActiveValue({
        svgPath: originalDefault.svgPath,
        scaleX: 1.0,
        scaleY: 1.0,
        offsetX: 0,
        offsetY: 0
      });
      setExtractStatus({
        type: 'success',
        text: 'Đã đặt lại hình dạng dấu mẫu về thiết kế mặc định của hệ thống!'
      });
      setTimeout(() => setExtractStatus(null), 4000);
    }
  };

  const handleExtractFromFont = () => {
    if (!font) {
      setExtractStatus({ type: 'error', text: 'Không tìm thấy tệp font gốc.' });
      return;
    }
    const candidateGlyph = findCandidateGlyph(font, activeDiaId);
    if (candidateGlyph) {
      const fontSvg = extractSvgFromGlyph(candidateGlyph, font.unitsPerEm);
      if (fontSvg) {
        updateActiveValue({
          svgPath: fontSvg,
          scaleX: 1.0,
          scaleY: 1.0,
          offsetX: 0,
          offsetY: 0
        });
        setExtractStatus({
          type: 'success',
          text: `Đã trích xuất dấu mẫu thành công từ ký tự '${candidateGlyph.name}' của font gốc!`
        });
        setTimeout(() => setExtractStatus(null), 6000);
        return;
      }
    }
    setExtractStatus({
      type: 'error',
      text: 'Không tìm thấy ký tự dấu tương ứng trong bộ font hiện tại để trích xuất tự động.'
    });
    setTimeout(() => setExtractStatus(null), 6000);
  };

  return (
    <div id="diacritic-studio-tab" className="space-y-6">
      
      {/* Informative Help Banner */}
      <div className="bg-neutral-900 text-neutral-100 p-5 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <span className="p-2 bg-neutral-800 text-white rounded-xl inline-flex items-center justify-center shrink-0 border border-neutral-700/60 shadow-2xs">
            <Sparkles className="w-4.5 h-4.5 text-amber-400" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">
              Trình Thiết Kế Dấu & Mũ Phụ
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 max-w-xl">
              Hệ thống tự động đề xuất mẫu dấu dựa trên font chữ gốc. Bạn có thể tùy chỉnh lại nét vẽ bằng mã SVG.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {font && availableNativeCount > 0 && (
            <button
              type="button"
              onClick={() => setShowGlyphLibrary(true)}
              className="text-xs bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black py-2 px-3.5 rounded-xl border border-amber-500/50 shadow-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              <Code className="w-4 h-4" />
              <span>Copy mã SVG Dấu ({availableNativeCount})</span>
            </button>
          )}
          <div className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-700/50 rounded-xl py-1.5 px-3 font-semibold">
            Đầy đủ 9 dấu mẫu chuẩn
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Diacritic Selector Buttons (3 columns) */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1 px-1">Danh sách Dấu mẫu (9)</span>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {(Object.values(templates) as DiacriticTemplate[]).map((dia) => (
              <button
                key={dia.id}
                onClick={() => {
                  setActiveDiaId(dia.id);
                  if (dia.id === 'bar' || dia.id === 'horn') {
                    // Horns & Bars are best tweaked with regular vowels preview, but custom logic applies
                  }
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  activeDiaId === dia.id
                    ? 'border-neutral-950 bg-neutral-950 text-white shadow-xs'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <span className="text-xs font-bold">{dia.name}</span>
                <span className="text-[10px] opacity-70 font-mono mt-1 truncate max-w-full">
                  {dia.svgPath ? 'Đã thiết lập vector' : 'Chưa có nét'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Middle: Canvas Live view workspace (5 columns) */}
        <div className="lg:col-span-5 flex flex-col bg-white border border-neutral-100 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Test dấu mẫu
            </h4>
            
            <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showReference}
                onChange={(e) => setShowReference(e.target.checked)}
                className="rounded-sm border-neutral-300 text-neutral-800"
              />
              <span>Bối cảnh chữ</span>
            </label>
          </div>

          {/* Native Glyph Status & 3-way view mode toggle for Test dấu mẫu */}
          {isTestNativeAvailable ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 px-3 mb-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                <div>
                  <span className="font-extrabold text-amber-950">
                    Font gốc ĐÃ CÓ SẴN ký tự "{testTargetChar}"
                  </span>
                  <span className="text-[10px] text-amber-800 block">
                    Ký tự này sẵn có trong font. Bạn có thể so sánh giữa thiết kế gốc và dấu tự ghép.
                  </span>
                </div>
              </div>

              {/* Copy actions & 3-way view mode toggle */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const p = getNativeCharSvgPath(font, testTargetChar || refChar);
                    if (p) {
                      navigator.clipboard.writeText(p);
                      setExtractStatus({ type: 'success', text: `Đã copy mã SVG Path ký tự gốc '${testTargetChar || refChar}'!` });
                      setTimeout(() => setExtractStatus(null), 3000);
                    }
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white text-amber-950 border border-amber-300 rounded-md hover:bg-amber-100 flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  title="Copy mã SVG Path d='...' của ký tự gốc này"
                >
                  <Copy className="w-2.5 h-2.5 text-amber-700" />
                  Copy Path ({testTargetChar})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const extracted = getExtractedDiacriticSvgPathFromChar(font, testTargetChar || refChar, refChar.toLowerCase());
                    if (extracted) {
                      navigator.clipboard.writeText(extracted);
                      setExtractStatus({ type: 'success', text: `Đã bóc tách và copy mã SVG Path DẤU từ '${testTargetChar || refChar}'!` });
                    } else {
                      setExtractStatus({ type: 'error', text: `Không thể bóc tách rời dấu từ '${testTargetChar || refChar}'` });
                    }
                    setTimeout(() => setExtractStatus(null), 3000);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-amber-800 text-amber-50 rounded-md hover:bg-amber-900 flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  title="Bóc tách và copy riêng mã SVG Path của DẤU"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  Copy SVG Dấu
                </button>

                <div className="flex p-0.5 bg-amber-100/80 rounded-lg border border-amber-300/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTestViewMode('composed')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${testViewMode === 'composed' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-amber-900 hover:text-neutral-900'}`}
                  >
                    Dấu tự ghép
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestViewMode('native')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${testViewMode === 'native' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-amber-900 hover:text-neutral-900'}`}
                  >
                    Thiết kế gốc
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestViewMode('overlay')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${testViewMode === 'overlay' ? 'bg-amber-900 text-white shadow-2xs' : 'text-amber-900 hover:text-neutral-900'}`}
                  >
                    So sánh 2 lớp
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 px-3 mb-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="text-neutral-600 font-medium text-[11px]">
                Ký tự <strong className="text-neutral-900">{testTargetChar || refChar}</strong> chưa có trong font gốc (Sẽ ghép tự động).
              </span>
            </div>
          )}

          {/* Unified Character & Case Selection Bar */}
          <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Base Character list */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Chữ cái gốc:
              </span>
              <div className="flex items-center gap-1">
                {(APPLICABLE_CHARS[activeDiaId] || ['a']).map((char) => {
                  const displayChar = isCapitalPreview ? char.toUpperCase() : char.toLowerCase();
                  const isActive = refChar === displayChar;
                  return (
                    <button
                      key={char}
                      onClick={() => setSelectedBaseChar(char)}
                      className={`w-7 h-7 text-xs font-bold rounded-lg border transition flex items-center justify-center ${
                        isActive
                          ? 'bg-neutral-900 border-neutral-900 text-white shadow-2xs'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {displayChar}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Case Segmented Control */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Kiểu chữ:
              </span>
              <div className="flex p-0.5 bg-neutral-200/60 rounded-lg border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsCapitalPreview(false)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                    !isCapitalPreview
                      ? 'bg-white text-neutral-900 shadow-3xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  thường
                </button>
                <button
                  type="button"
                  onClick={() => setIsCapitalPreview(true)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                    isCapitalPreview
                      ? 'bg-white text-neutral-900 shadow-3xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  HOA
                </button>
              </div>
            </div>
          </div>

          <div className="relative border border-neutral-100 rounded-xl bg-neutral-50 overflow-hidden flex items-center justify-center aspect-square">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full aspect-square block"
            />

            {/* Zoom Widget Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-neutral-200 p-1 rounded-lg shadow-xs">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                className="p-1 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-md"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono font-bold text-neutral-700 w-8 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(4.0, prev + 0.25))}
                className="p-1 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-md"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-neutral-400 mt-2.5 leading-relaxed">
            * Trục X mặc định căn giữa chữ cái gốc. Trục Y dịch chuyển theo kích thước Bounding Box của font gốc.
          </p>
        </div>

        {/* Right Side: Component Editors & Settings Panel (4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-5 bg-white border border-neutral-100 rounded-2xl p-5 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1">Thiết kế Nét & Tỷ lệ dấu</h4>
            <p className="text-[11px] text-neutral-500">
              Căn chỉnh hình học gốc của dấu mẫu **{activeTemplate?.name}**
            </p>
          </div>

          {activeTemplate && (
            <div className="space-y-3 border-b border-neutral-100 pb-4">
              {/* Checkbox to toggle uppercase variant */}
              <label className="flex items-start gap-2 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeTemplate.hasCapVariant || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onUpdateTemplate(activeDiaId, {
                      hasCapVariant: checked,
                      ...(checked ? {
                        capSvgPath: activeTemplate.capSvgPath || activeTemplate.svgPath || '',
                        capScaleX: activeTemplate.capScaleX ?? activeTemplate.scaleX ?? 1.0,
                        capScaleY: activeTemplate.capScaleY ?? activeTemplate.scaleY ?? 1.0,
                        capOffsetX: activeTemplate.capOffsetX ?? activeTemplate.offsetX ?? 0,
                        capOffsetY: activeTemplate.capOffsetY ?? activeTemplate.offsetY ?? 0,
                        capAutoCenterX: activeTemplate.capAutoCenterX ?? (activeTemplate.autoCenterX !== false)
                      } : {})
                    });
                  }}
                  className="rounded-sm border-indigo-300 text-indigo-800 mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-indigo-900">Thiết kế dấu chữ hoa khác biệt</span>
                  <span className="text-[9px] text-indigo-650 font-normal leading-normal">
                    Thiết lập hình dáng vector, tỉ lệ và dịch chuyển độc lập cho chữ HOA và chữ thường.
                  </span>
                </div>
              </label>

              {/* Status Banner indicating which variant is being edited */}
              {activeTemplate.hasCapVariant && (
                <div className={`p-2 px-2.5 rounded-lg text-[9px] font-bold flex items-center justify-between border ${
                  isCapitalPreview 
                    ? 'bg-amber-50 text-amber-800 border-amber-150' 
                    : 'bg-sky-50 text-sky-800 border-sky-150'
                }`}>
                  <span className="uppercase tracking-wider">
                    {isCapitalPreview ? '⚠️ Sửa: Dấu chữ hoa (Capital)' : 'ℹ️ Sửa: Dấu chữ thường (Lowercase)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCapitalPreview(!isCapitalPreview)}
                    className="px-1.5 py-0.5 bg-white border border-neutral-200 text-neutral-800 rounded-md hover:bg-neutral-50 text-[8px] font-bold shadow-2xs"
                  >
                    Chuyển sang {isCapitalPreview ? 'Chữ thường' : 'Chữ hoa'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1. SVG Paste Area */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <label className="text-[10px] font-bold text-neutral-800">Mã SVG / Vector</label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExtractFromFont}
                  className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                  title="Tìm kiếm và tự động trích xuất dấu từ ký tự tương ứng có sẵn trong font gốc"
                >
                  <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                  Gợi ý từ Font gốc
                </button>
                <span className="text-neutral-350 text-[10px] select-none">|</span>
                <button
                  onClick={handleResetTemplate}
                  className="text-[9px] text-neutral-500 hover:text-red-600 flex items-center gap-0.5 font-medium"
                  title="Khôi phục hình dạng dấu mặc định của hệ thống"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Mặc định hệ thống
                </button>
              </div>
            </div>

            {extractStatus && (
              <div className={`p-2 rounded-lg text-[9px] flex items-start gap-1.5 leading-relaxed border ${
                extractStatus.type === 'success' ? 'bg-emerald-50/80 text-emerald-800 border-emerald-100' : 'bg-amber-50/80 text-amber-800 border-amber-100'
              }`}>
                {extractStatus.type === 'success' ? <Check className="w-3 h-3 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-600" />}
                <span>{extractStatus.text}</span>
              </div>
            )}

            <textarea
              rows={3}
              value={activeSvgPath}
              onChange={(e) => handleVectorPaste(e.target.value)}
              placeholder="Dán mã SVG (<svg>...) hoặc chuỗi path d..."
              className="w-full text-[10px] font-mono p-2 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-neutral-800 focus:outline-hidden bg-neutral-50/50"
            />

            <div className="flex items-center justify-between text-[10px] pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!activeSvgPath) return;
                    navigator.clipboard.writeText(activeSvgPath);
                    setExtractStatus({ type: 'success', text: 'Đã sao chép mã SVG Path hiện tại vào Clipboard!' });
                    setTimeout(() => setExtractStatus(null), 3000);
                  }}
                  className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-md flex items-center gap-1 border border-neutral-200 transition cursor-pointer"
                  title="Sao chép chuỗi d='...' hiện tại"
                >
                  <Copy className="w-3 h-3 text-neutral-600" />
                  Copy Path d="..."
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeSvgPath) return;
                    const full = formatSvgPathToFullSvg(activeSvgPath);
                    navigator.clipboard.writeText(full);
                    setExtractStatus({ type: 'success', text: 'Đã sao chép thẻ <svg> đầy đủ vào Clipboard!' });
                    setTimeout(() => setExtractStatus(null), 3000);
                  }}
                  className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-md flex items-center gap-1 border border-neutral-200 font-mono text-[9px] transition cursor-pointer"
                  title="Sao chép thẻ <svg>...</svg> đầy đủ"
                >
                  <Code className="w-3 h-3 text-neutral-600" />
                  Copy thẻ &lt;svg&gt;
                </button>
              </div>

              {font && (
                <button
                  type="button"
                  onClick={() => setShowGlyphLibrary(true)}
                  className="text-amber-700 hover:text-amber-900 font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  Thư viện Dấu gốc
                </button>
              )}
            </div>
          </div>

          {/* 2. Scale & Tweak Sliders */}
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-800 flex items-center gap-1">
                Tỉ lệ Dấu (Scale)
                <button 
                  onClick={() => setScaleLinked(!scaleLinked)}
                  className="text-neutral-400 hover:text-neutral-800 transition"
                  title={scaleLinked ? 'Hủy liên kết X/Y' : 'Khóa tỷ lệ X/Y'}
                >
                  {scaleLinked ? <Link className="w-3 h-3 text-neutral-700" /> : <Link2Off className="w-3 h-3 text-neutral-400" />}
                </button>
              </span>
              <span className="font-mono text-[10px] font-bold">
                X: {activeScaleX.toFixed(2)} | Y: {activeScaleY.toFixed(2)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-neutral-400 font-mono block">Scale X</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10.0"
                    value={activeScaleX}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val)) return;
                      updateActiveValue({
                        scaleX: val,
                        ...(scaleLinked ? { scaleY: val } : {})
                      });
                    }}
                    className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                  />
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.05"
                  value={activeScaleX}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateActiveValue({
                      scaleX: val,
                      ...(scaleLinked ? { scaleY: val } : {})
                    });
                  }}
                  className="w-full accent-neutral-800 cursor-pointer"
                />
              </div>

              <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-neutral-400 font-mono block">Scale Y</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10.0"
                    value={activeScaleY}
                    disabled={scaleLinked}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val)) return;
                      updateActiveValue({ scaleY: val });
                    }}
                    className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white disabled:opacity-40"
                  />
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.05"
                  value={activeScaleY}
                  disabled={scaleLinked}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateActiveValue({ scaleY: val });
                  }}
                  className="w-full accent-neutral-800 disabled:opacity-40 cursor-pointer"
                />
              </div>
            </div>

            {/* Shift Tweaks */}
            <div className="space-y-3">
              <label className="flex items-start gap-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-150 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeAutoCenterX}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    updateActiveValue({ 
                      autoCenterX: isChecked,
                      ...(isChecked ? { offsetX: 0 } : {})
                    });
                  }}
                  className="rounded-sm border-neutral-300 text-neutral-800 mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-900">Tự động căn giữa ngang (Auto-center X)</span>
                  <span className="text-[9px] text-neutral-500 font-normal leading-snug">Căn dấu theo tâm ngang của ký tự gốc. Tắt đi để tự do dịch trái/phải (rất hữu ích để căn chỉnh thanh gạch chữ đ / Đ).</span>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-2 rounded-lg border transition space-y-1 ${
                  activeAutoCenterX 
                    ? 'bg-neutral-50/50 border-neutral-150/40 opacity-55 select-none' 
                    : 'bg-neutral-50 border-neutral-100/50'
                }`}>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-neutral-500 font-medium">Lệch X (Dịch ngang)</span>
                    <input
                      type="number"
                      step="5"
                      value={activeOffsetX}
                      disabled={activeAutoCenterX}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        updateActiveValue({ offsetX: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white disabled:bg-neutral-100 disabled:opacity-50"
                    />
                  </div>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    step="5"
                    value={activeOffsetX}
                    disabled={activeAutoCenterX}
                    onChange={(e) => updateActiveValue({ offsetX: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100/50 space-y-1">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-neutral-500 font-medium">Lệch Y (Dịch dọc)</span>
                    <input
                      type="number"
                      step="5"
                      value={activeOffsetY}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        updateActiveValue({ offsetY: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                    />
                  </div>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    step="5"
                    value={activeOffsetY}
                    onChange={(e) => updateActiveValue({ offsetY: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Global Positioning Rules Block */}
          <div className="border-t border-neutral-100 pt-4 space-y-3.5">
            <h5 className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-neutral-700" />
              Quy tắc Định Vị Toàn Cục (Rules)
            </h5>

            {/* Gap settings */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-neutral-600">
                  <span>Khoảng cách dấu trên Chữ thường:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="1000"
                      value={rules.lowercaseAccentGap}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        onUpdateRules({ lowercaseAccentGap: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                    />
                    <span className="font-bold text-neutral-800 font-mono">UPM</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="5"
                  value={rules.lowercaseAccentGap}
                  onChange={(e) => onUpdateRules({ lowercaseAccentGap: parseInt(e.target.value) })}
                  className="w-full accent-neutral-800 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-neutral-600">
                  <span>Khoảng cách dấu trên Chữ hoa:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="1000"
                      value={rules.uppercaseAccentGap}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        onUpdateRules({ uppercaseAccentGap: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                    />
                    <span className="font-bold text-neutral-800 font-mono">UPM</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="5"
                  value={rules.uppercaseAccentGap}
                  onChange={(e) => onUpdateRules({ uppercaseAccentGap: parseInt(e.target.value) })}
                  className="w-full accent-neutral-800 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-neutral-600">
                  <span>Khoảng cách Dấu nặng (Dưới):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="1000"
                      value={rules.dotBelowGap}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        onUpdateRules({ dotBelowGap: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                    />
                    <span className="font-bold text-neutral-800 font-mono">UPM</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="5"
                  value={rules.dotBelowGap}
                  onChange={(e) => onUpdateRules({ dotBelowGap: parseInt(e.target.value) })}
                  className="w-full accent-neutral-800 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Split Module for Double Accent Configuration */}
      <div className="mt-6 bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Title, Style Selector & Fine-Tuning Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Header Title & Description */}
            <div className="space-y-1.5 pb-3 border-b border-neutral-100">
              <div className="flex items-start sm:items-center gap-3">
                <span className="p-2 bg-neutral-900 text-white rounded-xl inline-flex items-center justify-center shrink-0 shadow-2xs">
                  <Layers className="w-4.5 h-4.5 text-amber-400" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-950 tracking-tight">
                    Cấu Hình Kiểu Ghép Dấu Kép
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    Tùy chỉnh quy tắc vị trí ghép 2 dấu đối với các nguyên âm có dấu mũ hoặc dấu trăng (ấ, ế, ố, ắ, ẩ...).
                  </p>
                </div>
              </div>
            </div>

            {/* 3-Way Style Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Chọn kiểu ghép mặc định:</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100/90 rounded-xl border border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => onUpdateRules({ doubleAccentStyle: 'stacked' })}
                  className={`py-2 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
                    rules.doubleAccentStyle === 'stacked'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                  }`}
                >
                  Xếp chồng
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateRules({ doubleAccentStyle: 'side' })}
                  className={`py-2 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
                    rules.doubleAccentStyle === 'side'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                  }`}
                >
                  Chéo sườn
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateRules({ doubleAccentStyle: 'custom' })}
                  className={`py-2 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
                    rules.doubleAccentStyle === 'custom'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                  }`}
                >
                  Tùy chỉnh
                </button>
              </div>
            </div>

            {/* Sliders or Mode Summary */}
            {rules.doubleAccentStyle === 'custom' ? (
              <div className="bg-neutral-50/90 p-3.5 rounded-xl border border-neutral-200/70 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                  <span className="font-extrabold text-neutral-900 uppercase text-[11px] tracking-wider">Thông số Tùy Chỉnh (Custom)</span>
                  <button
                    type="button"
                    onClick={() => onUpdateRules({ doubleAccentGap: 30, doubleAccentCustomX: 0, doubleAccentCustomY: 0 })}
                    className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                  >
                    Mặc định
                  </button>
                </div>

                {/* Gap Y */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-semibold">Khoảng cách (Gap):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="5"
                        min="-100"
                        max="300"
                        value={rules.doubleAccentGap}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val)) return;
                          onUpdateRules({ doubleAccentGap: val });
                        }}
                        className="w-16 text-right text-xs font-mono px-1.5 py-0.5 border border-neutral-200 rounded-md bg-white font-bold"
                      />
                      <span className="font-bold text-neutral-800 font-mono text-[10px]">UPM</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="300"
                    step="5"
                    value={rules.doubleAccentGap}
                    onChange={(e) => onUpdateRules({ doubleAccentGap: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>

                {/* Custom Offset X */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-semibold">Dịch ngang X (Dấu trên):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="5"
                        min="-250"
                        max="250"
                        value={rules.doubleAccentCustomX ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val)) return;
                          onUpdateRules({ doubleAccentCustomX: val });
                        }}
                        className="w-16 text-right text-xs font-mono px-1.5 py-0.5 border border-neutral-200 rounded-md bg-white font-bold"
                      />
                      <span className="font-bold text-neutral-800 font-mono text-[10px]">UPM</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="5"
                    value={rules.doubleAccentCustomX ?? 0}
                    onChange={(e) => onUpdateRules({ doubleAccentCustomX: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>

                {/* Custom Offset Y */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-semibold">Dịch dọc Y (Bổ sung):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="5"
                        min="-200"
                        max="200"
                        value={rules.doubleAccentCustomY ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val)) return;
                          onUpdateRules({ doubleAccentCustomY: val });
                        }}
                        className="w-16 text-right text-xs font-mono px-1.5 py-0.5 border border-neutral-200 rounded-md bg-white font-bold"
                      />
                      <span className="font-bold text-neutral-800 font-mono text-[10px]">UPM</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="5"
                    value={rules.doubleAccentCustomY ?? 0}
                    onChange={(e) => onUpdateRules({ doubleAccentCustomY: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/70 text-xs text-neutral-600 space-y-2.5">
                <p className="leading-relaxed">
                  Đang áp dụng kiểu <strong>{rules.doubleAccentStyle === 'stacked' ? 'Xếp chồng thẳng đứng' : 'Nằm chéo sườn phải'}</strong> tiêu chuẩn.
                </p>
                <button
                  type="button"
                  onClick={() => onUpdateRules({ doubleAccentStyle: 'custom' })}
                  className="w-full py-2 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-bold rounded-lg text-center transition cursor-pointer text-xs shadow-2xs"
                >
                  Mở Tùy chỉnh để tinh chỉnh thủ công
                </button>
              </div>
            )}

            {/* Typographic Note */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>* Lưu ý:</strong> Bộ dấu móc (ơ Ơ, ư Ư) sẽ lấy dấu chuẩn theo cách bỏ dấu đơn 
            </div>
          </div>

          {/* Right Column: Realtime Liveview Inspector Panel */}
          <div className="lg:col-span-7 bg-neutral-50/50 p-3.5 rounded-xl border border-neutral-200/80">
            <DoubleAccentLiveviewInspector
              font={font}
              fontMetadata={fontMetadata}
              templates={templates}
              rules={rules}
            />
          </div>

        </div>
      </div>

      {/* Modal library for inspecting and copying SVG from font */}
      <FontDiacriticsLibraryModal
        isOpen={showGlyphLibrary}
        onClose={() => setShowGlyphLibrary(false)}
        font={font}
        templates={templates}
        onApplySvgToTemplate={(diaId, svgPath) => {
          onUpdateTemplate(diaId, { svgPath });
          setShowGlyphLibrary(false);
          setExtractStatus({ type: 'success', text: `Đã áp dụng mã SVG bóc tách cho mẫu dấu!` });
          setTimeout(() => setExtractStatus(null), 3000);
        }}
      />
    </div>
  );
};
