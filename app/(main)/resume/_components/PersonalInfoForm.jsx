"use client";
import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import {
  Plus, Trash2, AlertCircle, Upload, User, X,
  ZoomIn, ZoomOut, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { personalInfoSchema, formatZodErrors } from "@/lib/resume-schema";

const CROP_PX = 280; // crop preview circle diameter
const OUT_PX  = 300; // saved output size

const BASE_INPUT =
  "w-full rounded-xl border bg-white/5 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all";

const inputCls = (hasErr) =>
  `${BASE_INPUT} ${hasErr ? "border-red-500/50 focus:ring-red-500/30" : "border-white/10 focus:ring-primary/50"}`;

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {msg}
    </p>
  );
}

function normalizeLinks(pi) {
  if (Array.isArray(pi?.links)) return pi.links;
  const migrated = [];
  if (pi?.link1Label?.trim() || pi?.link1Url?.trim())
    migrated.push({ id: crypto.randomUUID(), label: pi.link1Label ?? "", url: pi.link1Url ?? "" });
  if (pi?.link2Label?.trim() || pi?.link2Url?.trim())
    migrated.push({ id: crypto.randomUUID(), label: pi.link2Label ?? "", url: pi.link2Url ?? "" });
  return migrated;
}

// ── Crop helpers ──────────────────────────────────────────────────────────────

/** Render canvas → base64 JPEG from crop parameters */
function renderCrop({ src, natW, natH, baseScale, zoom, cropX, cropY }) {
  return new Promise((resolve, reject) => {
    const canvas  = document.createElement("canvas");
    canvas.width  = OUT_PX;
    canvas.height = OUT_PX;
    const ctx = canvas.getContext("2d");

    // Circular clip
    ctx.beginPath();
    ctx.arc(OUT_PX / 2, OUT_PX / 2, OUT_PX / 2, 0, Math.PI * 2);
    ctx.clip();

    const factor = OUT_PX / CROP_PX;
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      ctx.save();
      ctx.translate(
        OUT_PX / 2 + cropX * factor,
        OUT_PX / 2 + cropY * factor,
      );
      ctx.scale(baseScale * zoom * factor, baseScale * zoom * factor);
      ctx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
      ctx.restore();
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = src;
  });
}

// ── Photo Cropper Dialog ──────────────────────────────────────────────────────

