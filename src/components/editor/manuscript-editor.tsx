"use client";
import { remapChapterReferences } from "@/lib/editor/structure-navigation";
import { remapTitlePlan } from "@/lib/editor/title-plan";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  X,
  Sparkles,
  Pause,
  Play,
  ChevronRight,
  PanelRightClose,
  Download,
  AlertCircle,
  FileCheck2,
  RotateCcw,
  SlidersHorizontal,
  ListTree,
  BookOpen,
} from "lucide-react";
import { editorExtensions, reviewHighlightKey, structureTargetKey } from "@/lib/editor/extensions";
import {
  countWords,
  documentOutline,
  remapFindings,
} from "@/lib/editor/document";
import type {
  ManuscriptProject,
  EditorialFinding,
  OutlineItem,
} from "@/lib/editor/types";
import type { AnalysisResult } from "@/lib/editorial/types";
import { suggestedChapterLevel } from "@/lib/editorial/chapters";
import { EditorialBookPanel } from "./editorial-book-panel";
import { downloadBlob, exportDocx } from "@/lib/editor/export";
import { approvalTransaction } from "@/lib/editor/approve";
import { closeHistory } from "@tiptap/pm/history";
import { printPdf } from "@/lib/editor/print-pdf";
import { exportRevisionReport } from "@/lib/editor/revision-report";
import { EDITOR_PAGE_HEIGHT } from "@/lib/editor/pages";
import { useDocumentPages } from "./use-document-pages";
import { DeletePageButton } from "./delete-page-button";
import { PageGuides, PageNavigation } from "./page-navigation";
import { EditorToolbar } from "./toolbar";
import { useDialogFocus } from "./use-dialog-focus";
import { BookMetadataPanel } from "./book-metadata-panel";
import { TypographyPanel } from "./typography-panel";

