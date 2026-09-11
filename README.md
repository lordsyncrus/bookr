# Bookr

An editorial studio for turning your draft into a book—with AI by your side and the final say always yours.

**Upload → Analyze → Review changes → Export**

## What you can do

- **Edit your manuscript.** Import DOCX, TXT, or Markdown and work with text, headings, tables, and formatting in the editor.
- **Review with context.** AI reads chapters and smaller sections, builds a memory of the book, and suggests language, structure, and consistency improvements. Accept or reject suggestions individually or in bulk.
- **Organize your book.** Detect an existing table of contents or generate one, refine headings, and identify potential citations and references to check.
- **Keep your voice.** Book details bring together authors, credits, colophon information, and an editorial profile covering tone, audience, genre, and terminology.
- **Annotate and rewrite.** Highlight passages, add comments, and ask AI to write, expand, or summarize selected text. Find past changes in the history panel.
- **Manage and export.** Rename, duplicate, or move books to the trash. Download the revised DOCX, revision list, and original file, or create a PDF through your browser’s print dialog.

## Try it locally

You’ll need **Node.js 22+**, npm, and an OpenRouter API key for AI features.

```bash
npm install
```

Create `.env.development.local` in the project root:

```env
OPENROUTER_API_KEY=your_key_here

# Optional: review model and second-pass review model
# OPENROUTER_REVIEW_MODEL=google/gemini-2.5-flash
# OPENROUTER_QA_MODEL=google/gemini-2.5-flash
```

Then start the app:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). The command also starts the local Hexclave authentication environment, so you don’t need to configure its keys manually. Restart the server after changing environment variables.

## Good to know

Bookr is **under active development**. AI features are currently enabled only in development mode.

- **Local storage:** your library lives in the browser’s IndexedDB and is not yet synced to the cloud. Export a copy before clearing browser data. AI jobs use encrypted checkpoints in `.bookr-data/` and require the local server to stay running.
- **Page layout:** the editor uses a continuous view. DOCX import does not preserve every detail of complex Word layouts; final pagination depends on the export. The original file is kept separately.
- **Assisted review:** suggestions need editorial judgment. Detecting citations and references is not the same as verifying external sources.
- **Privacy:** text needed for AI processing passes through OpenRouter. Manuscript content and metadata are excluded from logs and analytics events; sensitive areas are protected in session replays with `hexclave-private`.

## Development

**Next.js · React · TypeScript · Tiptap · Tailwind CSS · Hexclave · OpenRouter**

```bash
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

See the [product concept](PRODUCT_CONCEPT.md) and [TODO](TODO.md) for direction and next steps. Architecture notes cover [review convergence](docs/architecture/review-convergence.md), [history](docs/architecture/manuscript-history.md), and [pagination](docs/architecture/editor-pagination.md).

## License

Copyright © 2026 Martino Tempesta and contributors.

Bookr is licensed under the [GNU Affero General Public License v3.0 only](LICENSE) (`AGPL-3.0-only`). Commercial use is allowed under its terms. If you offer a modified version over a network, you must offer its corresponding source code to users as required by the license.

The software is provided without warranty. Third-party dependencies retain their own licenses. This license covers Bookr’s software, not manuscripts merely processed with it.
