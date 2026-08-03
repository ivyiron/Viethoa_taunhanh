import React, { useEffect, useState } from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight, Moon, Sun, Sparkles } from 'lucide-react';

interface FontPlaygroundProps {
  fontBuffer: ArrayBuffer | null;
  fontFamilyName?: string;
}

const DEFAULT_SENTENCE = 'Chưng cất rượu nếp thơm lừng hoặc giã giò lụa truyền thống. Đất nước Việt Nam vạn dặm gấm vóc, núi sông hùng vĩ chứa chan nghĩa tình. 1234567890!';

export const FontPlayground: React.FC<FontPlaygroundProps> = ({
  fontBuffer,
  fontFamilyName = 'VietnameseizedFontPreview'
}) => {
  const [inputText, setInputText] = useState(DEFAULT_SENTENCE);
  const [fontSize, setFontSize] = useState(36);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [bgTheme, setBgTheme] = useState<'light' | 'dark' | 'paper' | 'black'>('light');
  const [boxHeightMode, setBoxHeightMode] = useState<'medium' | 'large' | 'auto'>('medium');

  const [fontRegistered, setFontRegistered] = useState(false);
  const [activeFamilyName, setActiveFamilyName] = useState(fontFamilyName);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Register font face in the browser
  useEffect(() => {
    if (!fontBuffer) {
      setFontRegistered(false);
      return;
    }

    const registerFont = async () => {
      try {
        setLoadError(null);
        // Generate a unique family name to bypass browser font-face cache
        const uniqueName = `${fontFamilyName}_v${Date.now()}`;
        const fontFace = new FontFace(uniqueName, fontBuffer);
        const loadedFace = await fontFace.load();
        
        try {
          // Remove old dynamic FontFaces with family names starting with our base name
          const toRemove: FontFace[] = [];
          document.fonts.forEach((face) => {
            if (face.family.startsWith(fontFamilyName + '_v') || face.family === fontFamilyName) {
              toRemove.push(face);
            }
          });
          toRemove.forEach((face) => {
            document.fonts.delete(face);
          });
        } catch (cleanErr) {
          console.warn('Error cleaning up previous dynamic fonts:', cleanErr);
        }

        // Add to document
        document.fonts.add(loadedFace);
        setActiveFamilyName(uniqueName);
        setFontRegistered(true);
      } catch (err: any) {
        console.error('FontFace registration failed', err);
        setLoadError('Không thể nạp font vào trình duyệt để chạy thử: ' + (err.message || 'Lỗi không xác định'));
        setFontRegistered(false);
      }
    };

    registerFont();
  }, [fontBuffer, fontFamilyName]);

  const getThemeClasses = () => {
    switch (bgTheme) {
      case 'dark':
        return 'bg-neutral-900 text-neutral-100 border-neutral-800 placeholder:text-neutral-600';
      case 'black':
        return 'bg-black text-amber-200 border-neutral-900 placeholder:text-neutral-700';
      case 'paper':
        return 'bg-[#FAF6EE] text-[#2C2621] border-[#EADFCB] placeholder:text-neutral-400';
      case 'light':
      default:
        return 'bg-neutral-50 text-neutral-900 border-neutral-200 placeholder:text-neutral-400';
    }
  };

  const getHeightStyle = () => {
    switch (boxHeightMode) {
      case 'large':
        return 'min-h-[380px] h-[380px]';
      case 'auto':
        return 'min-h-[200px] h-auto';
      case 'medium':
      default:
        return 'min-h-[260px] h-[260px]';
    }
  };

  return (
    <div id="font-playground-panel" className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-100 pb-4 gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <span className="p-2 bg-neutral-900 text-white rounded-xl inline-flex items-center justify-center shrink-0 shadow-2xs">
            <Type className="w-4.5 h-4.5 text-amber-400" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-neutral-950 tracking-tight flex items-center gap-2">
              Trình Gõ Thử Font
              <span className="text-[11px] font-normal text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md font-mono">
                {inputText.length} ký tự
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Gõ trực tiếp văn bản vào khung bên dưới để kiểm tra hiển thị thực tế, Việt hóa và khoảng cách chữ.
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {fontRegistered ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-xl border border-green-200/80">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              Font đang hoạt động
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-500 text-xs font-bold rounded-xl border border-neutral-200">
              Chưa nạp xuất bản...
            </span>
          )}
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-red-50 text-red-600 text-xs border border-red-100 rounded-xl">
          {loadError}
        </div>
      )}

      {/* Control Bar: Sliders, Preset Buttons, Theme, Alignment */}
      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Sliders: Size & Line height */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-neutral-600 font-bold">Cỡ chữ:</span>
              <input
                id="slider-playground-font-size"
                type="range"
                min="12"
                max="140"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="accent-neutral-900 w-28 sm:w-36 cursor-pointer"
              />
              <span className="text-xs text-neutral-900 font-mono font-bold w-12">{fontSize}px</span>
            </div>

            {/* Quick Font Size Presets */}
            <div className="hidden md:flex items-center gap-1">
              {[24, 36, 48, 64, 80].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition ${
                    fontSize === sz
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-4">
              <span className="text-xs text-neutral-600 font-bold">Giãn dòng:</span>
              <input
                id="slider-playground-line-height"
                type="range"
                min="0.8"
                max="3.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="accent-neutral-900 w-20 sm:w-28 cursor-pointer"
              />
              <span className="text-xs text-neutral-900 font-mono font-bold w-8">{lineHeight.toFixed(1)}</span>
            </div>
          </div>

          {/* Alignment & Themes & Height controls */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Text alignment */}
            <div className="flex items-center bg-white rounded-lg border border-neutral-200 p-0.5">
              <button
                onClick={() => setTextAlign('left')}
                className={`p-1.5 rounded transition ${textAlign === 'left' ? 'bg-neutral-200 text-neutral-950' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Căn trái"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('center')}
                className={`p-1.5 rounded transition ${textAlign === 'center' ? 'bg-neutral-200 text-neutral-950' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Căn giữa"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('right')}
                className={`p-1.5 rounded transition ${textAlign === 'right' ? 'bg-neutral-200 text-neutral-950' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Căn phải"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Background Theme Preset */}
            <div className="flex items-center bg-white rounded-lg border border-neutral-200 p-0.5 text-xs">
              <button
                onClick={() => setBgTheme('light')}
                className={`p-1.5 rounded flex items-center gap-1 ${bgTheme === 'light' ? 'bg-neutral-200 font-bold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Nền sáng"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBgTheme('paper')}
                className={`p-1.5 rounded flex items-center gap-1 ${bgTheme === 'paper' ? 'bg-[#EADFCB] font-bold text-[#2C2621]' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Nền giấy kem"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#FAF6EE] border border-amber-300 inline-block" />
              </button>
              <button
                onClick={() => setBgTheme('dark')}
                className={`p-1.5 rounded flex items-center gap-1 ${bgTheme === 'dark' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Nền tối"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBgTheme('black')}
                className={`p-1.5 rounded flex items-center gap-1 ${bgTheme === 'black' ? 'bg-black text-amber-300 font-bold' : 'text-neutral-500 hover:text-neutral-900'}`}
                title="Tương phản cao"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-black border border-neutral-700 inline-block" />
              </button>
            </div>

            {/* Box Height Preset */}
            <div className="flex items-center bg-white rounded-lg border border-neutral-200 p-0.5 text-[11px] font-bold text-neutral-600">
              <button
                onClick={() => setBoxHeightMode('medium')}
                className={`px-2 py-1 rounded transition ${boxHeightMode === 'medium' ? 'bg-neutral-900 text-white' : 'hover:text-neutral-900'}`}
              >
                Vừa
              </button>
              <button
                onClick={() => setBoxHeightMode('large')}
                className={`px-2 py-1 rounded transition ${boxHeightMode === 'large' ? 'bg-neutral-900 text-white' : 'hover:text-neutral-900'}`}
              >
                Lớn
              </button>
              <button
                onClick={() => setBoxHeightMode('auto')}
                className={`px-2 py-1 rounded transition ${boxHeightMode === 'auto' ? 'bg-neutral-900 text-white' : 'hover:text-neutral-900'}`}
              >
                Tự co giãn
              </button>
            </div>

          </div>
        </div>

        {/* Quick Sample Text Presets */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-neutral-200/60">
          <span className="text-xs text-neutral-500 font-bold shrink-0">Mẫu văn bản:</span>
          <button
            onClick={() => setInputText('Chưng cất rượu nếp thơm lừng hoặc giã giò lụa truyền thống. Đất nước Việt Nam vạn dặm gấm vóc, núi sông hùng vĩ chứa chan nghĩa tình. 1234567890!')}
            className="text-xs bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold py-1 px-3 rounded-lg shrink-0 shadow-2xs transition cursor-pointer"
          >
            Mẫu câu tiêu chuẩn
          </button>
          <button
            onClick={() => setInputText('ÁĂÂÈÉÊÌÍÒÓÔƠÙÚƯÝ Đ / áăâèéêìíòóôơùúưý đ\nảẻỉỏủỷ ãẽĩõũỹ ạẹịọụỵ\nầấẩẫậ ằắẳẵặ ềếểễệ ồốổỗộ ờớởỡợ ừứửữự')}
            className="text-xs bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold py-1 px-3 rounded-lg shrink-0 shadow-2xs transition cursor-pointer"
          >
            Toàn bộ 134 ký tự Việt
          </button>
          <button
            onClick={() => setInputText('Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau.\nTrải qua một cuộc bể dâu, những điều trông thấy mà đau đớn lòng.\nLạ gì bỉ sắc tư phong, trời xanh quen thói má hồng đánh ghen.')}
            className="text-xs bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold py-1 px-3 rounded-lg shrink-0 shadow-2xs transition cursor-pointer"
          >
            Đoạn văn Truyện Kiều
          </button>
          <button
            onClick={() => setInputText('VIỆT NAM HÙNG CƯỜNG - TỰ DO - HẠNH PHÚC 2026')}
            className="text-xs bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold py-1 px-3 rounded-lg shrink-0 shadow-2xs transition cursor-pointer"
          >
            Tiêu đề In Hoa
          </button>
          <button
            onClick={() => setInputText('AV TA Va To Tr Ch Gi Qu Yo Fo ÁV ÀV ÂV')}
            className="text-xs bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold py-1 px-3 rounded-lg shrink-0 shadow-2xs transition cursor-pointer"
          >
            Kiểm tra Kerning Cặp đôi
          </button>
        </div>
      </div>

      {/* Direct Interactive Display Area (Gõ trực tiếp) */}
      <div className="relative w-full">
        <textarea
          id="playground-rendering-box"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Gõ trực tiếp văn bản vào đây để kiểm thử font..."
          spellCheck={false}
          className={`w-full ${getHeightStyle()} p-6 border rounded-2xl overflow-y-auto break-words resize-y shadow-inner transition-colors duration-200 outline-none focus:ring-2 focus:ring-amber-400/60 ${getThemeClasses()}`}
          style={{
            fontFamily: fontRegistered ? `"${activeFamilyName}", sans-serif` : 'sans-serif',
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            textAlign: textAlign,
            fontKerning: 'normal',
            fontFeatureSettings: '"kern" 1, "liga" 1',
            WebkitFontFeatureSettings: '"kern" 1, "liga" 1',
            transition: 'font-size 0.1s ease, background-color 0.2s ease'
          }}
        />
      </div>
      
      {!fontRegistered && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-3 border border-amber-200/80 rounded-xl">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping shrink-0"></span>
          <span>Hãy bấm nút <strong>"Cập nhật & Chạy thử font mới"</strong> bên trên để đồng bộ hóa và hiển thị tệp font đã xuất bản.</span>
        </div>
      )}
    </div>
  );
};


