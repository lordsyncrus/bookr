"use client";
import { alignParagraphs } from "@/lib/editor/alignment";
import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Type, AlignVerticalSpaceAround } from "lucide-react";
import { typographyAudit } from "@/lib/editor/document";
import type { ManuscriptProject, Typography } from "@/lib/editor/types";
export function TypographyPanel({
  project,
  editor,
  locked,
  onChange,
}: {
  project: ManuscriptProject;
  editor: Editor;
  locked: boolean;
  onChange: (value: Typography) => void;
}) {
  const t = useTranslations("editor");
  const en = useLocale() === "en";
  function alignBody(alignment: "left" | "justify") {
    if (locked) return;
    const tr = alignParagraphs(editor.state, alignment);
    if (tr.docChanged) editor.view.dispatch(tr);
  }
  const audit = useMemo(() => typographyAudit(project.doc), [project.doc]);
  const update = (key: keyof Typography, value: string | number) =>
    onChange({ ...project.typography, [key]: value });
  function normalize() {
    const { state, view } = editor;
    const tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const mark = node.marks.find((m) => m.type.name === "textStyle");
      if (!mark) return;
      tr.removeMark(pos, pos + node.nodeSize, mark.type);
      const attrs = {
        ...mark.attrs,
        fontFamily: null,
        fontSize: null,
        lineHeight: null,
      };
      if (Object.values(attrs).some(Boolean))
        tr.addMark(pos, pos + node.nodeSize, mark.type.create(attrs));
    });
    view.dispatch(tr);
    editor.commands.focus();
  }
  return (
    <div className="typography-panel">
      <div className="inspector-intro">
        <span className="inspector-symbol">
          <Type size={20} />
        </span>
        <h3>{t("typographyTitle")}</h3>
        <p>{t("typographyDescription")}</p>
      </div>
      <label className="heading-flow-option"><input type="checkbox" checked={project.typography.keepHeadingsWithNext !== false} disabled={locked} onChange={event=>onChange({...project.typography,keepHeadingsWithNext:event.target.checked})}/><span>{en?"Keep headings with the following text":"Mantieni il titolo con il testo successivo"}<small>{en?"Applies to DOCX and PDF exports. The editor preview is temporarily disabled while pagination is stabilized.":"Si applica agli export DOCX e PDF. L’anteprima nell’editor è temporaneamente disattivata per stabilizzare la paginazione."}</small></span></label>
      <div className="inspector-fields">
        <label>
          {t("bodyFont")}
          <select
            aria-label={t("bodyFont")}
            value={project.typography.font}
            disabled={locked}
            onChange={(e) => update("font", e.target.value)}
          >
            {[
              "Georgia",
              "Garamond",
              "Times New Roman",
              "Palatino Linotype",
              "Arial",
              "Calibri",
              "Verdana",
            ].map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
        <div className="field-pair">
          <label>
            {t("fontSize")}
            <select
              disabled={locked}
              value={project.typography.size}
              onChange={(e) => update("size", Number(e.target.value))}
            >
              {[10, 11, 12, 13, 14, 16, 18].map((size) => (
                <option key={size} value={size}>
                  {size} pt
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("lineHeight")}
            <select
              disabled={locked}
              value={project.typography.lineHeight}
              onChange={(e) => update("lineHeight", Number(e.target.value))}
            >
              {[1, 1.15, 1.3, 1.5, 1.6, 1.8, 2].map((height) => (
                <option key={height}>{height}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-pair">
          <label>
            {t("paragraphSpace")}
            <select
              disabled={locked}
              value={project.typography.paragraphSpacing}
              onChange={(e) =>
                update("paragraphSpacing", Number(e.target.value))
              }
            >
              {[0, 4, 6, 8, 12, 16].map((size) => (
                <option key={size} value={size}>
                  {size} pt
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("margins")}
            <select
              disabled={locked}
              value={project.typography.margin}
              onChange={(e) => update("margin", Number(e.target.value))}
            >
              {[15, 20, 25, 30].map((size) => (
                <option key={size} value={size}>
                  {size} mm
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="format-audit">
        <h4>{en ? "Body text alignment" : "Allineamento del testo normale"}</h4>
        <p>{en ? "Apply to every normal paragraph, including lists and table cells. Headings, contents and bold/italic text are preserved. You can undo the operation." : "Applica a tutti i paragrafi normali, inclusi elenchi e celle delle tabelle. Titoli, indice, grassetti e corsivi vengono preservati. Puoi annullare l’operazione."}</p>
        <button className="studio-button secondary full" disabled={locked} onClick={() => alignBody("justify")}>{en ? "Justify all body text" : "Giustifica tutto il testo normale"}</button>
        <button className="studio-button text full" disabled={locked} onClick={() => alignBody("left")}>{en ? "Align all body text left" : "Allinea tutto il testo normale a sinistra"}</button>
        <small>{en?"Body alignment excludes tables. Cell alignment remains unchanged.":"L’allineamento del corpo esclude le tabelle. Gli allineamenti delle celle restano invariati."}</small>
        <button className="studio-button text full" disabled={locked} onClick={()=>{const tr=alignParagraphs(editor.state,"left","tables");if(tr.docChanged)editor.view.dispatch(tr);}}>{en?"Align table text left":"Allinea il testo delle tabelle a sinistra"}</button>
        <small>{en?"Changes all table paragraphs, including numeric cells. You can undo it.":"Modifica tutti i paragrafi delle tabelle, comprese le celle numeriche. Puoi annullare l’operazione."}</small>
      </div>
      <div className="format-audit">
        <h4>
          <AlignVerticalSpaceAround size={16} />
          {t("formatCheck")}
        </h4>
        <p>
          {t("fontsFound", { count: audit.fonts.length || 1 })}
          <strong>{audit.fonts.join(", ") || project.typography.font}</strong>
        </p>
        <p>
          {t("sizesFound", { count: audit.sizes.length || 1 })}
          <strong>
            {audit.sizes.join(", ") || `${project.typography.size} pt`}
          </strong>
        </p>
        <p>{t("emptyParagraphs", { count: audit.empty })}</p>
        <p>{t("headingSkips", { count: audit.headingSkips })}</p>
        <button
          className="studio-button secondary full"
          disabled={locked}
          onClick={normalize}
        >
          <Check size={15} />
          {t("normalizeFonts")}
        </button>
        <small>{t("normalizeNote")}</small>
        {audit.empty > 0 && (
          <button
            className="studio-button text full"
            disabled={locked}
            onClick={() => {
              const positions: { pos: number; size: number }[] = [];
              editor.state.doc.descendants((node, pos, parent) => {
                if (
                  node.type.name === "paragraph" &&
                  !node.content.size &&
                  parent?.type.name === "doc"
                )
                  positions.push({ pos, size: node.nodeSize });
              });
              const tr = editor.state.tr;
              positions
                .reverse()
                .forEach((p) => tr.delete(p.pos, p.pos + p.size));
              editor.view.dispatch(tr);
            }}
          >
            {t("removeEmpty")}
          </button>
        )}
      </div>
    </div>
  );
}
