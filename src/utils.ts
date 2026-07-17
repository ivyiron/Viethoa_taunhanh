import * as opentype from 'opentype.js';

// Full list of 134 Vietnamese letters requiring accents/diacritics
export const VIETNAMESE_CHARS = [
  // Vowel 'a' / 'A'
  'à', 'á', 'ả', 'ã', 'ạ', 'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ', 'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ',
  'À', 'Á', 'Ả', 'Ã', 'Ạ', 'Ă', 'Ằ', 'Ắ', 'Ẳ', 'Ẵ', 'Ặ', 'Â', 'Ầ', 'Ấ', 'Ẩ', 'Ẫ', 'Ậ',
  // Vowel 'e' / 'E'
  'è', 'é', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ề', 'ế', 'ể', 'ễ', 'ệ',
  'È', 'É', 'Ẻ', 'Ẽ', 'Ẹ', 'Ê', 'Ề', 'Ế', 'Ể', 'Ễ', 'Ệ',
  // Vowel 'i' / 'I'
  'ì', 'í', 'ỉ', 'ĩ', 'ị',
  'Ì', 'Í', 'Ỉ', 'Ĩ', 'Ị',
  // Vowel 'o' / 'O'
  'ò', 'ó', 'ỏ', 'õ', 'ọ', 'ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ', 'ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ',
  'Ò', 'Ó', 'Ỏ', 'Õ', 'Ọ', 'Ô', 'Ồ', 'Ố', 'Ổ', 'Ỗ', 'Ộ', 'Ơ', 'Ờ', 'Ớ', 'Ở', 'Ỡ', 'Ợ',
  // Vowel 'u' / 'U'
  'ù', 'ú', 'ủ', 'ũ', 'ụ', 'ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự',
  'Ù', 'Ú', 'Ủ', 'Ũ', 'Ụ', 'Ư', 'Ừ', 'Ứ', 'Ử', 'Ữ', 'Ự',
  // Vowel 'y' / 'Y'
  'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ',
  'Ỳ', 'Ý', 'Ỷ', 'Ỹ', 'Ỵ',
  // Consonant d/D
  'đ', 'Đ'
];

// Mapping of Vietnamese character with diacritic to standard Latin base character
export const VIETNAMESE_BASE_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',

  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',

  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',

  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',

  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',

  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',

  'đ': 'd', 'Đ': 'D'
};

// Human-readable names for characters to make alignment/editing crystal clear
export const CHARACTER_DESCRIPTIONS: Record<string, string> = {
  'à': 'a huyền', 'á': 'a sắc', 'ả': 'a hỏi', 'ã': 'a ngã', 'ạ': 'a nặng',
  'ă': 'a trăng (ă)', 'ằ': 'ă huyền', 'ắ': 'ă sắc', 'ẳ': 'ă hỏi', 'ẵ': 'ă ngã', 'ặ': 'ă nặng',
  'â': 'a mũ (â)', 'ầ': 'â huyền', 'ấ': 'â sắc', 'ẩ': 'â hỏi', 'ẫ': 'â ngã', 'ậ': 'â nặng',
  'è': 'e huyền', 'é': 'e sắc', 'ẻ': 'e hỏi', 'ẽ': 'e ngã', 'ẹ': 'e nặng',
  'ê': 'e mũ (ê)', 'ề': 'ê huyền', 'ế': 'ê sắc', 'ể': 'ê hỏi', 'ễ': 'ê ngã', 'ệ': 'ê nặng',
  'ì': 'i huyền', 'í': 'i sắc', 'ỉ': 'i hỏi', 'ĩ': 'i ngã', 'ị': 'i nặng',
  'ò': 'o huyền', 'ó': 'o sắc', 'ỏ': 'o hỏi', 'õ': 'o ngã', 'ọ': 'o nặng',
  'ô': 'o mũ (ô)', 'ồ': 'ô huyền', 'ố': 'ô sắc', 'ổ': 'ô hỏi', 'ỗ': 'ô ngã', 'ộ': 'ô nặng',
  'ơ': 'o móc (ơ)', 'ờ': 'ơ huyền', 'ớ': 'ơ sắc', 'ở': 'ơ hỏi', 'ỡ': 'ơ ngã', 'ợ': 'ơ nặng',
  'ù': 'u huyền', 'ú': 'u sắc', 'ủ': 'u hỏi', 'ũ': 'u ngã', 'ụ': 'u nặng',
  'ư': 'u móc (ư)', 'ừ': 'ư huyền', 'ứ': 'ư sắc', 'ử': 'ư hỏi', 'ữ': 'ư ngã', 'ự': 'ư nặng',
  'ỳ': 'y huyền', 'ý': 'y sắc', 'ỷ': 'y hỏi', 'ỹ': 'y ngã', 'ỵ': 'y nặng',
  'đ': 'd gạch (đ)',

  'À': 'A huyền hoa', 'Á': 'A sắc hoa', 'Ả': 'A hỏi hoa', 'Ã': 'A ngã hoa', 'Ạ': 'A nặng hoa',
  'Ă': 'Ă trăng hoa', 'Ằ': 'Ă huyền hoa', 'Ắ': 'Ă sắc hoa', 'Ẳ': 'Ă hỏi hoa', 'Ẵ': 'Ă ngã hoa', 'Ặ': 'Ă nặng hoa',
  'Â': 'Â mũ hoa', 'Ầ': 'Â huyền hoa', 'Ấ': 'Â sắc hoa', 'Ẩ': 'Â hỏi hoa', 'Ẫ': 'Â ngã hoa', 'Ậ': 'Â nặng hoa',
  'È': 'E huyền hoa', 'É': 'E sắc hoa', 'Ẻ': 'E hỏi hoa', 'Ẽ': 'E ngã hoa', 'Ẹ': 'E nặng hoa',
  'Ê': 'Ê mũ hoa', 'Ề': 'Ê huyền hoa', 'Ế': 'Ê sắc hoa', 'Ể': 'Ê hỏi hoa', 'Ễ': 'Ê ngã hoa', 'Ệ': 'Ê nặng hoa',
  'Ì': 'I huyền hoa', 'Í': 'I sắc hoa', 'Ỉ': 'I hỏi hoa', 'Ĩ': 'I ngã hoa', 'Ị': 'I nặng hoa',
  'Ò': 'O huyền hoa', 'Ó': 'O sắc hoa', 'Ỏ': 'O hỏi hoa', 'Õ': 'O ngã hoa', 'Ọ': 'O nặng hoa',
  'Ô': 'Ô mũ hoa', 'Ồ': 'Ô huyền hoa', 'Ố': 'Ô sắc hoa', 'Ổ': 'Ô hỏi hoa', 'Ỗ': 'Ô ngã hoa', 'Ộ': 'Ô nặng hoa',
  'Ơ': 'Ơ móc hoa', 'Ờ': 'Ơ huyền hoa', 'Ớ': 'Ơ sắc hoa', 'Ở': 'Ơ hỏi hoa', 'Ỡ': 'Ơ ngã hoa', 'Ợ': 'Ơ nặng hoa',
  'Ù': 'U huyền hoa', 'Ú': 'U sắc hoa', 'Ủ': 'U hỏi hoa', 'Ũ': 'U ngã hoa', 'Ụ': 'U nặng hoa',
  'Ư': 'Ư móc hoa', 'Ừ': 'Ư huyền hoa', 'Ứ': 'Ư sắc hoa', 'Ử': 'Ư hỏi hoa', 'Ữ': 'Ư ngã hoa', 'Ự': 'Ư nặng hoa',
  'Ỳ': 'Y huyền hoa', 'Ý': 'Y sắc hoa', 'Ỷ': 'Y hỏi hoa', 'Ỹ': 'Y ngã hoa', 'Ỵ': 'Y nặng hoa',
  'Đ': 'D gạch hoa (Đ)'
};

/**
 * Extracts raw SVG path 'd' string from pasted Adobe Illustrator markup, XML strings or raw inputs.
 * Supports automatic conversion of simple SVG shapes (rect, circle, ellipse, line, polygon, polyline) to path strings.
 */
