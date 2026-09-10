/** A4 page-height references in CSS pixels. The editor keeps its responsive text layout. */
export const EDITOR_PAGE_HEIGHT = 297 * 96 / 25.4;
export function pageCount(contentHeight: number): number {
  return Math.max(1, Math.ceil(Math.max(0, contentHeight - 1) / EDITOR_PAGE_HEIGHT));
}
export function clampPage(page: number, total: number): number {
  return Number.isFinite(page) ? Math.min(Math.max(1, Math.trunc(page)), Math.max(1, total)) : 1;
}
export function pageAtOffset(offset: number, total: number): number {
  return clampPage(Math.floor(Math.max(0, offset) / EDITOR_PAGE_HEIGHT) + 1, total);
}
export function pageScrollTop(page: number, total: number, paperTop: number, scale: number): number {
  return Math.max(0, paperTop + (clampPage(page, total) - 1) * EDITOR_PAGE_HEIGHT * scale - 12);
}
