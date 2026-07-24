import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as opentype from 'opentype.js';
import { Sliders, Sparkles, Filter, CheckCircle, ChevronRight, HelpCircle, Info, Move, Settings, Check } from 'lucide-react';
import { DiacriticTemplate, AutoPositionRules, GlyphOverrideState, FontMetadata } from '../types';
import { STEP2_RECIPES, isUnaccentedBaseChar, composeGlyphPath, ComponentRecipe, getTrackingFamilyMembers } from '../utils';

const getDiaName = (id: string): string => {
  const names: Record<string, string> = {
    acute: 'Dấu sắc (Acute)',
    grave: 'Dấu huyền (Grave)',
    hook: 'Dấu hỏi (Hook)',
    tilde: 'Dấu ngã (Tilde)',
    dot_below: 'Dấu nặng (Dot below)',
    circumflex: 'Mũ â, ê, ô (Circumflex)',
    breve: 'Mũ ă (Breve)',
    horn_o: 'Sừng chữ ơ (Horn O)',
    horn_u: 'Sừng chữ ư (Horn U)',
    bar: 'Nét gạch đ (Bar)'
  };
  return names[id] || id;
};

interface AutoCompositeBoardProps {
  font: opentype.Font;
  fontMetadata: FontMetadata;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
  overrides: Record<string, GlyphOverrideState>;
  onUpdateOverride: (char: string, updated: Partial<GlyphOverrideState>) => void;
  onBatchUpdateOverrides?: (updater: (prev: Record<string, GlyphOverrideState>) => Record<string, GlyphOverrideState>) => void;
  preserveExistingGlyphs?: boolean;
}

// Micro canvas to render a single composite glyph
const GlyphGridCell: React.FC<{
  char: string;
  recipe: ComponentRecipe;
  font: opentype.Font;
  fontMetadata: FontMetadata;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
  override?: GlyphOverrideState;
  isActive: boolean;
  onClick: () => void;
  preserveExistingGlyphs?: boolean;
}> = ({ char, recipe, font, fontMetadata, templates, rules, override, isActive, onClick, preserveExistingGlyphs = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI Device Pixel Ratio Scaling for micro cell canvas
    const cssWidth = canvas.clientWidth || 64;
    const cssHeight = canvas.clientHeight || 48;
    const dpr = Math.max(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    try {
      // Compose composite path
      const { path, advanceWidth } = composeGlyphPath(font, recipe, templates, rules, override, preserveExistingGlyphs);
      
      const width = cssWidth;
      const height = cssHeight;
      const padding = 12;
      const drawHeight = height - padding * 2;
      
      const scaleFactor = drawHeight / Math.max(1, (fontMetadata.ascender - fontMetadata.descender));
      const centerX = width / 2;
      const fontStartX = centerX - (advanceWidth / 2) * scaleFactor;
      const baselineY = padding + fontMetadata.ascender * scaleFactor;

      // Draw faint baseline line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();

      // Render the composite path
      ctx.beginPath();
      ctx.fillStyle = isActive ? '#0f172a' : '#334155';
      ctx.strokeStyle = isActive ? '#000000' : '#1e293b';
      ctx.lineWidth = 1.2;

      path.commands.forEach((cmd) => {
        if (cmd.type === 'M') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          ctx.moveTo(cx, cy);
        } else if (cmd.type === 'L') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          ctx.lineTo(cx, cy);
        } else if (cmd.type === 'Q') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          const cx1 = fontStartX + (cmd as any).x1 * scaleFactor;
          const cy1 = baselineY - (cmd as any).y1 * scaleFactor;
          ctx.quadraticCurveTo(cx1, cy1, cx, cy);
        } else if (cmd.type === 'C') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          const cx1 = fontStartX + (cmd as any).x1 * scaleFactor;
          const cy1 = baselineY - (cmd as any).y1 * scaleFactor;
          const cx2 = fontStartX + (cmd as any).x2 * scaleFactor;
          const cy2 = baselineY - (cmd as any).y2 * scaleFactor;
          ctx.bezierCurveTo(cx1, cy1, cx2, cy2, cx, cy);
        } else if (cmd.type === 'Z') {
          ctx.closePath();
        }
      });

      ctx.fill();
    } catch (err) {
      console.error('Failed to draw grid cell glyph:', char, err);
    } finally {
      ctx.restore();
    }
  }, [font, fontMetadata, templates, rules, override, isActive]);

  const isNative = useMemo(() => {
    if (!font) return false;
    const idx = font.charToGlyphIndex(char);
    if (idx <= 0) return false;
    const g = font.glyphs.get(idx);
    return !!(g && g.path && g.path.commands && g.path.commands.length > 0);
  }, [font, char]);

  const isCompleted = override?.isCompleted || false;
  const hasOverride = override && (
    override.offsetX !== 0 ||
    override.offsetY !== 0 ||
    override.scaleX !== 1.0 ||
    override.scaleY !== 1.0 ||
    override.advanceWidthTweak !== 0 ||
    (override.comp1OffsetX !== undefined && override.comp1OffsetX !== 0) ||
    (override.comp1OffsetY !== undefined && override.comp1OffsetY !== 0) ||
    (override.comp2OffsetX !== undefined && override.comp2OffsetX !== 0) ||
    (override.comp2OffsetY !== undefined && override.comp2OffsetY !== 0)
  );

  return (
    <button
      onClick={onClick}
      className={`relative p-3.5 rounded-xl border flex flex-col items-center justify-between transition group h-28 ${
        isActive
          ? 'border-neutral-950 bg-neutral-50/50 ring-2 ring-neutral-950/20 shadow-xs'
          : isCompleted
            ? 'border-green-200 bg-green-50/20 hover:border-green-300'
            : isNative
              ? 'border-amber-200/80 bg-amber-50/20 hover:border-amber-300'
              : 'border-neutral-200 bg-white hover:bg-neutral-50/80 hover:border-neutral-300'
      }`}
    >
      {/* Top markers */}
      <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center w-auto">
        <div className="flex items-center gap-1">
          <span className="font-sans font-bold text-xs text-neutral-800">{char}</span>
          {isNative && (
            <span className="text-[8px] font-extrabold px-1 py-0.2 bg-amber-100 text-amber-900 rounded" title="Ký tự đã có sẵn trong font gốc (được bảo toàn không ghi đè)">
              Gốc
            </span>
          )}
        </div>
        <div className="flex gap-0.5">
          {hasOverride && (
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" title="Có cài đặt tinh chỉnh riêng" />
          )}
          {isCompleted && (
            <Check className="w-3.5 h-3.5 text-green-600 font-bold" />
          )}
        </div>
      </div>

      {/* Render Canvas */}
      <div className="w-full flex-1 flex items-center justify-center mt-3 mb-1">
        <canvas ref={canvasRef} width={80} height={60} className="w-16 h-12 block" />
      </div>

      {/* Base Char tag */}
      <span className="text-[9px] text-neutral-400 font-mono">
        gốc: {recipe.baseChar}
      </span>
    </button>
  );
};

