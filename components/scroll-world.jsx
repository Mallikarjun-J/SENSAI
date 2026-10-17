"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    still: "/scroll-assets/still_overview.webp",
    clip: "/scroll-assets/dive_overview.mp4",
    accent: "#818CF8",
    eyebrow: "AI-POWERED CAREER COACH",
    title: "Your Personal AI Career Coach",
    body: "Get real-time industry insights, track market trends, and let AI guide every step of your career growth.",
    tags: ["50+ Industries", "Live Market Data", "Personalised to You"],
  },
  {
    id: "resume",
    label: "Resume",
    still: "/scroll-assets/still_resume.webp",
    clip: "/scroll-assets/dive_resume.mp4",
    accent: "#4F46E5",
    eyebrow: "RESUME BUILDER & ANALYSER",
    title: "Build, Import & Analyse Your Resume",
    body: "Create ATS-ready resumes with 3 templates, import and AI-parse existing PDFs, and get instant analysis to improve your chances.",
    tags: ["3 Templates", "PDF Import & Analysis", "ATS-Optimised"],
  },
  {
    id: "interview",
    label: "Interview",
    still: "/scroll-assets/still_interview.webp",
    clip: "/scroll-assets/dive_interview.mp4",
    accent: "#818CF8",
    eyebrow: "INTERVIEW PREP",
    title: "Practise Until You Ace It",
    body: "Industry-specific MCQ quizzes with performance tracking, plus AI-powered voice mock interviews with instant feedback.",
    tags: ["Quiz Practice", "Voice Interview", "Performance Charts"],
  },
  {
    id: "coverletter",
    label: "Cover Letter",
    still: "/scroll-assets/still_coverletter.webp",
    clip: "/scroll-assets/dive_coverletter.mp4",
    accent: "#38bdf8",
    eyebrow: "AI COVER LETTERS",
    title: "Write Tailored Letters in Seconds",
    body: "Describe the role, let AI craft a compelling cover letter matched to the job — saved and ready whenever you need it.",
    tags: ["AI-Generated", "Job-Specific", "Saved to Dashboard"],
  },
  {
    id: "roadmap",
    label: "Roadmap",
    still: "/scroll-assets/still_roadmap.webp",
    clip: "/scroll-assets/dive_roadmap.mp4",
    accent: "#f59e0b",
    eyebrow: "CAREER ROADMAP",
    title: "See Exactly How to Get There",
    body: "Tell AI your career goal and get a visual, step-by-step roadmap with milestones, skills, and timelines built just for you.",
    tags: ["AI-Generated", "Visual Roadmap", "Goal-Based"],
  },
  {
    id: "success",
    label: "Get Started",
    still: "/scroll-assets/still_success.webp",
    clip: "/scroll-assets/dive_success.mp4",
    accent: "#f59e0b",
    eyebrow: "YOUR CAREER STARTS HERE",
    title: "Land the Job You Deserve",
    body: "Resume builder, interview prep, cover letters, and career roadmaps — everything you need, all in one place.",
    tags: ["Free to Start", "All-in-One", "AI-Powered"],
    cta: {
      primary: { label: "Get Started Free", href: "/sign-up" },
      secondary: { label: "Sign In", href: "/sign-in" },
    },
  },
];

// ─── GSAP helpers ─────────────────────────────────────────────────────────────

/** Kill any existing timeline stored on an element to prevent double-runs */
function killStored(el, key) {
  if (el?._gsapTl?.[key]) {
    el._gsapTl[key].kill();
  }
}

/** Animate the topbar brand + auth buttons once on initial mount */
function animateTopbar(root) {
  const brand = root.querySelector(".sw-brand");
  const authBtns = root.querySelectorAll(".sw-btn");
  const navItems = root.querySelectorAll(".sw-nav__item");

  if (!brand) return;

  const ctx = gsap.context(() => {
    const tl = gsap.timeline({ delay: 0.1 });

    // Logo fades down from above
    tl.from(brand, {
      y: -18,
      opacity: 0,
      duration: 0.55,
      ease: "power3.out",
    });

    // Auth buttons stagger in from the right
    if (authBtns.length) {
      tl.from(
        authBtns,
        {
          x: 16,
          opacity: 0,
          stagger: 0.08,
          duration: 0.45,
          ease: "power2.out",
        },
        "-=0.3"
      );
    }

    // Nav items stagger in from top
    if (navItems.length) {
      tl.from(
        navItems,
        {
          y: -10,
          opacity: 0,
          stagger: 0.06,
          duration: 0.4,
          ease: "power2.out",
        },
        "-=0.35"
      );
    }
  }, root);

  return ctx;
}

