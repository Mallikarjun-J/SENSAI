"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";
import {
  getUserResumes,
  createResume,
  deleteResume,
  renameResume,
  parseResumeFromText,
  getResumeCount,
} from "@/actions/resume";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

const RESUME_LIMIT = 5;

function EmptyState({ onCreate }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-5">
        <svg className="h-9 w-9 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold">No resumes yet</h3>
      <p className="mb-5 text-sm text-muted-foreground">Create your first resume or import an existing one.</p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Resume
      </button>
    </div>
  );
}

function ResumeCard({ resume, onDelete, onRename }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resume.title);

  const templateColors = {
    classic: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    modern: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    minimal: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  };

  const handleRename = async () => {
    if (title.trim() && title !== resume.title) {
      await onRename({ resumeId: resume.id, title: title.trim() });
    }
    setEditing(false);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-primary/40 hover:bg-white/[0.05] transition-all duration-200">
      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: resume.ascentColor ?? "#a78bfa" }} />

      <div className="flex-1 p-5">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setTitle(resume.title); setEditing(false); } }}
            className="w-full rounded border border-primary/50 bg-white/5 px-2 py-1 text-base font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <h3
            className="truncate text-base font-semibold cursor-pointer hover:text-primary transition-colors"
            title={resume.title}
            onDoubleClick={() => setEditing(true)}
          >
            {resume.title}
          </h3>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${templateColors[resume.template] ?? templateColors.classic}`}>
            {resume.template ?? "classic"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(resume.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] px-4 py-3">
        <button
          onClick={() => router.push(`resume/builder/${resume.id}`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/25 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-all"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
          title="Rename"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <ConfirmDeleteDialog
          trigger={
            <button
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-all"
              title="Delete"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          }
          title={`Delete "${resume.title}"?`}
          description="Are you sure you want to delete this resume? This cannot be undone."
          onConfirm={() => onDelete(resume.id)}
        />
      </div>
    </div>
  );
}

export default function ResumePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState("pdf"); // "pdf" | "text"
  const [newTitle, setNewTitle] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState("");

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: getUserResumes,
  });

  const atLimit = resumes.length >= RESUME_LIMIT;

  const createMut = useMutation({
    mutationFn: () => createResume({ title: newTitle }),
    onSuccess: (data) => {
      toast.success("Resume created!");
      setCreateOpen(false);
      setNewTitle("");
      qc.invalidateQueries({ queryKey: ["resumes"] });
      router.push(`/resume/builder/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteResume(id),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const renameMut = useMutation({
    mutationFn: ({ resumeId, title }) => renameResume({ resumeId, title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });

  const importTextMut = useMutation({
    mutationFn: () => parseResumeFromText({ title: importTitle, resumeText }),
    onSuccess: (data) => {
      toast.success("Resume imported!");
      setImportOpen(false);
      setImportTitle("");
      setResumeText("");
      qc.invalidateQueries({ queryKey: ["resumes"] });
      router.push(`/resume/builder/${data.resumeId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const importPdfMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("file", pdfFile);
      fd.append("title", importTitle);
      const res = await fetch("/api/parse-resume-pdf", { method: "POST", body: fd });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to parse PDF");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("PDF imported!");
      setImportOpen(false);
      setImportTitle("");
      setPdfFile(null);
      setPdfName("");
      qc.invalidateQueries({ queryKey: ["resumes"] });
      router.push(`/resume/builder/${data.resumeId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-title">My Resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {resumes.length}/{RESUME_LIMIT} resumes · Build, edit, and export ATS-ready resumes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setImportOpen(true); setImportTab("pdf"); }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-all"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <button
            disabled={atLimit}
            onClick={() => setCreateOpen(true)}
            title={atLimit ? `Max ${RESUME_LIMIT} resumes reached` : ""}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New
          </button>
        </div>
      </div>

      {/* Resume grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <ResumeCard
              key={r.id}
              resume={r}
              onDelete={(id) => deleteMut.mutate(id)}
              onRename={(args) => renameMut.mutate(args)}
            />
          ))}
          {!atLimit && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-white/[0.02] transition-all group"
            >
              <div className="rounded-full border border-white/15 p-3 group-hover:border-primary/40 transition-all">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium">New Resume</span>
            </button>
          )}
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-background p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Create New Resume</h2>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resume Title</label>
                <input
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer — Google"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={createMut.isPending || !newTitle.trim()} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {createMut.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import Resume</h2>
              <button onClick={() => setImportOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-5 flex rounded-lg border border-white/10 bg-white/5 p-1 gap-1">
              <button
                onClick={() => setImportTab("pdf")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${importTab === "pdf" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                📄 Upload PDF
              </button>
              <button
                onClick={() => setImportTab("text")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${importTab === "text" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                📋 Paste Text
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resume Title (optional)</label>
                <input
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="e.g. Software Engineer 2025"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {importTab === "pdf" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-left">
                          <p className="text-sm font-medium text-green-400">PDF ready</p>
                          <p className="text-xs text-muted-foreground truncate max-w-48">{pdfName}</p>
                        </div>
                        <button
                          onClick={() => { setPdfFile(null); setPdfName(""); }}
                          className="ml-auto text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-3 text-sm text-muted-foreground">Pick your existing resume PDF (max 4 MB)</p>
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Choose PDF
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 4 * 1024 * 1024) {
                                toast.error("File too large — max 4 MB");
                                e.target.value = "";
                                return;
                              }
                              setPdfFile(f);
                              setPdfName(f.name);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <button
                    disabled={!pdfFile || importPdfMut.isPending}
                    onClick={() => importPdfMut.mutate()}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {importPdfMut.isPending ? "Parsing PDF with AI…" : "Import & Parse PDF"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Paste Resume Text</label>
                    <textarea
                      rows={8}
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste the full text content of your existing resume here..."
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    />
                  </div>
                  <button
                    disabled={!resumeText.trim() || importTextMut.isPending}
                    onClick={() => importTextMut.mutate()}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {importTextMut.isPending ? "Parsing with AI…" : "Import & Parse Text"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}