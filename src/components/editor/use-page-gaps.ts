"use client";
import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
/** Pagination Plus owns layout; these commands only synchronize user preferences. */
export function usePageGaps(editor: Editor | null, separated: boolean, marginMm: number, keepHeadings: boolean) {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const margin = marginMm * 96 / 25.4;
    editor.chain().updatePageGap(separated ? 24 : 0)
      .updateMargins({ top: margin, bottom: margin, left: margin, right: margin }).run();
  }, [editor, separated, marginMm]);
  useEffect(() => { if (editor && !editor.isDestroyed) editor.commands.setKeepHeadings(false); }, [editor, keepHeadings]);
}
