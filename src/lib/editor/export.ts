import type { JSONContent } from "@tiptap/core";
import {
  AlignmentType,
  Bookmark,
  TableOfContents,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
  type IParagraphOptions,
  type IRunOptions,
} from "docx";
import type { BookMetadata, ContentsOptions } from "../editorial/types";
import type { ManuscriptProject, Typography } from "./types";

function fontSize(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback * 2;
  const n = parseFloat(value);
  return Number.isFinite(n)
    ? n * (value.endsWith("px") ? 1.5 : 2)
    : fallback * 2;
}
function runs(node: JSONContent, typography: Typography): ParagraphChild[] {
  if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
  if (node.type === "image") {
    const src = String(node.attrs?.src || "");
    const match = src.match(/^data:image\/(png|jpeg|gif);base64,([\s\S]+)$/);
    if (!match) throw new Error("UNSUPPORTED_IMAGE");
    const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    return [
      new ImageRun({
        type: match[1] === "jpeg" ? "jpg" : (match[1] as "png" | "gif"),
        data: binary,
        transformation: {
          width: Number(node.attrs?.width) || 400,
          height: Number(node.attrs?.height) || 260,
        },
      }),
    ];
  }
  if (node.type !== "text")
    return (node.content || []).flatMap((n) => runs(n, typography));
  const marks = node.marks || [];
  const style = marks.find((m) => m.type === "textStyle")?.attrs || {};
  const options: IRunOptions = {
    text: node.text || "",
    font: style.fontFamily || typography.font,
    size: fontSize(style.fontSize, typography.size),
    highlight: marks.some(m => m.type === "userHighlight") ? "yellow" : undefined,
    bold: marks.some((m) => m.type === "bold"),
    italics: marks.some((m) => m.type === "italic"),
    strike: marks.some((m) => m.type === "strike"),
    underline: marks.some((m) => m.type === "underline") ? {} : undefined,
    superScript: marks.some((m) => m.type === "superscript"),
    subScript: marks.some((m) => m.type === "subscript"),
    color:
      typeof style.color === "string" && /^#[0-9a-f]{6}$/i.test(style.color)
        ? style.color.slice(1)
        : undefined,
  };
  const run = new TextRun(options);
  const link = marks.find((m) => m.type === "link")?.attrs?.href;
  return typeof link === "string" && /^(https?:|mailto:)/i.test(link)
    ? [new ExternalHyperlink({ link, children: [run] })]
    : [run];
}
function bookFrontMatter(metadata: BookMetadata | undefined, typography: Typography): Paragraph[] {
  if (!metadata) return [];
  const pages: Paragraph[] = [];
  const paragraph = (text: string, large = false) => new Paragraph({
    children: text.split(/\r?\n/).flatMap((line, index) => [new TextRun({ text: line, break: index ? 1 : undefined, font: typography.font, size: typography.size * (large ? 4 : 2) })]),
    spacing: { after: large ? 400 : 160 },
  });
  const endPage = () => pages.push(new Paragraph({ children: [new PageBreak()] }));
  if (metadata.includeTitlePage) {
    const content = [metadata.title, metadata.subtitle, metadata.authors].map(value => value.trim());
    if (content.some(Boolean)) {
      content.forEach((value, index) => { if (value) pages.push(paragraph(value, index === 0)); });
      endPage();
    }
  }
  if (metadata.includeColophon) {
    const english = /^en(?:glish)?(?:-|$)/i.test(metadata.language.trim());
    const lines = [metadata.title, metadata.subtitle, metadata.authors,
      metadata.writingYear.trim() ? `${english ? "Written" : "Scrittura"}: ${metadata.writingYear.trim()}` : "",
      metadata.language.trim() ? `${english ? "Language" : "Lingua"}: ${metadata.language.trim()}` : "",
      metadata.edition, metadata.publisher,
      [metadata.publicationPlace.trim(), metadata.publicationYear.trim()].filter(Boolean).join(", "),
      metadata.isbn.trim() ? `ISBN ${metadata.isbn.trim()}` : "",
      metadata.copyright, metadata.credits, metadata.rights, metadata.colophonNotes,
    ].map(value => value.trim()).filter(Boolean);
    if (lines.length) { lines.forEach(value => pages.push(paragraph(value))); endPage(); }
  }
  return pages;
}
export function buildWordDocument(
  doc: JSONContent,
  typography: Typography,
  metadata?: BookMetadata,
  contents?: ContentsOptions,
): Document {
  let headingIndex = 0;
  const tocEntries: {title:string;level:number;href:string}[] = [];
  let listInstance = 0;
  const blocks = (
    nodes: JSONContent[],
    list?: { kind: string; depth: number; instance: number },
    inTable = false,
  ): (Paragraph | Table)[] =>
    nodes.flatMap((node) => {
      if (node.type === "pageSection") return [new Paragraph({children:[new PageBreak()]}),...blocks(node.content||[],undefined,inTable),new Paragraph({children:[new PageBreak()]})];
      if (node.type === "table")
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: (node.content || []).map(
              (row) =>
                new TableRow({
                  children: (row.content || []).map(
                    (cell) =>
                      new TableCell({
                        columnSpan: Number(cell.attrs?.colspan) || 1,
                        rowSpan: Number(cell.attrs?.rowspan) || 1,
                        children: blocks(
                          cell.content || [{ type: "paragraph" }], undefined, true,
                        ),
                      }),
                  ),
                }),
            ),
          }),
        ];
      if (node.type === "bulletList" || node.type === "orderedList") {
        const context = {
          kind: node.type,
          depth: list ? Math.min(list.depth + 1, 8) : 0,
          instance: ++listInstance,
        };
        return (node.content || []).flatMap((item) =>
          (item.content || []).flatMap((part, index) =>
            blocks(
              [part],
              index === 0 || part.type?.endsWith("List") ? context : undefined, inTable,
            ),
          ),
        );
      }
      if (node.type === "blockquote" || node.type === "listItem")
        return blocks(node.content || [], list, inTable);
      const heading =
        node.type === "heading"
          ? Math.min(6, Math.max(1, Number(node.attrs?.level) || 1))
          : 0;
      const align = node.attrs?.textAlign || (node.type === "paragraph" && !inTable ? "justify" : "left");
      const alignment =
        align === "center"
          ? AlignmentType.CENTER
          : align === "right"
            ? AlignmentType.RIGHT
            : align === "justify"
              ? AlignmentType.JUSTIFIED
              : AlignmentType.LEFT;
      const options: IParagraphOptions = {
        children: runs(
          node,
          heading
            ? {
                ...typography,
                size:
                  typography.size * [1.8, 1.45, 1.25, 1.15, 1, 1][heading - 1],
              }
            : typography,
        ),
        alignment,
        heading: heading
          ? [
              HeadingLevel.HEADING_1,
              HeadingLevel.HEADING_2,
              HeadingLevel.HEADING_3,
              HeadingLevel.HEADING_4,
              HeadingLevel.HEADING_5,
              HeadingLevel.HEADING_6,
            ][heading - 1]
          : undefined,
        spacing: {
          after: typography.paragraphSpacing * 20,
          line: Math.round(typography.lineHeight * 240),
        },
        keepNext: !!heading && typography.keepHeadingsWithNext !== false,
        ...(list?.kind === "bulletList"
          ? { bullet: { level: list.depth } }
          : {}),
        ...(list?.kind === "orderedList"
          ? {
              numbering: {
                reference: "bookr-ordered",
                level: list.depth,
                instance: list.instance,
              },
            }
          : {}),
      };
      if (heading) {
        const id = `bookr_heading_${++headingIndex}`;
        const textOf = (n: JSONContent): string => (n.text || "") + (n.content || []).map(textOf).join("");
        if (contents && heading >= contents.minLevel && heading <= contents.maxLevel) tocEntries.push({ title: textOf(node), level: heading, href: id });
        return [new Paragraph({ ...options, children: [new Bookmark({ id, children: runs(node, { ...typography, size: typography.size * [1.8,1.45,1.25,1.15,1,1][heading-1] }) })] })];
      }
      return [new Paragraph(options)];
    });
  const nodeSize = (node: JSONContent): number => node.type === "text" ? (node.text || "").length : ["hardBreak","image","horizontalRule"].includes(node.type || "") ? 1 : 2 + (node.content || []).reduce((sum, child) => sum + nodeSize(child), 0);
  let offset = 0;
  const range = contents?.enabled && contents.replaceExisting ? contents.existingRange : undefined;
  let source = (doc.content || []).filter(node => {
    const from = offset; offset += nodeSize(node);
    return !(range && range.from < range.to && from >= range.from && offset <= range.to);
  });
  const hasIncludedHeading = (nodes: JSONContent[]): boolean => nodes.some(node => (node.type === "heading" && contents && Number(node.attrs?.level) >= contents.minLevel && Number(node.attrs?.level) <= contents.maxLevel) || hasIncludedHeading(node.content || []));
  if (range && !hasIncludedHeading(source)) source = doc.content || [];
  const body = blocks(source);
  return new Document({
    features: { updateFields: true },
    creator: metadata?.authors.trim() || "Bookr",
    title: metadata?.title.trim() || undefined,
    subject: metadata?.subtitle.trim() || undefined,
    styles: {
      default: {
        document: {
          run: { font: typography.font, size: typography.size * 2 },
          paragraph: {
            spacing: {
              after: typography.paragraphSpacing * 20,
              line: Math.round(typography.lineHeight * 240),
            },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bookr-ordered",
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } },
            },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: typography.margin * 56.693,
              bottom: typography.margin * 56.693,
              left: typography.margin * 56.693,
              right: typography.margin * 56.693,
            },
          },
        },
        children: [...(contents?.enabled && tocEntries.length ? [new TableOfContents(contents.title || "Indice", { hyperlink: true, headingStyleRange: `${contents.minLevel}-${contents.maxLevel}`, beginDirty: true, cachedEntries: tocEntries }), new Paragraph({children:[new PageBreak()]})] : []), ...bookFrontMatter(metadata, typography), ...body],
      },
    ],
  });
}
export async function exportDocx(project: ManuscriptProject): Promise<Blob> {
  return Packer.toBlob(buildWordDocument(project.doc, project.typography, project.metadata, project.contents));
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
