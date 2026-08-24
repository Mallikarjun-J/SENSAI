"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateUserProfile } from "@/actions/user";

export function EditProfileModal({ open, onClose, initialData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [experience, setExperience] = useState(String(initialData?.experience ?? 0));
  const [bio, setBio] = useState(initialData?.bio ?? "");
  const [skills, setSkills] = useState(initialData?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const skillRef = useRef(null);

  // Reset when modal is opened with fresh data
  useEffect(() => {
    if (open) {
      setExperience(String(initialData?.experience ?? 0));
      setBio(initialData?.bio ?? "");
      setSkills(initialData?.skills ?? []);
      setSkillInput("");
    }
  }, [open, initialData]);

  // ── Skill tag helpers ───────────────────────────────────────────────────────
  const addSkill = (raw) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...new Set([...skills, ...parts])]; // deduplicate
    setSkills(next);
    setSkillInput("");
  };

  const removeSkill = (idx) => setSkills(skills.filter((_, i) => i !== idx));

  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (skillInput.trim()) addSkill(skillInput);
    }
    if (e.key === "Backspace" && !skillInput && skills.length) {
      removeSkill(skills.length - 1);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const exp = parseInt(experience, 10);
    if (isNaN(exp) || exp < 0 || exp > 50) {
      toast.error("Experience must be between 0 and 50 years");
      return;
    }
    if (!bio.trim()) {
      toast.error("Bio cannot be empty");
      return;
    }
    if (skills.length === 0) {
      toast.error("Add at least one skill");
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({ experience: exp, skills, bio: bio.trim() });
      toast.success("Profile updated!");
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(e?.message ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your experience, skills &amp; bio
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Experience */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Skills ─ tag input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white">Skills</label>
            <div
              className="min-h-[48px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/30 transition-all"
              onClick={() => skillRef.current?.focus()}
            >
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSkill(i); }}
                    className="rounded-full text-primary/60 hover:text-primary transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                ref={skillRef}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => { if (skillInput.trim()) addSkill(skillInput); }}
                placeholder={skills.length === 0 ? "Type a skill and press Enter or comma…" : ""}
                className="flex-1 min-w-[140px] bg-transparent text-sm text-white placeholder:text-muted-foreground/60 outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Enter</kbd> or{" "}
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">,</kbd> to add a skill
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Professional Bio</label>
              <span className={`text-xs ${bio.length > 480 ? "text-red-400" : "text-muted-foreground"}`}>
                {bio.length}/500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your professional background…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/8">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