export function extractPathDataFromSvg(svgString: string): string {
  const cleanSvg = svgString.trim();

  // If it's just raw path data (e.g., M10 20 L30 40...)
  if (!cleanSvg.includes('<')) {
    return cleanSvg;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanSvg, 'image/svg+xml');
    
    // Query both paths and basic vector shapes in DOM order
    const elements = doc.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline');
    
    if (elements.length > 0) {
      const pathDatas: string[] = [];
      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'path') {
          const d = el.getAttribute('d');
          if (d) pathDatas.push(d);
        } else if (tagName === 'rect') {
          const x = parseFloat(el.getAttribute('x') || '0');
          const y = parseFloat(el.getAttribute('y') || '0');
          const w = parseFloat(el.getAttribute('width') || '0');
          const h = parseFloat(el.getAttribute('height') || '0');
          let rx = parseFloat(el.getAttribute('rx') || '0');
          let ry = parseFloat(el.getAttribute('ry') || '0');
          
          if (el.hasAttribute('rx') && !el.hasAttribute('ry')) {
            ry = rx;
          } else if (el.hasAttribute('ry') && !el.hasAttribute('rx')) {
            rx = ry;
          }
          
          if (rx > w / 2) rx = w / 2;
          if (ry > h / 2) ry = h / 2;
          
          if (rx > 0 && ry > 0) {
            pathDatas.push(`M ${x + rx} ${y} h ${w - 2 * rx} a ${rx} ${ry} 0 0 1 ${rx} ${ry} v ${h - 2 * ry} a ${rx} ${ry} 0 0 1 ${-rx} ${ry} h ${-w + 2 * rx} a ${rx} ${ry} 0 0 1 ${-rx} ${-ry} v ${-h + 2 * ry} a ${rx} ${ry} 0 0 1 ${rx} ${-ry} Z`);
          } else {
            pathDatas.push(`M ${x} ${y} h ${w} v ${h} h ${-w} Z`);
          }
        } else if (tagName === 'circle') {
          const cx = parseFloat(el.getAttribute('cx') || '0');
          const cy = parseFloat(el.getAttribute('cy') || '0');
          const r = parseFloat(el.getAttribute('r') || '0');
          if (r > 0) {
            pathDatas.push(`M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`);
          }
        } else if (tagName === 'ellipse') {
          const cx = parseFloat(el.getAttribute('cx') || '0');
          const cy = parseFloat(el.getAttribute('cy') || '0');
          const rx = parseFloat(el.getAttribute('rx') || '0');
          const ry = parseFloat(el.getAttribute('ry') || '0');
          if (rx > 0 && ry > 0) {
            pathDatas.push(`M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`);
          }
        } else if (tagName === 'line') {
          const x1 = parseFloat(el.getAttribute('x1') || '0');
          const y1 = parseFloat(el.getAttribute('y1') || '0');
          const x2 = parseFloat(el.getAttribute('x2') || '0');
          const y2 = parseFloat(el.getAttribute('y2') || '0');
          pathDatas.push(`M ${x1} ${y1} L ${x2} ${y2}`);
        } else if (tagName === 'polygon' || tagName === 'polyline') {
          const pointsAttr = el.getAttribute('points') || '';
          const coords = pointsAttr.trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
          if (coords.length >= 4) {
            let d = `M ${coords[0]} ${coords[1]}`;
            for (let i = 2; i < coords.length; i += 2) {
              if (coords[i+1] !== undefined) {
                d += ` L ${coords[i]} ${coords[i+1]}`;
              }
            }
            if (tagName === 'polygon') {
              d += ' Z';
            }
            pathDatas.push(d);
          }
        }
      });
      
      const mergedPath = pathDatas.join(' ').trim();
      if (mergedPath) {
        return mergedPath;
      }
    }

    // Regex fallback for 'd' attribute
    const regex = /d\s*=\s*["']([^"']+)["']/g;
    let match;
    const pathDatasFallback: string[] = [];
    while ((match = regex.exec(cleanSvg)) !== null) {
      pathDatasFallback.push(match[1]);
    }
    if (pathDatasFallback.length > 0) {
      return pathDatasFallback.join(' ');
    }
  } catch (err) {
    console.error("Lỗi khi trích xuất dữ liệu path từ SVG:", err);
  }

  return '';
}

/**
 * Parses SVG path 'd' strings into opentype.js style commands list
 */
export function parseSvgPath(d: string): any[] {
  const commands: any[] = [];
  
  // Robustly tokenize the SVG path (handling minus signs, exponents, commas, spacing)
  const regex = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/g;
  let match;
  const tokens: string[] = [];
  while ((match = regex.exec(d)) !== null) {
    tokens.push(match[0]);
  }

  let i = 0;
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(token)) {
      const cmd = token;
      i++;

      if (cmd === 'M' || cmd === 'm') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        if (cmd === 'm') {
          currentX += x;
          currentY += y;
        } else {
          currentX = x;
          currentY = y;
        }
        subpathStartX = currentX;
        subpathStartY = currentY;
        commands.push({ type: 'M', x: currentX, y: currentY });

        // Implicit lineto values
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const lx = parseFloat(tokens[i++]);
          const ly = parseFloat(tokens[i++]);
          if (cmd === 'm') {
            currentX += lx;
            currentY += ly;
          } else {
            currentX = lx;
            currentY = ly;
          }
          commands.push({ type: 'L', x: currentX, y: currentY });
        }
      } else if (cmd === 'L' || cmd === 'l') {
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);
          if (cmd === 'l') {
            currentX += x;
            currentY += y;
          } else {
            currentX = x;
            currentY = y;
          }
          commands.push({ type: 'L', x: currentX, y: currentY });
        }
      } else if (cmd === 'H' || cmd === 'h') {
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const x = parseFloat(tokens[i++]);
          if (cmd === 'h') {
            currentX += x;
          } else {
            currentX = x;
          }
          commands.push({ type: 'L', x: currentX, y: currentY });
        }
      } else if (cmd === 'V' || cmd === 'v') {
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const y = parseFloat(tokens[i++]);
          if (cmd === 'v') {
            currentY += y;
          } else {
            currentY = y;
          }
          commands.push({ type: 'L', x: currentX, y: currentY });
        }
      } else if (cmd === 'C' || cmd === 'c') {
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const x1 = parseFloat(tokens[i++]);
          const y1 = parseFloat(tokens[i++]);
          const x2 = parseFloat(tokens[i++]);
          const y2 = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);

          let cx1, cy1, cx2, cy2, destX, destY;
          if (cmd === 'c') {
            cx1 = currentX + x1;
            cy1 = currentY + y1;
            cx2 = currentX + x2;
            cy2 = currentY + y2;
            destX = currentX + x;
            destY = currentY + y;
          } else {
            cx1 = x1;
            cy1 = y1;
            cx2 = x2;
            cy2 = y2;
            destX = x;
            destY = y;
          }
          commands.push({ type: 'C', x1: cx1, y1: cy1, x2: cx2, y2: cy2, x: destX, y: destY });
          currentX = destX;
          currentY = destY;
        }
      } else if (cmd === 'Q' || cmd === 'q') {
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const x1 = parseFloat(tokens[i++]);
          const y1 = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);

          let cx1, cy1, destX, destY;
          if (cmd === 'q') {
            cx1 = currentX + x1;
            cy1 = currentY + y1;
            destX = currentX + x;
            destY = currentY + y;
          } else {
            cx1 = x1;
            cy1 = y1;
            destX = x;
            destY = y;
          }
          commands.push({ type: 'Q', x1: cx1, y1: cy1, x: destX, y: destY });
          currentX = destX;
          currentY = destY;
        }
      } else if (cmd === 'S' || cmd === 's') {
        while (i < tokens.length && !/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) {
          const x2 = parseFloat(tokens[i++]);
          const y2 = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);

          const prev = commands[commands.length - 1];
          let cx1 = currentX;
          let cy1 = currentY;
          if (prev && prev.type === 'C') {
            cx1 = 2 * currentX - prev.x2;
            cy1 = 2 * currentY - prev.y2;
          }

          const cx2 = cmd === 's' ? currentX + x2 : x2;
          const cy2 = cmd === 's' ? currentY + y2 : y2;
          const destX = cmd === 's' ? currentX + x : x;
          const destY = cmd === 's' ? currentY + y : y;

          commands.push({ type: 'C', x1: cx1, y1: cy1, x2: cx2, y2: cy2, x: destX, y: destY });
          currentX = destX;
          currentY = destY;
        }
      } else if (cmd === 'Z' || cmd === 'z') {
        commands.push({ type: 'Z' });
        currentX = subpathStartX;
        currentY = subpathStartY;
      } else {
        // Skip unknown tokens to avoid loops
        i++;
      }
    } else {
      i++;
    }
  }

  return commands;
}

/**
 * Transforms coordinates of a list of commands using scale, offsets and Y-flipping
 */
