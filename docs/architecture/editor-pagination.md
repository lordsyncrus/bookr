# Editor pagination

The interactive editor uses `tiptap-pagination-plus` and `tiptap-table-plus` 3.1.0 (MIT).
`paginatedExtensions()` replaces the standard TableKit only in the mounted editor.
The base `editorExtensions()` remains the schema used for import, analysis and PDF/DOCX export.
This prevents layout widgets from entering saved manuscript content or changing review offsets.

Pagination Plus owns the page flow. `pageGeometry()` reads its rendered gap boundaries,
including zero-height gaps. Navigation, page actions, page badges and contents references
use those boundaries. Layout preferences control the gap (0/24 px); margins use millimetres
converted at 96 dpi. The previous PageGaps decoration extension is no longer mounted.

This is an editor layout integration, not a promise of identical Word/PDF pagination.
Exports still use their existing independent layout engines. Extremely tall table cells and
merged rows need further real-world validation. Explicit blank pages still use the existing
PageSection node; its insertion/deletion is separate from automatic pagination.

Validation: TypeScript, targeted ESLint, editorial unit suite; synthetic schema round trip
preserves text, document positions, merged-cell attributes, highlights and comments across
base and paginated schemas. Browser inspection confirms Pagination Plus and TablePlus are
mounted and legacy separators are absent. Full editing/export parity is not yet established.

## Rollback — 2026-09-11

Pagination Plus and KeepHeadings are **not mounted in the manuscript editor** after
reported severe slowdown and growth to ~1,800 apparent pages. The editor uses the
base extensions and continuous layout again. The separate-page preference is retained
in stored settings but its UI is suspended; keep-with-next remains an export setting.
No manuscript content migration or deletion is performed. The previous integration
has not passed a long-document stability gate and must not be re-enabled without
repeated open/edit/resize/undo tests proving bounded page count and idle CPU usage.
