import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import type { EditorialFinding } from "./types";
export const reviewHighlightKey = new PluginKey("bookr-review-highlights");
const ReviewHighlights = Extension.create({
  name: "reviewHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reviewHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, current) {
            const meta = tr.getMeta(reviewHighlightKey) as
              | { findings: EditorialFinding[]; selected: string | null }
              | undefined;
            if (meta)
              return DecorationSet.create(
                tr.doc,
                meta.findings
                  .filter(
                    (f) =>
                      (f.status === "pending" || (f.id === meta.selected && f.status !== "stale")) &&
                      f.from < f.to &&
                      f.to <= tr.doc.content.size,
                  )
                  .map((f) =>
                    Decoration.inline(f.from, f.to, {
                      class:
                        f.id === meta.selected
                          ? "review-highlight is-selected"
                          : "review-highlight",
                      "data-finding-id": f.id,
                    }),
                  ),
              );
            return current.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
export const structureTargetKey = new PluginKey<number | null>("bookr-structure-target");
const StructureTarget = Extension.create({
  name: "structureTarget",
  addProseMirrorPlugins() {
    return [new Plugin<number | null>({
      key: structureTargetKey,
      state: {
        init: () => null,
        apply(tr, previous) {
          const target = tr.getMeta(structureTargetKey);
          if (target !== undefined) return target;
          if (previous === null) return null;
          const mapped = tr.mapping.mapResult(previous, 1);
          return mapped.deleted ? null : mapped.pos;
        },
      },
      props: { decorations(state) {
        const pos = structureTargetKey.getState(state);
        if (pos === null || pos === undefined) return DecorationSet.empty;
        const node = state.doc.nodeAt(pos);
        return node ? DecorationSet.create(state.doc, [Decoration.node(pos, pos + node.nodeSize, {class:"structure-target", "data-structure-target":"true"})]) : DecorationSet.empty;
      } },
    })];
  },
});
export function editorExtensions() {
  return [
    StarterKit.configure({
      link: { openOnClick: false, autolink: false },
      codeBlock: false,
    }),
    TextStyleKit,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TableKit,
    Image.configure({ allowBase64: true }),
    Superscript,
    Subscript,
    ReviewHighlights,
    StructureTarget,
  ];
}