export function transformCommands(
  cmds: any[],
  scaleX: number,
  scaleY: number,
  offsetX: number,
  offsetY: number,
  flipY: boolean
): any[] {
  const tY = (val: number) => {
    let y = val;
    if (flipY) y = -y;
    return y * scaleY + offsetY;
  };
  
  const tX = (val: number) => {
    return val * scaleX + offsetX;
  };

  return cmds.map(cmd => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      return { type: cmd.type, x: tX(cmd.x), y: tY(cmd.y) };
    } else if (cmd.type === 'Q') {
      return { 
        type: 'Q', 
        x1: tX(cmd.x1), 
        y1: tY(cmd.y1), 
        x: tX(cmd.x), 
        y: tY(cmd.y) 
      };
    } else if (cmd.type === 'C') {
      return { 
        type: 'C', 
        x1: tX(cmd.x1), 
        y1: tY(cmd.y1), 
        x2: tX(cmd.x2), 
        y2: tY(cmd.y2), 
        x: tX(cmd.x), 
        y: tY(cmd.y) 
      };
    } else if (cmd.type === 'Z') {
      return { type: 'Z' };
    }
    return cmd;
  });
}

/**
 * Calculates bounding box of parsed SVG commands
 */
export function getBoundingBox(cmds: any[]): { xMin: number; xMax: number; yMin: number; yMax: number } {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  
  cmds.forEach(cmd => {
    if (cmd.x !== undefined) {
      if (cmd.x < xMin) xMin = cmd.x;
      if (cmd.x > xMax) xMax = cmd.x;
    }
    if (cmd.y !== undefined) {
      if (cmd.y < yMin) yMin = cmd.y;
      if (cmd.y > yMax) yMax = cmd.y;
    }
    if (cmd.x1 !== undefined) {
      if (cmd.x1 < xMin) xMin = cmd.x1;
      if (cmd.x1 > xMax) xMax = cmd.x1;
    }
    if (cmd.y1 !== undefined) {
      if (cmd.y1 < yMin) yMin = cmd.y1;
      if (cmd.y1 > yMax) yMax = cmd.y1;
    }
    if (cmd.x2 !== undefined) {
      if (cmd.x2 < xMin) xMin = cmd.x2;
      if (cmd.x2 > xMax) xMax = cmd.x2;
    }
    if (cmd.y2 !== undefined) {
      if (cmd.y2 < yMin) yMin = cmd.y2;
      if (cmd.y2 > yMax) yMax = cmd.y2;
    }
  });

  if (xMin === Infinity) {
    return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  }

  return { xMin, xMax, yMin, yMax };
}

/**
 * Calculates a highly accurate tight bounding box of parsed SVG commands by sampling Bezier curve points
 */
export function getExactBoundingBox(cmds: any[]): { xMin: number; xMax: number; yMin: number; yMax: number } {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  
  let currentX = 0;
  let currentY = 0;

  const updateMinMax = (x: number, y: number) => {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  };

  cmds.forEach(cmd => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      updateMinMax(cmd.x, cmd.y);
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'Q') {
      // Sample 20 points along the quadratic curve for extreme precision
      for (let t = 0; t <= 1; t += 0.05) {
        const mt = 1 - t;
        const x = mt * mt * currentX + 2 * mt * t * cmd.x1 + t * t * cmd.x;
        const y = mt * mt * currentY + 2 * mt * t * cmd.y1 + t * t * cmd.y;
        updateMinMax(x, y);
      }
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'C') {
      // Sample 20 points along the cubic curve for extreme precision
      for (let t = 0; t <= 1; t += 0.05) {
        const mt = 1 - t;
        const x = mt * mt * mt * currentX + 3 * mt * mt * t * cmd.x1 + 3 * mt * t * t * cmd.x2 + t * t * t * cmd.x;
        const y = mt * mt * mt * currentY + 3 * mt * mt * t * cmd.y1 + 3 * mt * t * t * cmd.y2 + t * t * t * cmd.y;
        updateMinMax(x, y);
      }
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'Z') {
      // Z command doesn't move arbitrarily but can close back. Usually M handles start point.
    }
  });

  if (xMin === Infinity) {
    return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  }

  return { xMin, xMax, yMin, yMax };
}

function getSubpaths(commands: any[]): any[][] {
  const subpaths: any[][] = [];
  let current: any[] = [];
  commands.forEach(cmd => {
    if (cmd.type === 'M') {
      if (current.length > 0) {
        subpaths.push(current);
      }
      current = [cmd];
    } else {
      current.push(cmd);
    }
  });
  if (current.length > 0) {
    subpaths.push(current);
  }
  return subpaths;
}

function getSubpathBBox(cmds: any[]) {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  const update = (x: number, y: number) => {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  };
  cmds.forEach(cmd => {
    if (cmd.x !== undefined && cmd.y !== undefined) update(cmd.x, cmd.y);
    if (cmd.x1 !== undefined && cmd.y1 !== undefined) update(cmd.x1, cmd.y1);
    if (cmd.x2 !== undefined && cmd.y2 !== undefined) update(cmd.x2, cmd.y2);
  });
  return { xMin, xMax, yMin, yMax };
}

export function removeDotFromICommands(commands: any[]): any[] {
  const subpaths = getSubpaths(commands);
  if (subpaths.length <= 1) {
    return commands;
  }

  const bboxes = subpaths.map(cmds => getSubpathBBox(cmds));
  
  let overallYMax = -Infinity;
  let overallYMin = Infinity;
  bboxes.forEach(box => {
    if (box.yMax > overallYMax) overallYMax = box.yMax;
    if (box.yMin < overallYMin) overallYMin = box.yMin;
  });

  const totalHeight = overallYMax - overallYMin;
  if (totalHeight < 100) return commands;

  const thresholdY = overallYMin + 0.45 * totalHeight;

  const filteredSubpaths = subpaths.filter((cmds, idx) => {
    const box = bboxes[idx];
    const isTopmost = box.yMax === overallYMax;
    const isAboveThreshold = box.yMin > thresholdY;
    
    if (isTopmost && box.yMin > overallYMin + 0.25 * totalHeight) {
      return false; // This is the dot, remove it
    }
    if (isAboveThreshold) {
      return false; // This is also a dot, remove it
    }
    return true; // Keep this contour
  });

  if (filteredSubpaths.length === 0) {
    return commands;
  }

  const resultCommands: any[] = [];
  filteredSubpaths.forEach(cmds => {
    resultCommands.push(...cmds);
  });
  return resultCommands;
}

/**
 * Helper to extract glyph indexes from an opentype.js coverage table,
 * correctly supporting both Format 1 (individual glyphs list) and Format 2 (glyph ranges).
 */
export function getCoverageGlyphs(coverage: any): number[] {
  if (!coverage) return [];
  if (coverage.format === 1 && Array.isArray(coverage.glyphs)) {
    return coverage.glyphs;
  }
  if (coverage.format === 2 && Array.isArray(coverage.ranges)) {
    const glyphs: number[] = [];
    for (const r of coverage.ranges) {
      const start = r.start !== undefined ? r.start : r.startGlyphID;
      const end = r.end !== undefined ? r.end : r.endGlyphID;
      if (typeof start === 'number' && typeof end === 'number') {
        for (let g = start; g <= end; g++) {
          glyphs.push(g);
        }
      }
    }
    return glyphs;
  }
  if (Array.isArray(coverage.glyphs)) {
    return coverage.glyphs;
  }
  return [];
}

/**
 * Extracts and converts GPOS kerning tables (Format 1 and Format 2 Class-based positioning)
 * into standard font.kerningPairs so they can be written as standard 'kern' table pairs when saved,
 * and utilized for smart Vietnamese character kerning cloning.
 */
