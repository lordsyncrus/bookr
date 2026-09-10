import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { Schema } from "@tiptap/pm/model";
import { Transform } from "@tiptap/pm/transform";
import { Packer } from "docx";
import JSZip from "jszip";
const require = createRequire(new URL("../package.json", import.meta.url));
function load(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    require,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const { reviewChunks, anchorFinding, remapFindings, countWords } = load(
  "../src/lib/editor/document.ts",
);
const { buildWordDocument } = load("../src/lib/editor/export.ts");
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    heading: {
      content: "inline*",
      group: "block",
      attrs: { level: { default: 1 } },
    },
    text: { group: "inline" },
    hardBreak: { inline: true, group: "inline" },
  },
  marks: { bold: {} },
});
const p = (...children) => schema.node("paragraph", null, children);
const text = (value) => schema.text(value);
const finding = (original, suggested, from, to) => ({
  id: "synthetic",
  original,
  suggested,
  from,
  to,
  start: 0,
  end: original.length,
  reason: "fixture",
  category: "language",
  status: "pending",
  block: 1,
});

test("chunks cover the complete long manuscript, preserving text and valid positions", () => {
  const source = "Una frase sintetica. ".repeat(1500);
  const doc = schema.node("doc", null, [
    p(text(source)),
    p(text("Fine del secondo capitolo.")),
  ]);
  const chunks = reviewChunks(doc, 9000);
  assert.ok(chunks.length > 3);
  const flattened = chunks.flatMap((c) =>
    c.positions.filter((pos) => pos >= 0),
  );
  assert.equal(
    flattened.length,
    source.length + "Fine del secondo capitolo.".length,
  );
  assert.equal(new Set(flattened).size, flattened.length);
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= 9000);
    for (let i = 0; i < chunk.text.length; i++)
      if (chunk.positions[i] >= 0)
        assert.equal(
          doc.textBetween(chunk.positions[i], chunk.positions[i] + 1),
          chunk.text[i],
        );
  }
});

test("anchors across styled runs but rejects findings across paragraph boundaries", () => {
  const doc = schema.node("doc", null, [
    p(
      text("Una "),
      schema.text("frase", [schema.mark("bold")]),
      text(" chiara."),
    ),
    p(text("Una frase chiara.")),
  ]);
  const [chunk] = reviewChunks(doc);
  assert.deepEqual(anchorFinding(chunk, 0, 9), { from: 1, to: 10 });
  assert.equal(anchorFinding(chunk, 10, 20), null);
  assert.equal(countWords(doc.toJSON()), 6);
});

test("approvals track replacement and undo; unrelated proposals move and changed text goes stale", () => {
  const doc = schema.node("doc", null, [p(text("Alpha beta gamma."))]);
  const first = finding("beta", "much longer beta", 7, 11);
  const last = { ...finding("gamma", "G", 12, 17), id: "second" };
  const tr = new Transform(doc).replaceWith(
    first.from,
    first.to,
    text(first.suggested),
  );
  const [applied, shifted] = remapFindings(
    [{ ...first, status: "approved" }, last],
    tr.mapping,
    tr.doc,
  );
  assert.equal(applied.status, "approved");
  assert.equal(tr.doc.textBetween(applied.from, applied.to), first.suggested);
  assert.equal(shifted.status, "pending");
  assert.equal(tr.doc.textBetween(shifted.from, shifted.to), "gamma");
  const undo = new Transform(tr.doc).step(tr.steps[0].invert(doc));
  const [restored] = remapFindings([applied], undo.mapping, undo.doc);
  assert.equal(restored.status, "pending");
  const changed = new Transform(doc).replaceWith(8, 9, text("X"));
  assert.equal(
    remapFindings([first], changed.mapping, changed.doc)[0].status,
    "stale",
  );
});

test("DOCX contains complete text, formatting, headings, list and table with chosen page settings", async () => {
  const json = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Synthetic title" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          { type: "text", text: "Opening ", marks: [{ type: "bold" }] },
          {
            type: "text",
            text: "italic ending",
            marks: [
              { type: "italic" },
              {
                type: "textStyle",
                attrs: { fontFamily: "Arial", fontSize: "14pt" },
              },
            ],
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "List entry" }],
              },
            ],
          },
        ],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Table cell" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "THE VERY LAST PAGE" }],
      },
    ],
  };
  const doc = buildWordDocument(json, {
    font: "Georgia",
    size: 12,
    lineHeight: 1.5,
    paragraphSpacing: 8,
    margin: 25,
  });
  const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
  const xml = await zip.file("word/document.xml").async("string");
  for (const pattern of [
    "Synthetic title",
    "Opening ",
    "italic ending",
    "List entry",
    "Table cell",
    "THE VERY LAST PAGE",
    'w:val="Heading1"',
    'w:ascii="Arial"',
    'w:val="28"',
    'w:val="center"',
    "<w:tbl>",
    "<w:numPr>",
    'w:line="360"',
  ])
    assert.ok(xml.includes(pattern), pattern);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
});

