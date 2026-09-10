"use client";
import { AnnotationTools } from "./annotation-tools";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useTranslations } from "next-intl";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";
import type { Typography } from "@/lib/editor/types";
const fonts = [
  "Georgia",
  "Garamond",
  "Times New Roman",
  "Palatino Linotype",
  "Arial",
  "Calibri",
  "Verdana",
];
export function EditorToolbar({
  editor,
  typography,
  locked,
}: {
  editor: Editor;
  typography: Typography;
  locked: boolean;
}) {
  const t = useTranslations("editor");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      font: e.getAttributes("textStyle").fontFamily || typography.font,
      size: e.getAttributes("textStyle").fontSize || `${typography.size}pt`,
      heading: e.isActive("heading")
        ? String(e.getAttributes("heading").level)
        : "0",
      align:
        e.getAttributes("paragraph").textAlign ||
        e.getAttributes("heading").textAlign ||
        "left",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const button = (
    label: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
    disabled = false,
  ) => (
    <button
      type="button"
      className="editor-tool"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={locked || disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon size={16} />
    </button>
  );
  return (
    <div
      className="editor-toolbar"
      role="toolbar"
      aria-label={t("formattingToolbar")}
    >
      <div className="toolbar-group">
        {button(
          t("undo"),
          Undo2,
          () => {
            editor.chain().focus().undo().run();
          },
          false,
          !state.undo,
        )}
        {button(
          t("redo"),
          Redo2,
          () => {
            editor.chain().focus().redo().run();
          },
          false,
          !state.redo,
        )}
      </div>
      <div className="toolbar-group">
        <select
          aria-label={t("paragraphStyle")}
          disabled={locked}
          value={state.heading}
          onChange={(e) => {
            const level = Number(e.target.value);
            if (!level) editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .setHeading({ level: level as 1 | 2 | 3 })
                .run();
          }}
        >
          <option value="0">{t("normalText")}</option>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>
              {t("heading", { level })}
            </option>
          ))}
        </select>
        <select
          aria-label={t("font")}
          disabled={locked}
          value={state.font}
          onChange={(e) =>
            editor.chain().focus().setFontFamily(e.target.value).run()
          }
        >
          {[...new Set([...fonts, state.font])].map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
        <select
          className="font-size-select"
          aria-label={t("fontSize")}
          disabled={locked}
          value={state.size}
          onChange={(e) =>
            editor.chain().focus().setFontSize(e.target.value).run()
          }
        >
          {[
            ...new Set([
              "10pt",
              "11pt",
              "12pt",
              "14pt",
              "16pt",
              "18pt",
              "24pt",
              "32pt",
              state.size,
            ]),
          ].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className="toolbar-group">
        {button(
          t("bold"),
          Bold,
          () => {
            editor.chain().focus().toggleBold().run();
          },
          state.bold,
        )}
        {button(
          t("italic"),
          Italic,
          () => {
            editor.chain().focus().toggleItalic().run();
          },
          state.italic,
        )}
        {button(
          t("underline"),
          Underline,
          () => {
            editor.chain().focus().toggleUnderline().run();
          },
          state.underline,
        )}
      </div>
      <div className="toolbar-group">
        {(
          [
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
            ["justify", AlignJustify],
          ] as const
        ).map(([align, Icon]) => (
          <span key={align}>
            {button(
              t(align),
              Icon,
              () => {
                editor.chain().focus().setTextAlign(align).run();
              },
              state.align === align,
            )}
          </span>
        ))}
      </div>
      <div className="toolbar-group">
        {button(
          t("bulletList"),
          List,
          () => {
            editor.chain().focus().toggleBulletList().run();
          },
          state.bullet,
        )}
        {button(
          t("orderedList"),
          ListOrdered,
          () => {
            editor.chain().focus().toggleOrderedList().run();
          },
          state.ordered,
        )}
        {button(t("clearFormatting"), RemoveFormatting, () => {
          editor.chain().focus().unsetAllMarks().run();
        })}
      </div>
      <AnnotationTools editor={editor} locked={locked}/>
    </div>
  );
}