function PhotoCropDialog({ src, natW, natH, onApply, onClose }) {
  const baseScale = CROP_PX / Math.min(natW, natH); // fills the circle
  const [zoom,  setZoom]  = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  const isDragging  = useRef(false);
  const dragOrigin  = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Window-level drag listeners so fast moves don't lose the grab
  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      setCropX(dragOrigin.current.ox + e.clientX - dragOrigin.current.x);
      setCropY(dragOrigin.current.oy + e.clientY - dragOrigin.current.y);
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    // Touch
    const onTouchMove = (e) => {
      if (!isDragging.current) return;
      const t = e.touches[0];
      setCropX(dragOrigin.current.ox + t.clientX - dragOrigin.current.x);
      setCropY(dragOrigin.current.oy + t.clientY - dragOrigin.current.y);
    };
    const onTouchEnd = () => { isDragging.current = false; };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend",  onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onTouchEnd);
    };
  }, []);

  const onMouseDown = (e) => {
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY, ox: cropX, oy: cropY };
    e.preventDefault();
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    isDragging.current = true;
    dragOrigin.current = { x: t.clientX, y: t.clientY, ox: cropX, oy: cropY };
  };

  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.09;
    setZoom((z) => Math.min(Math.max(z * factor, 0.8), 5));
  };

  const resetCrop = () => { setCropX(0); setCropY(0); setZoom(1); };

  const handleApply = async () => {
    try {
      const b64 = await renderCrop({ src, natW, natH, baseScale, zoom, cropX, cropY });
      onApply(b64);
    } catch {
      toast.error("Failed to process image.");
    }
  };

  // Display image dimensions (before zoom)
  const dispW = natW * baseScale;
  const dispH = natH * baseScale;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Adjust Photo</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-zinc-400 text-center -mt-1">
          Drag to pan · Scroll or pinch to zoom
        </p>

        {/* ── Crop preview circle ── */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            style={{
              width:  CROP_PX,
              height: CROP_PX,
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              cursor: "grab",
              userSelect: "none",
              flexShrink: 0,
              backgroundColor: "#111",          /* solid fallback behind image */
              boxShadow: "0 0 0 3px hsl(var(--primary))",
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onWheel={onWheel}
          >
            <NextImage
              src={src}
              alt="crop"
              unoptimized
              width={Math.round(dispW)}
              height={Math.round(dispH)}
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top:  "50%",
                width:  dispW,
                height: dispH,
                transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${zoom})`,
                transformOrigin: "center center",
                pointerEvents: "none",
                userSelect: "none",
                maxWidth: "none",
              }}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button
              type="button" size="icon" variant="outline"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(z * 0.85, 0.8))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            {/* Zoom slider */}
            <input
              type="range" min="80" max="500" step="1"
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-36 accent-primary cursor-pointer"
            />

            <Button
              type="button" size="icon" variant="outline"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(z * 1.15, 5))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              type="button" size="icon" variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={resetCrop}
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function PersonalInfoForm({ value, onChange, validateTrigger = 0 }) {
  const v     = value ?? {};
  const links = normalizeLinks(v);

  const [touched, setTouched] = useState({});
  const [errors,  setErrors]  = useState({});

  // Crop dialog state
  const [cropData, setCropData] = useState(null); // { src, natW, natH }
  const photoInputRef = useRef(null);

  const runValidation = (data) => {
    const result = personalInfoSchema.safeParse(data);
    return result.success ? {} : formatZodErrors(result.error);
  };

  useEffect(() => {
    if (validateTrigger === 0) return;
    const allErrors = runValidation({ ...v, links });
    setErrors(allErrors);
    setTouched({
      fullName: true, email: true, phone: true, location: true, profession: true,
      ...Object.fromEntries(
        links.flatMap((_, i) =>
          [`links.${i}.label`, `links.${i}.url`].map((k) => [k, true])
        )
      ),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateTrigger]);

  const set = (key, val) => {
    const next = { ...v, [key]: val };
    onChange(next);
    if (touched[key]) setErrors(runValidation({ ...next, links }));
  };

  const setLinks = (nextLinks) => {
    onChange({
      ...v, links: nextLinks,
      link1Label: undefined, link1Url: undefined,
      link2Label: undefined, link2Url: undefined,
    });
    if (Object.keys(touched).some((k) => k.startsWith("links.")))
      setErrors(runValidation({ ...v, links: nextLinks }));
  };

  const handleBlur = (key) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(runValidation({ ...v, links }));
  };

  const handleLinkBlur = (idx, field) => {
    const key = `links.${idx}.${field}`;
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(runValidation({ ...v, links }));
  };

  const err = (key) => (touched[key] ? errors[key] : null);

  const addLink    = () => setLinks([...links, { id: crypto.randomUUID(), label: "", url: "" }]);
  const removeLink = (id) => setLinks(links.filter((l) => l.id !== id));
  const updateLink = (id, field, val) =>
    setLinks(links.map((l) => (l.id === id ? { ...l, [field]: val } : l)));

  // Photo upload → open crop dialog
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setCropData({ src: ev.target.result, natW: img.naturalWidth, natH: img.naturalHeight });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropApply = (base64) => {
    set("photo", base64);
    setCropData(null);
  };

  return (
    <div className="space-y-5">

      {/* ── Crop Dialog ── */}
      {cropData && (
        <PhotoCropDialog
          src={cropData.src}
          natW={cropData.natW}
          natH={cropData.natH}
          onApply={handleCropApply}
          onClose={() => setCropData(null)}
        />
      )}

      {/* ── Profile Photo ── */}
      <div className="flex items-center gap-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        {/* Preview */}
        <div className="relative shrink-0">
          {v.photo ? (
            <>
              <NextImage
                src={v.photo}
                alt="Profile"
                width={80}
                height={80}
                unoptimized
                className="h-20 w-20 rounded-full object-cover border-2 border-white/20"
              />
              <button
                type="button"
                onClick={() => set("photo", "")}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-white/5 text-muted-foreground">
              <User className="h-8 w-8 opacity-40" />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div>
          <p className="text-sm font-medium mb-0.5">Profile Photo</p>
          <p className="text-xs text-muted-foreground mb-3">
            Used in the <span className="text-primary font-medium">Creative</span> template.
            Drag &amp; zoom to crop after selecting.
          </p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              {v.photo ? "Change Photo" : "Upload Photo"}
            </button>
            {/* Re-crop existing photo */}
            {v.photo && (
              <button
                type="button"
                onClick={() => {
                  // Re-open crop dialog with the stored base64
                  const img = new Image();
                  img.onload = () =>
                    setCropData({ src: v.photo, natW: img.naturalWidth, natH: img.naturalHeight });
                  img.src = v.photo;
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition-all"
              >
                Adjust
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal details grid ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            value={v.fullName ?? ""}
            placeholder="Ada Lovelace"
            className={inputCls(!!err("fullName"))}
            onChange={(e) => set("fullName", e.target.value)}
            onBlur={() => handleBlur("fullName")}
          />
          <FieldError msg={err("fullName")} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Profession</label>
          <input
            value={v.profession ?? ""}
            placeholder="Software Developer"
            className={inputCls(false)}
            onChange={(e) => set("profession", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email Address</label>
          <input
            type="email"
            value={v.email ?? ""}
            placeholder="ada@example.com"
            className={inputCls(!!err("email"))}
            onChange={(e) => set("email", e.target.value)}
            onBlur={() => handleBlur("email")}
          />
          <FieldError msg={err("email")} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Phone Number</label>
          <input
            value={v.phone ?? ""}
            placeholder="+91 98765 43210"
            className={inputCls(!!err("phone"))}
            onChange={(e) => set("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
          />
          <FieldError msg={err("phone")} />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-sm font-medium text-foreground">Location</label>
          <input
            value={v.location ?? ""}
            placeholder="Bengaluru, India"
            className={inputCls(false)}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
      </div>

      {/* ── Custom Links ── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Custom Links</p>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-all rounded-md"
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
          <div
            key={link.id ?? `link-${idx}`}
            className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-start"
          >
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Label {idx + 1}</label>
              <input
                value={link.label}
                placeholder={idx === 0 ? "LinkedIn" : idx === 1 ? "GitHub" : "Portfolio"}
                className={inputCls(!!err(`links.${idx}.label`))}
                onChange={(e) => updateLink(link.id, "label", e.target.value)}
                onBlur={() => handleLinkBlur(idx, "label")}
              />
              <FieldError msg={err(`links.${idx}.label`)} />
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
                className={inputCls(!!err(`links.${idx}.url`))}
                onChange={(e) => updateLink(link.id, "url", e.target.value)}
                onBlur={() => handleLinkBlur(idx, "url")}
              />
              <FieldError msg={err(`links.${idx}.url`)} />
            </div>
            <button
              type="button"
              onClick={() => removeLink(link.id)}
              className="mt-6 flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-all shrink-0"
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
