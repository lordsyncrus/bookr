import type { EditorView } from "@tiptap/pm/view";
import { EDITOR_PAGE_HEIGHT, pageCount, mostVisiblePage } from "./pages";
/** Read the page boundaries rendered by Pagination Plus, including at zero gap. */
export function pageGeometry(view: EditorView) {
  const paper = view.dom.closest<HTMLElement>(".manuscript-paper");
  const canvas = view.dom.closest<HTMLElement>(".document-canvas");
  if (!paper || !canvas) return null;
  const rect = paper.getBoundingClientRect(), viewport = canvas.getBoundingClientRect();
  const scale = rect.width / Math.max(1, paper.offsetWidth);
  if (!scale) return null;
  const breaks = Array.from(view.dom.querySelectorAll<HTMLElement>("[data-rm-pagination] > .rm-page-break"));
  const offsets = breaks.length ? [0, ...breaks.slice(0, -1).map(element => {
    const gap = element.querySelector<HTMLElement>(".rm-pagination-gap")!;
    return (gap.getBoundingClientRect().bottom - rect.top) / scale;
  })] : Array.from({length: pageCount(view.dom.offsetHeight)}, (_, i) => i * EDITOR_PAGE_HEIGHT);
  const total = offsets.length;
  const current = mostVisiblePage((viewport.top - rect.top) / scale, canvas.clientHeight / scale, offsets, view.dom.offsetHeight);
  return { paper, canvas, rect, viewport, scale, total, current, offsets, gaps: [] as number[] };
}
