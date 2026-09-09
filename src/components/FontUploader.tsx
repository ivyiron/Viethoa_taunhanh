import React, { useRef, useState } from 'react';
import * as opentype from 'opentype.js';
import { Upload, FileType, CheckCircle, Info, FolderOpen, Sliders, Wand2, CopyCheck } from 'lucide-react';
import { FontMetadata, VietnameseProjectFile } from '../types';
import { parseFontResilient } from '../utils';

interface FontUploaderProps {
  onFontLoaded: (font: opentype.Font, filename: string, metadata: FontMetadata, rawBuffer: ArrayBuffer) => void;
  onProjectLoaded?: (projectData: VietnameseProjectFile) => void;
  onReset: () => void;
  metadata: FontMetadata | null;
  filename: string | null;
}


// Helper to safely retrieve localized font name strings across flat and platform-specific formats in opentype.js
const getFontName = (font: any, key: string, defaultValue: string): string => {
  if (!font || !font.names) return defaultValue;
  
  // 1. Check flat structure first (e.g., font.names.fontFamily)
  const flatObj = font.names[key];
  if (flatObj) {
    if (typeof flatObj === 'string') return flatObj;
    if (flatObj.en) return flatObj.en;
    if (flatObj.vi) return flatObj.vi;
    const langKeys = Object.keys(flatObj);
    if (langKeys.length > 0) {
      const val = flatObj[langKeys[0]];
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object') {
        const subKeys = Object.keys(val);
        if (subKeys.length > 0) return val[subKeys[0]];
      }
    }
  }

  // 2. Check platform-specific structures (e.g., font.names.windows.fontFamily)
  const platforms = ['windows', 'macintosh'];
  for (const plat of platforms) {
    const platObj = font.names[plat]?.[key];
    if (platObj) {
      if (typeof platObj === 'string') return platObj;
      if (platObj.en) return platObj.en;
      if (platObj.vi) return platObj.vi;
      const langKeys = Object.keys(platObj);
      if (langKeys.length > 0) {
        const val = platObj[langKeys[0]];
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object') {
          const subKeys = Object.keys(val);
          if (subKeys.length > 0) return val[subKeys[0]];
        }
      }
    }
  }

  return defaultValue;
};