test("DOCX exports optional author metadata and colophon without inventing absent credits", async () => {
  const metadata = { title: "Opera sintetica", subtitle: "Sottotitolo", authors: "Autrice Uno\nAutore Due", writingYear: "2020–2026", language: "it", edition: "Prima edizione", publisher: "", publicationYear: "", publicationPlace: "", isbn: "", copyright: "© 2026 Autrice Uno", credits: "Copertina: Nome di prova", rights: "", colophonNotes: "Stampato per prova", includeTitlePage: true, includeColophon: true };
  const typography = {font:"Garamond",size:12,lineHeight:1.5,paragraphSpacing:6,margin:25};
  const doc = { type:"doc", content:[{ type:"paragraph", content:[{type:"text",text:"CORPO INTEGRALE"}]}] };
  const zip = await JSZip.loadAsync(await Packer.toBuffer(buildWordDocument(doc, typography, metadata)));
  const xml = await zip.file("word/document.xml").async("string");
  const core = await zip.file("docProps/core.xml").async("string");
  for (const expected of ["Autrice Uno", "Autore Due", "2020–2026", "Copertina: Nome di prova", "CORPO INTEGRALE"]) assert.ok(xml.includes(expected));
  assert.ok(xml.indexOf("Stampato per prova") < xml.indexOf("CORPO INTEGRALE"));
  assert.equal((xml.match(/w:type="page"/g)||[]).length,2);
  assert.ok(core.includes("Autrice Uno"));
  assert.ok(!xml.includes("ISBN"));
  const plain = await JSZip.loadAsync(await Packer.toBuffer(buildWordDocument(doc, typography, {...metadata,includeTitlePage:false,includeColophon:false})));
  assert.ok(!(await plain.file("word/document.xml").async("string")).includes("Autrice Uno"));
});

test("bulk approval applies pending exact matches, skips changed text, preserves marks and undoes in one step", async () => {
  const { EditorState } = await import("@tiptap/pm/state");
  const { history, undo } = await import("@tiptap/pm/history");
  const { approvalTransaction } = load("../src/lib/editor/approve.ts");
  const doc = schema.node("doc", null, [p(text("Alpha "), schema.text("beta", [schema.mark("bold")]), text(" gamma delta."))]);
  const findings = [finding("beta", "BETTER beta", 7, 11), {...finding("gamma", "G", 12, 17), id:"second"}, {...finding("delta", "D", 18, 23), id:"rejected", status:"rejected"}, {...finding("Wrong", "new", 1, 6), id:"stale"}];
  let state = EditorState.create({doc,plugins:[history()]});
  const result = approvalTransaction(state, findings);
  assert.deepEqual(result.approved.sort(), ["second", "synthetic"]);
  assert.deepEqual(result.stale, ["stale"]);
  const mapped = remapFindings(findings.map(f=>result.approved.includes(f.id)?{...f,status:"approved"}:f),result.tr.mapping,result.tr.doc);
  assert.equal(mapped.filter(f=>f.status==="approved").length,2);
  state = state.apply(result.tr);
  assert.equal(state.doc.textContent,"Alpha BETTER beta G delta.");
  assert.ok(state.doc.rangeHasMark(7,18,schema.marks.bold));
  assert.equal(undo(state,tr=>{state=state.apply(tr);}),true);
  assert.ok(state.doc.eq(doc));
});

test("revision report includes every decision, source, replacement and reason without changing the manuscript", async () => {
  const { buildRevisionReport } = load("../src/lib/editor/revision-report.ts");
  const findings = ["approved","rejected","pending","stale"].map((status,i)=>({...finding(`Originale ${i}`,`Proposta ${i}`,1,4),id:String(i),status,reason:`Motivo ${i}`}));
  const project = {name:"Prova report",findings,doc:{type:"doc"}};
  const before = JSON.stringify(project);
  const zip = await JSZip.loadAsync(await Packer.toBuffer(buildRevisionReport(project,"it")));
  const xml = await zip.file("word/document.xml").async("string");
  for (const f of findings) for (const value of [f.original,f.suggested,f.reason]) assert.ok(xml.includes(value));
  for (const label of ["Approvata","Rifiutata","In attesa","Non più applicabile"]) assert.ok(xml.includes(label));
  assert.equal(JSON.stringify(project),before);
});

test("automatic contents has visible linked entries and bookmarks without invented page numbers", async () => {
  const doc={type:"doc",content:[{type:"heading",attrs:{level:1},content:[{type:"text",text:"Primo capitolo"}]},{type:"paragraph",content:[{type:"text",text:"Corpo uno"}]},{type:"heading",attrs:{level:2},content:[{type:"text",text:"Sottosezione"}]},{type:"heading",attrs:{level:1},content:[{type:"text",text:"Ultimo capitolo"}]}]};
  const typography={font:"Georgia",size:12,lineHeight:1.5,paragraphSpacing:6,margin:25};
  const zip=await JSZip.loadAsync(await Packer.toBuffer(buildWordDocument(doc,typography,undefined,{enabled:true,minLevel:1,maxLevel:2,title:"Indice"})));
  const xml=await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes("TOC"));assert.ok(xml.includes('w:name="bookr_heading_1"'));
  assert.ok(xml.includes('w:anchor="bookr_heading_1"'));
  assert.equal((xml.match(/Ultimo capitolo/g)||[]).length,2);
  assert.ok((await zip.file("word/settings.xml").async("string")).includes("updateFields"));
});