export const AutoCompositeBoard: React.FC<AutoCompositeBoardProps> = ({
  font,
  fontMetadata,
  templates,
  rules,
  overrides,
  onUpdateOverride,
  onBatchUpdateOverrides,
  preserveExistingGlyphs = true
}) => {
  const [selectedChar, setSelectedChar] = useState<string>('á');
  const [activeFilter, setActiveFilter] = useState<'all' | 'base_chars' | 'lowercase' | 'uppercase' | 'a_group' | 'e_group' | 'o_group' | 'u_group' | 'other_group' | 'edited'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeRecipe = useMemo(() => {
    return STEP2_RECIPES.find((r) => r.char === selectedChar) || STEP2_RECIPES[0];
  }, [selectedChar]);

  const activeOverride = overrides[selectedChar] || {
    char: selectedChar,
    offsetX: 0,
    offsetY: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    advanceWidthTweak: 0,
    isCompleted: false
  };

  const isGlyphCustomized = (ovr?: GlyphOverrideState): boolean => {
    if (!ovr) return false;
    return (
      ovr.offsetX !== 0 ||
      ovr.offsetY !== 0 ||
      ovr.scaleX !== 1.0 ||
      ovr.scaleY !== 1.0 ||
      ovr.advanceWidthTweak !== 0 ||
      (ovr.comp1OffsetX !== undefined && ovr.comp1OffsetX !== 0) ||
      (ovr.comp1OffsetY !== undefined && ovr.comp1OffsetY !== 0) ||
      (ovr.comp2OffsetX !== undefined && ovr.comp2OffsetX !== 0) ||
      (ovr.comp2OffsetY !== undefined && ovr.comp2OffsetY !== 0)
    );
  };

  const handleApproveAllCustomized = () => {
    if (onBatchUpdateOverrides) {
      onBatchUpdateOverrides((prev) => {
        const next = { ...prev };
        STEP2_RECIPES.forEach((recipe) => {
          const ovr = next[recipe.char];
          if (isGlyphCustomized(ovr)) {
            next[recipe.char] = {
              ...ovr,
              isCompleted: true
            };
          }
        });
        return next;
      });
    } else {
      STEP2_RECIPES.forEach((recipe) => {
        const ovr = overrides[recipe.char];
        if (isGlyphCustomized(ovr)) {
          onUpdateOverride(recipe.char, { isCompleted: true });
        }
      });
    }
  };

  const handleApproveAll = () => {
    if (onBatchUpdateOverrides) {
      onBatchUpdateOverrides((prev) => {
        const next = { ...prev };
        STEP2_RECIPES.forEach((recipe) => {
          const ovr = next[recipe.char] || {
            char: recipe.char,
            offsetX: 0,
            offsetY: 0,
            scaleX: 1.0,
            scaleY: 1.0,
            advanceWidthTweak: 0,
            isCompleted: false
          };
          next[recipe.char] = { ...ovr, isCompleted: true };
        });
        return next;
      });
    }
  };

  // Filter recipes based on tab and query
  const filteredRecipes = useMemo(() => {
    return STEP2_RECIPES.filter((recipe) => {
      // 1. Filter by Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (recipe.char.toLowerCase() !== q && recipe.baseChar.toLowerCase() !== q) {
          return false;
        }
      }

      // 2. Filter by tab selector
      if (activeFilter === 'base_chars') {
        return isUnaccentedBaseChar(recipe.char);
      }
      if (activeFilter === 'lowercase') {
        return recipe.char === recipe.char.toLowerCase();
      }
      if (activeFilter === 'uppercase') {
        return recipe.char === recipe.char.toUpperCase() && recipe.char !== recipe.char.toLowerCase();
      }
      if (activeFilter === 'a_group') {
        return ['a', 'A', 'ă', 'Ă', 'â', 'Â'].includes(recipe.baseChar);
      }
      if (activeFilter === 'e_group') {
        return ['e', 'E', 'ê', 'Ê'].includes(recipe.baseChar);
      }
      if (activeFilter === 'o_group') {
        return ['o', 'O', 'ô', 'Ô', 'ơ', 'Ơ'].includes(recipe.baseChar);
      }
      if (activeFilter === 'u_group') {
        return ['u', 'U', 'ư', 'Ư'].includes(recipe.baseChar);
      }
      if (activeFilter === 'other_group') {
        return ['i', 'I', 'y', 'Y', 'd', 'D'].includes(recipe.baseChar) || ['i', 'I', 'y', 'Y', 'd', 'D', 'đ', 'Đ'].includes(recipe.char);
      }
      if (activeFilter === 'edited') {
        const ovr = overrides[recipe.char];
        return isGlyphCustomized(ovr) || !!ovr?.isCompleted;
      }
      return true; // 'all'
    });
  }, [activeFilter, searchQuery, overrides]);

  const stats = useMemo(() => {
    const total = STEP2_RECIPES.length;
    let completed = 0;
    let customized = 0;

    STEP2_RECIPES.forEach((r) => {
      const ovr = overrides[r.char];
      if (ovr?.isCompleted) completed++;
      if (isGlyphCustomized(ovr)) customized++;
    });

    return { total, completed, customized };
  }, [overrides]);

  // Big Inspector preview drawing logic
  const inspectorCanvasRef = useRef<HTMLCanvasElement>(null);

  // Resize listener for inspector canvas
  const [inspectorResizeCounter, setInspectorResizeCounter] = useState(0);
  useEffect(() => {
    const handleResize = () => setInspectorResizeCounter(c => c + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = inspectorCanvasRef.current;
    if (!canvas || !activeRecipe) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI Scaling
    const cssWidth = canvas.clientWidth || 500;
    const cssHeight = canvas.clientHeight || 375;
    const dpr = Math.max(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    try {
      const { path, advanceWidth } = composeGlyphPath(font, activeRecipe, templates, rules, activeOverride, preserveExistingGlyphs);
      
      const width = cssWidth;
      const height = cssHeight;
      const padding = 35;
      const drawHeight = height - padding * 2;
      const scaleFactor = drawHeight / Math.max(1, (fontMetadata.ascender - fontMetadata.descender));
      const centerX = width / 2;
      const fontStartX = centerX - (advanceWidth / 2) * scaleFactor;
      const baselineY = padding + fontMetadata.ascender * scaleFactor;

      // Draw background mesh/dots
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#cbd5e1';
      for (let x = 15; x < width; x += 25) {
        for (let y = 15; y < height; y += 25) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Horizontal guidelines helper
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

        ctx.font = 'bold 10px sans-serif';
        const labelText = `${label} (${Math.round(yVal)})`;
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
      drawGuideLine(fontMetadata.xHeight, 'x-Height', '#a855f7', true);
      drawGuideLine(0, 'Baseline', '#2563eb', false, true);
      drawGuideLine(fontMetadata.descender, 'Descender', '#ef4444', true);

      // Side bearings (LSB / RSB)
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

      // Render Glyph Path
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.5;

      path.commands.forEach((cmd) => {
        if (cmd.type === 'M') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          ctx.moveTo(cx, cy);
        } else if (cmd.type === 'L') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          ctx.lineTo(cx, cy);
        } else if (cmd.type === 'Q') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          const cx1 = fontStartX + (cmd as any).x1 * scaleFactor;
          const cy1 = baselineY - (cmd as any).y1 * scaleFactor;
          ctx.quadraticCurveTo(cx1, cy1, cx, cy);
        } else if (cmd.type === 'C') {
          const cx = fontStartX + (cmd as any).x * scaleFactor;
          const cy = baselineY - (cmd as any).y * scaleFactor;
          const cx1 = fontStartX + (cmd as any).x1 * scaleFactor;
          const cy1 = baselineY - (cmd as any).y1 * scaleFactor;
          const cx2 = fontStartX + (cmd as any).x2 * scaleFactor;
          const cy2 = baselineY - (cmd as any).y2 * scaleFactor;
          ctx.bezierCurveTo(cx1, cy1, cx2, cy2, cx, cy);
        } else if (cmd.type === 'Z') {
          ctx.closePath();
        }
      });

      ctx.fill();
      ctx.stroke();

    } catch (err) {
      console.error('Inspector render failed', err);
    } finally {
      ctx.restore();
    }
  }, [font, fontMetadata, templates, rules, activeRecipe, activeOverride, inspectorResizeCounter]);

  return (
    <div id="auto-composite-board-panel" className="space-y-6">
      
      {/* Search & Tabs Filter Hub bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs">
        
        {/* Filters Carousel */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: `Tất cả (${STEP2_RECIPES.length})` },
            { id: 'base_chars', label: 'Ký tự gốc (14)' },
            { id: 'lowercase', label: 'Chữ thường' },
            { id: 'uppercase', label: 'Chữ hoa' },
            { id: 'a_group', label: 'Nhóm chữ A/Ă/Â' },
            { id: 'e_group', label: 'Nhóm chữ E/Ê' },
            { id: 'o_group', label: 'Nhóm chữ O/Ô/Ơ' },
            { id: 'u_group', label: 'Nhóm chữ U/Ư' },
            { id: 'other_group', label: 'Các ký tự khác' },
            { id: 'edited', label: 'Có tinh chỉnh' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                activeFilter === tab.id
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search Field */}
        <div className="relative w-full md:w-64">
          <input
            id="search-glyph-input"
            type="text"
            placeholder="Tìm nhanh chữ (á, o, u...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs py-2 pl-3 pr-8 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400 hover:text-neutral-900"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Area: Grid of 134 glyphs (8 columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap justify-between items-center px-1 gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
              Kết Quả Tự Động Hóa ({filteredRecipes.length} chữ hiển thị)
            </span>
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-mono text-neutral-500 flex gap-3">
                <span>Hoàn thành: <strong className="text-emerald-700 font-bold">{stats.completed}/{stats.total}</strong></span>
                <span>Đã tinh chỉnh: <strong className="text-indigo-700 font-bold">{stats.customized}</strong></span>
              </div>
              <button
                onClick={handleApproveAllCustomized}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Duyệt tất cả các ký tự đã được tinh chỉnh"
              >
                <CheckCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
                <span>Duyệt tất cả đã tinh chỉnh ({stats.customized})</span>
              </button>
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="bg-white border border-neutral-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <Info className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-neutral-700">Không tìm thấy ký tự phù hợp</p>
              <p className="text-xs text-neutral-400 mt-1">Hãy thử đổi bộ lọc hoặc gõ từ khóa tìm kiếm khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
              {filteredRecipes.map((recipe) => (
                <GlyphGridCell
                  key={recipe.char}
                  char={recipe.char}
                  recipe={recipe}
                  font={font}
                  fontMetadata={fontMetadata}
                  templates={templates}
                  rules={rules}
                  override={overrides[recipe.char]}
                  isActive={selectedChar === recipe.char}
                  onClick={() => setSelectedChar(recipe.char)}
                  preserveExistingGlyphs={preserveExistingGlyphs}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Area: Sidebar Inspector Overrides Panel (4 columns) */}
        <div className="lg:col-span-4 bg-white border border-neutral-100 rounded-2xl p-5 shadow-xs space-y-5 sticky top-6">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-neutral-900 flex items-center gap-1">
                <Settings className="w-4 h-4 text-indigo-600" />
                Bộ Tinh Chỉnh Riêng
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Đang chọn chữ <strong className="text-neutral-900 font-bold">"{selectedChar}"</strong>
              </p>
            </div>

            {/* Single glyph quick toggle */}
            <button
              onClick={() => onUpdateOverride(selectedChar, { isCompleted: !activeOverride.isCompleted })}
              className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold transition ${
                activeOverride.isCompleted
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'
              }`}
              title="Duyệt hoặc bỏ duyệt riêng cho ký tự đang chọn"
            >
              <CheckCircle className={`w-3.5 h-3.5 ${activeOverride.isCompleted ? 'fill-green-600 text-white' : ''}`} />
              <span>{activeOverride.isCompleted ? 'Đã duyệt' : 'Duyệt'}</span>
            </button>
          </div>

          {/* Large Inspector Canvas */}
          <div className="border border-neutral-100 rounded-xl bg-neutral-50 overflow-hidden flex flex-col items-center justify-center">
            <canvas ref={inspectorCanvasRef} width={400} height={300} className="w-full aspect-[4/3] block" />
            <div className="w-full bg-neutral-100/60 p-2 border-t border-neutral-200/50 flex justify-between text-[9px] font-mono text-neutral-500">
              <span>
                Công thức ghép:{' '}
                {activeRecipe?.components && activeRecipe.components.length > 0
                  ? activeRecipe.components.map(getDiaName).join(' + ')
                  : 'Ký tự gốc (không có dấu)'}
              </span>
              <span>Base: {activeRecipe?.baseChar}</span>
            </div>
          </div>

          {/* Fine Tuning Sliders */}
          <div className="space-y-4">
            
            {/* Tracking (advance width tweak) */}
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/40 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-indigo-950 flex items-center gap-1">
                  Độ rộng chữ (Tracking / LSB)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="5"
                    min="-1000"
                    max="1000"
                    value={activeOverride.advanceWidthTweak}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val)) return;
                      onUpdateOverride(selectedChar, { advanceWidthTweak: val });
                    }}
                    className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-indigo-200 rounded-sm bg-white text-indigo-950"
                  />
                  <span className="text-[9px] font-mono text-indigo-500 font-bold">UPM</span>
                </div>
              </div>
              <input
                id="slider-advance-width-tweak"
                type="range"
                min="-1000"
                max="1000"
                step="5"
                value={activeOverride.advanceWidthTweak}
                onChange={(e) => onUpdateOverride(selectedChar, { advanceWidthTweak: parseInt(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[9px] text-indigo-600/90 leading-snug">
                * Thay đổi tracking sẽ <strong>tự động đồng bộ</strong> cho cả bộ chữ liên quan:{' '}
                <span className="font-bold underline">{getTrackingFamilyMembers(selectedChar, false).join(', ') || 'Không có'}</span>.
              </p>
            </div>

            {/* Local Offset X / Y for specific accent position */}
            <div className="space-y-3.5 border-t border-neutral-100 pt-3.5">
              <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block">
                Dịch chuyển toàn bộ dấu (Global Offset)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-neutral-500">Lệch X</span>
                    <input
                      type="number"
                      step="5"
                      min="-2000"
                      max="2000"
                      value={activeOverride.offsetX}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        onUpdateOverride(selectedChar, { offsetX: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                    />
                  </div>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    step="5"
                    value={activeOverride.offsetX}
                    onChange={(e) => onUpdateOverride(selectedChar, { offsetX: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-neutral-500">Lệch Y</span>
                    <input
                      type="number"
                      step="5"
                      min="-2000"
                      max="2000"
                      value={activeOverride.offsetY}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        onUpdateOverride(selectedChar, { offsetY: val });
                      }}
                      className="w-16 text-right text-[10px] font-mono px-1 py-0.5 border border-neutral-200 rounded-sm bg-white"
                    />
                  </div>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    step="5"
                    value={activeOverride.offsetY}
                    onChange={(e) => onUpdateOverride(selectedChar, { offsetY: parseInt(e.target.value) })}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Component-Specific Local Offsets for composite accents */}
            {activeRecipe && activeRecipe.components.length > 1 && (
              <div className="space-y-3 pt-3.5 border-t border-neutral-100">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                  Dịch chuyển riêng từng dấu ghép (Individual Offsets)
                </span>

                {/* First Component */}
                <div className="p-3 bg-indigo-50/25 border border-indigo-100 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-indigo-950 block">
                    1. {getDiaName(activeRecipe.components[0])}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-medium text-neutral-500">
                        <span>Lệch X</span>
                        <input
                          type="number"
                          step="5"
                          min="-1000"
                          max="1000"
                          value={activeOverride.comp1OffsetX ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val)) return;
                            onUpdateOverride(selectedChar, { comp1OffsetX: val });
                          }}
                          className="w-12 text-right text-[9px] font-mono border border-neutral-200 rounded-sm bg-white"
                        />
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        step="5"
                        value={activeOverride.comp1OffsetX ?? 0}
                        onChange={(e) => onUpdateOverride(selectedChar, { comp1OffsetX: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-medium text-neutral-500">
                        <span>Lệch Y</span>
                        <input
                          type="number"
                          step="5"
                          min="-1000"
                          max="1000"
                          value={activeOverride.comp1OffsetY ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val)) return;
                            onUpdateOverride(selectedChar, { comp1OffsetY: val });
                          }}
                          className="w-12 text-right text-[9px] font-mono border border-neutral-200 rounded-sm bg-white"
                        />
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        step="5"
                        value={activeOverride.comp1OffsetY ?? 0}
                        onChange={(e) => onUpdateOverride(selectedChar, { comp1OffsetY: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Second Component */}
                <div className="p-3 bg-indigo-50/25 border border-indigo-100 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-indigo-950 block">
                    2. {getDiaName(activeRecipe.components[1])}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-medium text-neutral-500">
                        <span>Lệch X</span>
                        <input
                          type="number"
                          step="5"
                          min="-1000"
                          max="1000"
                          value={activeOverride.comp2OffsetX ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val)) return;
                            onUpdateOverride(selectedChar, { comp2OffsetX: val });
                          }}
                          className="w-12 text-right text-[9px] font-mono border border-neutral-200 rounded-sm bg-white"
                        />
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        step="5"
                        value={activeOverride.comp2OffsetX ?? 0}
                        onChange={(e) => onUpdateOverride(selectedChar, { comp2OffsetX: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-medium text-neutral-500">
                        <span>Lệch Y</span>
                        <input
                          type="number"
                          step="5"
                          min="-1000"
                          max="1000"
                          value={activeOverride.comp2OffsetY ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val)) return;
                            onUpdateOverride(selectedChar, { comp2OffsetY: val });
                          }}
                          className="w-12 text-right text-[9px] font-mono border border-neutral-200 rounded-sm bg-white"
                        />
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        step="5"
                        value={activeOverride.comp2OffsetY ?? 0}
                        onChange={(e) => onUpdateOverride(selectedChar, { comp2OffsetY: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fast Reset Buttons */}
            <button
              onClick={() => {
                onUpdateOverride(selectedChar, {
                  offsetX: 0,
                  offsetY: 0,
                  scaleX: 1.0,
                  scaleY: 1.0,
                  advanceWidthTweak: 0,
                  comp1OffsetX: 0,
                  comp1OffsetY: 0,
                  comp2OffsetX: 0,
                  comp2OffsetY: 0
                });
              }}
              className="w-full text-[10px] text-neutral-500 hover:text-neutral-900 font-semibold py-1.5 border border-dashed border-neutral-200 hover:border-neutral-300 rounded-lg text-center cursor-pointer"
            >
              Reset tinh chỉnh riêng của chữ này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
