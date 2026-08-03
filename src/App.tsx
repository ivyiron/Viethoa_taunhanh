import { useState, useCallback, useEffect } from 'react';
import * as opentype from 'opentype.js';
import { FontUploader } from './components/FontUploader';
import { DiacriticStudio } from './components/DiacriticStudio';
import { AutoCompositeBoard } from './components/AutoCompositeBoard';
import { FontPlayground } from './components/FontPlayground';
import { DiacriticTemplate, AutoPositionRules, GlyphOverrideState, FontMetadata, VietnameseProjectFile, AutoSpacingRules, AutoKerningSettings } from './types';
import { 
  DEFAULT_DIACRITICS, 
  DEFAULT_AUTO_RULES, 
  VIETNAMESE_RECIPES, 
  STEP2_RECIPES,
  getTrackingFamilyMembers,
  isUnaccentedBaseChar,
  composeGlyphPath, 
  ensureKerningPairsPopulated, 
  injectAdvancedLayoutTables, 
  buildKernTable,
  buildGPOSTable,
  findCandidateGlyph,
  extractSvgFromGlyph,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from './utils';
import { AutoKerningStudio } from './components/AutoKerningStudio';
import { HelpGuideModal } from './components/HelpGuideModal';
import { generateFullFontKerningPairs, calculateAutoSpacingAdjustments, findGlyphIndex } from './utils/kerningEngine';
import { Sliders, Sparkles, Download, RefreshCw, HelpCircle, Check, AlertTriangle, FileType, X, Settings2, LayoutGrid, ShieldCheck, CheckCircle2, FolderDown, FolderOpen, SlidersHorizontal } from 'lucide-react';

const DEFAULT_SPACING_RULES: AutoSpacingRules = {
  spacingPreset: 'normal',
  globalTrackingOffset: 0,
  curveTighteningPercent: 15,
  applyToLatin: true,
  applyToVietnamese: true,
  applyToNumbers: true,
  applyToPunctuation: true,
};

const DEFAULT_KERNING_SETTINGS: AutoKerningSettings = {
  intensityMultiplier: 1.0,
  minThreshold: 10,
  applyClassics: true,
  applyUpperLower: true,
  applyPunctuation: true,
  applyNumbers: true,
  applyVietnameseVariants: true,
  customPairs: {},
};


export default function App() {
  const [originalFont, setOriginalFont] = useState<opentype.Font | null>(null);
  const [rawFontBuffer, setRawFontBuffer] = useState<ArrayBuffer | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FontMetadata | null>(null);
  
  // V2 Core States
  const [templates, setTemplates] = useState<Record<string, DiacriticTemplate>>({});
  const [rules, setRules] = useState<AutoPositionRules>(DEFAULT_AUTO_RULES);
  const [overrides, setOverrides] = useState<Record<string, GlyphOverrideState>>({});
  const [spacingRules, setSpacingRules] = useState<AutoSpacingRules>(DEFAULT_SPACING_RULES);
  const [kerningSettings, setKerningSettings] = useState<AutoKerningSettings>(DEFAULT_KERNING_SETTINGS);

  // Existing Vietnamese glyph preservation
  const [preserveExistingGlyphs, setPreserveExistingGlyphs] = useState<boolean>(true);
  const [existingGlyphInfo, setExistingGlyphInfo] = useState<{ count: number; total: number; samples: string[] }>({ count: 0, total: 134, samples: [] });

  const [activeTab, setActiveTab] = useState<'components' | 'composite' | 'spacing'>('components');
  const [showSpacingWarningModal, setShowSpacingWarningModal] = useState<boolean>(false);
  const [hasConfirmedSpacingWarning, setHasConfirmedSpacingWarning] = useState<boolean>(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState<boolean>(false);
  
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

    // Scan font to detect existing Vietnamese characters
    const existingList: string[] = [];
    VIETNAMESE_RECIPES.forEach((recipe) => {
      const idx = loadedFont.charToGlyphIndex(recipe.char);
      if (idx > 0) {
        const g = loadedFont.glyphs.get(idx);
        if (g && g.path && g.path.commands && g.path.commands.length > 0) {
          existingList.push(recipe.char);
        }
      }
    });

    const existingInfo = {
      count: existingList.length,
      total: VIETNAMESE_RECIPES.length,
      samples: existingList.slice(0, 8)
    };
    setExistingGlyphInfo(existingInfo);

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

    if (existingInfo.count === VIETNAMESE_RECIPES.length) {
      setAppSuccess(`Font đã có ĐẦY ĐỦ 134/134 ký tự tiếng Việt! Ứng dụng sẽ GIỮ NGUYÊN các ký tự gốc và không ghi đè.`);
    } else if (existingInfo.count > 0) {
      setAppSuccess(`Phát hiện font đã có sẵn ${existingInfo.count}/${VIETNAMESE_RECIPES.length} ký tự tiếng Việt (ví dụ: ${existingInfo.samples.slice(0, 6).join(', ')}...). App sẽ GIỮ NGUYÊN các ký tự này và tự động lấy mẫu dấu từ chúng để tạo gợi ý dấu cho các ký tự còn thiếu!`);
    } else if (extractedCount > 0) {
      setAppSuccess(`Đã tự động trích xuất thành công ${extractedCount}/9 dấu mẫu (${extractedList.join(', ')}) trực tiếp từ các ký tự có sẵn trong tệp font!`);
    } else {
      setAppSuccess('Đã nạp tệp font thành công. Sử dụng hệ thống dấu mẫu mặc định.');
    }

    // Initialize individual overrides to empty defaults
    const initialOverrides: Record<string, GlyphOverrideState> = {};
    STEP2_RECIPES.forEach((recipe) => {
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
    setHasConfirmedSpacingWarning(false);
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
    setHasConfirmedSpacingWarning(false);
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
      const next = { ...prev };
      const current = next[char] || {
        char,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        advanceWidthTweak: 0,
        isCompleted: false
      };

      next[char] = { ...current, ...updated };

      // If advanceWidthTweak (tracking) is modified, propagate to all related family members EXCEPT unaccented base characters
      if (updated.advanceWidthTweak !== undefined) {
        const tweakVal = updated.advanceWidthTweak;
        const familyMembers = getTrackingFamilyMembers(char, false);
        familyMembers.forEach((fChar) => {
          if (fChar !== char && !isUnaccentedBaseChar(fChar)) {
            const fCurrent = next[fChar] || {
              char: fChar,
              offsetX: 0,
              offsetY: 0,
              scaleX: 1.0,
              scaleY: 1.0,
              advanceWidthTweak: 0,
              isCompleted: false
            };
            next[fChar] = {
              ...fCurrent,
              advanceWidthTweak: tweakVal
            };
          }
        });
      }

      return next;
    });
  }, []);

  const handleBatchUpdateOverrides = useCallback((updater: (prev: Record<string, GlyphOverrideState>) => Record<string, GlyphOverrideState>) => {
    setOverrides(updater);
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
      
      STEP2_RECIPES.forEach(recipe => {
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
        return findGlyphIndex(font, c);
      };

      const charHornInfo: Record<string, { yMin: number; yMax: number; excessRight: number }> = {};

      // Compose and inject all Vietnamese composite glyphs & base character tracking tweaks
      STEP2_RECIPES.forEach(recipe => {
        const unicode = recipe.char.charCodeAt(0);
        const existingIndex = font.charToGlyphIndex(recipe.char);
        const existingGlyph = existingIndex > 0 ? font.glyphs.get(existingIndex) : null;
        const hasOriginalPath = existingGlyph && existingGlyph.path && existingGlyph.path.commands && existingGlyph.path.commands.length > 0;

        const isBaseChar = recipe.components.length === 0;

        // If character already exists natively in the font and preserve option is enabled, DO NOT overwrite it
        if (!isBaseChar && preserveExistingGlyphs && hasOriginalPath) {
          return;
        }

        const override = overrides[recipe.char];
        
        // If it's a base character with no tracking tweak, do not overwrite font's native glyph
        if (isBaseChar && (!override || !override.advanceWidthTweak)) {
          return;
        }

        // Bake composite path and compute customized tracking
        const { path, advanceWidth, hornInfo } = composeGlyphPath(font, recipe, templates, rules, override, preserveExistingGlyphs);
        if (hornInfo) {
          charHornInfo[recipe.char] = hornInfo;
        }

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

      // Apply Full Font Auto Spacing Adjustments (Sidebearings / Tracking)
      const autoSpacingMap = calculateAutoSpacingAdjustments(font, spacingRules);
      for (let i = 0; i < font.glyphs.length; i++) {
        const g = font.glyphs.get(i);
        if (g && g.name) {
          const charStr = g.unicode ? String.fromCharCode(g.unicode) : g.name;
          if (autoSpacingMap[charStr]) {
            g.advanceWidth = Math.max(50, (g.advanceWidth || 500) + autoSpacingMap[charStr]);
          }
        }
      }

      // Generate Full-Font Auto Kerning Pairs
      const autoKerningPairs = generateFullFontKerningPairs(font, kerningSettings);
      autoKerningPairs.forEach(pair => {
        pairs[`${pair.indexLeft},${pair.indexRight}`] = pair.value;
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

      // Ensure user custom kerning pairs take absolute precedence over base character cloned expansion
      if (kerningSettings.customPairs) {
        Object.entries(kerningSettings.customPairs).forEach(([pairKey, customVal]) => {
          const valNum = Number(customVal) || 0;
          const parts = pairKey.split(',');
          if (parts.length === 2) {
            const idxL = findGlyphIndex(font, parts[0]);
            const idxR = findGlyphIndex(font, parts[1]);
            if (idxL > 0 && idxR > 0) {
              if (valNum === 0) {
                delete pairs[`${idxL},${idxR}`];
              } else {
                pairs[`${idxL},${idxR}`] = valNum;
              }
            }
          }
        });
      }

      // To prevent opentype.js from throwing serialization errors such as "lookupList table too big"
      // or "Table GPOS too big" (due to complex features/lookups in the original font that opentype.js
      // struggles to serialize from scratch), we delete GPOS, GSUB, and GDEF tables from the font's 
      // internal tables list before writing. 
      // Since we use injectAdvancedLayoutTables below to perfectly copy the pristine layout tables 
      // byte-for-byte from the original font buffer, this bypasses the buggy serializer while 
      // completely preserving original kerning, ligatures, and features!
      if (font.tables) {
        if (font.tables.head) {
          font.tables.head.flags |= 0x0040; // Set TrueType OVERLAP_SIMPLE flag (bit 6) for composite glyph rasterization
        }
        delete font.tables.gpos;
        delete font.tables.gsub;
        delete font.tables.gdef;
      }

      // Write font tables to binary OpenType ArrayBuffer
      let buffer = font.toArrayBuffer();
      
      // Build standard 'kern' table and OpenType GPOS table for full cross-browser kerning support
      const kernTableBytes = buildKernTable(font);
      const gposTableBytes = buildGPOSTable(font);
      
      // Inject custom GPOS and kern tables & preserve pristine original layout tables
      buffer = injectAdvancedLayoutTables(buffer, rawFontBuffer, false, kernTableBytes, gposTableBytes);
      
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
  }, [originalFont, rawFontBuffer, templates, rules, overrides, preserveExistingGlyphs, customFamilyName, customSubfamilyName, spacingRules, kerningSettings]);

  // Auto-sync & recompile font preview when kerning settings or spacing rules change
  useEffect(() => {
    if (!originalFont || !rawFontBuffer) return;
    const timer = setTimeout(() => {
      handleCompileFont(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [spacingRules, kerningSettings, originalFont, rawFontBuffer, handleCompileFont]);

  // Project Save Handler (.ftn)
  const handleSaveProject = useCallback(() => {
    if (!rawFontBuffer || !metadata || !filename) {
      setAppError('Không tìm thấy dữ liệu font để lưu file dự án!');
      return;
    }

    try {
      const base64Buffer = arrayBufferToBase64(rawFontBuffer);
      const projectData: VietnameseProjectFile = {
        ftnVersion: '1.0',
        appName: 'VietHoaTauNhanh',
        savedAt: new Date().toISOString(),
        filename: filename,
        fontMetadata: metadata,
        rawFontBufferBase64: base64Buffer,
        customFamilyName: customFamilyName,
        customSubfamilyName: customSubfamilyName,
        preserveExistingGlyphs: preserveExistingGlyphs,
        templates: templates,
        rules: rules,
        overrides: overrides,
        spacingRules: spacingRules,
        kerningSettings: kerningSettings,
      };

      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const cleanFamily = (customFamilyName || metadata.family || 'du_an').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanFamily}_VietHoa.ftn`;
      a.click();
      URL.revokeObjectURL(url);

      setAppSuccess('Đã lưu file dự án (.ftn) thành công! Bạn có thể lưu lại và nạp lại vào lần làm việc sau.');
    } catch (err: any) {
      console.error(err);
      setAppError('Lỗi khi xuất file dự án: ' + (err.message || 'Không thể đóng gói dữ liệu'));
    }
  }, [rawFontBuffer, metadata, filename, customFamilyName, customSubfamilyName, preserveExistingGlyphs, templates, rules, overrides]);

  // Project Load Handler (.ftn)
  const handleLoadProjectData = useCallback((projectData: VietnameseProjectFile) => {
    try {
      if (!projectData.rawFontBufferBase64) {
        throw new Error('Dữ liệu font trong file .ftn bị trống.');
      }

      const buffer = base64ToArrayBuffer(projectData.rawFontBufferBase64);
      const font = opentype.parse(buffer);

      setOriginalFont(font);
      setRawFontBuffer(buffer);
      setFilename(projectData.filename || 'font_project.otf');
      setMetadata(projectData.fontMetadata);

      if (projectData.customFamilyName !== undefined) {
        setCustomFamilyName(projectData.customFamilyName);
      }
      if (projectData.customSubfamilyName !== undefined) {
        setCustomSubfamilyName(projectData.customSubfamilyName);
      }
      if (projectData.preserveExistingGlyphs !== undefined) {
        setPreserveExistingGlyphs(projectData.preserveExistingGlyphs);
      }

      if (projectData.templates) {
        const mergedTemplates: Record<string, DiacriticTemplate> = {};
        DEFAULT_DIACRITICS.forEach((dia) => {
          mergedTemplates[dia.id] = { ...dia };
        });
        Object.keys(projectData.templates).forEach((key) => {
          if (isNaN(Number(key)) && projectData.templates[key]) {
            mergedTemplates[key] = projectData.templates[key];
          }
        });
        setTemplates(mergedTemplates);
      }
      if (projectData.rules) {
        setRules({ ...DEFAULT_AUTO_RULES, ...projectData.rules });
      }
      if (projectData.overrides) {
        setOverrides(projectData.overrides);
      }
      if (projectData.spacingRules) {
        setSpacingRules(projectData.spacingRules);
      }
      if (projectData.kerningSettings) {
        setKerningSettings(projectData.kerningSettings);
      }

      // Recalculate existing glyph info
      let count = 0;
      const samples: string[] = [];
      VIETNAMESE_RECIPES.forEach((recipe) => {
        const gIndex = font.charToGlyphIndex(recipe.char);
        if (gIndex > 0) {
          const glyph = font.glyphs.get(gIndex);
          if (glyph && ((glyph.path && glyph.path.commands && glyph.path.commands.length > 0) || (glyph.numberOfContours && glyph.numberOfContours > 0))) {
            count++;
            if (samples.length < 10) samples.push(recipe.char);
          }
        }
      });
      setExistingGlyphInfo({ count, total: 134, samples });

      setCompiledBuffer(null);
      setAppSuccess(`Đã nạp thành công file dự án "${projectData.filename}" (.ftn)!`);
    } catch (err: any) {
      console.error(err);
      setAppError('Không thể mở file dự án .ftn: ' + (err.message || 'File hỏng hoặc không đúng định dạng.'));
    }
  }, []);


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
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 sm:px-6 lg:px-10 space-y-8">
        
        {/* Header Branding */}
        <header id="app-header" className="border-b border-neutral-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <img src="/Logo.svg" alt="Việt hóa tàu nhanh" className="h-11 sm:h-14 w-auto object-contain object-left" />
            </div>
            <p className="text-sm text-neutral-500 mt-2 max-w-2xl leading-normal font-medium">
              Hệ thống Việt hóa tàu nhanh: Chỉ cần thêm 9 ký tự dấu hệ thống sẽ xào lại toàn bộ font.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowHelpGuideModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              title="Hướng dẫn sử dụng Việt Hóa Font"
            >
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hướng dẫn sử dụng</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-lg border border-neutral-200/50 text-xs text-neutral-600">
              <HelpCircle className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>Bản quyền ư? Bạn không có quyền Việt hóa font của người khác đâu nhưng mà quan tâm làm gì cơ chứ.</span>
            </div>
          </div>
        </header>

        <HelpGuideModal isOpen={showHelpGuideModal} onClose={() => setShowHelpGuideModal(false)} />

        {/* Step 1: Upload Font */}
        <section id="upload-step-section">
          <FontUploader
            onFontLoaded={handleFontLoaded}
            onProjectLoaded={handleLoadProjectData}
            onReset={handleReset}
            metadata={metadata}
            filename={filename}
          />
        </section>


        {originalFont && metadata && (
          <>
            {/* Notification Banner when original font already contains some Vietnamese glyphs */}
            {existingGlyphInfo.count > 0 && (
              <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-amber-950 shadow-xs animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl shrink-0 text-amber-800 mt-0.5 md:mt-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-amber-950">
                        Phát hiện {existingGlyphInfo.count}/{existingGlyphInfo.total} ký tự tiếng Việt đã có sẵn trong font gốc
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                        Mẫu: {existingGlyphInfo.samples.join(', ')}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 leading-relaxed">
                      Ứng dụng sẽ <strong>bảo toàn 100% bản gốc</strong> của các ký tự này và không ghi đè khi xuất font. Đồng thời, dữ liệu dấu của chúng đã được tự động trích xuất để tạo gợi ý cho các ký tự còn thiếu.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-amber-950 bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-amber-200/80 cursor-pointer shrink-0 transition shadow-2xs select-none">
                  <input
                    type="checkbox"
                    checked={preserveExistingGlyphs}
                    onChange={(e) => setPreserveExistingGlyphs(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                  <span>Giữ nguyên ký tự có sẵn (Khuyên dùng)</span>
                </label>
              </div>
            )}

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
                  <span>Bước 2: Căn chỉnh nâng cao</span>
                </button>
                <button
                  onClick={() => {
                    if (hasConfirmedSpacingWarning || activeTab === 'spacing') {
                      setActiveTab('spacing');
                      if ((!compiledBuffer || compiledBuffer === rawFontBuffer) && originalFont) {
                        handleCompileFont(false);
                      }
                    } else {
                      setShowSpacingWarningModal(true);
                    }
                  }}
                  className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition ${
                    activeTab === 'spacing'
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-950'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Bước 3: Auto Spacing & Kerning</span>
                </button>
              </div>

              {/* Warning Modal before Auto Spacing & Kerning */}
              {showSpacingWarningModal && (
                <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-extrabold text-neutral-900">
                          Xác Nhận Auto Spacing & Kerning
                        </h3>
                        <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                          Ứng dụng sẽ thay đổi spacing và kerning của hầu hết các ký tự trong font gốc. Để đạt kết quả tối ưu, chỉ nên thực hiện bước này khi thực sự cần thiết và trên phiên bản font đã được Việt hóa, căn chỉnh hoàn chỉnh.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => setShowSpacingWarningModal(false)}
                        className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
                      >
                        Bỏ qua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSpacingWarningModal(false);
                          setHasConfirmedSpacingWarning(true);
                          setActiveTab('spacing');
                          if ((!compiledBuffer || compiledBuffer === rawFontBuffer) && originalFont) {
                            handleCompileFont(false);
                          }
                        }}
                        className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                ) : activeTab === 'composite' ? (
                  <AutoCompositeBoard
                    font={originalFont}
                    fontMetadata={metadata}
                    templates={templates}
                    rules={rules}
                    overrides={overrides}
                    onUpdateOverride={handleUpdateOverride}
                    onBatchUpdateOverrides={handleBatchUpdateOverrides}
                    preserveExistingGlyphs={preserveExistingGlyphs}
                  />
                ) : (
                  <AutoKerningStudio
                    font={originalFont}
                    rawFontBuffer={rawFontBuffer}
                    compiledBuffer={compiledBuffer}
                    fontMetadata={metadata}
                    spacingRules={spacingRules}
                    kerningSettings={kerningSettings}
                    onUpdateSpacingRules={(partial) => setSpacingRules(prev => ({ ...prev, ...partial }))}
                    onUpdateKerningSettings={(partial) => setKerningSettings(prev => ({ ...prev, ...partial }))}
                    onCompileFont={() => handleCompileFont(false)}
                    compiling={compiling}
                  />
                )}
              </div>

            </div>

            {/* Step 3: Font Playground & Rename Configuration Panel */}
            <section id="compile-and-playground-section" className="space-y-6 pt-6 border-t border-neutral-200">
              
              {/* Custom Metadata Rename Card */}
              <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="p-2 bg-neutral-900 text-white rounded-xl inline-flex items-center justify-center shrink-0 shadow-2xs">
                      <Sliders className="w-4.5 h-4.5 text-amber-400" />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-neutral-950 tracking-tight">
                        Cấu Hình Tên Font Việt Hóa
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Đổi tên Font để tránh bị ghi đè, trùng lặp hoặc lẫn lộn với font gốc chưa Việt hóa khi cài đặt vào máy tính.
                      </p>
                    </div>
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
              <div className="bg-neutral-900 text-neutral-100 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-neutral-800 shadow-md">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="p-2 bg-neutral-800 text-white rounded-xl inline-flex items-center justify-center shrink-0 border border-neutral-700/60 shadow-2xs">
                    <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight">
                      Đóng Gói Bộ Font Việt Hóa 2.0
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5 max-w-md">
                      Lưu font hoặc lưu file dự án.
                    </p>
                  </div>
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
                    id="btn-save-project"
                    onClick={handleSaveProject}
                    className="flex-1 sm:flex-none py-2.5 px-4 font-bold text-xs rounded-lg hover:bg-emerald-600 bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer border border-emerald-500/30"
                  >
                    <FolderDown className="w-4 h-4 text-emerald-200" />
                    Lưu Tệp Dự Án (.ftn)
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

        {/* Footer Credit */}
        <footer className="pt-6 pb-4 border-t border-neutral-200/80 text-center text-xs text-neutral-400 font-medium">
          <a
            href="https://www.instagram.com/tuannlla/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-800 transition-colors font-semibold underline decoration-neutral-300 underline-offset-2"
          >
            © LaTuan Vibecode
          </a>
        </footer>

      </div>
    </div>
  );
}
