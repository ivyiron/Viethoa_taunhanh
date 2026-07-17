import { useState, useCallback, useEffect } from 'react';
import * as opentype from 'opentype.js';
import { FontUploader } from './components/FontUploader';
import { DiacriticStudio } from './components/DiacriticStudio';
import { AutoCompositeBoard } from './components/AutoCompositeBoard';
import { FontPlayground } from './components/FontPlayground';
import { DiacriticTemplate, AutoPositionRules, GlyphOverrideState, FontMetadata } from './types';
import { 
  DEFAULT_DIACRITICS, 
  DEFAULT_AUTO_RULES, 
  VIETNAMESE_RECIPES, 
  composeGlyphPath, 
  ensureKerningPairsPopulated, 
  injectAdvancedLayoutTables, 
  buildKernTable,
  findCandidateGlyph,
  extractSvgFromGlyph
} from './utils';
import { Sliders, Sparkles, Download, RefreshCw, HelpCircle, Check, AlertTriangle, FileType, X, Settings2, LayoutGrid } from 'lucide-react';

export default function App() {
  const [originalFont, setOriginalFont] = useState<opentype.Font | null>(null);
  const [rawFontBuffer, setRawFontBuffer] = useState<ArrayBuffer | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FontMetadata | null>(null);
  
  // V2 Core States
  const [templates, setTemplates] = useState<Record<string, DiacriticTemplate>>({});
  const [rules, setRules] = useState<AutoPositionRules>(DEFAULT_AUTO_RULES);
  const [overrides, setOverrides] = useState<Record<string, GlyphOverrideState>>({});
  
  const [activeTab, setActiveTab] = useState<'components' | 'composite'>('components');
  
  const [compiledBuffer, setCompiledBuffer] = useState<ArrayBuffer | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [appSuccess, setAppSuccess] = useState<string | null>(null);

  const [customFamilyName, setCustomFamilyName] = useState<string>('');
  const [customSubfamilyName, setCustomSubfamilyName] = useState<string>('');
  const optimizeWebKerning = true;

  // Auto-dismiss success notification
  useEffect(() => {
    if (appSuccess) {
      const timer = setTimeout(() => {
        setAppSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [appSuccess]);

  // Auto-dismiss error notification
  useEffect(() => {
    if (appError) {
      const timer = setTimeout(() => {
        setAppError(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [appError]);

  // Initialize V2 structure on font load
  const handleFontLoaded = useCallback((loadedFont: opentype.Font, nameOfFile: string, meta: FontMetadata, rawBuffer: ArrayBuffer) => {
    ensureKerningPairsPopulated(loadedFont);
    setOriginalFont(loadedFont);
    setRawFontBuffer(rawBuffer);
    setFilename(nameOfFile);
    setMetadata(meta);
    setCompiledBuffer(rawBuffer);
    setAppError(null);
    setAppSuccess(null);

    setCustomFamilyName(meta.family + ' Viet');
    setCustomSubfamilyName(meta.subfamily || 'Regular');

    // Initialize 9 diacritics templates from DEFAULT_DIACRITICS,
    // with suggestive automatic extraction from the loaded font!
    const initialTemplates: Record<string, DiacriticTemplate> = {};
    let extractedCount = 0;
    const extractedList: string[] = [];

    DEFAULT_DIACRITICS.forEach((dia) => {
      const candidateGlyph = findCandidateGlyph(loadedFont, dia.id);
      if (candidateGlyph) {
        const fontSvg = extractSvgFromGlyph(candidateGlyph, loadedFont.unitsPerEm);
        if (fontSvg) {
          initialTemplates[dia.id] = {
            ...dia,
            svgPath: fontSvg,
            // Automatically reset scale to 1.0 and offset to 0 because the path
            // is already drawn natively in the font's actual units!
            scaleX: 1.0,
            scaleY: 1.0,
            offsetX: 0,
            offsetY: 0
          };
          extractedCount++;
          extractedList.push(dia.name);
          return;
        }
      }
      // Fallback to default
      initialTemplates[dia.id] = { ...dia };
    });
    setTemplates(initialTemplates);

    if (extractedCount > 0) {
      setAppSuccess(`Đã tự động trích xuất thành công ${extractedCount}/9 dấu mẫu (${extractedList.join(', ')}) trực tiếp từ các ký tự có sẵn trong tệp font!`);
    } else {
      setAppSuccess('Đã nạp tệp font thành công. Sử dụng hệ thống dấu mẫu mặc định.');
    }

    // Initialize individual overrides to empty defaults
    const initialOverrides: Record<string, GlyphOverrideState> = {};
    VIETNAMESE_RECIPES.forEach((recipe) => {
      initialOverrides[recipe.char] = {
        char: recipe.char,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        advanceWidthTweak: 0,
        isCompleted: false
      };
    });
    setOverrides(initialOverrides);
    setRules(DEFAULT_AUTO_RULES);
    setActiveTab('components');
  }, []);

  const handleReset = useCallback(() => {
    setOriginalFont(null);
    setRawFontBuffer(null);
    setFilename(null);
    setMetadata(null);
    setTemplates({});
    setOverrides({});
    setCompiledBuffer(null);
    setAppError(null);
    setAppSuccess(null);
    setCustomFamilyName('');
    setCustomSubfamilyName('');
  }, []);

  const handleUpdateTemplate = useCallback((id: string, updated: Partial<DiacriticTemplate>) => {
    setTemplates((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: { ...current, ...updated }
      };
    });
  }, []);

  const handleUpdateRules = useCallback((updated: Partial<AutoPositionRules>) => {
    setRules((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleUpdateOverride = useCallback((char: string, updated: Partial<GlyphOverrideState>) => {
    setOverrides((prev) => {
      const current = prev[char];
      if (!current) return prev;
      return {
        ...prev,
        [char]: { ...current, ...updated }
      };
    });
  }, []);

  // V2 Compiler Action
  const handleCompileFont = useCallback(async (downloadAfterCompile = false) => {
    if (!originalFont || !rawFontBuffer) return;
    setCompiling(true);
    setAppError(null);
    setAppSuccess(null);

    try {
      const font = opentype.parse(rawFontBuffer.slice(0));
      ensureKerningPairsPopulated(font);

      // Rename Font Metadata to avoid collision
      if (font.names && customFamilyName) {
        const subfamily = customSubfamilyName || 'Regular';
        const fullName = `${customFamilyName} ${subfamily}`;
        const postScriptName = `${customFamilyName}-${subfamily}`.replace(/[^a-zA-Z0-9-]/g, '');
        const uniqueID = `${customFamilyName} ${subfamily};Version 2.00`;

        const setAllLangs = (nameObj: any, newVal: string) => {
          if (!nameObj) return { en: newVal };
          Object.keys(nameObj).forEach(lang => {
            nameObj[lang] = newVal;
          });
          if (!nameObj.en) nameObj.en = newVal;
          return nameObj;
        };

        const names = font.names as any;
        const platforms = ['unicode', 'macintosh', 'windows'];
        platforms.forEach(platform => {
          if (!names[platform]) names[platform] = {};
          names[platform].fontFamily = setAllLangs(names[platform].fontFamily, customFamilyName);
          names[platform].fontSubfamily = setAllLangs(names[platform].fontSubfamily, subfamily);
          names[platform].fullName = setAllLangs(names[platform].fullName, fullName);
          names[platform].postScriptName = setAllLangs(names[platform].postScriptName, postScriptName);
          names[platform].uniqueID = setAllLangs(names[platform].uniqueID, uniqueID);
          
          if (names[platform].preferredFamily) {
            names[platform].preferredFamily = setAllLangs(names[platform].preferredFamily, customFamilyName);
          }
          if (names[platform].preferredSubfamily) {
            names[platform].preferredSubfamily = setAllLangs(names[platform].preferredSubfamily, subfamily);
          }
        });
      }

      // Pre-compute a mapping from character to glyph index
      const charToGlyphIndexMap: Record<string, number> = {};
      let simulatedGlyphsLength = font.glyphs.length;
      
      VIETNAMESE_RECIPES.forEach(recipe => {
        const existingIndex = font.charToGlyphIndex(recipe.char);
        if (existingIndex > 0) {
          charToGlyphIndexMap[recipe.char] = existingIndex;
        } else {
          charToGlyphIndexMap[recipe.char] = simulatedGlyphsLength;
          simulatedGlyphsLength++;
        }
      });

      const getGlyphIndexForChar = (c: string): number => {
        if (charToGlyphIndexMap[c] !== undefined) {
          return charToGlyphIndexMap[c];
        }
        return font.charToGlyphIndex(c);
      };

      const charHornInfo: Record<string, { yMin: number; yMax: number; excessRight: number }> = {};

      // Compose and inject all 134 Vietnamese composite glyphs
      VIETNAMESE_RECIPES.forEach(recipe => {
        const override = overrides[recipe.char];
        
        // Bake composite path and compute customized tracking
        const { path, advanceWidth, hornInfo } = composeGlyphPath(font, recipe, templates, rules, override);
        if (hornInfo) {
          charHornInfo[recipe.char] = hornInfo;
        }
        
        const unicode = recipe.char.charCodeAt(0);
        const existingIndex = font.charToGlyphIndex(recipe.char);
        const glyphOptions = {
          name: recipe.char,
          unicode: unicode,
          unicodes: [unicode],
          advanceWidth: advanceWidth,
          path: path
        };

        if (existingIndex > 0) {
          // Overwrite existing slot
          const newGlyph = new opentype.Glyph({
            ...glyphOptions,
            index: existingIndex
          });
          (font.glyphs as any).glyphs[existingIndex] = newGlyph;
        } else {
          // Append new glyph
          const newIndex = font.glyphs.length;
          const newGlyph = new opentype.Glyph({
            ...glyphOptions,
            index: newIndex
          });
          (font.glyphs as any).glyphs[newIndex] = newGlyph;
          font.glyphs.length++;
        }
      });

      // Helper function to dynamically adjust kerning pairs based on horn overlap risks
      const adjustClonedKern = (
        horn: { yMin: number; yMax: number; excessRight: number },
        originalKern: number,
        rightGlyphIndex: number
      ): number => {
        if (horn.excessRight <= 0) return originalKern;

        const rightGlyph = font.glyphs.get(rightGlyphIndex);
        if (!rightGlyph || !rightGlyph.path || !rightGlyph.path.commands || rightGlyph.path.commands.length === 0) {
          return originalKern;
        }

        // Find the minimum x coordinate on the left side of the right glyph within the vertical range of the horn
        let leftXAtHornHeight = Infinity;
        const yMin = horn.yMin - 35; // 35-unit vertical buffer
        const yMax = horn.yMax + 35;

        rightGlyph.path.commands.forEach((cmd: any) => {
          const checkPoint = (x: number, y: number) => {
            if (y >= yMin && y <= yMax) {
              if (x < leftXAtHornHeight) {
                leftXAtHornHeight = x;
              }
            }
          };

          if (cmd.x !== undefined && cmd.y !== undefined) {
            checkPoint(cmd.x, cmd.y);
          }
          if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
            checkPoint(cmd.x1, cmd.y1);
          }
          if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
            checkPoint(cmd.x2, cmd.y2);
          }
        });

        if (leftXAtHornHeight !== Infinity) {
          // Overlap risk occurs if excessRight > leftXAtHornHeight
          const safetyGap = 60; // minimum required gap in font units
          const overlapRisk = horn.excessRight - leftXAtHornHeight;
          if (overlapRisk > -safetyGap) {
            const adjustment = overlapRisk + safetyGap;
            return originalKern + adjustment;
          }
        }

        return originalKern;
      };

      // Global Smart Kerning Synchronization cloned from base characters
      if (!font.kerningPairs) {
        font.kerningPairs = {};
      }
      const pairs = font.kerningPairs as Record<string, number>;
      const newPairs: Record<string, number> = {};

      // Map base glyph index to all of its Vietnamese variants' glyph indexes
      const baseIndexToVariants: Record<number, number[]> = {};
      VIETNAMESE_RECIPES.forEach(recipe => {
        const baseChar = recipe.baseChar;
        const targetIndex = getGlyphIndexForChar(recipe.char);
        const baseIndex = getGlyphIndexForChar(baseChar);
        if (baseIndex > 0 && targetIndex > 0 && baseIndex !== targetIndex) {
          if (!baseIndexToVariants[baseIndex]) {
            baseIndexToVariants[baseIndex] = [];
          }
          if (!baseIndexToVariants[baseIndex].includes(targetIndex)) {
            baseIndexToVariants[baseIndex].push(targetIndex);
          }
        }
      });

      // Loop over every original kerning pair and expand it to all combinations of its base & variant characters
      for (const [key, val] of Object.entries(pairs)) {
        const parts = key.split(',');
        if (parts.length !== 2) continue;
        const g1 = parseInt(parts[0], 10);
        const g2 = parseInt(parts[1], 10);

        // Get all variants (including base) for left and right
        const leftCandidates = [g1];
        if (baseIndexToVariants[g1]) {
          leftCandidates.push(...baseIndexToVariants[g1]);
        }

        const rightCandidates = [g2];
        if (baseIndexToVariants[g2]) {
          rightCandidates.push(...baseIndexToVariants[g2]);
        }

        // If either side has variants, expand to all pair combinations
        if (leftCandidates.length > 1 || rightCandidates.length > 1) {
          leftCandidates.forEach(g1_cand => {
            rightCandidates.forEach(g2_cand => {
              // Skip the original base pair itself to avoid overwriting
              if (g1_cand === g1 && g2_cand === g2) return;

              // Check if we need horn adjustments (for the left character if it has a horn)
              let adjustedVal = val;
              const recipeForCand = VIETNAMESE_RECIPES.find(r => getGlyphIndexForChar(r.char) === g1_cand);
              if (recipeForCand) {
                const horn = charHornInfo[recipeForCand.char];
                if (horn) {
                  adjustedVal = adjustClonedKern(horn, val, g2_cand);
                }
              }

              newPairs[`${g1_cand},${g2_cand}`] = adjustedVal;
            });
          });
        }
      }

      Object.assign(pairs, newPairs);

      // To prevent opentype.js from throwing serialization errors such as "lookupList table too big"
      // or "Table GPOS too big" (due to complex features/lookups in the original font that opentype.js
      // struggles to serialize from scratch), we delete GPOS, GSUB, and GDEF tables from the font's 
      // internal tables list before writing. 
      // Since we use injectAdvancedLayoutTables below to perfectly copy the pristine layout tables 
      // byte-for-byte from the original font buffer, this bypasses the buggy serializer while 
      // completely preserving original kerning, ligatures, and features!
      if (font.tables) {
        delete font.tables.gpos;
        delete font.tables.gsub;
        delete font.tables.gdef;
      }

      // Write font tables to binary OpenType ArrayBuffer
      let buffer = font.toArrayBuffer();
      
      // Build standard 'kern' table
      const kernTableBytes = buildKernTable(font);
      
      // Inject advanced layouts & preserve pristine tables
      buffer = injectAdvancedLayoutTables(buffer, rawFontBuffer, optimizeWebKerning, kernTableBytes);
      
      setCompiledBuffer(buffer);

      if (downloadAfterCompile) {
        const blob = new Blob([buffer], { type: 'font/opentype' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const cleanFamilyName = (customFamilyName || 'Vietnamese_Font').replace(/[^a-zA-Z0-9-]/g, '_');
        a.download = `${cleanFamilyName}.otf`;
        a.click();
        URL.revokeObjectURL(url);
        
        setAppSuccess('Đã đóng gói và tải xuống font thành công (Version 2.0 - Auto-Composition)!');
      } else {
        setAppSuccess('Đã đồng bộ hóa thành công 134 ký tự tiếng Việt có dấu! Hãy chạy thử bên dưới.');
      }
    } catch (err: any) {
      console.error(err);
      setAppError('Biên dịch thất bại: ' + (err.message || 'Kiểm tra lại cấu hình diacritics'));
    } finally {
      setCompiling(false);
    }
  }, [originalFont, rawFontBuffer, templates, rules, overrides, customFamilyName, customSubfamilyName]);

  return (
    <div className="min-h-screen bg-neutral-50/40 text-neutral-900 font-sans pb-16">
      
      {/* Dynamic Floating Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full px-4 sm:px-0">
        {appError && (
          <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 text-red-800 text-sm rounded-xl shadow-lg animate-slide-in relative">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="pr-6">
              <p className="font-semibold">Thông báo</p>
              <p className="text-xs text-red-700/90 mt-0.5">{appError}</p>
            </div>
            <button 
              onClick={() => setAppError(null)}
              className="absolute top-3 right-3 text-red-400 hover:text-red-700 hover:bg-red-100/50 p-1 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {appSuccess && (
          <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-xl shadow-lg animate-slide-in relative">
            <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="pr-6">
              <p className="font-semibold">Thành công</p>
              <p className="text-xs text-green-700/90 mt-0.5">{appSuccess}</p>
            </div>
            <button 
              onClick={() => setAppSuccess(null)}
              className="absolute top-3 right-3 text-green-400 hover:text-green-700 hover:bg-green-100/50 p-1 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Branding */}
        <header id="app-header" className="border-b border-neutral-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-950 tracking-tight font-sans flex items-center gap-2">
              <Sliders className="w-6 h-6 text-neutral-950" />
              Việt hóa tàu nhanh
            </h1>
            <p className="text-sm text-neutral-500 mt-1 max-w-2xl leading-normal">
              Việt hóa theo chủ nghĩa vô học: Chỉ cần thêm 9 ký tự dấu hệ thống sẽ xào lại toàn bộ font.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-lg border border-neutral-200/50 text-xs text-neutral-600">
            <HelpCircle className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>Bản quyền ư? Bạn không có quyền Việt hóa font của người khác đâu nhưng mà quan tâm làm gì cơ chứ.</span>
          </div>
        </header>

        {/* Step 1: Upload Font */}
        <section id="upload-step-section">
          <FontUploader
            onFontLoaded={handleFontLoaded}
            onReset={handleReset}
            metadata={metadata}
            filename={filename}
          />
        </section>

        {originalFont && metadata && (
          <>
            {/* V2 WORKSPACE TABS */}
            <div className="space-y-4">
              
              {/* Tab Switcher Headers */}
              <div className="flex border-b border-neutral-200">
                <button
                  onClick={() => setActiveTab('components')}
                  className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition ${
                    activeTab === 'components'
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-950'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Bước 1: Thiết kế 9 mẫu dấu</span>
                </button>
                <button
                  onClick={() => setActiveTab('composite')}
                  className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition ${
                    activeTab === 'composite'
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-950'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Bước 2: Căn chỉnh nâng cao (nếu bạn thực sự có tâm)</span>
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="animate-fade-in scroll-mt-6">
                {activeTab === 'components' ? (
                  <DiacriticStudio
                    font={originalFont}
                    fontMetadata={metadata}
                    templates={templates}
                    rules={rules}
                    onUpdateTemplate={handleUpdateTemplate}
                    onUpdateRules={handleUpdateRules}
                  />
                ) : (
                  <AutoCompositeBoard
                    font={originalFont}
                    fontMetadata={metadata}
                    templates={templates}
                    rules={rules}
                    overrides={overrides}
                    onUpdateOverride={handleUpdateOverride}
                  />
                )}
              </div>

            </div>

            {/* Step 3: Font Playground & Rename Configuration Panel */}
            <section id="compile-and-playground-section" className="space-y-6 pt-6 border-t border-neutral-200">
              
              {/* Custom Metadata Rename Card */}
              <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <Sliders className="w-5 h-5 text-neutral-800" />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      Cấu hình Tên Font Việt Hóa
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Đổi tên Font để tránh bị ghi đè, trùng lặp hoặc lẫn lộn với font gốc chưa Việt hóa khi cài đặt vào máy tính.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 block">Tên Family Font (Font Family Name):</label>
                    <input
                      type="text"
                      value={customFamilyName}
                      onChange={(e) => setCustomFamilyName(e.target.value)}
                      placeholder="Ví dụ: Roboto Viet"
                      className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:border-neutral-400 outline-hidden font-semibold text-neutral-800"
                    />
                    <p className="text-[11px] text-neutral-400">
                      Tên nhóm font chính. Khuyên dùng thêm hậu tố như <strong className="font-semibold text-neutral-600">"Viet"</strong> hoặc <strong className="font-semibold text-neutral-600">"VH"</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 block">Subfamily (Regular/Bold/Italic/etc):</label>
                    <input
                      type="text"
                      value={customSubfamilyName}
                      onChange={(e) => setCustomSubfamilyName(e.target.value)}
                      placeholder="Ví dụ: Regular"
                      className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:border-neutral-400 outline-hidden font-semibold text-neutral-800"
                    />
                    <p className="text-[11px] text-neutral-400">
                      Kiểu dáng/định dạng của font. Giữ nguyên theo gốc nếu chỉ Việt hóa 1 style.
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-50/50 p-3.5 rounded-lg border border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-600">
                  <div>
                    <span className="text-neutral-400 font-medium">Full Font Name (Tên đầy đủ):</span>
                    <p className="font-mono font-semibold text-neutral-700 mt-0.5">
                      {customFamilyName} {customSubfamilyName || 'Regular'}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-medium">PostScript Name (Không khoảng trắng):</span>
                    <p className="font-mono font-semibold text-neutral-700 mt-0.5">
                      {`${customFamilyName}-${customSubfamilyName || 'Regular'}`.replace(/[^a-zA-Z0-9-]/g, '')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compile & Download Controls Card */}
              <div className="bg-neutral-900 text-neutral-100 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 border border-neutral-850 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Đóng Gói Bộ Font Việt Hóa 2.0
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-md">
                    Biên dịch toàn bộ 134 ký tự đã được thiết lập tự động bên trên thành một tệp font thống nhất, bảo toàn nguyên vẹn tính năng OpenType và Kerning gốc.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                  <button
                    id="btn-recompile"
                    onClick={() => handleCompileFont(false)}
                    disabled={compiling}
                    className="flex-1 sm:flex-none py-2.5 px-4 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-45 cursor-pointer text-neutral-950 border border-transparent hover:opacity-90"
                    style={{ backgroundColor: '#ffa400' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${compiling ? 'animate-spin' : ''}`} />
                    Cập nhật & Chạy thử
                  </button>

                  <button
                    id="btn-download"
                    onClick={() => handleCompileFont(true)}
                    disabled={compiling}
                    className="flex-1 sm:flex-none py-2.5 px-5 font-bold text-xs rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-45 cursor-pointer border border-transparent"
                    style={{ backgroundColor: '#0077ff', color: '#ffffff' }}
                  >
                    <Download className="w-4 h-4" />
                    Tải Font Mới (.otf / .ttf)
                  </button>
                </div>
              </div>

              {/* Font Playground container */}
              <FontPlayground
                fontBuffer={compiledBuffer}
                fontFamilyName={customFamilyName || 'VietnameseizedFontPreview'}
              />

            </section>
          </>
        )}

        {/* Informative Step Tutorial (When no font loaded yet) */}
        {!originalFont && (
          <section id="instructional-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="bg-white border border-neutral-100 p-5 rounded-xl shadow-xs">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-neutral-950 text-white text-xs font-bold rounded-full mb-3">1</span>
              <h4 className="font-bold text-sm text-neutral-900 mb-1">Cấu hình Dấu phụ mẫu</h4>
              <p className="text-xs text-neutral-500 leading-normal">
                Không cần can thiệp tẻ nhạt vào từng ô chữ. Bạn chỉ cần nạp 9 nét dấu mẫu phụ (sắc, huyền, hỏi, ngã, nặng, mũ...) và tinh chỉnh tỷ lệ thu phóng chung một lần duy nhất.
              </p>
            </div>
            
            <div className="bg-white border border-neutral-100 p-5 rounded-xl shadow-xs">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-neutral-950 text-white text-xs font-bold rounded-full mb-3">2</span>
              <h4 className="font-bold text-sm text-neutral-900 mb-1">Căn chỉnh thông minh</h4>
              <p className="text-xs text-neutral-500 leading-normal">
                Hệ thống tự động căn giữa dấu phụ theo trục X của chữ cái gốc. Trục Y tự động nhảy sát đỉnh hoặc đáy sườn chữ cái. Có thể tinh chỉnh offset riêng biệt nếu muốn.
              </p>
            </div>

            <div className="bg-white border border-neutral-100 p-5 rounded-xl shadow-xs">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-neutral-950 text-white text-xs font-bold rounded-full mb-3">3</span>
              <h4 className="font-bold text-sm text-neutral-900 mb-1">Sao chép Kerning 100%</h4>
              <p className="text-xs text-neutral-500 leading-normal">
                Tất cả 134 ký tự mới tự động được thừa hưởng (clone) 100% dữ liệu Kerning từ các chữ cái gốc (a, e, o, u, d...). Đảm bảo khoảng cách hiển thị văn bản tự nhiên, tinh tế.
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
