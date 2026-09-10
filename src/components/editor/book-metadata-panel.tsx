"use client";
import { bookProfile, PROFILE_FIELDS, type ProfileField } from "@/lib/editor/book-profile";
import { useLocale, useTranslations } from "next-intl";
import type { ManuscriptProject } from "@/lib/editor/types";
import { EMPTY_METADATA, type BookMetadata } from "@/lib/editorial/types";

type TextField = Exclude<keyof BookMetadata, "includeTitlePage" | "includeColophon" | "editorialProfile">;
export function BookMetadataPanel({ project, onChange }: {
  project: ManuscriptProject;
  onChange: (metadata: BookMetadata) => void;
}) {
  const t = useTranslations("editor.bookData");
  const en=useLocale()==="en";
  const profile=bookProfile(project);
  const labels:Record<ProfileField,string>=en?{description:"Short description",purpose:"Purpose",audience:"Intended audience",workType:"Type of work",genre:"Genre / narrative type",tone:"Voice and tone",register:"Register",pointOfView:"Narrative point of view",tense:"Verb tenses",rhythm:"Rhythm and sentence structure",vocabulary:"Vocabulary and terminology",consistency:"Consistency rules"}:{description:"Descrizione breve",purpose:"Scopo del libro",audience:"Pubblico di riferimento",workType:"Tipo di opera",genre:"Genere / tipo di narrativa",tone:"Voce e tono",register:"Registro linguistico",pointOfView:"Persona e punto di vista",tense:"Tempi verbali",rhythm:"Ritmo e costruzione delle frasi",vocabulary:"Lessico e terminologia",consistency:"Regole di coerenza"};
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
    <fieldset className="book-editorial-profile"><legend>{en?"Book profile":"Profilo del libro"}</legend>
      <p>{en?"Context for AI writing and editing. When unspecified, preserve the voice and meaning of the passage.":"Contesto per scrittura e revisione AI. Se un campo non è specificato, vengono preservati voce e significato del passaggio."}</p>
      <small>{en?"New analyses infer this profile from reading memory. Older analyses provide description and tone only. Unsupported fields remain unspecified.":"Le nuove analisi ricavano il profilo dalla memoria di lettura. Da quelle precedenti recuperiamo descrizione e tono. I campi non deducibili restano da definire."}</small>
      {project.analysis?.stale&&<p role="status">{en?"The manuscript changed since the last analysis: review the inferred profile.":"Il manoscritto è cambiato dall’ultima analisi: ricontrolla il profilo ricavato dalla lettura."}</p>}
      {PROFILE_FIELDS.map(field=><label key={field}><span>{labels[field]} <small>{metadata.editorialProfile?.[field]!==undefined?(en?"Edited by you":"Personalizzato"):(profile[field]?(en?"From analysis · to verify":"Dall’analisi · da verificare"):(en?"Not specified":"Da definire"))}</small></span><textarea rows={["description","tone","consistency"].includes(field)?4:2} maxLength={6000} value={profile[field]} placeholder={en?"Preserve the passage’s existing style":"Mantieni le caratteristiche del testo"} onChange={event=>onChange({...metadata,editorialProfile:{...metadata.editorialProfile,[field]:event.target.value}})}/></label>)}
      <button type="button" className="studio-button secondary" onClick={()=>onChange({...metadata,editorialProfile:undefined})}>{en?"Reset profile to reading defaults":"Ripristina profilo dalla lettura"}</button>
    </fieldset>
    <fieldset><legend>{t("export")}</legend>
      <label className="book-option"><input type="checkbox" checked={metadata.includeTitlePage} onChange={event => onChange({ ...metadata, includeTitlePage: event.target.checked })} /><span>{t("includeTitlePage")}</span></label>
      <label className="book-option"><input type="checkbox" checked={metadata.includeColophon} onChange={event => onChange({ ...metadata, includeColophon: event.target.checked })} /><span>{t("includeColophon")}</span></label>
      <small>{t("exportHint")}</small>
    </fieldset>
  </div>;
}