export const FontUploader: React.FC<FontUploaderProps> = ({
  onFontLoaded,
  onProjectLoaded,
  onReset,
  metadata,
  filename
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.name.endsWith('.ftn')) {
      setLoading(true);
      setError(null);
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const projectData = JSON.parse(text) as VietnameseProjectFile;
            if (!projectData || !projectData.rawFontBufferBase64) {
              throw new Error('Cấu trúc file .ftn không đúng định dạng dự án Việt hóa.');
            }
            if (onProjectLoaded) {
              onProjectLoaded(projectData);
            }
          } catch (parseErr: any) {
            console.error(parseErr);
            setError('Lỗi khi đọc file dự án .ftn: ' + (parseErr.message || 'File hỏng hoặc không đúng định dạng.'));
          } finally {
            setLoading(false);
          }
        };
        reader.onerror = () => {
          setError('Đã xảy ra lỗi khi đọc file dự án.');
          setLoading(false);
        };
        reader.readAsText(file);
      } catch (err) {
        console.error(err);
        setError('Đã xảy ra lỗi không xác định.');
        setLoading(false);
      }
      return;
    }

    if (!file.name.endsWith('.otf') && !file.name.endsWith('.ttf')) {
      setError('Vui lòng tải lên file font định dạng .otf, .ttf hoặc file dự án .ftn');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;

          // parseFontResilient falls back to dropping broken GPOS/GSUB/GDEF/kern tables
          // so that fonts exported by older builds of this app can still be re-opened.
          const { font, degraded } = parseFontResilient(buffer);
          if (degraded) {
            console.warn('Font has damaged layout tables (GPOS/GSUB/GDEF/kern). They were dropped in order to load the outlines.');
          }
          
          // Retrieve metadata safely
          const family = getFontName(font, 'fontFamily', 'Không rõ');
          const subfamily = getFontName(font, 'fontSubfamily', 'Regular');
          const name = getFontName(font, 'fullName', `${family} ${subfamily}`);
          
          // Safely fetch unitsPerEm
          const unitsPerEm = font.unitsPerEm || font.tables?.head?.unitsPerEm || 1000;

          // Safely fetch capHeight and xHeight, or default based on ascender
          let capHeight = 700;
          let xHeight = 500;
          if (font.tables.os2) {
            if (font.tables.os2.sCapHeight) capHeight = font.tables.os2.sCapHeight;
            if (font.tables.os2.sxHeight) xHeight = font.tables.os2.sxHeight;
          }

          const fontMetadata: FontMetadata = {
            name,
            family,
            subfamily,
            unitsPerEm,
            ascender: font.ascender || 1000,
            descender: font.descender || -200,
            capHeight,
            xHeight,
            totalGlyphs: font.glyphs ? font.glyphs.length : 0
          };

          onFontLoaded(font, file.name, fontMetadata, buffer);
        } catch (parseError) {
          console.error(parseError);
          setError('Không thể đọc file font này. File có thể bị hỏng hoặc không đúng định dạng OpenType/TrueType.');
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Đã xảy ra lỗi khi đọc file.');
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi không xác định.');
      setLoading(false);
    }
  };


  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={projectInputRef}
        onChange={onFileChange}
        accept=".ftn"
        className="hidden"
      />

      {!metadata ? (
        <div className="space-y-6">
          {/* Two-column layout: Dropzone on Left, 3 USP Cards on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Column 1: Dropzone (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <div
                id="font-dropzone"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragOver
                    ? 'border-neutral-800 bg-neutral-50 dark:bg-neutral-900/10'
                    : 'border-neutral-200 hover:border-neutral-400 bg-white dark:bg-neutral-950/20 shadow-xs'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept=".otf,.ttf,.ftn"
                  className="hidden"
                />
                
                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-full mb-4 transition-transform duration-300 group-hover:scale-110">
                  <Upload className="w-8 h-8 text-neutral-600 dark:text-neutral-300" />
                </div>

                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  {loading ? 'Đang phân tích...' : 'Tải lên font hoặc mở file dự án'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-5 leading-relaxed">
                  Kéo & thả file font <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">.OTF</span>, <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">.TTF</span> hoặc tệp dự án <span className="font-mono font-bold text-amber-600 dark:text-amber-400">.FTN</span> vào đây, hoặc click để chọn file.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 rounded-full border border-neutral-200/80 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    <FileType className="w-3.5 h-3.5" />
                    <span>Font OpenType & TrueType (.otf, .ttf)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      projectInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-full border border-amber-300/70 text-xs transition cursor-pointer shadow-2xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nạp file dự án (.ftn)</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/25 border border-red-200 text-red-600 dark:text-red-400 text-xs rounded-lg max-w-md">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: 3 USP Cards (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-4.5 rounded-2xl shadow-2xs flex items-start gap-3.5 transition">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    Cấu hình Dấu phụ mẫu
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Không cần can thiệp tẻ nhạt vào từng ô chữ. Bạn chỉ cần nạp 9 nét dấu mẫu phụ (sắc, huyền, hỏi, ngã, nặng, mũ...) và tinh chỉnh tỷ lệ thu phóng chung một lần duy nhất.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-4.5 rounded-2xl shadow-2xs flex items-start gap-3.5 transition">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                    Căn chỉnh thông minh
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Hệ thống tự động căn chỉnh vị trí, kích thước và cách bỏ dấu cho toàn bộ ký tự. Tất nhiên bạn vẫn có thể tinh chỉnh riêng biệt nếu muốn.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 p-4.5 rounded-2xl shadow-2xs flex items-start gap-3.5 transition">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
                    <CopyCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Sao chép Kerning 100%
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Tất cả 134 ký tự mới tự động được thừa hưởng (clone) 100% dữ liệu Kerning từ các chữ cái gốc (a, e, o, u, d...). Đảm bảo khoảng cách hiển thị văn bản tự nhiên, tinh tế.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div id="font-metadata-panel" className="bg-white border border-neutral-100 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-100 pb-4 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-neutral-50 rounded-lg">
                <FileType className="w-6 h-6 text-neutral-800" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-950">{metadata.name}</h3>
                <p className="text-xs text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  File: {filename}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => projectInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                Mở dự án khác (.ftn)
              </button>
              <button
                id="btn-font-reset"
                onClick={onReset}
                className="px-4 py-2 text-xs font-semibold border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg transition duration-200 cursor-pointer"
              >
                Chọn font khác
              </button>
            </div>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-neutral-50/50 rounded-lg border border-neutral-100/50">
              <span className="block text-xs text-neutral-500 font-medium mb-1">Family</span>
              <span className="font-semibold text-sm text-neutral-800">{metadata.family}</span>
            </div>
            <div className="p-3.5 bg-neutral-50/50 rounded-lg border border-neutral-100/50">
              <span className="block text-xs text-neutral-500 font-medium mb-1">Subfamily</span>
              <span className="font-semibold text-sm text-neutral-800">{metadata.subfamily}</span>
            </div>
            <div className="p-3.5 bg-neutral-50/50 rounded-lg border border-neutral-100/50">
              <span className="block text-xs text-neutral-500 font-medium mb-1">Units Per Em</span>
              <span className="font-semibold text-sm text-neutral-800 font-mono">{metadata.unitsPerEm} UPM</span>
            </div>
            <div className="p-3.5 bg-neutral-50/50 rounded-lg border border-neutral-100/50">
              <span className="block text-xs text-neutral-500 font-medium mb-1">Tổng số ký tự gốc</span>
              <span className="font-semibold text-sm text-neutral-800 font-mono">{metadata.totalGlyphs} ký tự</span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
            <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 space-y-1">
              <p>
                <strong>Hệ tọa độ Font:</strong> Đường baseline ở mức <span className="font-mono">Y = 0</span>. Các chỉ số tham chiếu: 
                Ascender = <span className="font-mono">+{metadata.ascender}</span>, 
                Descender = <span className="font-mono">{metadata.descender}</span>, 
                Cap Height = <span className="font-mono">+{metadata.capHeight}</span>, 
                X Height = <span className="font-mono">+{metadata.xHeight}</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