export function ensureKerningPairsPopulated(font: any): void {
  if (!font) return;
  if (!font.kerningPairs) {
    font.kerningPairs = {};
  }

  const gpos = font.tables?.gpos;
  if (gpos && gpos.lookups) {
    const lookups = gpos.lookups || [];
    for (const lookup of lookups) {
      if (lookup.lookupType === 2) { // Pair Positioning
        const subtables = lookup.subtables || [];
        for (const subtable of subtables) {
          const posFormat = subtable.posFormat !== undefined ? subtable.posFormat : subtable.format;
          // Format 1: Pair Adjustment (Specific glyph pairs)
          if (posFormat === 1) {
            const coverage = subtable.coverage;
            if (!coverage) continue;
            const leftGlyphs = getCoverageGlyphs(coverage);
            if (leftGlyphs.length === 0) continue;
            const pairSets = subtable.pairSets || [];
            
            for (let i = 0; i < leftGlyphs.length; i++) {
              const leftGlyphIndex = leftGlyphs[i];
              const pairSet = pairSets[i];
              if (!pairSet) continue;
              
              for (const pairValueRecord of pairSet) {
                const rightGlyphIndex = pairValueRecord.secondGlyph;
                const value1 = pairValueRecord.value1;
                if (value1 && typeof value1.xAdvance === 'number' && value1.xAdvance !== 0) {
                  const kernValue = value1.xAdvance;
                  const pairKey = `${leftGlyphIndex},${rightGlyphIndex}`;
                  if (font.kerningPairs[pairKey] === undefined) {
                    font.kerningPairs[pairKey] = kernValue;
                  }
                }
              }
            }
          }
          // Format 2: Class-based Pair Adjustment
          else if (posFormat === 2) {
            const classDef1 = subtable.classDef1;
            const classDef2 = subtable.classDef2;
            const classRecords = subtable.classRecords || [];
            const class1Count = subtable.class1Count || 0;
            const class2Count = subtable.class2Count || 0;
            
            // Helper to fetch glyph class index safely
            const getGlyphClass = (classDef: any, glyphIndex: number): number => {
              if (!classDef) return 0;
              const format = classDef.format !== undefined ? classDef.format : classDef.classFormat;
              if (format === 1) {
                const startGlyph = classDef.startGlyph || 0;
                const classValueArray = classDef.classes || classDef.classValueArray || [];
                const index = glyphIndex - startGlyph;
                if (index >= 0 && index < classValueArray.length) {
                  return classValueArray[index];
                }
                return 0;
              }
              if (format === 2) {
                const ranges = classDef.ranges || classDef.classRangeRecords || [];
                for (const record of ranges) {
                  const start = record.start !== undefined ? record.start : record.startGlyphID;
                  const end = record.end !== undefined ? record.end : record.endGlyphID;
                  const classId = record.classId !== undefined ? record.classId : record.class;
                  if (glyphIndex >= start && glyphIndex <= end) {
                    return classId || 0;
                  }
                }
                return 0;
              }
              if (classDef.classDefs && typeof classDef.classDefs === 'object') {
                return classDef.classDefs[glyphIndex] || 0;
              }
              return 0;
            };

            const numGlyphs = font.glyphs.length;
            const class1ToGlyphs: Record<number, number[]> = {};
            const class2ToGlyphs: Record<number, number[]> = {};

            // Class 1 (left glyphs) MUST be in the coverage table to be valid
            const coverageGlyphs = getCoverageGlyphs(subtable.coverage);
            for (const g of coverageGlyphs) {
              const c1 = getGlyphClass(classDef1, g);
              if (c1 < class1Count) {
                if (!class1ToGlyphs[c1]) class1ToGlyphs[c1] = [];
                class1ToGlyphs[c1].push(g);
              }
            }

            // Class 2 (right glyphs) can be any glyph in the font
            for (let g = 0; g < numGlyphs; g++) {
              const c2 = getGlyphClass(classDef2, g);
              if (c2 < class2Count) {
                if (!class2ToGlyphs[c2]) class2ToGlyphs[c2] = [];
                class2ToGlyphs[c2].push(g);
              }
            }

            // Iterate over Class 1 -> Class 2 records to expand kerning pairs
            for (let c1 = 0; c1 < classRecords.length; c1++) {
              if (c1 >= class1Count) continue;
              const classRecordRow = classRecords[c1];
              if (!classRecordRow) continue;
              
              const firstGlyphsInClass = class1ToGlyphs[c1] || [];
              if (firstGlyphsInClass.length === 0) continue;
              
              for (let c2 = 0; c2 < classRecordRow.length; c2++) {
                if (c2 >= class2Count) continue;
                const classRecord = classRecordRow[c2];
                if (!classRecord) continue;
                
                const value1 = classRecord.value1;
                if (value1 && typeof value1.xAdvance === 'number' && value1.xAdvance !== 0) {
                  const kernValue = value1.xAdvance;
                  const secondGlyphsInClass = class2ToGlyphs[c2] || [];
                  if (secondGlyphsInClass.length === 0) continue;
                  
                  for (const g1 of firstGlyphsInClass) {
                    for (const g2 of secondGlyphsInClass) {
                      const pairKey = `${g1},${g2}`;
                      if (font.kerningPairs[pairKey] === undefined) {
                        font.kerningPairs[pairKey] = kernValue;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Calculates the checksum of a font table according to the OpenType specification
 */
function calculateTableChecksum(data: Uint8Array): number {
  let sum = 0;
  const len = data.length;
  const paddedLen = Math.ceil(len / 4) * 4;
  
  for (let i = 0; i < paddedLen; i += 4) {
    const b0 = i < len ? data[i] : 0;
    const b1 = i + 1 < len ? data[i + 1] : 0;
    const b2 = i + 2 < len ? data[i + 2] : 0;
    const b3 = i + 3 < len ? data[i + 3] : 0;
    
    const val = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    sum = (sum + val) >>> 0;
  }
  return sum;
}

/**
 * Builds a binary legacy 'kern' table (format 0, version 0) from font.kerningPairs.
 * This legacy table is essential for modern web browsers when GPOS is omitted,
 * allowing perfect kerning for both standard and custom Vietnamese character pairs.
 */
export function buildKernTable(font: any): Uint8Array {
  const pairs: { left: number; right: number; value: number }[] = [];
  if (font && font.kerningPairs) {
    for (const [key, val] of Object.entries(font.kerningPairs)) {
      const parts = key.split(',');
      if (parts.length !== 2) continue;
      const left = parseInt(parts[0], 10);
      const right = parseInt(parts[1], 10);
      if (isNaN(left) || isNaN(right)) continue;
      if (typeof val === 'number' && val !== 0) {
        pairs.push({ left, right, value: val });
      }
    }
  }

  // Sort by left glyph index, then right glyph index as mandated by the TrueType specification
  pairs.sort((a, b) => {
    if (a.left !== b.left) {
      return a.left - b.left;
    }
    return a.right - b.right;
  });

  const nPairs = pairs.length;
  const subtableSize = 14 + 6 * nPairs;
  const totalSize = 4 + subtableSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Main header
  view.setUint16(0, 0); // version 0
  view.setUint16(2, 1); // 1 subtable

  // Subtable header
  view.setUint16(4, 0); // subtable version 0
  view.setUint16(6, subtableSize); // length of subtable
  view.setUint16(8, 1); // coverage format 0 (horizontal)

  // Format 0 search values
  const maxPowerOf2 = nPairs > 0 ? Math.pow(2, Math.floor(Math.log2(nPairs))) : 0;
  const searchRange = maxPowerOf2 * 6;
  const entrySelector = nPairs > 0 ? Math.floor(Math.log2(maxPowerOf2)) : 0;
  const rangeShift = (nPairs - maxPowerOf2) * 6;

  view.setUint16(10, nPairs);
  view.setUint16(12, searchRange);
  view.setUint16(14, entrySelector);
  view.setUint16(16, rangeShift);

  // Pairs records
  let offset = 18;
  for (let i = 0; i < nPairs; i++) {
    const pair = pairs[i];
    view.setUint16(offset, pair.left);
    view.setUint16(offset + 2, pair.right);
    view.setInt16(offset + 4, pair.value);
    offset += 6;
  }

  return new Uint8Array(buffer);
}

/**
 * Merges advanced OpenType layout tables (GPOS, GSUB, GDEF, BASE) from the original font 
 * into the compiled font buffer to guarantee pristine original kerning and substitution features.
 * When skipGPOS is true, the GPOS table is omitted, allowing browsers to fallback to the legacy 'kern'
 * table which successfully includes all custom Vietnamese character kerning.
 */
export function injectAdvancedLayoutTables(
  compiledBuffer: ArrayBuffer, 
  originalBuffer: ArrayBuffer, 
  skipGPOS: boolean = false,
  kernTableBytes?: Uint8Array
): ArrayBuffer {
  try {
    const parseTables = (buf: ArrayBuffer) => {
      const view = new DataView(buf);
      const sfntVersion = view.getUint32(0);
      const numTables = view.getUint16(4);
      
      const tables: Record<string, Uint8Array> = {};
      let offset = 12;
      for (let i = 0; i < numTables; i++) {
        const tagBytes = [
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        ];
        const tag = String.fromCharCode(...tagBytes);
        const tableOffset = view.getUint32(offset + 8);
        const length = view.getUint32(offset + 12);
        
        // Use slice to copy safely without detaching backing store
        const data = new Uint8Array(buf.slice(tableOffset, tableOffset + length));
        tables[tag] = data;
        
        offset += 16;
      }
      return { sfntVersion, tables };
    };

    const original = parseTables(originalBuffer);
    const compiled = parseTables(compiledBuffer);

    let injectedAny = false;

    // Inject/overwrite the custom legacy kern table if provided
    if (kernTableBytes) {
      compiled.tables['kern'] = kernTableBytes;
      injectedAny = true;
    }

    // Ensure we strip GPOS from compiled tables if GPOS is skipped
    if (skipGPOS && compiled.tables['GPOS']) {
      delete compiled.tables['GPOS'];
      injectedAny = true;
    }

    const tagsToInject = skipGPOS ? ['GSUB', 'GDEF', 'BASE'] : ['GPOS', 'GSUB', 'GDEF', 'BASE'];

    tagsToInject.forEach(tag => {
      if (original.tables[tag] && !compiled.tables[tag]) {
        compiled.tables[tag] = original.tables[tag];
        injectedAny = true;
      }
    });

    if (!injectedAny) {
      return compiledBuffer;
    }

    const tableTags = Object.keys(compiled.tables).sort();
    const numTables = tableTags.length;

    let maxPowerOf2 = 1;
    while (maxPowerOf2 * 2 <= numTables) {
      maxPowerOf2 *= 2;
    }
    const searchRange = maxPowerOf2 * 16;
    const entrySelector = Math.log2(maxPowerOf2);
    const rangeShift = numTables * 16 - searchRange;

    const directoryOffset = 12;
    const firstTableOffset = directoryOffset + numTables * 16;

    let currentOffset = firstTableOffset;
    const offsets: Record<string, number> = {};
    const paddedLengths: Record<string, number> = {};

    tableTags.forEach(tag => {
      offsets[tag] = currentOffset;
      const data = compiled.tables[tag];
      const length = data.length;
      const paddedLength = Math.ceil(length / 4) * 4;
      paddedLengths[tag] = paddedLength;
      currentOffset += paddedLength;
    });

    const outputBuffer = new ArrayBuffer(currentOffset);
    const outputView = new DataView(outputBuffer);
    const outputBytes = new Uint8Array(outputBuffer);

    outputView.setUint32(0, compiled.sfntVersion);
    outputView.setUint16(4, numTables);
    outputView.setUint16(6, searchRange);
    outputView.setUint16(8, entrySelector);
    outputView.setUint16(10, rangeShift);

    let recOffset = directoryOffset;
    tableTags.forEach(tag => {
      const data = compiled.tables[tag];
      const offset = offsets[tag];
      const length = data.length;
      const checksum = calculateTableChecksum(data);

      for (let j = 0; j < 4; j++) {
        outputView.setUint8(recOffset + j, tag.charCodeAt(j));
      }
      outputView.setUint32(recOffset + 4, checksum);
      outputView.setUint32(recOffset + 8, offset);
      outputView.setUint32(recOffset + 12, length);

      outputBytes.set(data, offset);
      const paddedLength = paddedLengths[tag];
      for (let p = length; p < paddedLength; p++) {
        outputBytes[offset + p] = 0;
      }

      recOffset += 16;
    });

    const headData = compiled.tables['head'];
    if (headData) {
      const headOffset = offsets['head'];
      if (headOffset + 12 <= outputBuffer.byteLength) {
        outputView.setUint32(headOffset + 8, 0);
      }

      const fileChecksum = calculateTableChecksum(new Uint8Array(outputBuffer));
      const checksumAdjustment = (0xB1B0AFBA - fileChecksum) >>> 0;

      if (headOffset + 12 <= outputBuffer.byteLength) {
        outputView.setUint32(headOffset + 8, checksumAdjustment);
      }
    }

    return outputBuffer;
  } catch (err) {
    console.error('Failed to inject advanced layout tables:', err);
    return compiledBuffer;
  }
}

// ============================================================================
// VERSION 2.0 AUTOMATED COMPOSITION ENGINE UTILITIES
// ============================================================================

import { DiacriticTemplate, AutoPositionRules, GlyphOverrideState } from './types';

// Default professional vector shapes for 9 Vietnamese diacritics
export const DEFAULT_DIACRITICS: DiacriticTemplate[] = [
  {
    id: 'acute',
    name: 'Dấu sắc (Acute)',
    svgPath: 'M 54.36,0.00 L 63.56,30.09 L -56.78,66.92 L -63.56,44.77 L 54.36,0.00 Z',
    scaleX: 1.1,
    scaleY: 1.1,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'grave',
    name: 'Dấu huyền (Grave)',
    svgPath: 'M -54.35,0.00 L -63.56,30.09 L 56.78,66.92 L 63.56,44.77 L -54.35,0.00 Z',
    scaleX: 1.1,
    scaleY: 1.1,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'hook',
    name: 'Dấu hỏi (Hook above)',
    svgPath: 'M -15.46,85.51 L -15.46,73.99 C -15.46,67.12 -13.34,61.66 -9.09,57.62 C -4.84,53.58 -0.60,49.74 3.65,46.10 C 7.90,42.46 10.02,38.22 10.02,33.36 C 10.02,25.68 3.55,21.84 -9.38,21.84 C -13.83,21.84 -18.08,22.45 -22.12,23.66 C -26.17,24.87 -30.21,26.69 -34.25,29.12 L -41.54,10.31 C -35.88,6.67 -29.52,4.05 -22.44,2.43 C -15.37,0.82 -7.79,0.00 0.30,0.00 C 13.24,0.00 23.35,2.53 30.62,7.58 C 37.90,12.64 41.54,20.22 41.54,30.32 C 41.54,37.20 39.92,42.75 36.69,47.00 C 33.45,51.25 29.81,54.69 25.77,57.31 C 21.73,59.94 18.09,62.87 14.86,66.10 C 11.62,69.34 10.01,73.78 10.01,79.44 L 10.01,85.50 L -15.46,85.50 Z',
    scaleX: 1.35,
    scaleY: 1.35,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'tilde',
    name: 'Dấu ngã (Tilde)',
    svgPath: 'M 31.12,49.11 C 23.12,49.11 15.42,47.11 7.99,43.11 C 0.57,39.12 -6.48,35.22 -13.14,31.40 C -19.80,27.60 -26.37,25.69 -32.84,25.69 C -38.94,25.69 -43.98,27.69 -47.97,31.69 C -51.96,35.69 -54.35,41.49 -55.11,49.11 L -74.52,49.11 C -73.38,33.12 -69.01,20.94 -61.39,12.56 C -53.78,4.19 -43.88,0.00 -31.69,0.00 C -23.32,0.00 -15.51,2.00 -8.28,5.99 C -1.05,9.99 6.00,13.98 12.84,17.98 C 19.69,21.98 26.36,23.98 32.83,23.98 C 38.54,23.98 43.39,21.89 47.39,17.70 C 51.38,13.52 53.77,7.62 54.53,0.00 L 74.52,0.00 C 73.39,15.99 69.00,28.18 61.39,36.54 C 53.77,44.92 43.69,49.10 31.13,49.10 Z',
    scaleX: 1.1,
    scaleY: 1.1,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'dot_below',
    name: 'Dấu nặng (Dot below)',
    svgPath: 'M 23.53,21.69 C 22.63,10.25 13.36,0.98 1.92,0.08 C -12.63,-1.07 -24.68,10.98 -23.54,25.53 C -22.63,36.97 -13.36,46.25 -1.91,47.15 C 12.64,48.30 24.68,36.25 23.54,21.70 Z',
    scaleX: 1.3,
    scaleY: 1.3,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'circumflex',
    name: 'Dấu mũ (Circumflex â/ê/ô)',
    svgPath: 'M 16.70,0.00 L -16.70,0.00 L -50.99,59.85 L -31.84,59.85 L -0.22,29.93 L 31.40,59.85 L 50.99,59.85 L 16.70,0.00 Z',
    scaleX: 1.1,
    scaleY: 1.1,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'breve',
    name: 'Dấu trăng (Breve ă)',
    svgPath: 'M 44.31,0.00 C 36.44,50.64 -35.81,50.61 -43.59,0.00 L -59.27,0.00 C -58.71,35.53 -36.86,60.43 0.08,59.85 C 37.32,60.44 59.53,35.89 59.43,0.00 L 44.31,0.00 Z',
    scaleX: 1.25,
    scaleY: 1.25,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'horn_o',
    name: 'Dấu móc chữ ơ (Horn for ơ)',
    svgPath: 'M 21.36,12.25 C 19.27,8.47 16.38,5.48 12.70,3.29 C 9.02,1.10 4.78,-0.00 0.00,-0.00 C -4.77,-0.00 -8.71,1.04 -12.40,3.14 C -16.09,5.23 -19.02,8.07 -21.21,11.65 C -23.40,15.24 -24.50,19.32 -24.50,23.90 C -24.50,28.48 -23.41,32.32 -21.21,36.00 C -19.02,39.69 -16.09,42.62 -12.40,44.81 C -11.00,45.64 -9.54,46.31 -8.02,46.83 L -19.84,87.53 L -5.38,87.53 L 11.05,59.45 C 16.03,51.28 19.51,44.66 21.51,39.58 C 23.50,34.50 24.50,29.67 24.50,25.09 C 24.50,20.51 23.46,16.03 21.36,12.24 Z',
    scaleX: 1.1,
    scaleY: 1.1,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'horn_u',
    name: 'Dấu móc chữ ư (Horn for ư)',
    svgPath: 'M 21.36,12.25 C 19.27,8.47 16.38,5.48 12.70,3.29 C 9.02,1.10 4.78,-0.00 0.00,-0.00 C -4.77,-0.00 -8.71,1.04 -12.40,3.14 C -16.09,5.23 -19.02,8.07 -21.21,11.65 C -23.40,15.24 -24.50,19.32 -24.50,23.90 C -24.50,28.48 -23.41,32.32 -21.21,36.00 C -19.02,39.69 -16.09,42.62 -12.40,44.81 C -11.00,45.64 -9.54,46.31 -8.02,46.83 L -19.84,87.53 L -5.38,87.53 L 11.05,59.45 C 16.03,51.28 19.51,44.66 21.51,39.58 C 23.50,34.50 24.50,29.67 24.50,25.09 C 24.50,20.51 23.46,16.03 21.36,12.24 Z',
    scaleX: 1.1,
    scaleY: 1.1,
    offsetX: 0,
    offsetY: 0
  },
  {
    id: 'bar',
    name: 'Thanh gạch chữ đ/Đ (Stroke/Bar)',
    svgPath: 'M -80,30 L 80,30 L 80,60 L -80,60 Z',
    scaleX: 1.0,
    scaleY: 1.0,
    offsetX: 0,
    offsetY: 0
  }
];

export const DEFAULT_AUTO_RULES: AutoPositionRules = {
  lowercaseAccentGap: 35,
  uppercaseAccentGap: 50,
  lowercaseAccentScale: 1.0,
  uppercaseAccentScale: 1.25,
  dotBelowGap: 60,
  dotBelowScale: 1.0,
  hornScale: 1.0,
  hornOffsetX: 0,
  hornOffsetY: 0,
  barScale: 1.1,
  barOffsetX: 0,
  barOffsetY: 0,
  doubleAccentStyle: 'stacked',
  doubleAccentGap: 20
};

export interface ComponentRecipe {
  char: string;
  baseChar: string;
  components: string[]; // Diacritic template IDs, e.g., ['circumflex', 'acute']
}

export const VIETNAMESE_RECIPES: ComponentRecipe[] = [];

// Helper variables to auto-generate the complete recipe map
const TONE_MARKS = ['grave', 'acute', 'hook', 'tilde', 'dot_below'];

// 1. Simple single-accent vowels
const singleToneGroup = [
  { base: 'a', chars: ['à', 'á', 'ả', 'ã', 'ạ'] },
  { base: 'A', chars: ['À', 'Á', 'Ả', 'Ã', 'Ạ'] },
  { base: 'e', chars: ['è', 'é', 'ẻ', 'ẽ', 'ẹ'] },
  { base: 'E', chars: ['È', 'É', 'Ẻ', 'Ẽ', 'Ẹ'] },
  { base: 'i', chars: ['ì', 'í', 'ỉ', 'ĩ', 'ị'] },
  { base: 'I', chars: ['Ì', 'Í', 'Ỉ', 'Ĩ', 'Ị'] },
  { base: 'o', chars: ['ò', 'ó', 'ỏ', 'õ', 'ọ'] },
  { base: 'O', chars: ['Ò', 'Ó', 'Ỏ', 'Õ', 'Ọ'] },
  { base: 'u', chars: ['ù', 'ú', 'ủ', 'ũ', 'ụ'] },
  { base: 'U', chars: ['Ù', 'Ú', 'Ủ', 'Ũ', 'Ụ'] },
  { base: 'y', chars: ['ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ'] },
  { base: 'Y', chars: ['Ỳ', 'Ý', 'Ỷ', 'Ỹ', 'Ỵ'] }
];

singleToneGroup.forEach(({ base, chars }) => {
  chars.forEach((char, idx) => {
    VIETNAMESE_RECIPES.push({
      char,
      baseChar: base,
      components: [TONE_MARKS[idx]]
    });
  });
});

// 2. Simple circumflex / breve vowels
const baseWithAccent = [
  { char: 'ă', base: 'a', comp: 'breve' },
  { char: 'Ă', base: 'A', comp: 'breve' },
  { char: 'â', base: 'a', comp: 'circumflex' },
  { char: 'Â', base: 'A', comp: 'circumflex' },
  { char: 'ê', base: 'e', comp: 'circumflex' },
  { char: 'Ê', base: 'E', comp: 'circumflex' },
  { char: 'ô', base: 'o', comp: 'circumflex' },
  { char: 'Ô', base: 'O', comp: 'circumflex' },
  { char: 'ơ', base: 'o', comp: 'horn_o' },
  { char: 'Ơ', base: 'O', comp: 'horn_o' },
  { char: 'ư', base: 'u', comp: 'horn_u' },
  { char: 'Ư', base: 'U', comp: 'horn_u' },
  { char: 'đ', base: 'd', comp: 'bar' },
  { char: 'Đ', base: 'D', comp: 'bar' }
];

baseWithAccent.forEach(({ char, base, comp }) => {
  VIETNAMESE_RECIPES.push({
    char,
    baseChar: base,
    components: [comp]
  });
});

// 3. Double-accent combinations (circumflex/breve/horn + tone mark)
const doubleAccentGroup = [
  { base: 'a', comp: 'breve', chars: ['ằ', 'ắ', 'ẳ', 'ẵ', 'ặ'] },
  { base: 'A', comp: 'breve', chars: ['Ằ', 'Ắ', 'Ẳ', 'Ẵ', 'Ặ'] },
  { base: 'a', comp: 'circumflex', chars: ['ầ', 'ấ', 'ẩ', 'ẫ', 'ậ'] },
  { base: 'A', comp: 'circumflex', chars: ['Ầ', 'Ấ', 'Ẩ', 'Ẫ', 'Ậ'] },
  { base: 'e', comp: 'circumflex', chars: ['ề', 'ế', 'ể', 'ễ', 'ệ'] },
  { base: 'E', comp: 'circumflex', chars: ['Ề', 'Ế', 'Ể', 'Ễ', 'Ệ'] },
  { base: 'o', comp: 'circumflex', chars: ['ồ', 'ố', 'ổ', 'ỗ', 'ộ'] },
  { base: 'O', comp: 'circumflex', chars: ['Ồ', 'Ố', 'Ổ', 'Ỗ', 'Ộ'] },
  { base: 'o', comp: 'horn_o', chars: ['ờ', 'ớ', 'ở', 'ỡ', 'ợ'] },
  { base: 'O', comp: 'horn_o', chars: ['Ờ', 'Ớ', 'Ở', 'Ỡ', 'Ợ'] },
  { base: 'u', comp: 'horn_u', chars: ['ừ', 'ứ', 'ử', 'ữ', 'ự'] },
  { base: 'U', comp: 'horn_u', chars: ['Ừ', 'Ứ', 'Ử', 'Ữ', 'Ự'] }
];

doubleAccentGroup.forEach(({ base, comp, chars }) => {
  chars.forEach((char, idx) => {
    VIETNAMESE_RECIPES.push({
      char,
      baseChar: base,
      components: [comp, TONE_MARKS[idx]]
    });
  });
});

/**
 * Calculates the exact translation scaling and offsets required to automatically align a diacritic on top/bottom of a base glyph.
 * Uses bounding boxes for highly professional type design results.
 */
export function calculateAutoPosition(
  diaId: string,
  baseBBox: { x1: number; y1: number; x2: number; y2: number },
  diaBBox: { xMin: number; yMin: number; xMax: number; yMax: number },
  rules: AutoPositionRules,
  isCapital: boolean,
  previousPlacedBox?: { xMin: number; yMin: number; xMax: number; yMax: number }
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {
  const baseXCenter = (baseBBox.x1 + baseBBox.x2) / 2;
  const baseYTop = baseBBox.y2;
  const baseYBottom = baseBBox.y1;
  
  const diaWidth = diaBBox.xMax - diaBBox.xMin;
  const diaHeight = diaBBox.yMax - diaBBox.yMin;
  const diaXCenter = (diaBBox.xMin + diaBBox.xMax) / 2;

  let scale = isCapital ? rules.uppercaseAccentScale : rules.lowercaseAccentScale;
  let scaleX = scale;
  let scaleY = scale;
  
  let offsetX = 0;
  let offsetY = 0;

  if (diaId === 'dot_below') {
    scaleX = rules.dotBelowScale;
    scaleY = rules.dotBelowScale;
    offsetX = baseXCenter - (diaXCenter * scaleX);
    // Position below the baseline/bottom of letter
    offsetY = baseYBottom - (diaBBox.yMax * scaleY) - rules.dotBelowGap;
  } else if (diaId === 'horn' || diaId === 'horn_o' || diaId === 'horn_u') {
    scaleX = rules.hornScale;
    scaleY = rules.hornScale;
    // Align horn to upper right of vowel
    offsetX = baseBBox.x2 - (diaBBox.xMin * scaleX) - 10 + rules.hornOffsetX;
    offsetY = baseYTop - (diaBBox.yMax * scaleY) - 15 + rules.hornOffsetY;
  } else if (diaId === 'bar') {
    scaleX = rules.barScale;
    scaleY = rules.barScale;
    // Strike bar through d or Đ
    if (isCapital) {
      offsetX = baseXCenter - (diaXCenter * scaleX) + rules.barOffsetX;
      offsetY = baseYTop - 240 + rules.barOffsetY;
    } else {
      offsetX = baseBBox.x2 - (diaBBox.xMin * scaleX) - 80 + rules.barOffsetX;
      offsetY = baseYTop - 130 + rules.barOffsetY;
    }
  } else {
    // Normal top marks: acute, grave, hook, tilde, circumflex, breve
    offsetX = baseXCenter - (diaXCenter * scaleX);

    if (previousPlacedBox) {
      // Placing on top of another diacritic (Stacked vs Side-by-side)
      if (rules.doubleAccentStyle === 'stacked') {
        const targetTopY = previousPlacedBox.yMax;
        offsetY = targetTopY - (diaBBox.yMin * scaleY) + rules.doubleAccentGap;
      } else {
        // Angled/Side placement (very popular in high-end Vietnamese type design)
        offsetX = (previousPlacedBox.xMax - 10) - (diaBBox.xMin * scaleX);
        offsetY = previousPlacedBox.yMax - (diaBBox.yMax * scaleY) + 5;
      }
    } else {
      const gap = isCapital ? rules.uppercaseAccentGap : rules.lowercaseAccentGap;
      offsetY = baseYTop - (diaBBox.yMin * scaleY) + gap;
    }
  }

  return { scaleX, scaleY, offsetX, offsetY };
}

/**
 * Builds a composite path for a character by merging the base glyph and its required diacritics.
 */
export function composeGlyphPath(
  font: opentype.Font,
  recipe: ComponentRecipe,
  templates: Record<string, DiacriticTemplate>,
  rules: AutoPositionRules,
  overrides?: GlyphOverrideState
): { 
  path: opentype.Path; 
  advanceWidth: number; 
  hornInfo?: { yMin: number; yMax: number; excessRight: number } 
} {
  let baseGlyph = font.charToGlyph(recipe.baseChar);
  
  // For lowercase 'i', when combining with any diacritics, use the dotless 'i' glyph to remove the original dot
  if (recipe.baseChar === 'i' && recipe.components.length > 0) {
    const dotlessGlyph = font.charToGlyph('ı');
    if (dotlessGlyph && dotlessGlyph.index > 0 && dotlessGlyph.name !== '.notdef') {
      baseGlyph = dotlessGlyph;
    } else {
      const glyphNames = (font as any).glyphNames;
      const glyphIndex = glyphNames && typeof glyphNames.nameToGlyph === 'function' 
        ? glyphNames.nameToGlyph('dotlessi') 
        : 0;
      if (glyphIndex > 0) {
        const glyph = font.glyphs.get(glyphIndex);
        if (glyph) {
          baseGlyph = glyph;
        }
      }
    }
  }

  if (!baseGlyph) {
    return { path: new opentype.Path(), advanceWidth: 500 };
  }

  const upm = font.unitsPerEm || 1000;
  
  // Get base commands and programmatically strip dot if it's 'i' to guarantee dotless output
  let baseCmds = baseGlyph.path.commands;
  if (recipe.baseChar === 'i' && recipe.components.length > 0) {
    baseCmds = removeDotFromICommands(baseCmds);
  }

  // Recalculate bounding box based on actual dotless commands if we stripped it
  const baseBBox = baseGlyph.getBoundingBox();
  if (recipe.baseChar === 'i' && recipe.components.length > 0) {
    const tightBox = getExactBoundingBox(baseCmds);
    baseBBox.x1 = tightBox.xMin;
    baseBBox.y1 = tightBox.yMin;
    baseBBox.x2 = tightBox.xMax;
    baseBBox.y2 = tightBox.yMax;
  }

  // Clone the base glyph path
  const compositePath = new opentype.Path();
  
  // Re-push original glyph commands safely
  baseCmds.forEach(cmd => {
    if (cmd.type === 'M') compositePath.moveTo(cmd.x, cmd.y);
    else if (cmd.type === 'L') compositePath.lineTo(cmd.x, cmd.y);
    else if (cmd.type === 'Q') compositePath.quadTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
    else if (cmd.type === 'C') compositePath.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
    else if (cmd.type === 'Z') compositePath.closePath();
  });

  const isCapital = recipe.baseChar === recipe.baseChar.toUpperCase() && recipe.baseChar !== recipe.baseChar.toLowerCase();
  let previousBox: { xMin: number; yMin: number; xMax: number; yMax: number } | undefined = undefined;
  let autoHornAdvanceWidthTweak = 0;
  let hornInfo: { yMin: number; yMax: number; excessRight: number } | undefined = undefined;

  recipe.components.forEach((diaId, idx) => {
    const template = templates[diaId];
    if (!template) return;

    const useCapVariant = isCapital && template.hasCapVariant;
    const svgPathToUse = useCapVariant && template.capSvgPath ? template.capSvgPath : template.svgPath;
    const scaleXToUse = useCapVariant && template.capScaleX !== undefined ? template.capScaleX : template.scaleX;
    const scaleYToUse = useCapVariant && template.capScaleY !== undefined ? template.capScaleY : template.scaleY;
    const offsetXToUse = useCapVariant && template.capOffsetX !== undefined ? template.capOffsetX : template.offsetX;
    const offsetYToUse = useCapVariant && template.capOffsetY !== undefined ? template.capOffsetY : template.offsetY;
    const autoCenterXToUse = useCapVariant && template.capAutoCenterX !== undefined ? template.capAutoCenterX : (template.autoCenterX !== false);

    const diaRawCmds = parseSvgPath(svgPathToUse);
    if (diaRawCmds.length === 0) return;

    // Apply template scale first (Do NOT apply offsets here as they will be added after auto-positioning)
    const templateTransformed = transformCommands(
      diaRawCmds,
      scaleXToUse,
      scaleYToUse,
      0,
      0,
      true // flip Y to ensure Illustrator compatibility
    );

    const diaBBox = getExactBoundingBox(templateTransformed);
    
    // Auto align the diacritic based on the bounding boxes
    const autoPos = calculateAutoPosition(diaId, baseBBox, diaBBox, rules, isCapital, previousBox);

    // Apply template offsets and individual character override tweaks if present
    let finalScaleX = autoPos.scaleX;
    let finalScaleY = autoPos.scaleY;
    
    const useAutoCenterX = autoCenterXToUse;
    let finalOffsetX = autoPos.offsetX + (useAutoCenterX ? 0 : offsetXToUse);
    let finalOffsetY = autoPos.offsetY + offsetYToUse;

    if (overrides) {
      // Robust safeguard against undefined or NaN scale/offset values
      const oScaleX = overrides.scaleX !== undefined && !isNaN(overrides.scaleX) ? overrides.scaleX : 1.0;
      const oScaleY = overrides.scaleY !== undefined && !isNaN(overrides.scaleY) ? overrides.scaleY : 1.0;
      const oOffsetX = overrides.offsetX !== undefined && !isNaN(overrides.offsetX) ? overrides.offsetX : 0;
      const oOffsetY = overrides.offsetY !== undefined && !isNaN(overrides.offsetY) ? overrides.offsetY : 0;

      finalScaleX *= oScaleX;
      finalScaleY *= oScaleY;
      finalOffsetX += oOffsetX;
      finalOffsetY += oOffsetY;

      // Component-specific offsets (comp1 for first, comp2 for second)
      if (idx === 0) {
        if (overrides.comp1OffsetX !== undefined && !isNaN(overrides.comp1OffsetX)) {
          finalOffsetX += overrides.comp1OffsetX;
        }
        if (overrides.comp1OffsetY !== undefined && !isNaN(overrides.comp1OffsetY)) {
          finalOffsetY += overrides.comp1OffsetY;
        }
      } else if (idx === 1) {
        if (overrides.comp2OffsetX !== undefined && !isNaN(overrides.comp2OffsetX)) {
          finalOffsetX += overrides.comp2OffsetX;
        }
        if (overrides.comp2OffsetY !== undefined && !isNaN(overrides.comp2OffsetY)) {
          finalOffsetY += overrides.comp2OffsetY;
        }
      }
    }

    // Final composition transformation for this diacritic
    const finalCmds = transformCommands(
      templateTransformed,
      finalScaleX,
      finalScaleY,
      finalOffsetX,
      finalOffsetY,
      false // Already flipped Y in templateTransformed, don't flip again
    );

    // Push diacritic commands to the composite path
    finalCmds.forEach(cmd => {
      if (cmd.type === 'M') compositePath.moveTo(cmd.x, cmd.y);
      else if (cmd.type === 'L') compositePath.lineTo(cmd.x, cmd.y);
      else if (cmd.type === 'Q') compositePath.quadTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      else if (cmd.type === 'C') compositePath.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      else if (cmd.type === 'Z') compositePath.closePath();
    });

    // Update previous bounding box to handle stacked double accents
    const composedDiaBBox = getExactBoundingBox(finalCmds);
    previousBox = composedDiaBBox;

    if (diaId === 'horn_o' || diaId === 'horn_u' || diaId.startsWith('horn')) {
      const excessRight = composedDiaBBox.xMax - baseBBox.x2;
      if (excessRight > 0) {
        autoHornAdvanceWidthTweak = Math.max(autoHornAdvanceWidthTweak, excessRight);
        hornInfo = {
          yMin: composedDiaBBox.yMin,
          yMax: composedDiaBBox.yMax,
          excessRight: excessRight
        };
      }
    }
  });

  // Calculate advance width (tracking)
  let advanceWidth = baseGlyph.advanceWidth;
  if (autoHornAdvanceWidthTweak > 0) {
    advanceWidth += autoHornAdvanceWidthTweak;
  }
  if (overrides) {
    advanceWidth += overrides.advanceWidthTweak;
  }

  return { path: compositePath, advanceWidth, hornInfo };
}

/**
 * Searches the loaded font for the best candidate glyph matching a diacritic ID,
 * checking standard Unicodes and a list of alternative glyph names.
 */
export function findCandidateGlyph(font: any, diaId: string): any {
  if (!font) return null;

  const searchConfig: Record<string, { unicodes: number[]; names: string[] }> = {
    grave: {
      unicodes: [0x0060, 0x0300, 0x02CB],
      names: ['grave', 'graveaccent', 'uni0300', 'uni0060', 'dauhuyen']
    },
    acute: {
      unicodes: [0x00B4, 0x0301, 0x02CA],
      names: ['acute', 'acuteaccent', 'uni0301', 'uni00B4', 'dausac']
    },
    hook: {
      unicodes: [0x0309, 0x02C0],
      names: ['hookabove', 'hookabovecomb', 'uni0309', 'hook', 'dauhoi']
    },
    tilde: {
      unicodes: [0x007E, 0x02DC, 0x0303],
      names: ['tilde', 'tildeaccent', 'uni0303', 'uni007E', 'daunga']
    },
    dot_below: {
      unicodes: [0x0323, 0x2024],
      names: ['dotbelow', 'dotbelowcomb', 'uni0323', 'dot', 'daunang']
    },
    circumflex: {
      unicodes: [0x005E, 0x02C6, 0x0302],
      names: ['circumflex', 'circumflexaccent', 'uni0302', 'uni005E', 'hat', 'daumu']
    },
    breve: {
      unicodes: [0x02D8, 0x0306],
      names: ['breve', 'breveaccent', 'uni0306', 'uni02D8', 'dautrang']
    },
    horn_o: {
      unicodes: [0x031B, 0x002C],
      names: ['horn', 'horncomb', 'uni031B', 'daumoc', 'comma', 'uni002C']
    },
    horn_u: {
      unicodes: [0x031B, 0x002C],
      names: ['horn', 'horncomb', 'uni031B', 'daumoc', 'comma', 'uni002C']
    },
    bar: {
      unicodes: [0x00AF, 0x002D, 0x2212, 0x0304],
      names: ['macron', 'hyphen', 'minus', 'uni002D', 'uni00AF', 'bar', 'gachngang']
    }
  };

  const config = searchConfig[diaId];
  if (!config) return null;

  // 1. Try search by character codes in the font mapping
  for (const unicode of config.unicodes) {
    try {
      const charStr = String.fromCharCode(unicode);
      const idx = font.charToGlyphIndex(charStr);
      if (idx > 0) {
        const glyph = font.glyphs.get(idx);
        if (glyph && glyph.path && glyph.path.commands && glyph.path.commands.length > 0) {
          return glyph;
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  // 2. Scan font glyph names sequentially
  if (font.glyphs && font.glyphs.length > 0) {
    for (let i = 0; i < font.glyphs.length; i++) {
      try {
        const glyph = font.glyphs.get(i);
        if (glyph && glyph.name) {
          const lowerName = glyph.name.toLowerCase();
          if (config.names.includes(lowerName)) {
            if (glyph.path && glyph.path.commands && glyph.path.commands.length > 0) {
              return glyph;
            }
          }
        }
      } catch (e) {
        // Ignored
      }
    }
  }

  return null;
}

/**
 * Extracts the contour path commands from an existing font glyph,
 * centers it horizontally, normalizes coordinates uniformly to a standard 1000-UPM bounding scale
 * to preserve original designer proportions, and converts it into a standard Y-down SVG path string.
 */
export function extractSvgFromGlyph(glyph: any, fontUnitsPerEm: number = 1000): string {
  if (!glyph || !glyph.path || !glyph.path.commands || glyph.path.commands.length === 0) {
    return '';
  }

  const baseCmds = glyph.path.commands;

  // Compute bounding box manually to ensure high precision
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  baseCmds.forEach((cmd: any) => {
    if (cmd.x !== undefined) {
      if (cmd.x < xMin) xMin = cmd.x;
      if (cmd.x > xMax) xMax = cmd.x;
    }
    if (cmd.y !== undefined) {
      if (cmd.y < yMin) yMin = cmd.y;
      if (cmd.y > yMax) yMax = cmd.y;
    }
    if (cmd.x1 !== undefined) {
      if (cmd.x1 < xMin) xMin = cmd.x1;
      if (cmd.x1 > xMax) xMax = cmd.x1;
    }
    if (cmd.y1 !== undefined) {
      if (cmd.y1 < yMin) yMin = cmd.y1;
      if (cmd.y1 > yMax) yMax = cmd.y1;
    }
    if (cmd.x2 !== undefined) {
      if (cmd.x2 < xMin) xMin = cmd.x2;
      if (cmd.x2 > xMax) xMax = cmd.x2;
    }
    if (cmd.y2 !== undefined) {
      if (cmd.y2 < yMin) yMin = cmd.y2;
      if (cmd.y2 > yMax) yMax = cmd.y2;
    }
  });

  if (xMin === Infinity || yMin === Infinity) return '';

  const cx = (xMin + xMax) / 2;

  // Uniformly scale to a standard 1000 UPM space, and apply 0.5 reduction to make extracted diacritics smaller by 1/2 of their current size.
  const targetScale = (1000 / (fontUnitsPerEm || 1000)) * 0.5;

  const parts: string[] = [];

  baseCmds.forEach((cmd: any) => {
    // Horizontal alignment relative to center of glyph; vertical flip and offset relative to yMax, then scaled
    const tX = (x: number) => (x - cx) * targetScale;
    const tY = (y: number) => (yMax - y) * targetScale;

    if (cmd.type === 'M') {
      parts.push(`M${tX(cmd.x).toFixed(1)},${tY(cmd.y).toFixed(1)}`);
    } else if (cmd.type === 'L') {
      parts.push(`L${tX(cmd.x).toFixed(1)},${tY(cmd.y).toFixed(1)}`);
    } else if (cmd.type === 'Q') {
      parts.push(`Q${tX(cmd.x1).toFixed(1)},${tY(cmd.y1).toFixed(1)} ${tX(cmd.x).toFixed(1)},${tY(cmd.y).toFixed(1)}`);
    } else if (cmd.type === 'C') {
      parts.push(`C${tX(cmd.x1).toFixed(1)},${tY(cmd.y1).toFixed(1)} ${tX(cmd.x2).toFixed(1)},${tY(cmd.y2).toFixed(1)} ${tX(cmd.x).toFixed(1)},${tY(cmd.y).toFixed(1)}`);
    } else if (cmd.type === 'Z') {
      parts.push('Z');
    }
  });

  return parts.join('');
}