export function ManuscriptEditor({
  project,
  panel,
  onPanel: changePanel,
  onChange,
  onOutline,
  onBusy,
  jumpTo,
}: {
  project: ManuscriptProject;
  panel: "review" | "typography" | "book" | "structure" | null;
  onPanel: (panel: "review" | "typography" | "book" | "structure" | null) => void;
  onChange: (project: ManuscriptProject) => void;
  onOutline: (outline: OutlineItem[]) => void;
  onBusy: (busy: boolean) => void;
  jumpTo: { pos: number; at: number } | null;
}) {
  const t = useTranslations("editor");
  const locale = useLocale();
  const latest = useRef(project);
  const change = useRef(onChange);
  const busyCallback = useRef(onBusy);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [budget, setBudget] = useState(project.analysis?.budgetUsd || 5);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");
  const findingCards = useRef(new Map<string, HTMLElement>());
  const [revealRevision, setRevealRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [approveAllOpen, setApproveAllOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reviewConfirm, setReviewConfirm] = useState(false);
  const [structurePeek, setStructurePeek] = useState(false);
  const onPanel = (next: typeof panel) => { setStructurePeek(false); changePanel(next); };
  const [zoom, setZoom] = useState(100);
  const closeDialogs = useCallback(() => {
    setReviewConfirm(false);
    setApproveAllOpen(false);
    setExportOpen(false);
  }, []);
  useDialogFocus(reviewConfirm || exportOpen || approveAllOpen, closeDialogs);
  useEffect(() => {
    latest.current = project;
    change.current = onChange;
    busyCallback.current = onBusy;
  }, [project, onChange, onBusy]);
  const publish = (next: ManuscriptProject) => {
    const updated = { ...next, updatedAt: Date.now() };
    latest.current = updated;
    change.current(updated);
  };
  const editor = useEditor({
    extensions: editorExtensions(),
    immediatelyRender: false,
    content: project.doc,
    editorProps: {
      attributes: {
        class: "manuscript-content hexclave-private",
        "aria-label": t("manuscriptText"),
        spellcheck: "false",
      },
    },
    onTransaction({ editor: current, transaction }) {
      if (!transaction.docChanged) return;
      const prev = latest.current;
      const action = transaction.getMeta("bookr-approve") as string[] | undefined;
      const stale = transaction.getMeta("bookr-stale") as string[] | undefined;
      const findings = prev.findings.map((f) =>
        action?.includes(f.id) ? { ...f, status: "approved" as const } : stale?.includes(f.id) ? { ...f, status: "stale" as const } : f,
      );
      publish({
        ...prev,
        doc: current.getJSON(),
        titlePlan: remapTitlePlan(prev.titlePlan,transaction),
        contents: transaction.getMeta("bookr-title-approve")?.length ? {...(prev.contents || {minLevel:1,maxLevel:1,title:locale==="it"?"Indice":"Contents"}),enabled:true,existingRange:prev.contents?.existingRange?{from:transaction.mapping.map(prev.contents.existingRange.from,1),to:transaction.mapping.map(prev.contents.existingRange.to,-1)}:undefined} : prev.contents?.existingRange ? { ...prev.contents, existingRange: { from: transaction.mapping.map(prev.contents.existingRange.from,1), to: transaction.mapping.map(prev.contents.existingRange.to,-1) } } : prev.contents,
        updatedAt: Date.now(),
        analysis: prev.analysis ? { ...prev.analysis, stale: prev.analysis.stale || current.state.doc.textContent !== transaction.before.textContent, chapters: remapChapterReferences(prev.analysis.chapters, transaction, prev.analysis.stale) } : undefined,
        findings: remapFindings(
          findings,
          transaction.mapping,
          current.state.doc,
        ),
        review: action
          ? prev.review
          : current.state.doc.textContent === transaction.before.textContent
            ? prev.review
            : null,
      });
    },
    onCreate({ editor: current }) {
      onOutline(documentOutline(current.state.doc));
    },
  });
  const documentPages = useDocumentPages(editor,!!project.contents?.enabled);
  const paused = !!project.analysis && ["paused", "error"].includes(project.analysis.state);
  const locked = running || !!paused || !!project.analysis && ["queued", "running"].includes(project.analysis.state);
  useEffect(() => {
    editor?.setEditable(!locked);
  }, [editor, locked]);
  useEffect(() => {
    if (editor) onOutline(documentOutline(editor.state.doc));
  }, [editor, project.doc, onOutline]);
  useEffect(() => {
    if (editor)
      editor.view.dispatch(
        editor.state.tr.setMeta(reviewHighlightKey, {
          findings: project.findings,
          selected,
        }),
      );
  }, [editor, project.findings, selected]);
  useEffect(() => {
    if (editor && jumpTo)
      editor
        .chain()
        .setTextSelection(
          Math.min(jumpTo.pos + 1, editor.state.doc.content.size),
        )
        .scrollIntoView()
        .run();
  }, [editor, jumpTo]);
  useEffect(() => {
    if (!selected || panel !== "review") return;
    const frame = requestAnimationFrame(() => {
      const card = findingCards.current.get(selected);
      const scroller = card?.closest(".inspector-scroll");
      if (!card || !scroller) return;
      const target = card.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      if (target.top < viewport.top + 12 || target.bottom > viewport.bottom - 12) {
        scroller.scrollTo({
          top: scroller.scrollTop + target.top - viewport.top - 16,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, panel, revealRevision, filter]);
  const jobId = project.analysis?.jobId;
  useEffect(() => {
    if (!jobId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/api/editorial/${jobId}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("PROVIDER");
        const result = await response.json() as AnalysisResult;
        if (disposed || latest.current.analysis?.jobId !== jobId) return;
        const previous = latest.current.analysis;
        if (result.version > previous.version || result.state !== previous.state) {
          const completed = result.state === "complete" && previous.state !== "complete";
          publish({ ...latest.current, analysis: { ...result, stale: previous.stale, issues: result.issues.map(issue => ({ ...issue, status: previous.issues.find(old => old.id === issue.id)?.status || issue.status })) },
            ...(completed && !previous.stale && result.mode === "full" ? { findings: result.findings, review: { next: 1, total: 1, cost: result.costUsd, discarded: result.discarded, state: "complete" as const, model: result.model } } : {}),
            updatedAt: Date.now() });
        }
        setRunning(["queued","running"].includes(result.state));
        setStopping(false);
        if (["complete","cancelled"].includes(result.state)) return;
      } catch { if (!disposed) setError(t("jobConnection")); }
      if (!disposed) timer = setTimeout(poll, 2500);
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [jobId, t]);
  async function controlJob(desired: "run" | "pause" | "cancel") {
    const analysis = latest.current.analysis;
    if (!analysis) return;
    setError("");setStopping(true);
    try {
      const response = await fetch(`/api/editorial/${analysis.jobId}`, { method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify({desired,budgetUsd:budget}) });
      if (!response.ok) throw new Error("PROVIDER");
    } catch { setError(t("errors.PROVIDER"));setStopping(false); }
  }
  async function runReview(mode: "full" | "final" = "full") {
    if (!editor || runningRef.current) return;
    if (paused) { await controlJob("run"); return; }
    setReviewConfirm(false);runningRef.current=true;setError("");setRunning(true);
    try {
      // Images are not sent to the language model. Keep nodes to preserve positions.
      const source = JSON.parse(JSON.stringify(editor.getJSON(), (key,value) => key === "src" && typeof value === "string" && value.startsWith("data:") ? "" : value));
      const response = await fetch("/api/editorial", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobId:crypto.randomUUID(),projectId:latest.current.id,doc:source,chapterLevel:latest.current.chapterLevel || suggestedChapterLevel(editor.state.doc),locale,mode,budgetUsd:budget})});
      const data = await response.json();
      if(!response.ok)throw new Error(data.error || "PROVIDER");
      publish({...latest.current,analysis:data as AnalysisResult,updatedAt:Date.now()});
      onPanel(mode === "final" ? "structure" : "review");
    } catch(caught) {
      setRunning(false);
      const code=caught instanceof Error?caught.message:"PROVIDER";
      setError(t.has(`errors.${code}`)?t(`errors.${code}`):t("errors.PROVIDER"));
    } finally {runningRef.current=false;busyCallback.current(false);}
  }
  function focusStructure(pos: number) {
    if (!editor || pos < 0 || pos >= editor.state.doc.content.size) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    editor.commands.setTextSelection(Math.min(pos + 1, editor.state.doc.content.size));
    editor.view.dispatch(editor.state.tr.setMeta(structureTargetKey, pos));
    if (window.matchMedia("(max-width: 980px)").matches) setStructurePeek(true);
    requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      const canvas = editor.view.dom.closest(".document-canvas");
      if (!canvas) return;
      const target = editor.view.coordsAtPos(Math.min(pos + 1, editor.state.doc.content.size));
      const rect = canvas.getBoundingClientRect();
      canvas.scrollTo({top:canvas.scrollTop + target.top - rect.top - rect.height / 3,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    });
  }
  function focusFinding(f: EditorialFinding) {
    if (!editor || f.from > f.to || f.to > editor.state.doc.content.size || f.status === "stale") return;
    setSelected(f.id);
    editor.view.dispatch(editor.state.tr
      .setMeta(reviewHighlightKey, { findings: latest.current.findings, selected: f.id }));
    editor.commands.setTextSelection({ from: f.from, to: f.to });
    // The mobile inspector overlays the manuscript; reveal it before measuring.
    if (window.matchMedia("(max-width: 980px)").matches) onPanel(null);
    requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      const canvas = editor.view.dom.closest(".document-canvas");
      if (!canvas) return;
      const target = editor.view.coordsAtPos(f.from);
      const viewport = canvas.getBoundingClientRect();
      canvas.scrollTo({
        top: canvas.scrollTop + target.top - viewport.top - viewport.height / 3,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
  }
  function approveMany(findings: EditorialFinding[]) {
    if (!editor || locked) return;
    const result = approvalTransaction(editor.state, findings);
    if (result.tr.docChanged) {
      editor.view.dispatch(result.tr);
      // Keep the following manual edit out of this single undo group as well.
      editor.view.dispatch(closeHistory(editor.state.tr));
    } else if (result.stale.length) {
      publish({ ...latest.current, findings: latest.current.findings.map(f => result.stale.includes(f.id) ? { ...f, status: "stale" } : f), updatedAt: Date.now() });
    }
    setSelected(null);
    setApproveAllOpen(false);
  }
  function approve(f: EditorialFinding) { approveMany([f]); }
  async function exportReport() {
    if (reporting) return;
    setReporting(true);
    setError("");
    try {
      downloadBlob(await exportRevisionReport(latest.current, locale), `${latest.current.name}-elenco-revisioni.docx`);
    } catch { setError(t("errors.EXPORT")); }
    finally { setReporting(false); }
  }
  async function exportPdf() {
    if(exporting)return;
    setExporting(true);setError("");
    try { await printPdf(latest.current,locale);setExportOpen(false); }
    catch(caught) { setError(caught instanceof Error&&caught.message==="POPUP_BLOCKED"?(locale==="it"?"Consenti l’apertura della finestra di stampa per salvare il PDF.":"Allow the print window to open to save the PDF."):t("errors.EXPORT")); }
    finally { setExporting(false); }
  }
  async function exportDocument() {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      downloadBlob(
        await exportDocx(latest.current),
        `${latest.current.name}-revisionato.docx`,
      );
      setExportOpen(false);
    } catch {
      setError(t("errors.EXPORT"));
    } finally {
      setExporting(false);
    }
  }
  if (!editor)
    return <div className="studio-loading">{t("loadingEditor")}</div>;
  const pending = project.findings.filter((f) => f.status === "pending");
  const approved = project.findings.filter(
    (f) => f.status === "approved",
  ).length;
  const visible = project.findings.filter(
    (f) => filter === "all" || f.status === "pending",
  );
  const progress = project.review;
  const percent = project.analysis?.mode === "full"
    ? project.analysis.state === "complete" ? 100 : Math.min(99, Math.round(project.analysis.done / Math.max(1,project.analysis.total) * 100))
    : progress?.total ? Math.round((progress.next / progress.total) * 100) : 0;
  return (
    <div className="document-workspace hexclave-private">
      <div className="document-topbar">
        <div className="document-breadcrumb">
          <span>{t("manuscripts")}</span>
          <ChevronRight size={14} />
          <strong>{project.name}</strong>
          <span className="document-tag">{t("draft")}</span>
        </div>
        <div className="document-actions">
          <button className="studio-button secondary" aria-label={t("bookData.title")} aria-pressed={panel === "book"} onClick={() => onPanel(panel === "book" ? null : "book")}>
            <BookOpen size={15} /><span>{t("bookData.title")}</span>
          </button>
          <button
            className="studio-button secondary"
            aria-label={t("review")}
            onClick={() => onPanel(panel === "review" ? null : "review")}
          >
            <Sparkles size={15} />
            <span>{t("review")}</span>
            {pending.length > 0 && <b>{pending.length}</b>}
          </button>
          <button
            className="studio-button primary"
            aria-label={t("export")}
            onClick={() => setExportOpen(true)}
            disabled={running}
          >
            <Download size={15} />
            <span>{t("export")}</span>
          </button>
        </div>
      </div>
      <EditorToolbar
        editor={editor}
        typography={project.typography}
        locked={locked}
      />
      <div className={`document-body ${panel ? "with-inspector" : ""}`}>
        <div className="document-canvas">
          {project.importNotice && (
            <div className="import-notice">
              <AlertCircle size={15} />
              <p>{t("importNotice")}</p>
              <button
                aria-label={t("dismiss")}
                onClick={() =>
                  publish({ ...latest.current, importNotice: false })
                }
              >
                <X size={15} />
              </button>
            </div>
          )}
          {locked && (
            <div className="review-lock">
              <Sparkles size={15} />
              {running ? t("reviewingLocked") : t("pausedLocked")}
              {!running && (
                <button
                  onClick={() => void controlJob("cancel")}
                >
                  {t("stopAndEdit")}
                </button>
              )}
            </div>
          )}
          <div
            className="paper-stage"
            style={
              {
                "--document-font": project.typography.font,
                "--heading-name": JSON.stringify(t("structure.headingBadge")),
                "--document-size": `${project.typography.size}pt`,
                "--document-line": project.typography.lineHeight,
                "--document-spacing": `${project.typography.paragraphSpacing}pt`,
                "--document-margin": `${project.typography.margin}mm`,
                "--document-zoom": zoom / 100,
              } as CSSProperties
            }
          >
            <div className="paper-ruler" aria-hidden="true">
              <span>0</span>
              <span>2</span>
              <span>4</span>
              <span>6</span>
              <span>8</span>
              <span>10</span>
              <span>12</span>
              <span>14</span>
              <span>16</span>
            </div>
            {editor&&project.contents?.enabled&&<section className="contents-paper hexclave-private" aria-label={locale==="it"?"Pagina 0 · Indice":"Page 0 · Contents"}>
              <span className="contents-page-label">{locale==="it"?"Pagina 0":"Page 0"}</span>
              <h2>{project.contents.title || (locale==="it"?"Indice":"Contents")}</h2>
              <p className="contents-paper-note">{locale==="it"?"Aggiornato automaticamente dai titoli del manoscritto. Clicca una voce per raggiungerla.":"Updated automatically from manuscript headings. Click an entry to jump to it."}</p>
              <label className="contents-detail">{locale==="it"?"Dettaglio indice":"Contents detail"}<select aria-label={locale==="it"?"Dettaglio indice":"Contents detail"} value={project.contents.maxLevel} onChange={event=>publish({...latest.current,contents:{...latest.current.contents!,minLevel:1,maxLevel:Number(event.target.value)}})}>{[1,2,3,4,5,6].map(level=><option key={level} value={level}>{level===1?(locale==="it"?"Solo titoli di livello 1":"Level 1 headings only"):(locale==="it"?`Titoli fino al livello ${level}`:`Headings through level ${level}`)}</option>)}</select></label>
              <nav aria-label={locale==="it"?"Indice del libro":"Book contents"}><ol>{documentOutline(editor.state.doc).filter(item=>item.level>=(project.contents?.minLevel||1)&&item.level<=(project.contents?.maxLevel||6)).map(item=><li key={item.pos} style={{paddingInlineStart:(item.level-1)*16}}><button type="button" onClick={()=>focusStructure(item.pos)}><span>{item.title}</span><span className="contents-leader" aria-hidden="true"/><span className="contents-page-ref" aria-label={`${locale==="it"?"Pagina":"Page"} ${documentPages.headingPages[item.pos]||1}`}>{documentPages.headingPages[item.pos]??"…"}</span></button></li>)}</ol></nav>
            </section>}
            <div
              className="manuscript-paper"
              style={{minHeight: documentPages.total * EDITOR_PAGE_HEIGHT}}
              onClick={(e) => {
                const id = (e.target as HTMLElement)
                  .closest("[data-finding-id]")
                  ?.getAttribute("data-finding-id");
                if (id) {
                  setSelected(id);
                  setRevealRevision(value => value + 1);
                  if (latest.current.findings.find(f => f.id === id)?.status !== "pending") setFilter("all");
                  onPanel("review");
                }
              }}
            >
              <EditorContent editor={editor} />
              <PageGuides total={documentPages.total} />
            </div>
            <div className="paper-end">
              <span />
              {t("endDocument")}
              <span />
            </div>
          </div>
        </div>
        {panel && (
          <aside className={`document-inspector ${structurePeek && panel === "structure" ? "is-peeking" : ""}`} aria-label={t("inspector")}>
            <div className="inspector-tabs">
              <button
                className={panel === "review" ? "active" : ""}
                onClick={() => onPanel("review")}
              >
                <Sparkles size={15} />
                {t("review")}
              </button>
              <button
                className={panel === "structure" ? "active" : ""}
                aria-pressed={panel === "structure"}
                onClick={() => onPanel("structure")}
              >
                <ListTree size={15} />
                {t("structure.tab")}
              </button>
              <button
                className={panel === "typography" ? "active" : ""}
                onClick={() => onPanel("typography")}
              >
                <SlidersHorizontal size={15} />
                {t("format")}
              </button>
              <button
                title={t("closePanel")}
                aria-label={t("closePanel")}
                onClick={() => onPanel(null)}
              >
                <PanelRightClose size={16} />
              </button>
            </div>
            <div className="inspector-scroll">
              {panel === "book" ? (
                <BookMetadataPanel project={project} onChange={(metadata) => publish({ ...latest.current, metadata, updatedAt: Date.now() })} />
              ) : panel === "structure" ? (
                <>
                  <EditorialBookPanel project={project} editor={editor} locked={locked} onChange={publish} onFinal={() => void runReview("final")} onNavigate={focusStructure} />
                  <div className="structure-controls">
                    <label className="budget-field">{t("budget")}<input type="number" min="0.25" max="100" step="0.25" value={budget} onChange={event => setBudget(Number(event.target.value))} /></label>
                    {project.analysis && <p role="status">{t(`phases.${project.analysis.phase}`)} · {project.analysis.done}/{project.analysis.total}</p>}
                    {locked && <button className="studio-button secondary full" onClick={() => onPanel("review")}>{t("structure.manageAnalysis")}</button>}
                    {error && <p role="alert" className="studio-error">{error}</p>}
                  </div>
                </>
              ) : panel === "typography" ? (
                <TypographyPanel
                  project={project}
                  editor={editor}
                  locked={locked}
                  onChange={(typography) =>
                    publish({
                      ...latest.current,
                      typography,
                      updatedAt: Date.now(),
                    })
                  }
                />
              ) : (
                <>
                  <div className="review-bulk-actions">
                    <button className="studio-button primary full" disabled={locked || !pending.length} onClick={() => setApproveAllOpen(true)}><Check size={15} />{t("approveAll", {count:pending.length})}</button>
                    <button className="studio-button secondary full" disabled={reporting} onClick={() => void exportReport()}><Download size={15} />{reporting ? t("exporting") : t("exportReport")}</button>
                  </div>
                  <div className="review-overview">
                    <div className="review-overview-heading">
                      <span className="inspector-symbol">
                        <FileCheck2 size={21} />
                      </span>
                      <span className="small-overline">
                        {t("editorialAssistant")}
                      </span>
                    </div>
                    <h3>
                      {running
                        ? t("reviewInProgress")
                        : progress?.state === "complete"
                          ? t("reviewReady")
                          : t("yourVoice")}
                    </h3>
                    <p>{t("wholeBookDescription")}</p>
                    {project.analysis && <p role="status">{t(`phases.${project.analysis.phase}`)} · {project.analysis.done}/{project.analysis.total}
                      {project.analysis.error && <strong className="studio-error">{t.has(`jobErrors.${project.analysis.error}`) ? t(`jobErrors.${project.analysis.error}`) : t("errors.PROVIDER")}</strong>}
                    </p>}
                    <label className="budget-field">{t("budget")}<input type="number" min="0.25" max="100" step="0.25" value={budget} onChange={event => setBudget(Number(event.target.value))} /></label>
                    {(progress || project.analysis) && (
                      <div className="review-progress">
                        <div>
                          <span>
                            {t("blocksProgress", {
                              done: project.analysis?.done ?? progress?.next ?? 0,
                              total: project.analysis?.total ?? progress?.total ?? 0,
                            })}
                          </span>
                          <strong>{percent}%</strong>
                        </div>
                        <div className="progress-track">
                          <i style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )}
                    {running ? (
                      <button
                        className="studio-button secondary full"
                        disabled={stopping}
                        onClick={() => {
                          void controlJob("pause");
                        }}
                      >
                        <Pause size={15} />
                        {stopping ? t("pausing") : t("pause")}
                      </button>
                    ) : (
                      <button
                        className="studio-button primary full"
                        disabled={!editor.state.doc.textContent.trim() || budget < 0.25 || budget > 100}
                        onClick={() =>
                          paused ? void runReview() : setReviewConfirm(true)
                        }
                      >
                        {paused ? <Play size={15} /> : <Sparkles size={15} />}
                        {paused
                          ? t("resume")
                          : progress?.state === "complete"
                            ? t("reviewAgain")
                            : t("reviewAll")}
                      </button>
                    )}
                    {project.analysis && <small className="review-cost">${project.analysis.costUsd.toFixed(4)} · {t("serverContinues")}</small>}
                    {!project.analysis && progress?.model && (
                      <small className="review-cost">
                        {progress.model} · ${progress.cost.toFixed(4)}
                      </small>
                    )}
                  </div>
                  {error && (
                    <div className="studio-error" role="alert">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}
                  <div className="findings-heading">
                    <h4>
                      {t("suggestions")} <span>{pending.length}</span>
                    </h4>
                    <select
                      aria-label={t("filterSuggestions")}
                      value={filter}
                      onChange={(e) =>
                        setFilter(e.target.value as "pending" | "all")
                      }
                    >
                      <option value="pending">{t("pending")}</option>
                      <option value="all">{t("all")}</option>
                    </select>
                  </div>
                  {visible.length === 0 && (
                    <div className="findings-empty">
                      <ListTree size={28} />
                      <p>
                        {project.findings.length
                          ? t("allResolved")
                          : running
                            ? t("waitingFindings")
                            : t("noSuggestions")}
                      </p>
                    </div>
                  )}
                  {visible.map((finding, index) => (
                    <article
                      key={finding.id}
                      ref={(element) => { if (element) findingCards.current.set(finding.id, element); else findingCards.current.delete(finding.id); }}
                      data-card-finding-id={finding.id}
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest("button, a, input, select, textarea")) focusFinding(finding);
                      }}
                      className={`finding-card ${selected === finding.id ? "selected" : ""} ${finding.status !== "pending" ? "resolved" : ""}`}
                    >
                      <button
                        className="finding-location"
                        title={t("goToPassage")}
                        disabled={finding.status === "stale"}
                        onClick={() => focusFinding(finding)}
                      >
                        <span className={`category-dot ${finding.category}`} />
                        <span>{t(finding.category)}</span>
                        <span className="finding-number">
                          {t("block", { number: finding.block })} · {index + 1}
                        </span>
                      </button>
                      <div className="finding-diff">
                        <del>{finding.original}</del>
                        <ins>{finding.suggested || t("removePassage")}</ins>
                      </div>
                      <p>{finding.reason}</p>
                      {finding.status === "pending" ? (
                        <div className="finding-actions">
                          <button
                            disabled={locked}
                            onClick={() => approve(finding)}
                          >
                            <Check size={15} />
                            {t("approve")}
                          </button>
                          <button
                            disabled={locked}
                            onClick={() =>
                              publish({
                                ...latest.current,
                                updatedAt: Date.now(),
                                findings: latest.current.findings.map((f) =>
                                  f.id === finding.id
                                    ? { ...f, status: "rejected" }
                                    : f,
                                ),
                              })
                            }
                          >
                            <X size={15} />
                            {t("reject")}
                          </button>
                        </div>
                      ) : (
                        <div className="finding-status">
                          {t(finding.status)}
                          {finding.status === "rejected" && (
                            <button
                              disabled={locked}
                              onClick={() =>
                                publish({
                                  ...latest.current,
                                  findings: latest.current.findings.map((f) =>
                                    f.id === finding.id
                                      ? { ...f, status: "pending" }
                                      : f,
                                  ),
                                })
                              }
                            >
                              <RotateCcw size={12} />
                              {t("reopen")}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                  {progress && progress.discarded > 0 && (
                    <p className="inspector-footnote">
                      {t("discarded", { count: progress.discarded })}
                    </p>
                  )}
                </>
              )}
            </div>
          </aside>
        )}
      </div>
      {structurePeek && panel === "structure" && <button className="studio-button primary structure-return" onClick={() => setStructurePeek(false)}><ListTree size={16}/>{t("structure.returnToPanel")}</button>}
      <footer className="document-status">
        <div>
          <span className="status-dot" />
          {t("words", { count: countWords(project.doc) })}
          <span className="status-divider" />
          {t("approvedCount", { count: approved })}
        </div>
        {project.contents?.enabled&&<button type="button" className="studio-button" onClick={()=>documentPages.goToPage(0)}>{locale==="it"?"Indice · 0":"Contents · 0"}</button>}
        {editor&&<DeletePageButton editor={editor} current={documentPages.current} total={documentPages.total} locked={locked||documentPages.current===0}/>}
        <PageNavigation hasContents={!!project.contents?.enabled} current={documentPages.current} total={documentPages.total} onNavigate={(page) => {
          if (window.matchMedia("(max-width: 980px)").matches) {
            if (panel === "structure") setStructurePeek(true);
            else if (panel) onPanel(null);
          }
          documentPages.goToPage(page);
        }} />
        <div className="document-view-settings">
          <span title={t("pages.hint")}>{t("pages.layout")}</span>
          <select
            aria-label={t("zoom")}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            {[75, 85, 100, 110, 125].map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
        </div>
      </footer>
      {approveAllOpen && (
        <div className="studio-modal-backdrop">
          <section className="studio-modal hexclave-private" role="dialog" aria-modal="true" aria-labelledby="approve-all-title">
            <button className="modal-close" aria-label={t("close")} onClick={() => setApproveAllOpen(false)}><X size={20} /></button>
            <Check size={28} className="modal-symbol" />
            <h2 id="approve-all-title">{t("approveAllTitle", {count:pending.length})}</h2>
            <p>{t("approveAllDescription")}</p>
            <div className="modal-actions">
              <button className="studio-button secondary" onClick={() => setApproveAllOpen(false)}>{t("cancel")}</button>
              <button className="studio-button primary" disabled={locked || !pending.length} onClick={() => approveMany(latest.current.findings)}>{t("approveAllConfirm")}</button>
            </div>
          </section>
        </div>
      )}
      {reviewConfirm && (
        <div className="studio-modal-backdrop">
          <section
            className="studio-modal hexclave-private"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dialog-title"
          >
            <button
              className="modal-close"
              aria-label={t("close")}
              onClick={() => setReviewConfirm(false)}
            >
              <X size={20} />
            </button>
            <Sparkles size={28} className="modal-symbol" />
            <h2 id="review-dialog-title">{t("reviewEntireBook")}</h2>
            <p>
              {t("wholeBookConsent")}
            </p>
            <p className="modal-note">{t("serverContinues")}</p>
            {project.findings.length > 0 && (
              <p className="modal-note">{t("newPassNotice")}</p>
            )}
            <div className="modal-actions">
              <button
                className="studio-button secondary"
                onClick={() => setReviewConfirm(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="studio-button primary"
                onClick={() => void runReview()}
              >
                {t("startReview")}
              </button>
            </div>
          </section>
        </div>
      )}
      {exportOpen && (
        <div className="studio-modal-backdrop">
          <section
            className="studio-modal hexclave-private"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
          >
            <button
              className="modal-close"
              aria-label={t("close")}
              onClick={() => setExportOpen(false)}
            >
              <X size={20} />
            </button>
            <Download size={28} className="modal-symbol" />
            <h2 id="export-dialog-title">{t("exportTitle")}</h2>
            <p>{t("exportDescription")}</p>
            <div className="export-summary">
              <div>
                <span>{t("aiCoverage")}</span>
                <strong>{percent}%</strong>
              </div>
              <div>
                <span>{t("approved")}</span>
                <strong>{approved}</strong>
              </div>
              <div>
                <span>{t("stillPending")}</span>
                <strong>{pending.length}</strong>
              </div>
            </div>
            {(percent < 100 || pending.length > 0) && (
              <p className="modal-note">{t("exportIncomplete")}</p>
            )}
            {error && (
              <p role="alert" className="studio-error">
                {error}
              </p>
            )}
            <p className="modal-note">{locale==="it"?"PDF: scegli Salva come PDF nella finestra di stampa. L’indice contiene i collegamenti ai titoli; i numeri di pagina dell’editor non vengono riportati perché l’impaginazione di stampa è diversa.":"PDF: choose Save as PDF in the print dialog. Contents link to headings; editor page numbers are omitted because print pagination differs."}</p>
            <div className="modal-actions">
              <button className="studio-button secondary" disabled={exporting} onClick={()=>void exportPdf()}>{locale==="it"?"Esporta PDF":"Export PDF"}</button>
              <button
                className="studio-button secondary"
                onClick={() => setExportOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="studio-button primary"
                disabled={exporting}
                onClick={() => void exportDocument()}
              >
                <Download size={15} />
                {exporting ? t("exporting") : t("downloadDocx")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
