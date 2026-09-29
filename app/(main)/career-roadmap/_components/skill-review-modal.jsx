"use client";
import { useEffect, useState } from "react";
import { X, Plus, Loader2, Sparkles } from "lucide-react";
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

export default function SkillReviewModal({ open, rawTitles, onClose, onSaved }) {
  const [normalizing, setNormalizing]   = useState(false);
  const [recognized,  setRecognized]    = useState([]); // chips in "to add" list
  const [skipped,     setSkipped]       = useState([]); // chips in "also available"
  const [customInput, setCustomInput]   = useState("");
  const [saving,      setSaving]        = useState(false);

  /* ── Run AI normalization whenever modal opens ─────────────────────────── */
  useEffect(() => {
    if (!open || !rawTitles?.length) return;
    setNormalizing(true);
    setRecognized([]);
    setSkipped([]);
    setCustomInput("");

    normalizeSkillTitles(rawTitles).then(({ recognized: r, skipped: s }) => {
      setRecognized(r);
      setSkipped(s);
      setNormalizing(false);
    }).catch(() => {
      setNormalizing(false);
      toast.error("Failed to analyse skills. You can still add them manually.");
      // Put everything in recognized as fallback
      setRecognized(rawTitles);
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ── Save ──────────────────────────────────────────────────────────────── */
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
      <DialogContent className="sm:max-w-md border-white/10 bg-[#0c0e14]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Review Skills to Add
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            AI has identified the skills below. Remove what you don&apos;t want,
            add back any skipped items, or type a custom skill.
          </DialogDescription>
        </DialogHeader>

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {normalizing && (
          <div className="flex items-center justify-center py-10 gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing skills…
          </div>
        )}

        {!normalizing && (
          <div className="space-y-5 py-1">
            {/* ── Skills to add ──────────────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Skills to add ({recognized.length})
              </p>
              {recognized.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  None selected — add from below or type a custom skill.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recognized.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="gap-1.5 pl-3 pr-2 py-1 border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15"
                    >
                      {skill}
                      <button
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

            {/* ── Skipped by AI — user can add back ──────────────────────── */}
            {skipped.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Also available — click to add
                </p>
                <div className="flex flex-wrap gap-2">
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

            {/* ── Custom skill input ─────────────────────────────────────── */}
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-white/40 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || normalizing || recognized.length === 0}
            className="gap-2"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              `Save ${recognized.length > 0 ? recognized.length : ""} skill${recognized.length === 1 ? "" : "s"} to Profile`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
