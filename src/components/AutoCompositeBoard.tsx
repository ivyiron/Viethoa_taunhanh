import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as opentype from 'opentype.js';
import { Sliders, Sparkles, Filter, CheckCircle, ChevronRight, HelpCircle, Info, Move, Settings, Check } from 'lucide-react';
import { DiacriticTemplate, AutoPositionRules, GlyphOverrideState, FontMetadata } from '../types';
import { VIETNAMESE_RECIPES, composeGlyphPath, ComponentRecipe } from '../utils';

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
}> = ({ char, recipe, font, fontMetadata, templates, rules, override, isActive, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Compose composite path
      const { path, advanceWidth } = composeGlyphPath(font, recipe, templates, rules, override);
      
      const width = canvas.width;
      const height = canvas.height;
      const padding = 16;
      const drawHeight = height - padding * 2;
      
      const scaleFactor = drawHeight / (fontMetadata.ascender - fontMetadata.descender);
      const centerX = width / 2;
      const fontStartX = centerX - (advanceWidth / 2) * scaleFactor;
      const baselineY = padding + fontMetadata.ascender * scaleFactor;

      // Draw faint baseline & advance lines
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();

      // Render the composite path
      ctx.beginPath();
      ctx.fillStyle = isActive ? '#0f172a' : '#334155';
      ctx.strokeStyle = isActive ? '#000000' : '#475569';
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
    }
  }, [font, fontMetadata, templates, rules, override, isActive]);

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
            : 'border-neutral-200 bg-white hover:bg-neutral-50/80 hover:border-neutral-300'
      }`}
    >
      {/* Top markers */}
      <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center w-auto">
        <span className="font-sans font-bold text-xs text-neutral-800">{char}</span>
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
  onUpdateOverride
}) => {
  const [selectedChar, setSelectedChar] = useState<string>('á');
  const [activeFilter, setActiveFilter] = useState<'all' | 'lowercase' | 'uppercase' | 'a_group' | 'e_group' | 'o_group' | 'u_group' | 'edited'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeRecipe = useMemo(() => {
    return VIETNAMESE_RECIPES.find((r) => r.char === selectedChar) || VIETNAMESE_RECIPES[0];
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

  // Filter recipes based on tab and query
  const filteredRecipes = useMemo(() => {
    return VIETNAMESE_RECIPES.filter((recipe) => {
      // 1. Filter by Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (recipe.char.toLowerCase() !== q && recipe.baseChar.toLowerCase() !== q) {
          return false;
        }
      }

      // 2. Filter by tab selector
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
      if (activeFilter === 'edited') {
        const ovr = overrides[recipe.char];
        return ovr && (
          ovr.offsetX !== 0 ||
          ovr.offsetY !== 0 ||
          ovr.scaleX !== 1.0 ||
          ovr.scaleY !== 1.0 ||
          ovr.advanceWidthTweak !== 0 ||
          (ovr.comp1OffsetX !== undefined && ovr.comp1OffsetX !== 0) ||
          (ovr.comp1OffsetY !== undefined && ovr.comp1OffsetY !== 0) ||
          (ovr.comp2OffsetX !== undefined && ovr.comp2OffsetX !== 0) ||
          (ovr.comp2OffsetY !== undefined && ovr.comp2OffsetY !== 0) ||
          ovr.isCompleted
        );
      }
      return true; // 'all'
    });
  }, [activeFilter, searchQuery, overrides]);

  const stats = useMemo(() => {
    const total = VIETNAMESE_RECIPES.length;
    let completed = 0;
    let customized = 0;

    VIETNAMESE_RECIPES.forEach((r) => {
      const ovr = overrides[r.char];
      if (ovr?.isCompleted) completed++;
      if (ovr && (
        ovr.offsetX !== 0 ||
        ovr.offsetY !== 0 ||
        ovr.scaleX !== 1.0 ||
        ovr.scaleY !== 1.0 ||
        ovr.advanceWidthTweak !== 0 ||
        (ovr.comp1OffsetX !== undefined && ovr.comp1OffsetX !== 0) ||
        (ovr.comp1OffsetY !== undefined && ovr.comp1OffsetY !== 0) ||
        (ovr.comp2OffsetX !== undefined && ovr.comp2OffsetX !== 0) ||
        (ovr.comp2OffsetY !== undefined && ovr.comp2OffsetY !== 0)
      )) customized++;
    });

    return { total, completed, customized };
  }, [overrides]);

  // Big Inspector preview drawing logic
  const inspectorCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = inspectorCanvasRef.current;
    if (!canvas || !activeRecipe) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const { path, advanceWidth } = composeGlyphPath(font, activeRecipe, templates, rules, activeOverride);
      
      const width = canvas.width;
      const height = canvas.height;
      const padding = 40;
      const drawHeight = height - padding * 2;
      const scaleFactor = drawHeight / (fontMetadata.ascender - fontMetadata.descender);
      const centerX = width / 2;
      const fontStartX = centerX - (advanceWidth / 2) * scaleFactor;
      const baselineY = padding + fontMetadata.ascender * scaleFactor;

      // Draw background grids
      ctx.fillStyle = '#fcfcfc';
      ctx.fillRect(0, 0, width, height);

      // Baseline guide
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(10, baselineY);
      ctx.lineTo(width - 10, baselineY);
      ctx.stroke();

      // Side bearings
      ctx.strokeStyle = '#93c5fd';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(fontStartX, 10);
      ctx.lineTo(fontStartX, height - 10);
      ctx.moveTo(fontStartX + advanceWidth * scaleFactor, 10);
      ctx.lineTo(fontStartX + advanceWidth * scaleFactor, height - 10);
      ctx.stroke();

      // Render Glyph
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
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
    }
  }, [font, fontMetadata, templates, rules, activeRecipe, activeOverride]);

  return (
    <div id="auto-composite-board-panel" className="space-y-6">
      
      {/* Search & Tabs Filter Hub bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs">
        
        {/* Filters Carousel */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'Tất cả (134)' },
            { id: 'lowercase', label: 'Chữ thường' },
            { id: 'uppercase', label: 'Chữ hoa' },
            { id: 'a_group', label: 'Nhóm chữ A/Ă/Â' },
            { id: 'e_group', label: 'Nhóm chữ E/Ê' },
            { id: 'o_group', label: 'Nhóm chữ O/Ô/Ơ' },
            { id: 'u_group', label: 'Nhóm chữ U/Ư' },
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
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
              Kết Quả Tự Động Hóa ({filteredRecipes.length} chữ hiển thị)
            </span>
            <div className="text-[10px] font-mono text-neutral-500 flex gap-4">
              <span>Hoàn thành: <strong>{stats.completed}/{stats.total}</strong></span>
              <span>Đã override: <strong>{stats.customized}</strong></span>
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="bg-white border border-neutral-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <Info className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-neutral-700">Không tìm thấy ký tự phù hợp</p>
              <p className="text-xs text-neutral-400 mt-1">Hãy thử đổi bộ lọc hoặc gõ từ khóa tìm kiếm khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-7 gap-3">
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
                Ghi đè thủ công cho chữ <strong className="text-neutral-900 font-bold">"{selectedChar}"</strong>
              </p>
            </div>

            {/* Quick Completion checkbox */}
            <button
              onClick={() => onUpdateOverride(selectedChar, { isCompleted: !activeOverride.isCompleted })}
              className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold transition ${
                activeOverride.isCompleted
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${activeOverride.isCompleted ? 'fill-green-600 text-white' : ''}`} />
              <span>{activeOverride.isCompleted ? 'Đã duyệt' : 'Duyệt'}</span>
            </button>
          </div>

          {/* Large Inspector Canvas */}
          <div className="border border-neutral-100 rounded-xl bg-neutral-50 overflow-hidden flex flex-col items-center justify-center">
            <canvas ref={inspectorCanvasRef} width={400} height={300} className="w-full aspect-[4/3] block" />
            <div className="w-full bg-neutral-100/60 p-2 border-t border-neutral-200/50 flex justify-between text-[9px] font-mono text-neutral-500">
              <span>Công thức ghép: {activeRecipe?.components.join(' + ')}</span>
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
              <p className="text-[9px] text-indigo-600/80 leading-snug">
                * Kéo sang phải để tăng khoảng đệm phải (tracking). Thích hợp tinh chỉnh sườn phải cho các ký tự <strong>ư, ơ, đ, Ư, Ơ, Đ</strong>.
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
