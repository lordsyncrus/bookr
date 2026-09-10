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
/** Choose the page occupying most of the viewport, not a sliver at its top. */
export function mostVisiblePage(top:number,height:number,boundaries:number[],end:number){
 let best=1,area=-1;
 boundaries.forEach((start,index)=>{const overlap=Math.max(0,Math.min(top+height,boundaries[index+1]??end)-Math.max(top,start));if(overlap>area){area=overlap;best=index+1;}});
 return best;
}
