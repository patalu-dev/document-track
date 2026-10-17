import { SelectQueryBuilder } from 'typeorm';
import { escapeLike } from './sanitize';

/**
 * Tìm kiếm từ khóa nhiều từ: tách keyword theo khoảng trắng, bắt buộc
 * KHỚP MỌI TỪ (AND), mỗi từ khớp bất kỳ trường nào (OR).
 * - Chịu được lệch khoảng trắng (1 space vs nhiều space) và khác thứ tự từ.
 * - Từ đơn lẻ cho kết quả đúng như LIKE cũ nên không đổi hành vi hiện tại.
 */
export function applyKeywordSearch(
  qb: SelectQueryBuilder<any>,
  fields: string[],
  keyword: string,
  paramPrefix = 'kw',
): void {
  const words = keyword
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (words.length === 0 || fields.length === 0) return;
  words.forEach((word, i) => {
    const param = `${paramPrefix}_${i}`;
    const ors = fields.map((f) => `${f} LIKE :${param} ESCAPE '\\\\'`).join(' OR ');
    qb.andWhere(`(${ors})`, { [param]: `%${escapeLike(word).slice(0, 50)}%` });
  });
}
