"use client";
import { useEffect, useRef } from "react";

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


export default function ScrollWorld() {
  const worldRef = useRef(null);

  useEffect(() => {
    // Hide SensAI header and footer — the scroll world has its own nav
    const siteHeader = document.querySelector("header");
    const siteFooter = document.querySelector("footer");
    if (siteHeader) siteHeader.style.display = "none";
    if (siteFooter) siteFooter.style.display = "none";

    let mountedInThisEffect = false;

    function mountEngine() {
      if (mountedInThisEffect || !worldRef.current || !window.mountLetsScroll) return;
      mountedInThisEffect = true;
      window.mountLetsScroll(worldRef.current, {
        brand: { name: "Sens-AI", href: "#" },
        hint: "scroll to explore",
        diveScroll: 1.4,
        nav: true,
        atmosphere: true,
        sections: SECTIONS,
        connectors: [], // no connectors — sections crossfade directly
      });

      // Replace the engine's default brand mark + text with the actual /logo.png
      const brandEl = worldRef.current.querySelector(".sw-brand");
      if (brandEl) {
        brandEl.style.cssText = "background:none;border:none;padding:0;";
        brandEl.innerHTML = "";
        const img = document.createElement("img");
        img.src = "/logo.png";
        img.alt = "Sens-AI";
        // drop-shadow traces the actual logo pixels — no bounding box, readable on any bg
        img.style.cssText =
          "height:40px;width:auto;object-fit:contain;display:block;" +
          "filter:drop-shadow(0 1px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 10px rgba(0,0,0,0.6));";
        brandEl.appendChild(img);
      }

      // ── Restructure topbar into two rows ──────────────────────────────
      const topbar = worldRef.current.querySelector(".sw-topbar");
      const navEl  = worldRef.current.querySelector(".sw-nav");
      const topcta = worldRef.current.querySelector(".sw-topcta");

      if (topbar && brandEl && navEl) {
        // Build auth button group (replaces topcta)
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

        // Row 1: logo left, auth right
        const row1 = document.createElement("div");
        row1.style.cssText = "display:flex;width:100%;justify-content:space-between;align-items:center;";
        row1.appendChild(brandEl); // move brand into row1
        row1.appendChild(authGroup);

        // Row 2: nav right-aligned
        const row2 = document.createElement("div");
        row2.style.cssText = "display:flex;width:100%;justify-content:flex-end;padding-top:8px;";
        row2.appendChild(navEl); // move nav into row2

        // Clear topbar and rebuild
        topbar.innerHTML = "";
        topbar.style.flexDirection = "column";
        topbar.style.alignItems = "stretch";
        topbar.appendChild(row1);
        topbar.appendChild(row2);
      }

      // Fix: push copy block up so CTA buttons are always visible, even on short viewports
      const fixStyle = document.createElement("style");
      fixStyle.id = "sw-fix";
      fixStyle.textContent = `
        .sw-copy {
          top: 38% !important;
        }
        .sw-copy__title {
          font-size: clamp(1.7rem, 3.8vw, 3rem) !important;
          line-height: 1.08 !important;
          margin-top: 8px !important;
        }
        .sw-copy__body {
          margin-top: 12px !important;
        }
        .sw-copy__tags {
          margin-top: 16px !important;
        }
        .sw-copy__cta {
          margin-top: 20px !important;
        }
        /* Dark theme: primary button — accent blue bg, white text */
        .sw-btn--primary {
          background: var(--sw-accent) !important;
          color: #fff !important;
        }
        .sw-btn--primary:hover {
          filter: brightness(1.15);
        }
        /* Dark theme: ghost button — visible white border + light text */
        .sw-btn--ghost {
          color: var(--sw-ink) !important;
          border: 1.5px solid rgba(240,244,255,0.45) !important;
        }
        .sw-btn--ghost:hover {
          background: rgba(240,244,255,0.08) !important;
        }
        /* Nav items more visible on dark bg */
        .sw-nav {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .sw-nav__item {
          color: rgba(240,244,255,0.7) !important;
        }
        .sw-nav__item:hover, .sw-nav__item.is-active {
          color: #fff !important;
        }
        /* Top CTA button (Get Started in topbar) */
        .sw-topcta {
          background: var(--sw-accent) !important;
          color: #fff !important;
        }
        /* Right-side route dot labels — dark bg for dark theme */
        .sw-route__label {
          background: rgba(13,15,20,0.88) !important;
          color: #f0f4ff !important;
          border-color: rgba(255,255,255,0.15) !important;
          backdrop-filter: blur(8px) !important;
        }
      `;
      document.head.appendChild(fixStyle);

    }

    // Remove any stale injected engine CSS from a previous mount
    const staleStyle = document.getElementById("sw-css");
    if (staleStyle) staleStyle.remove();

    // If the script is already present (hot-reload / strict-mode remount), just mount
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
      // Restore header/footer when navigating away
      if (siteHeader) siteHeader.style.display = "";
      if (siteFooter) siteFooter.style.display = "";
      // Remove engine CSS so it doesn't bleed into other pages
      const engineStyle = document.getElementById("sw-css");
      if (engineStyle) engineStyle.remove();
      const fixStyle = document.getElementById("sw-fix");
      if (fixStyle) fixStyle.remove();
      // Reset body/html background the engine injected
      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
    };
  }, []);

  return (
    <div
      ref={worldRef}
      style={{
        "--sw-bg": "#0d0f14",       // near-black — vignette blends into dark videos
        "--sw-ink": "#f0f4ff",      // near-white text
        "--sw-ink-soft": "#94a3b8", // muted blue-gray
        "--sw-accent": "#60a5fa",   // bright blue — matches the glowing AI in videos
      }}
    />
  );
}

