import type { Node } from "@tiptap/pm/model";
import { Fragment, Slice } from "@tiptap/pm/model";
import { TextSelection, type EditorState } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
export function canRewriteSelection(doc: Node, from: number, to: number) {
  if (from >= to || from < 1 || to >= doc.content.size) return false;
  const a=doc.resolve(from),b=doc.resolve(to);
  // A single cell/list paragraph is safe; spanning structured blocks is not.
  if (a.sameParent(b)) return a.parent.isTextblock && !a.parent.type.spec.code;
  if (a.depth !== 1 || b.depth !== 1) return false;
  let valid=true;
  doc.nodesBetween(from,to,node=>{if(!node.isText && !["paragraph","heading","hardBreak"].includes(node.type.name))valid=false;});
  return valid;
}
export function replaceAiSelection(state: EditorState, snapshot: Node, from: number, to: number, text: string) {
  if (!state.doc.eq(snapshot) || !canRewriteSelection(state.doc,from,to)) throw new Error("CHANGED");
  const lines=text.trim().split(/\n+/).filter(Boolean);
  if (!lines.length) throw new Error("EMPTY");
  const marks=state.doc.resolve(from).marks().filter(mark=>!["userComment","userHighlight"].includes(mark.type.name));
  const paragraphs=lines.map(line=>state.schema.nodes.paragraph.create(null,state.schema.text(line,marks)));
  return closeHistory(state.tr).setSelection(TextSelection.create(state.doc,from,to))
    .replaceSelection(new Slice(Fragment.fromArray(paragraphs),1,1)).scrollIntoView();
}
