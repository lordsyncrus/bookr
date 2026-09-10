import { KeepHeadings } from "./keep-headings";
import { PaginationPlus } from "tiptap-pagination-plus";
import { TableKitPlus } from "tiptap-table-plus";
import { editorExtensions } from "./extensions";
import { EDITOR_PAGE_HEIGHT } from "./pages";
/** Layout-only extensions: never use these for server analysis or serialization. */
export function paginatedExtensions() {
  return [...editorExtensions().filter(extension => extension.name !== "tableKit"), TableKitPlus, KeepHeadings,
    PaginationPlus.configure({
      pageHeight: EDITOR_PAGE_HEIGHT,
      pageWidth: 210 * 96 / 25.4,
      marginTop: 25 * 96 / 25.4,
      marginBottom: 25 * 96 / 25.4,
      marginLeft: 25 * 96 / 25.4,
      marginRight: 25 * 96 / 25.4,
      contentMarginTop: 0,
      contentMarginBottom: 0,
      pageGap: 0,
      pageBreakBackground: "#eef0e7",
      pageGapBorderColor: "#dfe4d7",
      headerLeft: "", headerRight: "", footerLeft: "", footerRight: "",
    })];
}