/** Animate a single .sw-copy block (one section's text panel).
 *
 *  Uses fromTo() not from() — this prevents the "flash" where from() instantly
 *  sets opacity:0 on children while the engine is simultaneously fading the
 *  parent .sw-copy in, creating a visible snap.
 */
function animateCopyBlock(copyEl) {
  if (!copyEl) return;

  if (copyEl._swTl) {
    copyEl._swTl.kill();
    copyEl._swTl = null;
  }

  const eyebrow = copyEl.querySelector(".sw-copy__eyebrow");
  const titleEl  = copyEl.querySelector(".sw-copy__title");
  const body     = copyEl.querySelector(".sw-copy__body");
  const tags     = copyEl.querySelectorAll(".sw-copy__tags li");
  const cta      = copyEl.querySelectorAll(".sw-copy__cta .sw-btn");

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // Eyebrow: slide in from left
  if (eyebrow) {
    tl.fromTo(
      eyebrow,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.42 }
    );
  }

  // Title: SplitText word-by-word reveal with subtle 3-D rotation
  if (titleEl) {
    if (!titleEl.getAttribute("aria-label")) {
      titleEl.setAttribute("aria-label", titleEl.textContent);
    }

    let split;
    try {
      split = new SplitText(titleEl, { type: "words" });
      tl.fromTo(
        split.words,
        { y: 28, opacity: 0, rotateX: -15, transformOrigin: "0% 50% -40px" },
        { y: 0,  opacity: 1, rotateX: 0,   stagger: 0.055, duration: 0.52 },
        eyebrow ? "-=0.18" : ">"
      );
      // Revert split so the DOM stays clean for the engine's own text handling
      tl.call(() => { try { split?.revert(); } catch (_) {} });
    } catch (_) {
      // SplitText unavailable — simple fade-up fallback
      tl.fromTo(
        titleEl,
        { y: 18, opacity: 0 },
        { y: 0,  opacity: 1, duration: 0.48 },
        ">"
      );
    }
  }

  // Body: fade up
  if (body) {
    tl.fromTo(
      body,
      { y: 14, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.42 },
      "-=0.22"
    );
  }

  // Tags: staggered spring pop-in
  if (tags.length) {
    tl.fromTo(
      tags,
      { scale: 0.74, opacity: 0 },
      { scale: 1,    opacity: 1, stagger: 0.06, duration: 0.36, ease: "back.out(1.7)" },
      "-=0.18"
    );
  }

  // CTA buttons: scale + fade
  if (cta.length) {
    tl.fromTo(
      cta,
      { scale: 0.88, opacity: 0 },
      { scale: 1,    opacity: 1, stagger: 0.08, duration: 0.32 },
      "-=0.14"
    );
  }

  copyEl._swTl = tl;
  return tl;
}

/** Watch the engine's nav for `.is-active` class changes to detect section switches.
 *
 *  Why NOT the old accent approach:
 *  - `.sw-copy` blocks don't have `--sw-accent` set inline, so accent matching
 *    always fails — zero GSAP animations ever fired.
 *  - Two sections share the same accent (#818CF8), so accent matching would
 *    double-animate them anyway.
 *
 *  The engine toggles `is-active` on `.sw-nav__item[k]` exactly once per
 *  section change — clean, index-based, zero noise.
 */
