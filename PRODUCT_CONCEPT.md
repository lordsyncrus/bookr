# Bookr — Product concept

Updated September 11, 2026. This document describes the product direction and distinguishes available features from planned work. For setup, see the [README](README.md). For planned tasks, see the [TODO](TODO.md).

## The promise

**Help people who already have a manuscript review, organize, and export it while keeping their voice and control over changes.**

Bookr is an editorial studio for fiction, nonfiction, and practical guides. Its value is a guided workflow that connects an understanding of the book with explained suggestions and author decisions. It does not promise certified correctness or a publication-ready book without human review.

The initial audience includes independent authors, professionals writing books, and small editorial teams.

## Product principles

- **Useful defaults.** The workflow should require few initial choices. Advanced options remain available without becoming mandatory steps.
- **The author’s voice.** Fix errors and concrete problems without treating every distinctive trait as a stylistic flaw.
- **Explicit decisions.** Suggestions should explain what changes and why, and link to the relevant passage. Substantial interventions remain under user control.
- **A review can finish.** No changes needed is a valid outcome. Later checks must not continually reopen accepted or rejected decisions.
- **Preserve the original.** Keep the source file separate from the edited document; history and undo help recover work.
- **An interface for getting work done.** A compact dashboard, recognizable stages, accessible decisions, and AI activity visible from the library too.

## The workflow

**Upload → Understand → Review → Decide → Verify → Export**

### 1. Library and import

Users import DOCX, TXT, or Markdown and find their manuscripts in a library showing progress, review status, and ongoing activity. Quick actions include export, original download, rename, duplicate, and moving to the trash with confirmation.

A book’s title and authors are editorial metadata: they do not necessarily match the filename or the signed-in user.

### 2. Book details and understanding

Book details include title, authors, years, credits, and information for the title page and colophon. They also include an editable editorial profile: description, purpose, audience, work type, genre, tone, register, point of view, tense, rhythm, vocabulary, and consistency.

New analyses derive this profile from reading memory. Unsupported information stays blank; explicit user edits override inferred values. The profile guides both review and writing on selected passages.

### 3. Review and structure

The editor combines text, formatting, and panels organized by stage. Language suggestions show the original, replacement, and explanation, with navigation between the suggestion and its passage. Users can accept or reject them individually or in bulk.

Structural checks flag issues with order, transitions, and consistency; they do not automatically rewrite the book. Existing table-of-contents detection, heading links, table-of-contents generation, and heading revision proposals are available.

The intended UX is to automatically reuse a confidently recognized table of contents and generate one when missing, asking users to resolve only ambiguities. More robust recognition before reading remains in the TODO.

### 4. Author interventions

Users can format the document, highlight passages, add comments, and find annotations in dedicated collections. History is accessible from the sidebar.

AI selection actions—write, expand, summarize—produce a proposal to review before applying it. Assisted writing is an explicit author choice.

### 5. Verification and export

The final check looks for concrete remaining errors and respects previous decisions. The interface distinguishes current checks from those made outdated by later edits.

Available outputs include a DOCX of the current document, a revision list, the original file, and PDF through browser printing. Title page, colophon, and table of contents are editorial export options.

## How AI works today

The pipeline uses OpenRouter and structured requests rather than relying on one call containing the entire book:

1. Identify chapters from semantic headings at the selected level.
2. Split each chapter into blocks of roughly 9,000 characters and produce reading notes.
3. Combine notes into chapter summaries and a global book memory.
4. Analyze chapter roles using the outline, memory, and neighboring chapter summaries.
5. Compare extracted facts and quotations to look for inconsistencies across chapters.
6. Propose corrections within blocks using chapter context and the book profile.
7. Run a second check on proposals, with a separately configurable model.

Text anchors are validated. Repeat analyses reuse some unchanged results and account for past decisions. This reduces repetition and unnecessary rewriting without guaranteeing an exhaustive review.

**Current limitations:** visually styled headings are not yet reliable segmentation boundaries. Without semantic headings, the text becomes one section divided into blocks. Context across block boundaries and verifiable coverage are planned improvements.

Citation, attribution, and bibliography detection identifies passages to check. **It does not yet verify claims against external sources.**

## Formatting and document fidelity

Bookr supports headings, body text, lists, tables, fonts, spacing, and margins. Body text can be uniformly justified while keeping tables excluded from global alignment. The option to keep headings with the following text is enabled by default for exports.

The editor currently uses a continuous view: advanced pagination is suspended because of performance problems with long manuscripts. DOCX import reconstructs editable content but does not provide a complete round trip for every Word feature. Page numbers and layout need checking in the final output.

## Storage and production

| Area | Today | Planned direction |
| --- | --- | --- |
| Library and documents | Local IndexedDB, separated by user | Persistent database and file storage, synchronization |
| AI processing | Development mode; worker inside the Next process, encrypted checkpoints in `.bookr-data/` | Persistent queue and workers suitable for production |
| History | Local document versions | Deltas, checkpoints, and progressive loading to limit storage use |
| PDF | Browser printing | Direct export to evaluate |
| Coverage | Stage status and pipeline results | Checks tracked by text range, version, and rules |

The local server must stay running to execute jobs. The current implementation is not a distributed queue for serverless deployments. The local library is not a cloud backup.

## Usage and business model

Technical usage costs are visible in settings and the user summary. Limits and safeguards are the system’s responsibility: users should not need to set spending thresholds to complete the editorial workflow.

Commercial pricing, per-book payments, and subscriptions remain undecided. They are not part of the current workflow, and the old mandatory quote step should not be reintroduced.

Hexclave manages identity and remains the preferred platform for user-facing services, including potential future payments. Account settings are separate from Bookr preferences.

## Privacy

- Text needed for processing is sent to AI providers through OpenRouter; routing requires Zero Data Retention and disallows data collection.
- No excerpts, filenames, or editorial metadata may appear in logs or analytics events.
- Rendered sensitive content must be protected with `hexclave-private` in session replays.
- Job access is isolated by user; service keys stay on the server.
- Retention, backups, and complete server-side deletion are requirements for future cloud persistence. The library trash must not be described as permanently deleting every copy.

## Next steps

Agreed priorities are in the [TODO](TODO.md): chapter recognition before reading, context across block boundaries, and verifiable coverage. These are followed by structured memory with source references, checks scoped to their purpose, and more targeted reanalysis.

A possible agentic evolution is a coordinator that prepares a plan, selects tools, waits for decisions, and stops when checks are complete. This is a discussed direction, **not an implemented feature or an approved scope change**.

EPUB, promotional materials, and integrations with external editors remain later possibilities. The [AuthorAgent study](docs/research/authoragent-reuse.md) documents reuse opportunities; it does not imply that all its features are present in Bookr.

## How we evaluate the product

A trial with a real manuscript should verify that:

- every expected section is processed or marked incomplete;
- revisions point to the correct text and are not duplicated;
- decisions and changes remain recoverable after closing and reopening;
- subsequent checks converge without inventing new work;
- opening, navigating, and editing remain responsive with long books;
- exports contain the current document and the original remains recoverable.

The guiding question remains: **does this feature help authors improve their own book while preserving their voice and control?**
