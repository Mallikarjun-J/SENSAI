"use client";
import { Plus, Trash2 } from "lucide-react";

const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

// Normalise: supports both old flat format (link1Label/link1Url) and new links[] array
function normalizeLinks(pi) {
  if (Array.isArray(pi?.links)) return pi.links;
  // Migrate from old format
  const migrated = [];
  if (pi?.link1Label?.trim() || pi?.link1Url?.trim())
    migrated.push({ id: crypto.randomUUID(), label: pi.link1Label ?? "", url: pi.link1Url ?? "" });
  if (pi?.link2Label?.trim() || pi?.link2Url?.trim())
    migrated.push({ id: crypto.randomUUID(), label: pi.link2Label ?? "", url: pi.link2Url ?? "" });
  return migrated;
}

export function PersonalInfoForm({ value, onChange }) {
  const v = value ?? {};
  const links = normalizeLinks(v);

  // Update a scalar field
  const set = (key, val) => onChange({ ...v, [key]: val });

  // Update the whole links array (clears old link1/link2 keys on first edit)
  const setLinks = (nextLinks) =>
    onChange({
      ...v,
      links: nextLinks,
      // Clear legacy keys so they don't appear in the contact line
      link1Label: undefined,
      link1Url: undefined,
      link2Label: undefined,
      link2Url: undefined,
    });

  const addLink = () =>
    setLinks([...links, { id: crypto.randomUUID(), label: "", url: "" }]);

  const removeLink = (id) =>
    setLinks(links.filter((l) => l.id !== id));

  const updateLink = (id, field, val) =>
    setLinks(links.map((l) => (l.id === id ? { ...l, [field]: val } : l)));

  return (
    <div className="space-y-5">
      {/* ── Core fields ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Full Name</label>
          <input value={v.fullName ?? ""} placeholder="Ada Lovelace"
            onChange={(e) => set("fullName", e.target.value)} className={INPUT} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Profession</label>
          <input value={v.profession ?? ""} placeholder="Software Developer"
            onChange={(e) => set("profession", e.target.value)} className={INPUT} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email Address</label>
          <input type="email" value={v.email ?? ""} placeholder="ada@example.com"
            onChange={(e) => set("email", e.target.value)} className={INPUT} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Phone Number</label>
          <input value={v.phone ?? ""} placeholder="+91 98765 43210"
            onChange={(e) => set("phone", e.target.value)} className={INPUT} />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-sm font-medium text-foreground">Location</label>
          <input value={v.location ?? ""} placeholder="Bengaluru, India"
            onChange={(e) => set("location", e.target.value)} className={INPUT} />
        </div>
      </div>

      {/* ── Custom Links ─────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Custom Links</p>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-all"
          >
            <Plus className="h-3 w-3" /> Add Link
          </button>
        </div>

        {links.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-2">
            No links yet — click &ldquo;Add Link&rdquo; to add LinkedIn, GitHub, Portfolio, etc.
          </p>
        )}

        {links.map((link, idx) => (
          <div key={link.id ?? `link-${idx}`} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-end">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Label {idx + 1}</label>
              <input
                value={link.label}
                placeholder={idx === 0 ? "LinkedIn" : idx === 1 ? "GitHub" : "Portfolio"}
                onChange={(e) => updateLink(link.id, "label", e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">URL {idx + 1}</label>
              <input
                value={link.url}
                placeholder={
                  idx === 0
                    ? "linkedin.com/in/yourname"
                    : idx === 1
                    ? "github.com/yourname"
                    : "yourportfolio.dev"
                }
                onChange={(e) => updateLink(link.id, "url", e.target.value)}
                className={INPUT}
              />
            </div>
            <button
              type="button"
              onClick={() => removeLink(link.id)}
              className="mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-all shrink-0"
              title="Remove link"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
