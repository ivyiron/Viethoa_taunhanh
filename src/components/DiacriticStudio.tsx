import React, { useEffect, useRef, useState } from 'react';
import * as opentype from 'opentype.js';
import { Sliders, Sparkles, Copy, Trash2, ArrowLeftRight, Link, Link2Off, ZoomIn, ZoomOut, RotateCcw, AlertCircle, HelpCircle, Check } from 'lucide-react';
import { DiacriticTemplate, AutoPositionRules, FontMetadata } from '../types';
import { getExactBoundingBox, parseSvgPath, extractPathDataFromSvg, transformCommands, calculateAutoPosition, DEFAULT_DIACRITICS, findCandidateGlyph, extractSvgFromGlyph } from '../utils';

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
  const [extractStatus, setExtractStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const useCapVariant = activeTemplate?.hasCapVariant && isCapitalPreview;
  const activeSvgPath = useCapVariant && activeTemplate.capSvgPath !== undefined ? activeTemplate.capSvgPath : (activeTemplate?.svgPath || '');
  const activeScaleX = useCapVariant && activeTemplate.capScaleX !== undefined ? activeTemplate.capScaleX : (activeTemplate?.scaleX ?? 1.0);
  const activeScaleY = useCapVariant && activeTemplate.capScaleY !== undefined ? activeTemplate.capScaleY : (activeTemplate?.scaleY ?? 1.0);
  const activeOffsetX = useCapVariant && activeTemplate.capOffsetX !== undefined ? activeTemplate.capOffsetX : (activeTemplate?.offsetX ?? 0);
  const activeOffsetY = useCapVariant && activeTemplate.capOffsetY !== undefined ? activeTemplate.capOffsetY : (activeTemplate?.offsetY ?? 0);
  const activeAutoCenterX = useCapVariant && activeTemplate.capAutoCenterX !== undefined ? activeTemplate.capAutoCenterX : (activeTemplate?.autoCenterX !== false);

  // Helper to resolve viewport coords
  const getScaleFactorAndStartX = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { scaleFactor: 1, fontStartX: 0, baselineY: 0, width: 440, height: 440 };
    }
    const height = canvas.height;
    const width = canvas.width;
    const padding = 70;
    const drawHeight = height - padding * 2;
    const baseScaleFactor = drawHeight / (fontMetadata.ascender - fontMetadata.descender);
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

  // Redraw the component live view canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { scaleFactor, fontStartX, baselineY, width, height, advanceWidth } = getScaleFactorAndStartX();
    const upm = fontMetadata.unitsPerEm;

    // Subtle grid dots
    ctx.fillStyle = '#f5f5f5';
    for (let x = 0; x < width; x += 20) {
      for (let y = 0; y < height; y += 20) {
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }

    // Reference horizontal guidelines
    const drawGuideLine = (yVal: number, label: string, color: string, isDashed = true) => {
      const yCanvas = baselineY - yVal * scaleFactor;
      ctx.beginPath();
      if (isDashed) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(10, yCanvas);
      ctx.lineTo(width - 10, yCanvas);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.fillText(`${label} (${Math.round(yVal)})`, 15, yCanvas - 4);
    };

    drawGuideLine(fontMetadata.ascender, 'Ascender', '#fca5a5', true);
    drawGuideLine(fontMetadata.capHeight, 'Cap Height', '#fed7aa', true);
    drawGuideLine(fontMetadata.xHeight, 'x-Height', '#e9d5ff', true);
    drawGuideLine(0, 'Baseline', '#93c5fd', false);
    drawGuideLine(fontMetadata.descender, 'Descender', '#fca5a5', true);

    // Vertical guides
    const drawVerticalGuide = (xVal: number, label: string, color: string) => {
      const xCanvas = fontStartX + xVal * scaleFactor;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(xCanvas, 20);
      ctx.lineTo(xCanvas, height - 20);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.fillText(label, xCanvas + 4, height - 12);
    };

    drawVerticalGuide(0, 'LSB', '#93c5fd');
    drawVerticalGuide(advanceWidth, 'RSB', '#93c5fd');

    const baseGlyph = font.charToGlyph(refChar);
    const baseBBox = baseGlyph ? baseGlyph.getBoundingBox() : { x1: 50, y1: 0, x2: 450, y2: fontMetadata.xHeight };

    // Draw reference letter outline
    if (showReference && baseGlyph) {
      ctx.setLineDash([]);
      const fontPath = baseGlyph.getPath(fontStartX, baselineY, scaleFactor * upm);
      fontPath.fill = `rgba(148, 163, 184, ${bgOpacity / 100})`;
      fontPath.stroke = `rgba(100, 116, 139, ${Math.min(0.9, (bgOpacity + 15) / 100)})`;
      fontPath.lineWidth = 1;
      fontPath.draw(ctx);

      // Faint reference center line
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
        // Apply template scale first (Do NOT apply offsets here as they will be added after auto-positioning)
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
        ctx.strokeStyle = '#0f172a';
        ctx.fillStyle = '#1e293b';
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
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(diaCenterCanvas, 20);
        ctx.lineTo(diaCenterCanvas, height - 20);
        ctx.stroke();
      }
    }
  }, [font, fontMetadata, templates, rules, activeDiaId, zoom, showReference, bgOpacity, isCapitalPreview]);

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
      <div className="bg-neutral-900 text-neutral-100 p-5 rounded-2xl border border-neutral-850 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Trình thiết kế Dấu & Mũ phụ (Tab 1: Component Studio)
          </h4>
          <p className="text-xs text-neutral-400 max-w-xl">
            Hệ thống sẽ đề xuất các mẫu dấu câu dựa trên các ký tự có sẵ n của font chữ. Cơ mà nếu nó xấu quá, hãy tự design lại dấu trong illustrator rồi copy paste vào ô mã SVG.
          </p>
        </div>
        <div className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-700/50 rounded-lg py-1.5 px-3">
          Tối ưu hóa thời gian: <strong>giảm 95% thao tác thủ công!</strong>
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
              Màn Vẽ Chạy Thử dấu mẫu
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
            * Trục X luôn được tự động **căn thẳng tắp theo tâm ngang** của chữ cái gốc. Trục Y tự động nhảy lên đỉnh (hoặc chân đối với dấu nặng) dựa theo kích thước Bounding Box của font gốc.
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
                  <span className="text-[9px] text-neutral-500 font-normal leading-snug">Khóa dấu thẳng tắp theo tâm ngang của ký tự gốc. Tắt đi để tự do dịch trái/phải (rất hữu ích để căn chỉnh thanh gạch chữ đ / Đ).</span>
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

              {/* Stack style for compound double accents */}
              <div className="space-y-1.5 pt-1.5 border-t border-neutral-50">
                <div className="flex justify-between items-center text-[10px] text-neutral-600">
                  <span className="font-medium">Kiểu ghép dấu kép (ví dụ: ấ, ế, ố):</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateRules({ doubleAccentStyle: 'stacked' })}
                    className={`py-1.5 px-2 text-[10px] font-semibold border rounded-lg transition ${
                      rules.doubleAccentStyle === 'stacked'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Xếp chồng thẳng đứng
                  </button>
                  <button
                    onClick={() => onUpdateRules({ doubleAccentStyle: 'side' })}
                    className={`py-1.5 px-2 text-[10px] font-semibold border rounded-lg transition ${
                      rules.doubleAccentStyle === 'side'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Nằm chéo sườn phải
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
