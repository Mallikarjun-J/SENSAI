"use client";
import { useState } from "react";
import { X, Plus, Loader2, Sparkles, ArrowRight, ArrowLeft, ListChecks } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeSkillTitles, saveSkillsToProfile } from "@/actions/user";

export default function SkillReviewModal({ open, rawTitles = [], onClose, onSaved }) {
  // Step in the modal: "preview" (see completed steps) | "review" (review AI-extracted skills)
  const [step, setStep] = useState("preview");
  const [selectedTitles, setSelectedTitles] = useState(() =>
    Array.isArray(rawTitles) ? [...rawTitles] : []
  );
  const [normalizing, setNormalizing] = useState(false);
  const [recognized, setRecognized] = useState([]); // chips in "to add" list
  const [skipped, setSkipped] = useState([]); // chips in "also available"
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Stage 1: remove title from preview list ──────────────────────────── */
  const removeTitle = (titleToRemove) => {
    setSelectedTitles((prev) => prev.filter((t) => t !== titleToRemove));
  };

  /* ── Trigger AI normalization on user request ─────────────────────────── */
  const handleStartAnalysis = async () => {
    if (!selectedTitles.length) return;
    setStep("review");
    setNormalizing(true);
    setRecognized([]);
    setSkipped([]);
    setCustomInput("");

    try {
      const { recognized: r, skipped: s } = await normalizeSkillTitles(selectedTitles);
      setRecognized(r);
      setSkipped(s);
    } catch {
      toast.error("Failed to analyse skills. You can still add them manually.");
      setRecognized(selectedTitles);
    } finally {
      setNormalizing(false);
    }
  };

  /* ── Chip helpers ──────────────────────────────────────────────────────── */
  const removeRecognized = (skill) =>
    setRecognized((prev) => prev.filter((s) => s !== skill));

  const addFromSkipped = (skill) => {
    setSkipped((prev) => prev.filter((s) => s !== skill));
    setRecognized((prev) => [...prev, skill]);
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    if (!recognized.includes(val)) setRecognized((prev) => [...prev, val]);
    setCustomInput("");
  };

  /* ── Save to profile ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!recognized.length) return;
    setSaving(true);
    try {
      const result = await saveSkillsToProfile(recognized);
      if (result.success) {
        if (result.added.length > 0) {
          toast.success(
            `${result.added.length} skill${result.added.length === 1 ? "" : "s"} added to your profile!`,
            { description: result.added.join(", ") }
          );
        } else {
          toast.info("All selected skills are already in your profile.");
        }
        onSaved?.();
        onClose?.();
      } else {
        toast.error("Failed to save skills.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-lg border-white/10 bg-[#0c0e14]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {step === "preview" ? (
              <>
                <ListChecks className="h-4 w-4 text-violet-400" />
                Completed Steps to Add
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-violet-400" />
                Review Skills to Add
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {step === "preview"
              ? "Review the completed roadmap steps below. Click 'Extract Skills with AI' to identify resume-ready skills."
              : "AI has identified the skills below. Remove what you don't want, add back skipped items, or type a custom skill."}
          </DialogDescription>
        </DialogHeader>

        {/* ── STAGE 1: PREVIEW COMPLETED STEPS (NO AI CALL YET) ─────────── */}
        {step === "preview" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Completed Steps ({selectedTitles.length})</span>
              {selectedTitles.length > 0 && (
                <span className="text-[11px] text-muted-foreground">Ready to extract</span>
              )}
            </div>

            {selectedTitles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                No steps selected. Check off steps in your roadmap to add them.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {selectedTitles.map((title, idx) => (
                  <div
                    key={`${title}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white/90"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-semibold text-violet-300">
                        {idx + 1}
                      </span>
                      <span className="truncate">{title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTitle(title)}
                      className="rounded-md p-1 text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors shrink-0"
                      title="Remove from batch"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STAGE 2: AI REVIEW / LOADING ──────────────────────────────── */}
        {step === "review" && (
          <>
            {normalizing && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                <span>Analysing steps with AI to extract industry skills…</span>
              </div>
            )}

            {!normalizing && (
              <div className="space-y-5 py-1">
                {/* ── Skills to add ────────────────────────────────────────── */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Skills to add ({recognized.length})
                  </p>
                  {recognized.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      None selected — add from below or type a custom skill.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {recognized.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="gap-1.5 pl-3 pr-2 py-1 border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeRecognized(skill)}
                            className="rounded-full hover:bg-white/10 p-0.5 transition-colors"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Skipped by AI — user can add back ────────────────────── */}
                {skipped.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Also available — click to add
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                      {skipped.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="gap-1.5 pl-3 pr-2 py-1 border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/20 cursor-pointer transition-colors"
                          onClick={() => addFromSkipped(skill)}
                        >
                          {skill}
                          <Plus className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Custom skill input ───────────────────────────────────── */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Add a custom skill
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. API Security, System Design…"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustom()}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus-visible:ring-violet-500/30"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustom}
                      disabled={!customInput.trim()}
                      className="shrink-0 border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06]"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-white/40 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStartAnalysis}
                disabled={selectedTitles.length === 0}
                className="gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium"
              >
                <Sparkles className="h-4 w-4" />
                Extract Skills with AI
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("preview")}
                disabled={saving || normalizing}
                className="gap-1.5 text-white/40 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Steps
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || normalizing || recognized.length === 0}
                className="gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  `Save ${recognized.length > 0 ? recognized.length : ""} skill${
                    recognized.length === 1 ? "" : "s"
                  } to Profile`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
