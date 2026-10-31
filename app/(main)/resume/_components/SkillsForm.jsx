"use client";
import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getProfileSkillsFormatted } from "@/actions/resume";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SkillsForm({ value, onChange }) {
  const [prevValue, setPrevValue] = useState(value);
  const [raw, setRaw] = useState(() => (value ?? []).join("\n"));
  const [loading, setLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingLines, setPendingLines] = useState([]);

  if (value !== prevValue) {
    setPrevValue(value);
    setRaw((value ?? []).join("\n"));
  }

  const handleChange = (nextRaw) => {
    setRaw(nextRaw);
    onChange(
      nextRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    );
  };

  const handleImportClick = async () => {
    setLoading(true);
    try {
      const res = await getProfileSkillsFormatted();
      if (!res.success || !res.lines?.length) {
        toast.error(res.message || "No skills found in your profile to import.");
        return;
      }

      // If text is currently empty, import immediately
      if (!raw.trim()) {
        const newText = res.lines.join("\n");
        handleChange(newText);
        toast.success(`Imported ${res.count} skills from your profile!`);
        return;
      }

      // If text already exists, prompt user (replace or append)
      setPendingLines(res.lines);
      setConfirmModalOpen(true);
    } catch (err) {
      console.error("Failed to import profile skills:", err);
      toast.error("Failed to import skills from profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = () => {
    const newText = pendingLines.join("\n");
    handleChange(newText);
    setConfirmModalOpen(false);
    toast.success("Replaced with skills from your profile!");
  };

  const handleAppend = () => {
    const newText = raw.trim() + "\n" + pendingLines.join("\n");
    handleChange(newText);
    setConfirmModalOpen(false);
    toast.success("Appended profile skills to existing skills!");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Skills</label>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all disabled:opacity-50"
            title="Import and organize skills from your profile"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            )}
            <span>Import from Profile</span>
          </button>
        </div>

        <textarea
          rows={9}
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Languages: Java, Python, C++, JavaScript, TypeScript\nWeb & Frameworks: React, Next.js, Node.js, Express.js, FastAPI\nDatabases: MySQL, PostgreSQL, MongoDB, Prisma ORM\nAI / ML: LLM Integration (Gemini, Mistral), RAG Pipelines\nCore Concepts: Data Structures & Algorithms, OOP, REST APIs`}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y font-mono"
        />
      </div>

      <div className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span>
          💡 Each non-empty line appears as a separate row on the resume. Use <code className="bg-white/10 px-1 rounded">Category: detail, detail</code> format for best results.
        </span>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={loading}
          className="text-primary hover:underline shrink-0 text-xs font-medium self-start sm:self-auto"
        >
          Import from Profile →
        </button>
      </div>

      {/* Confirmation Dialog when content already exists in textarea */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md border-white/10 bg-[#0c0e14] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Import Skills from Profile
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              You already have skills listed on this resume. How would you like to apply your profile skills?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs space-y-1.5 max-h-40 overflow-y-auto font-mono text-zinc-300">
            {pendingLines.map((line, i) => (
              <div key={i} className="truncate">{line}</div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmModalOpen(false)}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAppend}
              className="text-xs border-white/15 hover:bg-white/10"
            >
              Append to Existing
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleReplace}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              Replace All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
