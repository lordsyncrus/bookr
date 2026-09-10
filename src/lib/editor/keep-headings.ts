import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> { keepHeadings: { setKeepHeadings: (enabled: boolean) => ReturnType } }
}
const key = new PluginKey<DecorationSet>("bookr-keep-headings");
/** View-only spacing: never inserts paragraphs or changes manuscript positions. */
export const KeepHeadings = Extension.create({
  name: "keepHeadings",
  addStorage() { return { enabled: false }; },
  addCommands() { return { setKeepHeadings: (enabled: boolean) => ({ tr, dispatch }) => {
    if (dispatch) { this.storage.enabled = enabled; tr.setMeta(key, []).setMeta("addToHistory", false); }
    return true;
  } }; },
  addProseMirrorPlugins() {
    const settings = this.storage;
    return [new Plugin<DecorationSet>({
      key,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, previous, oldState) {
          const decorations = tr.getMeta(key);
          if (decorations) return DecorationSet.create(tr.doc, decorations);
          // Recompute after editing, including undo, rather than retaining stale spacing.
          if (!tr.docChanged) return previous;
          // TablePlus persists measured column widths; those transactions must not
          // erase spacing and restart pagination. Text/mark edits do invalidate it.
          const changed = tr.doc.textContent !== oldState.doc.textContent ||
            tr.doc.content.size !== oldState.doc.content.size ||
            tr.steps.some(step => ["addMark", "removeMark"].includes(step.toJSON().stepType));
          return changed ? DecorationSet.empty : previous.map(tr.mapping, tr.doc);
        },
      },
      props: { decorations: state => key.getState(state) },
      view(view) {
        let frame = 0, disposed = false, layout = "";
        const attempted = new Set<number>();
        const measure = () => {
          frame = 0;
          if (disposed || settings?.enabled === false) return;
          const root = view.dom;
          const scale = root.getBoundingClientRect().width / Math.max(1, root.offsetWidth);
          if (!scale) return;
          const footers = Array.from(root.querySelectorAll<HTMLElement>("[data-rm-pagination] .rm-page-footer"));
          const headers = Array.from(root.querySelectorAll<HTMLElement>("[data-rm-pagination] .rm-page-header"));
          if (footers.length < 2) return;
          const existing = key.getState(view.state)?.find() ?? [];
          const css = getComputedStyle(root);
          const signature = [root.offsetWidth, css.fontFamily, css.fontSize, css.lineHeight,
            css.getPropertyValue("--document-spacing"), css.getPropertyValue("--rm-margin-top"),
            css.getPropertyValue("--rm-margin-left"), css.getPropertyValue("--rm-page-gap")].join("|");
          if (layout !== signature) {
            layout = signature;
            attempted.clear();
            if (existing.length) {
              view.dispatch(view.state.tr.setMeta(key, []).setMeta("addToHistory", false));
              return;
            }
          }
          let candidate: Decoration | null = null;
          view.state.doc.forEach((node, pos, index) => {
            if (candidate || node.type.name !== "heading" || index + 1 >= view.state.doc.childCount) return;
            const heading = view.nodeDOM(pos);
            if (!(heading instanceof HTMLElement)) return;
            const next = view.state.doc.child(index + 1);
            if (next.type.name === "pageSection") return; // Respect explicit page separation.
            const nextPos = pos + node.nodeSize;
            let textPos: number | null = null;
            next.descendants((child, offset) => {
              if (textPos === null && child.isText) textPos = nextPos + 1 + offset;
            });
            if (textPos === null) return;
            const headingTop = view.coordsAtPos(pos + 1).top;
            const page = footers.findIndex(footer => headingTop < footer.getBoundingClientRect().top);
            if (page < 0 || page >= headers.length - 1) return;
            const nextLine = view.coordsAtPos(textPos);
            const end = footers[page].getBoundingClientRect().top;
            if (nextLine.bottom <= end + 1) return;
            const destination = headers[page].getBoundingClientRect().bottom;
            const delta = (destination - heading.getBoundingClientRect().top) / scale;
            if (delta <= 1) return;
            // Avoid moving a heading repeatedly when the whole block is taller than a page.
            if (attempted.has(pos) || existing.some(decoration => decoration.from === pos)) return;
            const margin = parseFloat(getComputedStyle(heading).marginTop) || 0;
            candidate = Decoration.node(pos, pos + node.nodeSize, {
              style: `margin-top: ${margin + delta}px`,
              "data-keep-with-next": "true",
            });
          });
          if (candidate) {
            attempted.add((candidate as Decoration).from);
            view.dispatch(view.state.tr.setMeta(key, [...existing, candidate]).setMeta("addToHistory", false));
          }
        };
        const schedule = () => { if (!disposed && !frame) frame = window.setTimeout(measure, 120); };
        const observer = new ResizeObserver(schedule);
        observer.observe(view.dom);
        document.fonts.addEventListener("loadingdone", schedule);
        schedule();
        return {
          update(updated, previous) {
            if (updated.state.doc.textContent !== previous.doc.textContent || (key.getState(previous)?.find().length && !key.getState(updated.state)?.find().length)) attempted.clear();
            schedule();
          },
          destroy() { disposed = true; clearTimeout(frame); observer.disconnect(); document.fonts.removeEventListener("loadingdone", schedule); },
        };
      },
    })];
  },
});
