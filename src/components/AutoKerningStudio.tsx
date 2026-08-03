import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as opentype from 'opentype.js';
import { AutoSpacingRules, AutoKerningSettings, FontMetadata } from '../types';
import { NumericInput } from './NumericInput';
import {
  generateFullFontKerningPairs,
  calculateAutoSpacingAdjustments,
  getCharacterFamilyGroup,
  GeneratedKerningPair
} from '../utils/kerningEngine';
import {
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Zap,
  Eye,
  Info,
  SlidersHorizontal,
  Layers,
  ArrowRightLeft,
  Sun,
  Moon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Columns,
  Maximize2
} from 'lucide-react';

interface AutoKerningStudioProps {
  font: opentype.Font | null;
  rawFontBuffer: ArrayBuffer | null;
  compiledBuffer: ArrayBuffer | null;
  fontMetadata: FontMetadata | null;
  spacingRules: AutoSpacingRules;
  kerningSettings: AutoKerningSettings;
  onUpdateSpacingRules: (rules: Partial<AutoSpacingRules>) => void;
  onUpdateKerningSettings: (settings: Partial<AutoKerningSettings>) => void;
  onCompileFont: () => void;
  compiling: boolean;
}

export const AutoKerningStudio: React.FC<AutoKerningStudioProps> = ({
  font,
  rawFontBuffer,
  compiledBuffer,
  fontMetadata,
  spacingRules,
  kerningSettings,
  onUpdateSpacingRules,
  onUpdateKerningSettings,
  onCompileFont,
  compiling,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'upper_upper' | 'upper_lower' | 'vietnamese' | 'punctuation' | 'number' | 'custom'
  >('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [smartGroupEdit, setSmartGroupEdit] = useState<boolean>(true);

  // Auto-sync compiled font when kerning or spacing settings change so Live Comparison updates automatically
  const onCompileFontRef = useRef(onCompileFont);
  useEffect(() => {
    onCompileFontRef.current = onCompileFont;
  }, [onCompileFont]);

  useEffect(() => {
    if (!font) return;
    const timer = setTimeout(() => {
      onCompileFontRef.current();
    }, 350);
    return () => clearTimeout(timer);
  }, [font, kerningSettings, spacingRules]);

  // Custom Pair Input Form State
  const [newCharLeft, setNewCharLeft] = useState<string>('');
  const [newCharRight, setNewCharRight] = useState<string>('');
  const [newValue, setNewValue] = useState<number>(-40);

  // Sample Text for Live Preview Comparison
  const [sampleText, setSampleText] = useState<string>(
    'Tự động quét toàn bộ ký tự trong font, tính toán khoảng cách quang học và tự động tạo Kerning cho tất cả cụm chữ kinh điển & tiếng Việt.\n\nAVATAR WAVE TAXI TYPOGRAPHY WALTZ YOUTH — Việt Nam Thịnh Vượng • Tình Yêu & Trí Tuệ • (012) 345-6789 [1/2] 90%'
  );
  const [fontSize, setFontSize] = useState<number>(36);
  const [showComparison, setShowComparison] = useState<boolean>(true);

  // Live Preview Studio Enhanced States
  const [previewMode, setPreviewMode] = useState<'side_by_side' | 'overlay' | 'single'>('side_by_side');
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark');
  const [isMultiLine, setIsMultiLine] = useState<boolean>(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Register raw original font face for Box 1 comparison
  const [originalFamilyName, setOriginalFamilyName] = useState<string | null>(null);
  const [originalRegistered, setOriginalRegistered] = useState<boolean>(false);

  useEffect(() => {
    if (!rawFontBuffer) {
      setOriginalRegistered(false);
      return;
    }

    let isMounted = true;
    const registerOriginal = async () => {
      try {
        const uniqueName = `OriginalFont_Preview_${Date.now()}`;
        const fontFace = new FontFace(uniqueName, rawFontBuffer);
        const loadedFace = await fontFace.load();

        if (!isMounted) return;

        // Clean up old OriginalFont_Preview font faces
        const toRemove: FontFace[] = [];
        document.fonts.forEach((face) => {
          if (face.family.startsWith('OriginalFont_Preview_')) {
            toRemove.push(face);
          }
        });
        toRemove.forEach((face) => document.fonts.delete(face));

        document.fonts.add(loadedFace);
        setOriginalFamilyName(uniqueName);
        setOriginalRegistered(true);
      } catch (err) {
        console.warn('Error registering original preview font:', err);
        if (isMounted) setOriginalRegistered(false);
      }
    };

    registerOriginal();
    return () => {
      isMounted = false;
    };
  }, [rawFontBuffer]);

  // Register compiled font face for Box 2 comparison
  const [compiledFamilyName, setCompiledFamilyName] = useState<string | null>(null);
  const [compiledRegistered, setCompiledRegistered] = useState<boolean>(false);

  useEffect(() => {
    if (!compiledBuffer) {
      setCompiledRegistered(false);
      return;
    }

    let isMounted = true;
    const registerCompiled = async () => {
      try {
        const uniqueName = `CompiledKerningFont_Preview_${Date.now()}`;
        const fontFace = new FontFace(uniqueName, compiledBuffer);
        const loadedFace = await fontFace.load();

        if (!isMounted) return;

        // Clean up old CompiledKerningFont_Preview font faces
        const toRemove: FontFace[] = [];
        document.fonts.forEach((face) => {
          if (face.family.startsWith('CompiledKerningFont_Preview_')) {
            toRemove.push(face);
          }
        });
        toRemove.forEach((face) => document.fonts.delete(face));

        document.fonts.add(loadedFace);
        setCompiledFamilyName(uniqueName);
        setCompiledRegistered(true);
      } catch (err) {
        console.warn('Error registering compiled preview font:', err);
        if (isMounted) setCompiledRegistered(false);
      }
    };

    registerCompiled();
    return () => {
      isMounted = false;
    };
  }, [compiledBuffer]);

  // Generate all kerning pairs based on current settings
  const kerningPairs = useMemo(() => {
    return generateFullFontKerningPairs(font, kerningSettings);
  }, [font, kerningSettings]);

  // Calculate optical spacing adjustments
  const spacingAdjustments = useMemo(() => {
    return calculateAutoSpacingAdjustments(font, spacingRules);
  }, [font, spacingRules]);

  // Filter pairs by category and search
  const filteredPairs = useMemo(() => {
    return kerningPairs.filter((pair) => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'custom') {
          const pairKey = `${pair.charLeft},${pair.charRight}`;
          const isCustom = pair.category === 'custom' || (kerningSettings.customPairs && kerningSettings.customPairs[pairKey] !== undefined);
          if (!isCustom) return false;
        } else if (pair.category !== selectedCategory) {
          return false;
        }
      }
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        const pairName = (pair.charLeft + pair.charRight).toLowerCase();
        const valStr = pair.value.toString();
        return pairName.includes(query) || valStr.includes(query);
      }
      return true;
    });
  }, [kerningPairs, selectedCategory, searchFilter, kerningSettings.customPairs]);

  // Handle individual pair value edit (with smart group expansion support)
  const handleEditPairValue = useCallback(
    (charLeft: string, charRight: string, newVal: number) => {
      const nextCustomPairs = { ...kerningSettings.customPairs };

      if (smartGroupEdit) {
        const groupL = getCharacterFamilyGroup(charLeft);
        const groupR = getCharacterFamilyGroup(charRight);

        for (const l of groupL) {
          for (const r of groupR) {
            const pairKey = `${l},${r}`;
            nextCustomPairs[pairKey] = newVal;
          }
        }
      } else {
        const pairKey = `${charLeft},${charRight}`;
        nextCustomPairs[pairKey] = newVal;
      }

      onUpdateKerningSettings({ customPairs: nextCustomPairs });
    },
    [kerningSettings, onUpdateKerningSettings, smartGroupEdit]
  );

  // Handle individual pair removal (setting value to 0 removes kerning)
  const handleRemovePair = useCallback(
    (charLeft: string, charRight: string) => {
      const nextCustomPairs = { ...kerningSettings.customPairs };

      if (smartGroupEdit) {
        const groupL = getCharacterFamilyGroup(charLeft);
        const groupR = getCharacterFamilyGroup(charRight);

        for (const l of groupL) {
          for (const r of groupR) {
            const pairKey = `${l},${r}`;
            nextCustomPairs[pairKey] = 0;
          }
        }
      } else {
        const pairKey = `${charLeft},${charRight}`;
        nextCustomPairs[pairKey] = 0;
      }

      onUpdateKerningSettings({ customPairs: nextCustomPairs });
    },
    [kerningSettings, onUpdateKerningSettings, smartGroupEdit]
  );

  // Handle adding custom pair with full Unicode & smart group expansion support
  const handleAddCustomPair = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const charsL = Array.from(newCharLeft.trim());
      const charsR = Array.from(newCharRight.trim());
      const charL = (charsL[0] as string) || '';
      const charR = (charsR[0] as string) || '';
      if (!charL || !charR) return;

      const nextCustomPairs = { ...kerningSettings.customPairs };

      if (smartGroupEdit) {
        const groupL = getCharacterFamilyGroup(charL);
        const groupR = getCharacterFamilyGroup(charR);

        for (const l of groupL) {
          for (const r of groupR) {
            const pairKey = `${l},${r}`;
            nextCustomPairs[pairKey] = newValue;
          }
        }
      } else {
        const pairKey = `${charL},${charR}`;
        nextCustomPairs[pairKey] = newValue;
      }

      onUpdateKerningSettings({ customPairs: nextCustomPairs });

      setNewCharLeft('');
      setNewCharRight('');
    },
    [newCharLeft, newCharRight, newValue, kerningSettings, onUpdateKerningSettings, smartGroupEdit]
  );

  // Preset Text Templates categorized for comprehensive typography testing
  const textPresetCategories = [
    { label: 'Tiếng Việt', text: 'Việt Nam Thịnh Vượng — Tình Yêu & Trí Tuệ • Thành Phố Vô Tận • Vũ Trụ Rạng Rỡ' },
    { label: 'All Caps', text: 'AVATAR WAVE TAXI TYPOGRAPHY WALTZ YOUTH' },
    { label: 'Cụm cơ bản', text: 'Ta To Te Va Ve Vo Vê Vô Vơ Vư vo ve va wo we wa yà ý' },
    { label: 'Số & Dấu Câu', text: 'L\'Amour T.T.S. (012) 345-6789 [1/2] 90% + $100 = €85' },
    { label: 'Đoạn Văn', text: 'Tự động quét toàn bộ ký tự trong font, tính toán khoảng cách quang học và tự động tạo Kerning cho tất cả cụm chữ kinh điển & tiếng Việt. Căn chỉnh khoảng cách đạt độ hoàn hảo tự nhiên.' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Stats & Sync Action */}
      <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-600 text-white rounded-xl inline-flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-300" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-neutral-950 tracking-tight flex items-center gap-2">
                Auto Spacing & Kerning Engine
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tự động quét toàn bộ ký tự trong font, tính toán khoảng cách quang học và tự động tạo Kerning cho tất cả cụm chữ (bao gồm các dấu Tiếng Việt đã tạo)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-200/80 text-xs text-neutral-700 font-semibold">
              <div className="text-center border-r border-neutral-200 pr-3">
                <p className="text-[10px] text-neutral-400 font-medium uppercase">Ký tự đã quét</p>
                <p className="text-sm font-extrabold text-neutral-900">{fontMetadata?.totalGlyphs || font?.glyphs.length || 0}</p>
              </div>
              <div className="text-center pl-1">
                <p className="text-[10px] text-neutral-400 font-medium uppercase">Cặp Kerning tạo ra</p>
                <p className="text-sm font-extrabold text-indigo-600">{kerningPairs.length}</p>
              </div>
            </div>

            <button
              id="btn-sync-autokern"
              onClick={onCompileFont}
              disabled={compiling}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${compiling ? 'animate-spin' : ''}`} />
              <span>Cập nhật & Đồng bộ Font</span>
            </button>
          </div>
        </div>

        {/* Section Tabs / Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* SECTION 1: AUTO SPACING / SIDEBEARINGS */}
          <div className="bg-neutral-50/70 border border-neutral-200/80 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-neutral-900">
                  1. Auto Spacing (Sidebearings)
                </h3>
              </div>
            </div>

            {/* Spacing Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Chế độ Mật độ Chữ (Spacing Preset):</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: 'Chặt chẽ (-15)' },
                  { id: 'normal', label: 'Tiêu chuẩn (0)' },
                  { id: 'spacious', label: 'Thoáng rộng (+25)' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdateSpacingRules({ spacingPreset: preset.id as any })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition cursor-pointer text-center ${
                      spacingRules.spacingPreset === preset.id
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Global Tracking Offset Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-700">Độ giãn Tracking Toàn Bộ:</span>
                <NumericInput
                  value={spacingRules.globalTrackingOffset}
                  onChange={(val) => onUpdateSpacingRules({ globalTrackingOffset: val })}
                  step={2}
                  min={-200}
                  max={200}
                  unit="UPM"
                />
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="2"
                value={spacingRules.globalTrackingOffset}
                onChange={(e) => onUpdateSpacingRules({ globalTrackingOffset: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 accent-indigo-600 cursor-pointer rounded-lg bg-neutral-200"
              />
            </div>

            {/* Curve Tightening Ratio Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-700">Tỷ lệ Tối Ưu Chữ Tròn (O, C, o, e):</span>
                <NumericInput
                  value={spacingRules.curveTighteningPercent}
                  onChange={(val) => onUpdateSpacingRules({ curveTighteningPercent: val })}
                  step={1}
                  min={-50}
                  max={100}
                  unit="%"
                />
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={spacingRules.curveTighteningPercent}
                onChange={(e) => onUpdateSpacingRules({ curveTighteningPercent: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 accent-indigo-600 cursor-pointer rounded-lg bg-neutral-200"
              />
              <p className="text-[11px] text-neutral-400">
                Tự động thu hẹp/mở rộng khoảng bên (sidebearing) của chữ cái cong tròn (O, C, e) giúp chữ cân bằng hơn.
              </p>
            </div>
          </div>

          {/* SECTION 2: AUTO KERNING GENERATOR CONTROLS */}
          <div className="bg-neutral-50/70 border border-neutral-200/80 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-neutral-900">
                  2. Auto Kerning
                </h3>
              </div>
            </div>

            {/* Kerning Multiplier Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-700">Cường Độ Kerning (Multiplier):</span>
                <NumericInput
                  value={Math.round(kerningSettings.intensityMultiplier * 100)}
                  onChange={(val) => onUpdateKerningSettings({ intensityMultiplier: val / 100 })}
                  step={5}
                  min={-200}
                  max={300}
                  unit="%"
                />
              </div>
              <input
                type="range"
                min="-1"
                max="3"
                step="0.05"
                value={kerningSettings.intensityMultiplier}
                onChange={(e) => onUpdateKerningSettings({ intensityMultiplier: parseFloat(e.target.value) })}
                className="w-full h-1.5 accent-indigo-600 cursor-pointer rounded-lg bg-neutral-200"
              />
            </div>

            {/* Minimum Threshold Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-700">Ngưỡng Bỏ Qua Nhiễu (Min Threshold):</span>
                <NumericInput
                  value={kerningSettings.minThreshold}
                  onChange={(val) => onUpdateKerningSettings({ minThreshold: val })}
                  step={1}
                  min={-100}
                  max={100}
                  unit="UPM"
                />
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={kerningSettings.minThreshold}
                onChange={(e) => onUpdateKerningSettings({ minThreshold: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 accent-indigo-600 cursor-pointer rounded-lg bg-neutral-200"
              />
            </div>

            {/* Checkboxes Scope */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <label className="flex items-center gap-2 font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kerningSettings.applyClassics}
                  onChange={(e) => onUpdateKerningSettings({ applyClassics: e.target.checked })}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                />
                <span>Cụm Chữ Hoa (AV, AW, AT...)</span>
              </label>

              <label className="flex items-center gap-2 font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kerningSettings.applyUpperLower}
                  onChange={(e) => onUpdateKerningSettings({ applyUpperLower: e.target.checked })}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                />
                <span>Hoa-Thường (Ta, To, Va...)</span>
              </label>

              <label className="flex items-center gap-2 font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kerningSettings.applyVietnameseVariants}
                  onChange={(e) => onUpdateKerningSettings({ applyVietnameseVariants: e.target.checked })}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                />
                <span>Biến thể Tiếng Việt (Tà, Vô...)</span>
              </label>

              <label className="flex items-center gap-2 font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kerningSettings.applyPunctuation}
                  onChange={(e) => onUpdateKerningSettings({ applyPunctuation: e.target.checked })}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                />
                <span>Dấu câu (A., T., L'...)</span>
              </label>
            </div>

          </div>

        </div>
      </div>

      {/* SECTION 3: LIVE HARMONY COMPARISON TESTER STUDIO */}
      <div className="bg-neutral-900 text-white p-6 rounded-2xl shadow-xl space-y-5 border border-neutral-800">
        
        {/* Header & Main Mode Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
               
              <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-bold text-neutral-300">
              <button
                type="button"
                onClick={() => setPreviewMode('side_by_side')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  previewMode === 'side_by_side'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="Before & After"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side by side</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('overlay')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  previewMode === 'overlay'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="So sánh dịch chuyển ký tự"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overlay</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('single')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  previewMode === 'single'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="Xem tập trung Font đã kerning"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Solo</span>
              </button>
            </div>

            {/* Sync Button */}
            <button
              type="button"
              onClick={onCompileFont}
              disabled={compiling}
              className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-indigo-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${compiling ? 'animate-spin text-amber-400' : ''}`} />
              <span>{compiledRegistered ? 'Cập nhật' : 'Đồng bộ Font'}</span>
            </button>
          </div>
        </div>

        {/* Toolbar Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 text-xs">
          
          {/* Preset Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider mr-1">Mẫu Thử:</span>
            {textPresetCategories.map((cat, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSampleText(cat.text)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                  sampleText === cat.text
                    ? 'bg-indigo-950 text-indigo-200 border-indigo-700/80'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Display Customizers */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Font Size Presets & Slider */}
            <div className="flex items-center gap-2 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-400">Cỡ chữ:</span>
              <div className="flex items-center gap-1">
                {[24, 36, 48, 64].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
                      fontSize === size ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="16"
                max="80"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-16 accent-indigo-500 cursor-pointer"
              />
              <span className="font-mono text-indigo-300 text-[11px] font-bold">{fontSize}px</span>
            </div>

            {/* Canvas Theme Toggle */}
            <button
              type="button"
              onClick={() => setCanvasTheme(canvasTheme === 'dark' ? 'light' : 'dark')}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                canvasTheme === 'dark'
                  ? 'bg-neutral-900 text-amber-300 border-neutral-800 hover:bg-neutral-800'
                  : 'bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100'
              }`}
              title="Chuyển nền Sáng / Tối"
            >
              {canvasTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Text Alignment */}
            <div className="flex items-center bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setTextAlign('left')}
                className={`p-1 rounded transition cursor-pointer ${
                  textAlign === 'left' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign('center')}
                className={`p-1 rounded transition cursor-pointer ${
                  textAlign === 'center' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign('right')}
                className={`p-1 rounded transition cursor-pointer ${
                  textAlign === 'right' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Multi-line Toggle */}
            <button
              type="button"
              onClick={() => setIsMultiLine(!isMultiLine)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isMultiLine
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700/80'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
              }`}
              title="Đổi giữa 1 Dòng vs Đoạn Văn"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input Text Box / Textarea */}
        <div className="space-y-1">
          {isMultiLine ? (
            <textarea
              rows={3}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Nhập hoặc dán văn bản kiểm thử nhiều dòng..."
              className="w-full text-sm p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-medium focus:border-indigo-500 outline-hidden resize-y"
            />
          ) : (
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Nhập đoạn văn bản bất kỳ để kiểm tra kerning trực tiếp..."
              className="w-full text-sm px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-medium focus:border-indigo-500 outline-hidden"
            />
          )}
        </div>

        {/* Render Preview Displays */}
        {previewMode === 'overlay' ? (
          /* OVERLAY DIFF SUPERIMPOSE MODE */
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-4">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Chế Độ Đè Bóng So Sánh (Overlay Superimpose)
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-red-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    Đỏ Bóng: Font Gốc
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                    Xanh Lam: Font Sau Auto Kerning
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-neutral-400">
                Góc nhìn trực quan phát hiện sự dịch chuyển quang học của từng chữ cái.
              </span>
            </div>

            <div
              className={`relative p-6 rounded-2xl border overflow-x-auto transition-colors duration-200 ${
                canvasTheme === 'dark'
                  ? 'bg-neutral-950 border-neutral-800 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900 shadow-inner'
              }`}
            >
              {/* Stacked Containers */}
              <div className="relative min-w-max" style={{ textAlign }}>
                {/* Layer 1: ORIGINAL FONT (RED GHOST) */}
                <div
                  className="whitespace-pre select-none leading-relaxed"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: originalRegistered && originalFamilyName
                      ? `"${originalFamilyName}", sans-serif`
                      : 'sans-serif',
                    fontKerning: 'none',
                    fontFeatureSettings: '"kern" 0',
                    color: canvasTheme === 'dark' ? 'rgba(239, 68, 68, 0.75)' : 'rgba(220, 38, 38, 0.7)',
                    whiteSpace: isMultiLine ? 'pre-wrap' : 'nowrap',
                  }}
                >
                  {sampleText}
                </div>

                {/* Layer 2: KERNED FONT (CYAN/ELECTRIC OVERLAY) */}
                <div
                  className="absolute inset-0 pointer-events-none leading-relaxed"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: compiledRegistered && compiledFamilyName
                      ? `"${compiledFamilyName}", sans-serif`
                      : originalRegistered && originalFamilyName
                      ? `"${originalFamilyName}", sans-serif`
                      : 'sans-serif',
                    fontKerning: 'normal',
                    fontFeatureSettings: '"kern" 1, "liga" 1',
                    WebkitFontFeatureSettings: '"kern" 1, "liga" 1',
                    letterSpacing: `${spacingRules.globalTrackingOffset}px`,
                    color: canvasTheme === 'dark' ? '#06b6d4' : '#0284c7',
                    mixBlendMode: canvasTheme === 'dark' ? 'screen' : 'multiply',
                    whiteSpace: isMultiLine ? 'pre-wrap' : 'nowrap',
                  }}
                >
                  {sampleText}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SIDE-BY-SIDE OR SINGLE PREVIEW MODE */
          <div className={`grid grid-cols-1 ${previewMode === 'side_by_side' ? 'md:grid-cols-2' : ''} gap-4 pt-1`}>
            
            {/* Box 1: BEFORE Kerning / Spacing */}
            {previewMode === 'side_by_side' && (
              <div
                className={`p-5 rounded-2xl border space-y-3 transition-colors duration-200 ${
                  canvasTheme === 'dark'
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
                    : 'bg-white border-neutral-300 text-neutral-900 shadow-xs'
                }`}
              >
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider border-b pb-2.5 border-neutral-800/60">
                  <span className="text-red-500 flex items-center gap-1.5 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    1. Gốc (Chưa Auto Kerning)
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {fontMetadata?.family || 'Font Gốc'}
                  </span>
                </div>

                <div
                  className="py-3 px-2 overflow-x-auto font-normal min-h-[100px] leading-relaxed"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: originalRegistered && originalFamilyName
                      ? `"${originalFamilyName}", sans-serif`
                      : 'sans-serif',
                    fontKerning: 'none',
                    fontFeatureSettings: '"kern" 0',
                    textAlign,
                    whiteSpace: isMultiLine ? 'pre-wrap' : 'nowrap',
                  }}
                >
                  {sampleText}
                </div>
              </div>
            )}

            {/* Box 2: AFTER Auto Kerning & Spacing */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-colors duration-200 ${
                canvasTheme === 'dark'
                  ? 'bg-neutral-950 border-indigo-500/50 text-white shadow-indigo-950/20'
                  : 'bg-white border-indigo-400 text-neutral-900 shadow-md'
              }`}
            >
              <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider border-b pb-2.5 border-neutral-800/60">
                <span className="text-emerald-400 flex items-center gap-1.5 font-mono">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {previewMode === 'single' ? 'Font Sau Auto Kerning & Spacing' : '2. Sau Auto Kerning'} ({kerningPairs.length} cặp)
                </span>
                <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-800">
                  {spacingRules.globalTrackingOffset > 0 ? `Tracking +${spacingRules.globalTrackingOffset}` : 'Kerning Enabled'}
                </span>
              </div>

              <div
                className="py-3 px-2 overflow-x-auto font-normal min-h-[100px] leading-relaxed"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: compiledRegistered && compiledFamilyName
                    ? `"${compiledFamilyName}", sans-serif`
                    : originalRegistered && originalFamilyName
                    ? `"${originalFamilyName}", sans-serif`
                    : 'sans-serif',
                  fontKerning: 'normal',
                  fontFeatureSettings: '"kern" 1, "liga" 1',
                  WebkitFontFeatureSettings: '"kern" 1, "liga" 1',
                  letterSpacing: `${spacingRules.globalTrackingOffset}px`,
                  textAlign,
                  whiteSpace: isMultiLine ? 'pre-wrap' : 'nowrap',
                }}
              >
                {sampleText}
              </div>

              {!compiledRegistered && (
                <p className="text-[11px] text-amber-400/90 pt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Đang biên dịch hiển thị kerning trực tiếp lên mẫu font...</span>
                </p>
              )}
            </div>

          </div>
        )}

      </div>

      {/* SECTION 4: KERNING PAIRS LIST & CUSTOM PAIR CREATOR */}
      <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-xs space-y-5">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-neutral-950 tracking-tight flex items-center gap-2">
              Danh Sách Cặp Kerning Đã Tạo ({filteredPairs.length}/{kerningPairs.length})
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Bạn có thể tìm kiếm, lọc theo phân loại, tinh chỉnh giá trị cho từng cặp hoặc thêm cặp Kerning tùy chỉnh.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'upper_upper', label: 'Chữ Hoa' },
              { id: 'upper_lower', label: 'Hoa-Thường' },
              { id: 'vietnamese', label: 'Tiếng Việt' },
              { id: 'punctuation', label: 'Dấu câu' },
              { id: 'number', label: 'Chữ số' },
              { id: 'custom', label: 'Tự thêm' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Group Kerning Editing Banner Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/80 border border-amber-200/90 p-3.5 rounded-xl">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="smart-group-kerning-checkbox"
              checked={smartGroupEdit}
              onChange={(e) => setSmartGroupEdit(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
            />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-extrabold text-amber-950">
                Chỉnh kerning theo nhóm thông minh
              </span>
            </div>
          </label>
          <span className="text-[11px] text-amber-800/90 font-medium">
            {smartGroupEdit
              ? '✓ Bật: Chỉnh sửa giá trị kerning của cả nhóm ký tự tương đồng.'
              : '✕ Tắt: Chỉnh sửa giá trị kerning riêng lẻ từng cặp độc lập.'}
          </span>
        </div>

        {/* Search & Add Custom Pair Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Search Box */}
          <div className="lg:col-span-5 space-y-1">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm kiếm cặp Kerning (ví dụ: AV, Ta, Tà, A...)"
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-200 rounded-xl focus:border-neutral-400 outline-hidden font-medium"
            />
          </div>

          {/* Add Custom Pair Form */}
          <form onSubmit={handleAddCustomPair} className="lg:col-span-7 flex flex-wrap items-center gap-2 bg-neutral-50 p-2 rounded-xl border border-neutral-200/80">
            <span className="text-xs font-bold text-neutral-700 px-2 shrink-0">Thêm cặp tùy chỉnh:</span>
            
            <input
              type="text"
              maxLength={2}
              value={newCharLeft}
              onChange={(e) => setNewCharLeft(e.target.value)}
              placeholder="Chữ 1 (A)"
              className="w-16 text-xs text-center font-mono font-bold px-2 py-1.5 bg-white border border-neutral-200 rounded-lg outline-hidden"
            />
            <span className="text-xs text-neutral-400">+</span>
            <input
              type="text"
              maxLength={2}
              value={newCharRight}
              onChange={(e) => setNewCharRight(e.target.value)}
              placeholder="Chữ 2 (V)"
              className="w-16 text-xs text-center font-mono font-bold px-2 py-1.5 bg-white border border-neutral-200 rounded-lg outline-hidden"
            />

            <span className="text-xs text-neutral-400">Giá trị:</span>
            <NumericInput
              value={newValue}
              onChange={(val) => setNewValue(val)}
              step={5}
              min={-1000}
              max={1000}
            />

            <button
              type="submit"
              disabled={!newCharLeft || !newCharRight}
              className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0 ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Cặp
            </button>
          </form>

        </div>

        {/* Grid of Kerning Cards */}
        {filteredPairs.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 space-y-2 border border-dashed border-neutral-200 rounded-xl">
            <Info className="w-8 h-8 mx-auto text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-600">Không tìm thấy cặp Kerning nào phù hợp.</p>
            <p className="text-xs text-neutral-400">Hãy thử đổi danh mục hoặc tăng cường độ Kerning ở thanh trượt bên trên.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredPairs.map((pair) => {
              const pairKey = `${pair.charLeft},${pair.charRight}`;
              return (
                <div
                  key={pairKey}
                  className="bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-neutral-300 p-3 rounded-xl space-y-2 flex flex-col justify-between transition shadow-2xs group"
                >
                  {/* Pair Visual Display */}
                  <div className="text-center py-2 bg-white rounded-lg border border-neutral-100 group-hover:border-neutral-200 overflow-hidden">
                    <span
                      className="text-2xl tracking-tight text-neutral-900 font-extrabold inline-block"
                      style={{
                        fontFamily: compiledRegistered && compiledFamilyName
                          ? `"${compiledFamilyName}", serif`
                          : originalRegistered && originalFamilyName
                          ? `"${originalFamilyName}", serif`
                          : 'serif',
                        fontKerning: 'normal',
                        fontFeatureSettings: '"kern" 1, "liga" 1',
                        WebkitFontFeatureSettings: '"kern" 1, "liga" 1'
                      }}
                    >
                      {pair.charLeft}{pair.charRight}
                    </span>
                  </div>

                  {/* Pair Info & Controls */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                      <span className="truncate">{pair.category}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePair(pair.charLeft, pair.charRight)}
                        className="text-neutral-300 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                        title="Xóa cặp Kerning này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-center pt-0.5">
                      <NumericInput
                        value={pair.value}
                        onChange={(val) => handleEditPairValue(pair.charLeft, pair.charRight, val)}
                        step={5}
                        min={-2000}
                        max={2000}
                        size="sm"
                        className="w-full justify-between"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
