import { generateHTML, getSchema } from "@tiptap/core";
import DOMPurify from "dompurify";
import { editorExtensions } from "./extensions";
import type { ManuscriptProject } from "./types";
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]!);
export function buildPrintDocument(project:ManuscriptProject,locale:string) {
  const schema=getSchema(editorExtensions());const doc=schema.nodeFromJSON(project.doc);
  const range=project.contents?.enabled&&project.contents.replaceExisting?project.contents.existingRange:undefined;
  const nodes:ReturnType<typeof doc.toJSON>[]=[];
  doc.forEach((node,pos)=>{if(!(range&&range.from<range.to&&pos>=range.from&&pos+node.nodeSize<=range.to))nodes.push(node.toJSON());});
  const root=document.createElement("div");
  root.innerHTML=DOMPurify.sanitize(generateHTML({type:"doc",content:nodes},editorExtensions()));
  const entries:string[]=[];
  root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading,index)=>{
    const id=`bookr-print-heading-${index+1}`;heading.id=id;
    const level=Number(heading.tagName.slice(1));
    if(project.contents?.enabled&&level>=project.contents.minLevel&&level<=project.contents.maxLevel)entries.push(`<li style="margin-left:${(level-project.contents.minLevel)*16}px"><a href="#${id}">${escape(heading.textContent||"")}</a></li>`);
  });
  // Imported images are local data URLs; do not make network requests while printing.
  root.querySelectorAll("img").forEach(img=>{if(!img.src.startsWith("data:image/"))img.remove();});
  const meta=project.metadata;const p=(value:string)=>`<p>${escape(value).replace(/\n/g,"<br>")}</p>`;
  let front="";
  if(meta?.includeTitlePage)front+=`<section class="front"><h1>${escape(meta.title)}</h1>${p(meta.subtitle)}${p(meta.authors)}</section>`;
  if(meta?.includeColophon){const values=[meta.title,meta.subtitle,meta.authors,meta.writingYear?`${locale==="it"?"Scrittura":"Written"}: ${meta.writingYear}`:"",meta.language,meta.edition,meta.publisher,[meta.publicationPlace,meta.publicationYear].filter(Boolean).join(", "),meta.isbn?`ISBN ${meta.isbn}`:"",meta.copyright,meta.credits,meta.rights,meta.colophonNotes];front+=`<section class="front">${values.filter(Boolean).map(p).join("")}</section>`;}
  const type=project.typography;
  const number=(value:number,fallback:number,min:number,max:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
  const font=type.font.replace(/[^a-zA-Z0-9 -]/g,"");
  return `<!doctype html><html lang="${locale==="en"?"en":"it"}"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'"><title>${escape(project.metadata?.title||project.name)} — PDF</title><style>
  @page { size:A4; margin:${number(type.margin,25,10,45)}mm; }
  * { box-sizing:border-box; } body { margin:0; color:#222; background:white; font-family:'${font}',Georgia,serif; font-size:${number(type.size,12,8,36)}pt; line-height:${number(type.lineHeight,1.6,1,3)}; }
  p { text-align:justify; margin:0 0 ${number(type.paragraphSpacing,8,0,40)}pt; orphans:3; widows:3; }
  h1,h2,h3,h4,h5,h6 { break-after:avoid; text-align:left; line-height:1.25; margin:1.4em 0 .65em; } h1{font-size:1.8em} h2{font-size:1.45em} h3{font-size:1.25em}
  img { max-width:100%; height:auto; break-inside:avoid; } table { border-collapse:collapse; width:100%; table-layout:fixed; } td,th { border:1px solid #999; padding:6pt; vertical-align:top; overflow-wrap:anywhere; } thead{display:table-header-group} blockquote{border-left:2pt solid #aaa;padding-left:12pt} a { color:inherit; text-decoration:none; }
  .front,.contents { break-after:page; } .contents ol { list-style:none;padding:0; } .contents li { margin-bottom:8pt; } .front:first-child h1 { margin-top:0; }
  .print-help { font:14px/1.5 sans-serif; background:#eff3e9; padding:16px; margin-bottom:25px; } @media screen { body{max-width:794px;margin:32px auto;padding:24px} } @media print { .print-help{display:none} }
  </style></head><body class="hexclave-private"><aside class="print-help">${locale==="it"?"Nella finestra di stampa scegli Salva come PDF. Usa A4 e disattiva le intestazioni e i piè di pagina del browser. Per riaprire la finestra: Ctrl+P / ⌘P.":"Choose Save as PDF in the print dialog. Use A4 and disable browser headers and footers. Press Ctrl+P / ⌘P to reopen the dialog."}</aside>${entries.length?`<section class="contents"><h1>${escape(project.contents?.title||"Indice")}</h1><ol>${entries.join("")}</ol></section>`:""}${front}<main>${root.innerHTML}</main></body></html>`;
}
export async function printPdf(project:ManuscriptProject,locale:string) {
  const popup=window.open("about:blank","_blank");
  if(!popup)throw new Error("POPUP_BLOCKED");
  popup.opener=null;
  try {
    popup.document.open();popup.document.write(buildPrintDocument(project,locale));popup.document.close();
    await popup.document.fonts.ready;
    await Promise.all(Array.from(popup.document.images).map(img=>img.decode().catch(()=>{})));
    if(popup.closed)return;
    popup.focus();popup.print();
  }catch(error){popup.close();throw error;}
}
