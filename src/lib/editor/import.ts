import DOMPurify from "dompurify";
import { generateJSON } from "@tiptap/core";
import { editorExtensions } from "./extensions";
import { DEFAULT_TYPOGRAPHY, type ManuscriptProject } from "./types";
import { MAX_MANUSCRIPT_BYTES } from "../manuscript-types";

export async function importManuscript(file: File): Promise<ManuscriptProject> {
  if (file.size > MAX_MANUSCRIPT_BYTES) throw new Error("FILE_TOO_LARGE");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["docx", "md", "txt"].includes(extension || ""))
    throw new Error("UNSUPPORTED_FORMAT");
  let html: string;
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      { styleMap: ["u => u", "strike => s"], includeDefaultStyleMap: true },
    );
    html = await restoreRunTypography(buffer, result.value);
  } else if (extension === "md") {
    const { marked } = await import("marked");
    html = await marked.parse(await file.text());
  } else {
    const escape = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = (await file.text())
      .replace(/\r\n?/g, "\n")
      .split(/\n/)
      .map((p) => `<p>${escape(p)}</p>`)
      .join("");
  }
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "br",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "span",
      "sup",
      "sub",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
      "hr",
    ],
    FORBID_TAGS: extension === "docx" ? [] : ["img"],
    ALLOWED_ATTR: [
      "style",
      "href",
      "src",
      "alt",
      "width",
      "height",
      "colspan",
      "rowspan",
      "start",
    ],
  });
  const container = document.createElement("div");
  container.innerHTML = safe;
  // Never fetch remote manuscript images or retain active CSS from imported HTML.
  container.querySelectorAll("img").forEach((img) => {
    if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(img.src))
      img.remove();
  });
  container.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const properties = [
      "font-family",
      "font-size",
      "color",
      "text-align",
      "line-height",
    ];
    const keep = properties.map((key) => [key, el.style.getPropertyValue(key)]);
    el.removeAttribute("style");
    for (const [key, value] of keep)
      if (value && !/url\(|var\(/i.test(value))
        el.style.setProperty(key, value);
  });
  if (!container.textContent?.trim()) throw new Error("EMPTY_MANUSCRIPT");
  for (const img of Array.from(container.querySelectorAll("img"))) {
    const image = new Image();
    image.src = img.src;
    try {
      await image.decode();
      const width = Math.min(image.naturalWidth, 600);
      const height = Math.round(
        (image.naturalHeight * width) / image.naturalWidth,
      );
      img.width = width;
      img.height = height;
      if (img.src.startsWith("data:image/webp")) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("PARSE_FAILED");
        context.drawImage(image, 0, 0, width, height);
        img.src = canvas.toDataURL("image/png");
      }
    } catch {
      throw new Error("PARSE_FAILED");
    }
  }
  const doc = generateJSON(container.innerHTML, editorExtensions());
  const now = Date.now();
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    createdAt: now,
    updatedAt: now,
    doc,
    original: structuredClone(doc),
    source: file,
    typography: { ...DEFAULT_TYPOGRAPHY },
    findings: [],
    review: null,
    importNotice: extension === "docx",
  };
}

// Mammoth preserves semantic structure; overlay Word run fonts/sizes on exact
// matching paragraphs, without flattening bold, italics, links or footnotes.
async function restoreRunTypography(
  buffer: ArrayBuffer,
  html: string,
): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("PARSE_FAILED");
  const parse = (s: string) =>
    new DOMParser().parseFromString(s, "application/xml");
  const main = parse(xml);
  const styleXml = await zip.file("word/styles.xml")?.async("string");
  const styles = styleXml ? parse(styleXml) : null;
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const child = (e: Element | null, name: string) =>
    e
      ? (Array.from(e.children).find((n) => n.localName === name) ?? null)
      : null;
  const attr = (e: Element | null, key = "val") =>
    e?.getAttributeNS(ns, key) || undefined;
  const props = (e: Element | null) => {
    const font =
      attr(child(e, "rFonts"), "ascii") || attr(child(e, "rFonts"), "hAnsi");
    const size = Number(attr(child(e, "sz")));
    return {
      ...(font ? { font } : {}),
      ...(size > 0 && size < 300 ? { size: size / 2 } : {}),
    };
  };
  type RunStyle = { font?: string; size?: number };
  const styleMap = new Map<string, Element>();
  if (styles)
    Array.from(styles.getElementsByTagNameNS(ns, "style")).forEach((e) =>
      styleMap.set(attr(e, "styleId") || "", e),
    );
  const resolveStyle = (id?: string, depth = 0): RunStyle => {
    const e = id ? styleMap.get(id) : null;
    if (!e || depth > 10) return {};
    return {
      ...resolveStyle(attr(child(e, "basedOn")), depth + 1),
      ...props(child(e, "rPr")),
    };
  };
  const defaults = props(
    styles
      ?.getElementsByTagNameNS(ns, "rPrDefault")[0]
      ?.getElementsByTagNameNS(ns, "rPr")[0] ?? null,
  );
  const container = document.createElement("div");
  container.innerHTML = DOMPurify.sanitize(html);
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>("p,h1,h2,h3,h4,h5,h6,li"),
  );
  let searchFrom = 0;
  for (const paragraph of Array.from(main.getElementsByTagNameNS(ns, "p"))) {
    const base = {
      ...defaults,
      ...resolveStyle(attr(child(child(paragraph, "pPr"), "pStyle"))),
    };
    const runs = Array.from(paragraph.getElementsByTagNameNS(ns, "r"))
      .map((run) => {
        const text = Array.from(run.children)
          .map((n) =>
            n.localName === "t"
              ? n.textContent || ""
              : n.localName === "tab"
                ? "\t"
                : n.localName === "br"
                  ? "\n"
                  : "",
          )
          .join("");
        return {
          text,
          style: {
            ...base,
            ...resolveStyle(attr(child(child(run, "rPr"), "rStyle"))),
            ...props(child(run, "rPr")),
          },
        };
      })
      .filter((r) => r.text);
    const text = runs.map((r) => r.text).join("");
    if (!text) continue;
    const match = candidates.findIndex(
      (el, i) => i >= searchFrom && el.textContent === text,
    );
    if (match < 0) continue;
    const el = candidates[match];
    searchFrom = match + 1;
    const align = attr(child(child(paragraph, "pPr"), "jc"));
    if (align) el.style.textAlign = align === "both" ? "justify" : align;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    let runIndex = 0;
    let runOffset = 0;
    for (const node of nodes) {
      let offset = 0;
      const fragment = document.createDocumentFragment();
      while (offset < node.length && runs[runIndex]) {
        const run = runs[runIndex];
        const length = Math.min(
          node.length - offset,
          run.text.length - runOffset,
        );
        const span = document.createElement("span");
        span.textContent = node.data.slice(offset, offset + length);
        if (run.style.font) span.style.fontFamily = run.style.font;
        if (run.style.size) span.style.fontSize = `${run.style.size}pt`;
        fragment.appendChild(span);
        offset += length;
        runOffset += length;
        if (runOffset === run.text.length) {
          runIndex++;
          runOffset = 0;
        }
      }
      if (offset < node.length)
        fragment.appendChild(document.createTextNode(node.data.slice(offset)));
      node.replaceWith(fragment);
    }
  }
  return container.innerHTML;
}