test("detects an existing contents list and distinguishes unique and ambiguous body titles", () => {
  const { detectContents } = load("../src/lib/editor/detect-contents.ts");
  const doc=schema.node("doc",null,[p(text("Indice")),p(text("Introduzione ........ 3")),p(text("1. Tecnica\t7")),p(text("Conclusione ...... 12")),p(text("Introduzione")),p(text("Un paragrafo introduttivo sintetico, sufficientemente lungo per distinguere il corpo del libro dall’indice iniziale. ".repeat(3))),p(text("Tecnica")),p(text("Corpo tecnico")),p(text("Conclusione")),p(text("Testo conclusivo")),p(text("Conclusione"))]);
  const result=detectContents(doc);
  assert.equal(result.entries.length,3);
  assert.equal(result.entries[0].targets.length,1);
  assert.equal(result.entries[1].targets[0].title,"Tecnica");
  assert.equal(result.entries[2].targets.length,2);
  assert.equal(result.range.from,0);
  assert.equal(doc.nodeAt(result.range.to).textContent,"Introduzione");
});

test("unlabelled prose and numeric page columns do not become chapter references", () => {
  const { detectContents }=load("../src/lib/editor/detect-contents.ts");
  const doc=schema.node("doc",null,[p(text("Una breve storia.")),p(text("Fine")),p(text("Una breve storia.")),p(text("Fine"))]);
  assert.equal(detectContents(doc).entries.length,0);
});

test("export can replace only the confirmed contents range while retaining the body and front matter",async()=>{
  const source=schema.node("doc",null,[p(text("Dedica sintetica")),p(text("Indice originale")),p(text("Prima voce .... 3")),schema.node("heading",{level:1},text("Capitolo vero")),p(text("Ultima frase del corpo"))]);
  const from=source.child(0).nodeSize,to=from+source.child(1).nodeSize+source.child(2).nodeSize;
  const typography={font:"Georgia",size:12,lineHeight:1.5,paragraphSpacing:6,margin:25};
  const zip=await JSZip.loadAsync(await Packer.toBuffer(buildWordDocument(source.toJSON(),typography,undefined,{enabled:true,minLevel:1,maxLevel:3,title:"Indice",existingRange:{from,to},replaceExisting:true})));
  const xml=await zip.file("word/document.xml").async("string");
  assert.ok(!xml.includes("Indice originale"));assert.ok(!xml.includes("Prima voce"));
  assert.ok(xml.includes("Dedica sintetica"));assert.ok(xml.includes("Ultima frase del corpo"));assert.equal((xml.match(/Capitolo vero/g)||[]).length,2);
});

test("structural references follow moved headings and expose duplicate-title ambiguity", () => {
  const {chapterReferences}=load("../src/lib/editor/structure-navigation.ts");
  const heading=value=>schema.node("heading",{level:1},text(value));
  const chapter={id:"chapter-1",title:"Introduzione",from:0,to:20,headingPos:0,index:1,words:2};
  const original=schema.node("doc",null,[heading("Introduzione"),p(text("Testo"))]);
  assert.deepEqual(chapterReferences(original,chapter,false),[{pos:0,title:"Introduzione"}]);
  const moved=schema.node("doc",null,[heading("Altro capitolo"),p(text("Introduzione")),heading("Introduzione")]);
  const expected=moved.child(0).nodeSize+moved.child(1).nodeSize;
  assert.deepEqual(chapterReferences(moved,chapter,true),[{pos:expected,title:"Introduzione"}]);
  const duplicate=schema.node("doc",null,[heading("Introduzione"),p(text("Testo")),heading("Introduzione")]);
  assert.equal(chapterReferences(duplicate,chapter,true).length,2);
  const removed=schema.node("doc",null,[p(text("Introduzione"))]);
  assert.equal(chapterReferences(removed,chapter,true).length,0);
});

test("editor page navigation handles boundaries, zoomed offsets and document shrinkage", () => {
  const {EDITOR_PAGE_HEIGHT:H,pageCount,clampPage,pageAtOffset,pageScrollTop}=load("../src/lib/editor/pages.ts");
  assert.equal(pageCount(0),1);
  assert.equal(pageCount(H),1);
  assert.equal(pageCount(H*12),12);
  assert.equal(pageCount(H+20),2);
  assert.equal(pageCount(H*2-50),2);
  assert.equal(pageAtOffset(-200,12),1);
  assert.equal(pageAtOffset(H*4,12),5);
  assert.equal(pageAtOffset(H*40,12),12);
  assert.equal(clampPage(12,3),3);
  assert.equal(clampPage(NaN,3),1);
  assert.equal(pageScrollTop(5,12,46,1.25),46+H*4*1.25-12);
  assert.equal(pageScrollTop(100,3,46,.75),46+H*2*.75-12);
});
