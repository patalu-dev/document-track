import sanitizeHtml from 'sanitize-html';

export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return input as any;
  if (!input) return '';

  try {
    return sanitizeHtml(input, {
      allowedTags: [], // Disallow all HTML tags
      allowedAttributes: {},
      textFilter: function(text) {
        return text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
      },
    });
  } catch {
    return input;
  }
}

export function escapeLike(input: string): string {
  if (typeof input !== 'string') return input;
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}