function setupSectionObserver(root) {
  let lastIndex = -1;
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    const navItems = root.querySelectorAll(".sw-nav__item");
    let activeIndex = -1;
    navItems.forEach((item, i) => {
      if (item.classList.contains("is-active")) activeIndex = i;
    });

    if (activeIndex === -1 || activeIndex === lastIndex) return;
    lastIndex = activeIndex;

    clearTimeout(debounceTimer);
    // 200 ms delay: crossfade is already underway before GSAP fires,
    // so text reveals layer on top of a smooth dissolve (not a snap).
    debounceTimer = setTimeout(() => {
      const copies = root.querySelectorAll(".sw-copy");
      if (copies[activeIndex]) {
        animateCopyBlock(copies[activeIndex]);
      }
    }, 200);
  });

  // Watch the nav subtree for class changes only — not style, not whole doc.
  // The engine only touches .sw-nav__item classList once per section change.
  const navEl = root.querySelector(".sw-nav");
  if (navEl) {
    observer.observe(navEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  return observer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScrollWorld() {
  const worldRef = useRef(null);
  const [splashDone, setSplashDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // ── Splash: show for 1.1 s then fade out ────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1100);
    return () => clearTimeout(t);
  }, []);

  // ── Show hint after splash exits ────────────────────────────────────────
  useEffect(() => {
    if (!splashDone) return;
    const t = setTimeout(() => setShowHint(true), 600);
    return () => clearTimeout(t);
  }, [splashDone]);

  // ── Engine mount + GSAP ─────────────────────────────────────────────────
  useEffect(() => {
    if (!splashDone) return; // wait for splash to finish before mounting engine

    const siteHeader = document.querySelector("header");
    const siteFooter = document.querySelector("footer");
    if (siteHeader) siteHeader.style.display = "none";
    if (siteFooter) siteFooter.style.display = "none";

    let mountedInThisEffect = false;
    let gsapCtx = null;
    let observer = null;

    function mountEngine() {
      if (mountedInThisEffect || !worldRef.current || !window.mountLetsScroll)
        return;
      mountedInThisEffect = true;

      window.mountLetsScroll(worldRef.current, {
        brand: { name: "Sens-AI", href: "#" },
        hint: "scroll to explore",
        diveScroll: 1.4,
        // Increase crossfade from the default 0.12 (too narrow = sections
        // snap in/out abruptly). 0.55 gives a wide, smooth dissolve zone
        // between each scene — the single biggest fix for the "flick".
        crossfade: 0.55,
        nav: true,
        atmosphere: true,
        sections: SECTIONS,
        connectors: [],
      });

      // ── Brand logo ────────────────────────────────────────────────────
      const brandEl = worldRef.current.querySelector(".sw-brand");
      if (brandEl) {
        brandEl.style.cssText = "background:none;border:none;padding:0;";
        brandEl.innerHTML = "";
        const img = document.createElement("img");
        img.src = "/logo.png";
        img.alt = "Sens-AI";
        img.style.cssText =
          "height:40px;width:auto;object-fit:contain;display:block;" +
          "filter:drop-shadow(0 1px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 10px rgba(0,0,0,0.6));";
        brandEl.appendChild(img);
      }

      // ── Topbar restructure ────────────────────────────────────────────
      const topbar = worldRef.current.querySelector(".sw-topbar");
      const navEl = worldRef.current.querySelector(".sw-nav");
      const topcta = worldRef.current.querySelector(".sw-topcta");

      if (topbar && brandEl && navEl) {
        const authGroup = document.createElement("div");
        authGroup.style.cssText =
          "display:flex;gap:4px;align-items:center;flex-shrink:0;" +
          "padding:5px;background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);" +
          "-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.12);border-radius:999px;";

        const signIn = document.createElement("a");
        signIn.href = "/sign-in";
        signIn.textContent = "Sign In";
        signIn.className = "sw-btn sw-btn--ghost";
        signIn.style.cssText = "padding:8px 18px;font-size:0.88rem;";

        const signUp = document.createElement("a");
        signUp.href = "/sign-up";
        signUp.textContent = "Sign Up";
        signUp.className = "sw-btn sw-btn--primary";
        signUp.style.cssText = "padding:8px 18px;font-size:0.88rem;";

        authGroup.appendChild(signIn);
        authGroup.appendChild(signUp);
        if (topcta) topcta.remove();

        const row1 = document.createElement("div");
        row1.style.cssText =
          "display:flex;width:100%;justify-content:space-between;align-items:center;";
        row1.appendChild(brandEl);
        row1.appendChild(authGroup);

        const row2 = document.createElement("div");
        row2.className = "sw-topbar__row2";
        row2.style.cssText =
          "display:flex;width:100%;justify-content:flex-end;padding-top:8px;";
        row2.appendChild(navEl);

        topbar.innerHTML = "";
        topbar.style.flexDirection = "column";
        topbar.style.alignItems = "stretch";
        topbar.appendChild(row1);
        topbar.appendChild(row2);
      }

      // ── Injected CSS fixes ────────────────────────────────────────────
      const fixStyle = document.createElement("style");
      fixStyle.id = "sw-fix";
      fixStyle.textContent = `
        /* ── Base / Desktop styling ──────────────────────────────────── */
        .sw-copy {
          top: 42% !important;
        }
        .sw-copy__title {
          font-size: clamp(1.8rem, 3.8vw, 3rem) !important;
          line-height: 1.08 !important;
          margin-top: 8px !important;
          text-shadow: 0 2px 20px rgba(0,0,0,0.8) !important;
        }
        .sw-copy__body {
          margin-top: 12px !important;
          text-shadow: 0 1px 12px rgba(0,0,0,0.85) !important;
        }
        .sw-copy__tags {
          margin-top: 18px !important;
        }
        .sw-copy__cta {
          margin-top: 22px !important;
        }
        /* Dark theme: primary button */
        .sw-btn--primary {
          background: var(--sw-accent) !important;
          color: #fff !important;
          transition: filter 0.2s ease, transform 0.18s ease !important;
        }
        .sw-btn--primary:hover {
          filter: brightness(1.18) !important;
          transform: scale(1.04) !important;
        }
        .sw-btn--primary:active { transform: scale(0.97) !important; }
        /* Ghost button */
        .sw-btn--ghost {
          color: var(--sw-ink) !important;
          border: 1.5px solid rgba(240,244,255,0.45) !important;
          transition: background 0.2s ease, transform 0.18s ease !important;
        }
        .sw-btn--ghost:hover {
          background: rgba(240,244,255,0.08) !important;
          transform: scale(1.03) !important;
        }
        .sw-btn--ghost:active { transform: scale(0.97) !important; }
        /* Nav */
        .sw-nav {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .sw-nav__item {
          color: rgba(240,244,255,0.7) !important;
          transition: color 0.2s ease !important;
        }
        .sw-nav__item:hover, .sw-nav__item.is-active { color: #fff !important; }
        .sw-topcta { background: var(--sw-accent) !important; color: #fff !important; }
        .sw-route__label {
          background: rgba(13,15,20,0.88) !important;
          color: #f0f4ff !important;
          border-color: rgba(255,255,255,0.15) !important;
          backdrop-filter: blur(8px) !important;
        }
        /* hide engine default hint — we render ours in React */
        .sw-hint { display: none !important; }

        /* ── Tablet portrait (≤ 768px) ─────────────────────────────── */
        @media (max-width: 768px) {
          .sw-topbar__row2 { display: none !important; }
          .sw-route { right: 8px !important; opacity: 0.5 !important; }
          .sw-route__label { display: none !important; }
          .sw-copylayer::before {
            width: 100% !important;
            height: 65% !important;
            top: auto !important;
            bottom: 0 !important;
            background: linear-gradient(
              0deg,
              rgba(13, 15, 20, 0.95) 0%,
              rgba(13, 15, 20, 0.72) 48%,
              rgba(13, 15, 20, 0.25) 78%,
              transparent 100%
            ) !important;
          }
          .sw-copy {
            top: 42% !important;
            left: 24px !important;
            right: 32px !important;
            max-width: calc(100vw - 56px) !important;
            width: auto !important;
            box-sizing: border-box !important;
          }
          .sw-copy__title {
            font-size: clamp(1.55rem, 5.5vw, 2.3rem) !important;
            line-height: 1.15 !important;
          }
        }

        /* ── Mobile portrait (≤ 480px) ─────────────────────────────── */
        @media (max-width: 480px) {
          .sw-topbar { padding: 10px 14px !important; }
          .sw-topbar__row2 { display: none !important; }
          .sw-route {
            right: 6px !important;
            opacity: 0.45 !important;
            gap: 14px !important;
          }
          .sw-route__dot { width: 18px !important; height: 18px !important; }
          .sw-route__label { display: none !important; }
          .sw-copylayer::before {
            width: 100% !important;
            height: 68% !important;
            top: auto !important;
            bottom: 0 !important;
            background: linear-gradient(
              0deg,
              rgba(13, 15, 20, 0.96) 0%,
              rgba(13, 15, 20, 0.76) 52%,
              rgba(13, 15, 20, 0.3) 80%,
              transparent 100%
            ) !important;
          }
          .sw-copy {
            top: 42% !important;
            left: 18px !important;
            right: 28px !important;
            max-width: calc(100vw - 46px) !important;
            width: auto !important;
            box-sizing: border-box !important;
          }
          .sw-copy__num {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important;
            font-size: 0.72rem !important;
            letter-spacing: 0.12em !important;
            color: rgba(240, 244, 255, 0.5) !important;
            display: inline-block !important;
            margin-bottom: 4px !important;
          }
          .sw-copy__eyebrow {
            font-size: 0.68rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.15em !important;
            text-transform: uppercase !important;
            color: var(--sw-accent, #60a5fa) !important;
            margin: 2px 0 6px !important;
            display: block !important;
          }
          .sw-copy__title {
            font-size: clamp(1.4rem, 6.4vw, 1.85rem) !important;
            font-weight: 800 !important;
            line-height: 1.18 !important;
            letter-spacing: -0.02em !important;
            color: #ffffff !important;
            margin: 0 0 8px !important;
            text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 4px 28px rgba(0, 0, 0, 0.6) !important;
          }
          .sw-copy__body {
            font-size: 0.84rem !important;
            line-height: 1.54 !important;
            color: rgba(226, 232, 240, 0.9) !important;
            margin: 0 0 12px !important;
            max-width: 36ch !important;
            text-shadow: 0 1px 10px rgba(0, 0, 0, 0.95) !important;
          }
          .sw-copy__tags {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 7px !important;
            margin: 10px 0 0 !important;
            padding: 0 !important;
            list-style: none !important;
          }
          .sw-copy__tags li {
            font-size: 0.72rem !important;
            font-weight: 600 !important;
            padding: 5px 13px !important;
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.92) !important;
            color: #0f172a !important;
            border: 1px solid rgba(255, 255, 255, 0.35) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45) !important;
            white-space: nowrap !important;
          }
          .sw-copy__cta {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 10px !important;
            margin-top: 16px !important;
          }
          .sw-copy__cta .sw-btn--primary {
            background: #3b82f6 !important;
            color: #ffffff !important;
            padding: 9px 20px !important;
            font-size: 0.84rem !important;
            font-weight: 600 !important;
            border-radius: 999px !important;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.45) !important;
          }
          .sw-copy__cta .sw-btn--ghost {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            border: 1.5px solid rgba(255, 255, 255, 0.35) !important;
            padding: 9px 20px !important;
            font-size: 0.84rem !important;
            font-weight: 600 !important;
            border-radius: 999px !important;
            backdrop-filter: blur(8px) !important;
          }
          .sw-btn--ghost,
          .sw-btn--primary {
            padding: 6px 14px !important;
            font-size: 0.8rem !important;
          }
        }

        /* ── Very small phones (≤ 360px) ───────────────────────────── */
        @media (max-width: 360px) {
          .sw-copy { top: 40% !important; left: 14px !important; right: 24px !important; }
          .sw-copy__title { font-size: clamp(1.22rem, 7.8vw, 1.55rem) !important; }
          .sw-copy__body { font-size: 0.78rem !important; }
          .sw-btn--ghost,
          .sw-btn--primary {
            padding: 5px 11px !important;
            font-size: 0.74rem !important;
          }
        }
      `;
      document.head.appendChild(fixStyle);

      // ── GSAP: topbar entrance + initial section animation ────────────
      // 80 ms delay so the engine finishes painting nav items
      let zRafId = null;
      setTimeout(() => {
        gsapCtx = animateTopbar(worldRef.current);
        // Animate the first copy block (section 0) immediately
        const firstCopy = worldRef.current.querySelector(".sw-copy");
        if (firstCopy) {
          requestAnimationFrame(() => animateCopyBlock(firstCopy));
        }
        // Set up section-change observer AFTER nav items exist
        observer = setupSectionObserver(worldRef.current);

        // ── Z-index flick fix ────────────────────────────────────────────
        // The engine sets scene.style.zIndex = 120 the instant the active
        // segment index (ci) changes — a hard snap that makes the new scene
        // suddenly appear on top mid-crossfade. We correct every frame so
        // z-index always reflects actual opacity (highest opacity = on top).
        const stage = worldRef.current.querySelector(".sw-stage");
        function fixZIndex() {
          if (stage) {
            const scenes = stage.querySelectorAll(".sw-scene");
            scenes.forEach((scene) => {
              const op = parseFloat(scene.style.opacity) || 0;
              // Map opacity 0→1 to z-index 100→119, so the most-visible
              // scene is always on top with NO sudden snap.
              scene.style.zIndex = String(100 + Math.round(op * 19));
            });
          }
          zRafId = requestAnimationFrame(fixZIndex);
        }
        zRafId = requestAnimationFrame(fixZIndex);
      }, 80);

      // Store cancel handle on the root for cleanup
      worldRef.current._zRafCleanup = () => {
        if (zRafId !== null) cancelAnimationFrame(zRafId);
      };
    }

    // ── Load / attach engine script ───────────────────────────────────────
    const staleStyle = document.getElementById("sw-css");
    if (staleStyle) staleStyle.remove();

    const existing = document.getElementById("lets-scroll-engine");
    if (existing) {
      if (window.mountLetsScroll) mountEngine();
    } else {
      const script = document.createElement("script");
      script.id = "lets-scroll-engine";
      script.src = "/lets-scroll.js";
      script.onload = mountEngine;
      document.head.appendChild(script);
    }

    return () => {
      // Restore layout
      if (siteHeader) siteHeader.style.display = "";
      if (siteFooter) siteFooter.style.display = "";

      // Kill GSAP context (cleans up all tweens scoped to root)
      gsapCtx?.revert();

      // Stop observer
      observer?.disconnect();

      // Stop z-index corrector rAF loop
      worldRef.current?._zRafCleanup?.();

      // Remove injected styles
      document.getElementById("sw-css")?.remove();
      document.getElementById("sw-fix")?.remove();

      // Reset bg the engine injected
      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
    };
  }, [splashDone]); // only mount engine after splash

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Framer Motion: Intro Splash ─────────────────────────────────── */}
      <AnimatePresence>
        {!splashDone && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "#0d0f14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Logo mark */}
            <motion.img
              src="/logo.png"
              alt="SensAI"
              initial={{ opacity: 0, y: 14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
              style={{ height: 64, width: "auto", objectFit: "contain" }}
            />

            {/* Subtle loading bar */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut", delay: 0.2 }}
              style={{
                width: 120,
                height: 2,
                background:
                  "linear-gradient(90deg, #4F46E5, #818CF8, #38bdf8)",
                borderRadius: 999,
                transformOrigin: "left center",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Framer Motion: "Scroll to explore" hint ─────────────────────── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: "fixed",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              pointerEvents: "none",
            }}
          >
            <motion.span
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(240,244,255,0.5)",
                fontWeight: 500,
              }}
            >
              scroll to explore
            </motion.span>
            {/* Bouncing chevron */}
            <motion.svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(240,244,255,0.45)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.7, ease: "easeInOut" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scroll engine mount point ────────────────────────────────────── */}
      <div
        ref={worldRef}
        style={{
          "--sw-bg": "#0d0f14",
          "--sw-ink": "#f0f4ff",
          "--sw-ink-soft": "#94a3b8",
          "--sw-accent": "#60a5fa",
        }}
      />
    </>
  );
}
