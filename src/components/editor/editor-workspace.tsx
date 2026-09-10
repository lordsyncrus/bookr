"use client";
import { useTitleActivity } from "@/lib/editor/ai-activity";
import type { AnalysisResult } from "@/lib/editorial/types";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Trash2,
  Search,
  BookOpen,
  Plus,
  Library,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AuthActions } from "@/components/auth-actions";
import { countWords } from "@/lib/editor/document";
import { loadProjects, saveProjects, changeProjectLifecycle } from "@/lib/editor/storage";
import type { ManuscriptProject } from "@/lib/editor/types";
import { useDialogFocus } from "./use-dialog-focus";
import { SaveStatus } from "./save-status";
import { LibraryCardStatus, LibraryCardMenu } from "./library-card-tools";
import { ManuscriptEditor } from "./manuscript-editor";

const bookTitle = (project: ManuscriptProject) => project.metadata?.title.trim() || project.name;

export function EditorWorkspace({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const t = useTranslations("editor");
  const en=useLocale()==="en";
  const [bookAction,setBookAction]=useState<{kind:"trash"|"rename";project:ManuscriptProject}|null>(null);
  const [newName,setNewName]=useState("");
  const closeBookAction=useCallback(()=>setBookAction(null),[]);
  useDialogFocus(!!bookAction,closeBookAction);
  const [trashView,setTrashView]=useState(false);
  const [changing,setChanging]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState<ManuscriptProject|null>(null);
  const closeDelete=useCallback(()=>setDeleteConfirm(null),[]);
  useDialogFocus(!!deleteConfirm,closeDelete);
  const [projects, setProjects] = useState<ManuscriptProject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"library" | "editor">("library");
  const [panel, setPanel] = useState<"review" | "typography" | "book" | "structure" | "export" | null>("review");
  const [jump, setJump] = useState<{ pos: number; at: number } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const importLock = useRef(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [search, setSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const saveAllowed = useRef(false);
  const pendingSave = useRef<Promise<void>>(Promise.resolve());
  const [importConfirm, setImportConfirm] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const closeImport = useCallback(() => {
    setImportConfirm(null);
    if (fileInput.current) fileInput.current.value = "";
  }, []);
  useDialogFocus(!!importConfirm, closeImport);
  useEffect(() => {
    let alive = true;
    loadProjects(userId)
      .then((items) => {
        if (alive) {
          saveAllowed.current = true;
          setProjects(items);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive) {
          setError(t("errors.STORAGE"));
          setSaveState("error");
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [userId, t]);
  useEffect(() => {
    if (!loaded || !saveAllowed.current) return;
    const timer = setTimeout(() => {
      setSaveState("saving");
      pendingSave.current = pendingSave.current
        .catch(() => {})
        .then(() => saveProjects(userId, projects));
      pendingSave.current
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 450);
    return () => clearTimeout(timer);
  }, [projects, loaded, userId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (busy || saveState !== "saved") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, saveState]);
  const updateProject = useCallback((project: ManuscriptProject) => {
    setSaveState("saving");
    setProjects((items) =>
      items.map((item) => (item.id === project.id ? project : item)),
    );
  }, []);
  const titleActivity=useTitleActivity();
  const activeProjects=projects.filter(p=>titleActivity.includes(p.id)||["queued","running"].includes(p.analysis?.state||""));
  const backgroundJobs=projects.filter(p=>p.analysis&&["queued","running"].includes(p.analysis.state)&&(view!=="editor"||p.id!==current?.id)).map(p=>p.analysis!.jobId).sort().join(",");
  useEffect(()=>{
    if(!backgroundJobs)return;
    let disposed=false;
    const controller=new AbortController();
    const poll=async()=>{
      await Promise.all(backgroundJobs.split(",").map(async id=>{
        try{
          const response=await fetch(`/api/editorial/${id}`,{cache:"no-store",signal:controller.signal});
          if(!response.ok)return;
          const result=await response.json() as AnalysisResult;
          if(disposed)return;
          setProjects(items=>items.map(p=>{
            const previous=p.analysis;
            if(previous?.jobId!==id||result.version<previous.version||(result.version===previous.version&&result.state===previous.state))return p;
            const completed=result.state==="complete"&&previous.state!=="complete";
            return {...p,analysis:{...result,stale:previous.stale,issues:result.issues.map(issue=>({...issue,status:previous.issues.find(old=>old.id===issue.id)?.status||issue.status}))},...(completed&&!previous.stale&&result.mode==="full"?{findings:result.findings,review:{next:1,total:1,cost:result.costUsd,discarded:result.discarded,state:"complete" as const,model:result.model}}:{}),updatedAt:Date.now()};
          }));
        }catch{/* Keep the last known activity while the connection recovers. */}
      }));
    };
    void poll();const timer=setInterval(()=>void poll(),4000);
    return()=>{disposed=true;controller.abort();clearInterval(timer);};
  },[backgroundJobs]);
  const liveProjects=projects.filter(p=>!p.trashedAt);
  const trashedProjects=projects.filter(p=>!!p.trashedAt);
  const current = liveProjects.find((p) => p.id === activeId);
  async function lifecycle(id:string,action:"trash"|"restore"|"delete") {
    if(changing||busy||!saveAllowed.current)return;
    setChanging(true);setError("");setSaveState("saving");
    try {
      await pendingSave.current.catch(()=>{});
      await saveProjects(userId,projects);
      const next=await changeProjectLifecycle(userId,id,action);
      setProjects(next);
      if(id===activeId&&action!=="restore"){setActiveId(null);setView("library");}
      setDeleteConfirm(null);setBookAction(null);setSaveState("saved");
      setNotice(action==="trash"?(en?"Book moved to Trash. You can restore it from there.":"Libro spostato nel cestino. Puoi ripristinarlo da lì."):action==="restore"?(en?"Book restored to your library.":"Libro ripristinato nella libreria."):(en?"Book permanently removed from this device’s library.":"Libro eliminato definitivamente dalla libreria di questo dispositivo."));
    }catch{setError(t("errors.STORAGE"));setSaveState("error");}finally{setChanging(false);}
  }
  async function renameBook() {
    const name=newName.trim();if(!bookAction||bookAction.kind!=="rename"||!name||name.length>200||changing)return;
    setChanging(true);setError("");setSaveState("saving");
    const next=projects.map(p=>p.id===bookAction.project.id?{...p,name,updatedAt:Math.max(Date.now(),p.updatedAt+1)}:p);
    try {await pendingSave.current.catch(()=>{});await saveProjects(userId,next);setProjects(next);setBookAction(null);setSaveState("saved");}
    catch{setError(t("errors.STORAGE"));setSaveState("error");}finally{setChanging(false);}
  }
  function openProject(id: string) {
    if (busy||changing||!liveProjects.some(p=>p.id===id)) return;
    setActiveId(id);
    setView("editor");
    setPanel("review");
    setMobileNav(false);
    setJump(null);
  }
  function selectView(
    next: "library" | "editor",
    inspector?: "review" | "typography" | "structure",
  ) {
    if (busy) return;
    setView(next);
    setTrashView(false);
    if (inspector) setPanel(inspector);
    setMobileNav(false);
  }
  function chooseFile(file?: File) {
    if (!file || importLock.current || busy) return;
    if (file.name.toLowerCase().endsWith(".docx")) setImportConfirm(file);
    else void importFile(file);
  }
  async function importFile(file: File) {
    if (importLock.current) return;
    importLock.current = true;
    setImporting(true);
    setImportConfirm(null);
    setError("");
    try {
      const { importManuscript } = await import("@/lib/editor/import");
      const project = await importManuscript(file);
      setProjects((items) => [project, ...items]);
      setActiveId(project.id);
      setView("editor");
      setPanel("review");
      setMobileNav(false);
      setSaveState("saving");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "IMPORT";
      setError(
        t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.IMPORT"),
      );
    } finally {
      setImporting(false);
      importLock.current = false;
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const visibleProjects=trashView?trashedProjects:liveProjects;
  const filtered = visibleProjects.filter((p) =>
    [p.name,p.metadata?.title,p.metadata?.subtitle,p.metadata?.authors,p.metadata?.publisher,p.metadata?.writingYear,p.metadata?.publicationYear].filter(Boolean).join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const firstName = displayName?.split(" ")[0] || "";
  return (
    <div className="studio-shell hexclave-private">
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept=".docx,.txt,.md"
        aria-label={t("uploadManuscript")}
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />
      <div className="mobile-studio-header">
        <button
          aria-label={t("openNavigation")}
          onClick={() => setMobileNav(true)}
        >
          <Menu size={22} />
        </button>
        <Image src="/bookr-logo.svg" alt="Bookr" width={100} height={32} />
        <button className="studio-upload-circle" aria-label={t("newManuscript")} title={t("newManuscript")} disabled={!loaded||importing||busy||changing} onClick={()=>fileInput.current?.click()}>{importing?<LoaderCircle className="animate-spin" size={19}/>:<Plus size={21}/>}</button>
      </div>
      {mobileNav && (
        <button
          className="sidebar-backdrop"
          aria-label={t("closeNavigation")}
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`studio-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/" aria-label="Bookr — Home">
            <Image
              src="/bookr-logo.svg"
              alt="Bookr"
              width={124}
              height={40}
              priority
            />
          </Link>
          <button className="studio-upload-circle" aria-label={t("newManuscript")} title={t("newManuscript")} disabled={!loaded||importing||busy||changing} onClick={()=>fileInput.current?.click()}>{importing?<LoaderCircle className="animate-spin" size={19}/>:<Plus size={21}/>}</button>
          <button
            className="mobile-nav-close"
            aria-label={t("closeNavigation")}
            onClick={() => setMobileNav(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="sidebar-label">{t("workspaceLabel")}</div>
        <nav className="studio-nav" aria-label={t("mainNavigation")}>
          <button
            disabled={busy}
            className={view === "library" && !trashView ? "active" : ""}
            onClick={() => selectView("library")}
          >
            <Library size={18} />
            {t("library")}
            <span>{liveProjects.length}</span>
          </button>
          <button disabled={busy||changing} className={view==="library"&&trashView?"active":""} onClick={()=>{setView("library");setTrashView(true);setSearch("");setMobileNav(false);}}><Trash2 size={18}/>{en?"Trash":"Cestino"}<span>{trashedProjects.length}</span></button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">{t("recentManuscripts")}<span>{liveProjects.length}</span></div>
        <div className="sidebar-scroll">{liveProjects.slice(0,8).map(project=><button className={`recent-item ${activeId===project.id&&view==="editor"?"active":""}`} key={project.id} onClick={()=>openProject(project.id)}><BookOpen size={15}/><span>{bookTitle(project)}</span></button>)}</div>
      </aside>
      <main className="studio-main">
        <div className="studio-global-bar">
          <div>
            <span className="workspace-crumb">{t("personalWorkspace")}</span>
            <ChevronRight size={13} />
            <span>{view === "library" ? (trashView?(en?"Trash":"Cestino"):t("library")) : t("editorLabel")}</span>
          </div>
          {view==="library"&&<label className="header-library-search"><Search size={15} aria-hidden="true"/><input type="search" aria-label={t("searchManuscripts")} placeholder={t("searchPlaceholder")} value={search} onChange={event=>setSearch(event.target.value)}/></label>}
          {activeProjects.length>0&&<details className="ai-activity hexclave-private"><summary><span className="ai-orbit" aria-hidden="true"/><span role="status">{en?"AI working":"AI al lavoro"} · {activeProjects.length}</span></summary><div className="ai-activity-menu">{activeProjects.map(p=><button key={p.id} onClick={()=>openProject(p.id)}><span className="ai-dot"/><span>{p.metadata?.title||p.name}<small>{titleActivity.includes(p.id)?(en?"Generating headings":"Generazione titoli"):`${en?"Processing":"Elaborazione"} · ${Math.min(100,Math.round((p.analysis?.done||0)/Math.max(1,p.analysis?.total||1)*100))}%`}</small></span></button>)}</div></details>}
          <SaveStatus state={saveState}/>
          <div className="header-account"><AuthActions showIdentity showSettings projects={projects} /></div>
        </div>
        {(error || saveState === "error") && (
          <div role="alert" className="studio-global-error">
            {error || t("errors.STORAGE")}
            <button aria-label={t("dismiss")} onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="studio-global-error">
            {notice}
            <button aria-label={t("dismiss")} onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {!loaded ? (
          <div className="studio-loading">
            <LoaderCircle className="animate-spin" />
            {t("loadingLibrary")}
          </div>
        ) : view === "editor" && current ? (
          <ManuscriptEditor
            key={current.id}
            project={current}
            panel={panel}
            onPanel={setPanel}
            onChange={updateProject}
            onOutline={() => {}}
            onBusy={setBusy}
            jumpTo={jump}
          />
        ) : (
          <div className="library-page">
            <header className="library-heading">
              <div>
                <span className="small-overline">{t("yourWritingSpace")}</span>
                <h1>
                  {trashView?(en?"Trash":"Cestino"):firstName
                    ? t("welcomeNamed", { name: firstName })
                    : t("welcome")}
                </h1>
                <p>{trashView?(en?"Restore books or permanently remove them from this device. Nothing is deleted automatically.":"Ripristina i libri o eliminali definitivamente da questo dispositivo. Nessuna eliminazione automatica."):t("libraryIntro")}</p>
              </div>

            </header>
            <div className="library-section-heading">
              <h2>
                {trashView?(en?"Deleted books":"Libri nel cestino"):t("yourManuscripts")}
                <span>{visibleProjects.length}</span>
              </h2>

            </div>
            {trashView&&trashedProjects.length===0 ? <div className="library-empty"><Trash2 size={28}/><h3>{en?"Trash is empty":"Il cestino è vuoto"}</h3><p>{en?"Books moved to Trash will appear here.":"I libri rimossi dalla libreria compariranno qui."}</p></div> : visibleProjects.length === 0 ? (
              <div
                className="library-empty"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  chooseFile(e.dataTransfer.files[0]);
                }}
              >
                <div className="empty-book-icon">
                  <BookOpen size={28} />
                </div>
                <h3>{t("emptyTitle")}</h3>
                <p>{t("emptyBody")}</p>
                <button
                  className="studio-button primary"
                  disabled={importing}
                  onClick={() => fileInput.current?.click()}
                >
                  {importing ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {t("importFirst")}
                </button>
                <small>DOCX, TXT, Markdown · 50 MB</small>
              </div>
            ) : filtered.length === 0 ? (
              <div className="library-empty">
                <h3>{t("noSearchResults")}</h3>
                <button
                  className="studio-button secondary"
                  onClick={() => setSearch("")}
                >
                  {t("clearSearch")}
                </button>
              </div>
            ) : (
              <div className="manuscript-grid">
                {filtered.map((project, index) => (
                  <article className="manuscript-card" key={project.id}>
                  <button className="manuscript-card-open" disabled={trashView||changing} onClick={() => openProject(project.id)}>
                    <div className={`manuscript-cover cover-${index % 3}`}>
                      <span className="cover-kicker">{project.metadata?.authors.trim() || t("manuscript")}</span>
                      <span className="cover-title" title={bookTitle(project)}>{bookTitle(project)}</span>
                      {project.metadata?.subtitle.trim()&&<span className="cover-subtitle">{project.metadata.subtitle}</span>}
                      <span className="cover-rule" />
                      <span className="cover-monogram" aria-hidden="true">{project.metadata?.title.trim()?.[0] || "b."}</span>
                    </div>
                    <div className="manuscript-card-info">{activeProjects.some(p=>p.id===project.id)&&<span className="ai-card-status" role="status"><span className="ai-dot"/>{en?"AI working":"AI in elaborazione"}</span>}
                      <div>
                        <h3 title={bookTitle(project)}>{bookTitle(project)}</h3>
                        <ArrowUpRight size={17} />
                      </div>
                      {project.metadata?.authors.trim()&&<p className="book-card-authors">{project.metadata.authors}</p>}
                      {(project.metadata?.publisher.trim()||project.metadata?.writingYear.trim()||project.metadata?.publicationYear.trim())&&<p className="book-card-edition">{[project.metadata?.publisher.trim(),project.metadata?.publicationYear.trim() || (project.metadata?.writingYear.trim()?`${en?"Written":"Scritto nel"} ${project.metadata.writingYear.trim()}`:"")].filter(Boolean).join(" · ")}</p>}
                      <p>
                        {t("words", { count: countWords(project.doc) })}
                        <span>·</span>
                        {new Intl.DateTimeFormat(undefined, {
                          day: "numeric",
                          month: "short",
                        }).format(project.updatedAt)}
                      </p>

                    </div>
                  </button>
                  {!trashView&&<LibraryCardStatus project={project}/>}
                  <LibraryCardMenu project={project} disabled={changing} onError={setError} onRename={()=>{setNewName(project.name);setBookAction({kind:"rename",project});}} onTrash={()=>setBookAction({kind:"trash",project})} onRestore={()=>void lifecycle(project.id,"restore")} onDelete={()=>setDeleteConfirm(project)}/>
                  </article>
                ))}
              </div>
            )}
            <footer className="library-footer">
              <ShieldCheck size={15} />
              <span>{t("libraryPrivacy")}</span>
              <Link href="/">
                <ArrowLeft size={13} />
                {t("backHome")}
              </Link>
            </footer>
          </div>
        )}
      </main>
      {bookAction&&<div className="studio-modal-backdrop"><section className="studio-modal hexclave-private" role="dialog" aria-modal="true" aria-labelledby="book-action-title"><h2 id="book-action-title">{bookAction.kind==="trash"?(en?"Move book to Trash?":"Spostare il libro nel cestino?"):(en?"Rename book":"Rinomina libro")}</h2><form onSubmit={event=>{event.preventDefault();if(bookAction.kind==="rename")void renameBook();else void lifecycle(bookAction.project.id,"trash");}}>{bookAction.kind==="trash"?<><p><strong>{bookTitle(bookAction.project)}</strong></p><p>{en?"It will disappear from the library. The manuscript and its revisions remain in Trash, where you can restore them.":"Scomparirà dalla libreria. Il manoscritto e le revisioni resteranno nel cestino, da cui potrai ripristinarli."}</p></>:<><label className="library-rename-field">{en?"Library name":"Nome in libreria"}<input autoFocus value={newName} maxLength={200} required onChange={e=>setNewName(e.target.value)}/></label><p>{en?"Changes the library name. The title in book metadata and the original file remain unchanged.":"Modifica il nome in libreria. Il titolo nei metadati e il file originale restano invariati."}</p></>}{error&&<p role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="studio-button secondary" disabled={changing} onClick={closeBookAction}>{t("cancel")}</button><button type="submit" className="studio-button primary" disabled={changing||(bookAction.kind==="rename"&&!newName.trim())}>{bookAction.kind==="trash"?(en?"Move to Trash":"Sposta nel cestino"):(en?"Save name":"Salva nome")}</button></div></form></section></div>}
      {deleteConfirm&&<div className="studio-modal-backdrop"><section className="studio-modal hexclave-private" role="dialog" aria-modal="true" aria-labelledby="delete-book-title"><h2 id="delete-book-title">{en?"Permanently delete this book?":"Eliminare definitivamente questo libro?"}</h2><p><strong>{bookTitle(deleteConfirm)}</strong></p><p>{en?"The manuscript, original file, metadata and revisions saved in this browser will be removed. This cannot be undone. Files you already exported are unaffected.":"Verranno rimossi il manoscritto, il file originale, i metadati e le revisioni salvati in questo browser. L’operazione non è annullabile. I file già esportati restano disponibili."}</p><div className="modal-actions"><button className="studio-button secondary" disabled={changing} onClick={closeDelete}>{t("cancel")}</button><button className="studio-button primary" disabled={changing} onClick={()=>void lifecycle(deleteConfirm.id,"delete")}>{en?"Delete permanently":"Elimina definitivamente"}</button></div></section></div>}
      {importConfirm && (
        <div className="studio-modal-backdrop">
          <section
            className="studio-modal hexclave-private"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-dialog-title"
          >
            <button
              className="modal-close"
              aria-label={t("close")}
              onClick={() => {
                setImportConfirm(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              <X size={20} />
            </button>
            <FileText className="modal-symbol" size={28} />
            <h2 id="import-dialog-title">{t("importTitle")}</h2>
            <p>{t("importExplanation")}</p>
            <p className="modal-note">{t("importLimit")}</p>
            <div className="modal-actions">
              <button
                className="studio-button secondary"
                onClick={() => {
                  setImportConfirm(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                {t("cancel")}
              </button>
              <button
                className="studio-button primary"
                onClick={() => void importFile(importConfirm)}
              >
                {t("openInEditor")}
                <ChevronRight size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
