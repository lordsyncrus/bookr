import type { EditorState } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import type { EditorialFinding } from "./types";

/** Apply from the end so all source ranges retain their original coordinates. */
export function approvalTransaction(state: EditorState, findings: EditorialFinding[]) {
  const tr = closeHistory(state.tr);
  const approved: string[] = [];
  const stale: string[] = [];
  let boundary = state.doc.content.size + 1;
  for (const finding of [...findings].filter(f => f.status === "pending").sort((a, b) => b.from - a.from)) {
    if (finding.from < 0 || finding.to > state.doc.content.size || finding.from >= finding.to || finding.to > boundary || state.doc.textBetween(finding.from, finding.to, "\n", "\n") !== finding.original) {
      stale.push(finding.id);
      continue;
    }
    let prefix = 0, suffix = 0;
    while (prefix < finding.original.length && prefix < finding.suggested.length && finding.original[prefix] === finding.suggested[prefix]) prefix++;
    while (suffix < finding.original.length - prefix && suffix < finding.suggested.length - prefix && finding.original[finding.original.length - 1 - suffix] === finding.suggested[finding.suggested.length - 1 - suffix]) suffix++;
    // Do not split UTF-16 surrogate pairs at the replacement edges.
    if (prefix && /[\uD800-\uDBFF]/.test(finding.original[prefix - 1])) prefix--;
    if (suffix && /[\uDC00-\uDFFF]/.test(finding.original[finding.original.length - suffix])) suffix--;
    const from = finding.from + prefix, to = finding.to - suffix;
    const replacement = finding.suggested.slice(prefix, finding.suggested.length - suffix);
    const marks = state.doc.resolve(from).marks();
    if (replacement) tr.replaceWith(from, to, state.schema.text(replacement, marks));
    else if (from !== to) tr.delete(from, to);
    approved.push(finding.id);
    boundary = finding.from;
  }
  return { tr: tr.setMeta("bookr-approve", approved).setMeta("bookr-stale", stale), approved, stale };
}
