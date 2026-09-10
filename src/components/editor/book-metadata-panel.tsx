"use client";
import { useTranslations } from "next-intl";
import type { ManuscriptProject } from "@/lib/editor/types";
import { EMPTY_METADATA, type BookMetadata } from "@/lib/editorial/types";

type TextField = Exclude<keyof BookMetadata, "includeTitlePage" | "includeColophon">;
export function BookMetadataPanel({ project, onChange }: {
  project: ManuscriptProject;
  onChange: (metadata: BookMetadata) => void;
}) {
  const t = useTranslations("editor.bookData");
  const metadata = { ...EMPTY_METADATA, ...project.metadata };
  const groups: { title: string; fields: TextField[] }[] = [
    { title: "identity", fields: ["title", "subtitle", "authors", "writingYear", "language"] },
    { title: "publication", fields: ["edition", "publisher", "publicationYear", "publicationPlace", "isbn"] },
    { title: "colophon", fields: ["copyright", "credits", "rights", "colophonNotes"] },
  ];
  return <div className="book-metadata hexclave-private">
    <h3>{t("title")}</h3><p>{t("description")}</p>
    {groups.map(group => <fieldset key={group.title}>
      <legend>{t(group.title)}</legend>
      {group.fields.map(field => <label key={field}>
        <span>{t(`fields.${field}`)}</span>
        {["authors", "credits", "rights", "colophonNotes"].includes(field)
          ? <textarea rows={field === "colophonNotes" ? 4 : 2} maxLength={6000} value={metadata[field]} onChange={event => onChange({ ...metadata, [field]: event.target.value })} />
          : <input type="text" maxLength={500} value={metadata[field]} onChange={event => onChange({ ...metadata, [field]: event.target.value })} />}
        {field === "authors" && <small>{t("authorsHint")}</small>}
      </label>)}
    </fieldset>)}
    <fieldset><legend>{t("export")}</legend>
      <label className="book-option"><input type="checkbox" checked={metadata.includeTitlePage} onChange={event => onChange({ ...metadata, includeTitlePage: event.target.checked })} /><span>{t("includeTitlePage")}</span></label>
      <label className="book-option"><input type="checkbox" checked={metadata.includeColophon} onChange={event => onChange({ ...metadata, includeColophon: event.target.checked })} /><span>{t("includeColophon")}</span></label>
      <small>{t("exportHint")}</small>
    </fieldset>
  </div>;
}
