"use client";
import { Fragment } from "react";
import NextImage from "next/image";
import { BulletLines, has, hasText } from "../_templates/shared";
import { DEFAULT_SECTION_ORDER } from "../_components/SectionOrderForm";

function getInitials(name) {
  if (!name?.trim()) return "?";
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Sidebar section label */
function SideLabel({ children }) {
  return (
    <div className="text-[0.71em] font-bold uppercase tracking-[0.14em] text-white/85 border-b border-white/30 pb-1 mb-2">
      {children}
    </div>
  );
}

/** Main area section label — uses accent CSS var for color + border */
function MainLabel({ children }) {
  return (
    <div
      className="text-[0.76em] font-bold uppercase tracking-[0.12em] pb-[3px] mb-2 border-b-2"
      style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
    >
      {children}
    </div>
  );
}

export function PhotoTemplate({ data }) {
  const pi    = data.personalInfo ?? {};
  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;

  // ── Sidebar contact items with clickable hrefs ──────────────────────────
  const contactItems = [];
  if (pi.email?.trim())
    contactItems.push({ text: pi.email.trim(), href: `mailto:${pi.email.trim()}` });
  if (pi.phone?.trim())
    contactItems.push({ text: pi.phone.trim(), href: `tel:${pi.phone.trim()}` });
  if (pi.location?.trim())
    contactItems.push({
      text: pi.location.trim(),
      href: `https://maps.google.com/?q=${encodeURIComponent(pi.location.trim())}`,
    });
  (Array.isArray(pi.links) ? pi.links : []).forEach(({ label, url }) => {
    if (label?.trim() && url?.trim())
      contactItems.push({
        text: label.trim(),
        href: /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`,
      });
  });

  // ── Main area sections ────────────────────────────────────────────────────
  const mainSections = {};

  if (hasText(data.professionalSummary)) {
    mainSections.summary = (
      <div className="break-inside-avoid mb-3">
        <MainLabel>Summary</MainLabel>
        <p className="text-[0.905em] text-[#444] leading-[1.45] text-justify">
          {data.professionalSummary}
        </p>
      </div>
    );
  }

  if (has(data.experience)) {
    mainSections.experience = (
      <div className="mb-3">
        <MainLabel>Experience</MainLabel>
        <div className="flex flex-col gap-2.5">
          {data.experience.map((e, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="flex justify-between items-baseline gap-2">
                <div>
                  <span className="font-semibold text-[#111]">{e.position}</span>
                  {e.company && (
                    <span className="text-[0.905em] text-[#666]"> · {e.company}</span>
                  )}
                </div>
                <div className="text-[0.79em] text-[#888] whitespace-nowrap shrink-0">
                  {e.startDate}
                  {(e.endDate || e.isCurrent)
                    ? ` – ${e.isCurrent ? "Present" : e.endDate}`
                    : ""}
                </div>
              </div>
              {hasText(e.description) && (
                <BulletLines text={e.description} className="mt-0.5 text-[#444]" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (has(data.education)) {
    mainSections.education = (
      <div className="mb-3">
        <MainLabel>Education</MainLabel>
        <div className="flex flex-col gap-1.5">
          {data.education.map((e, i) => (
            <div key={i} className="break-inside-avoid flex justify-between gap-2">
              <div>
                <div className="font-semibold text-[#111]">{e.institution}</div>
                <div className="text-[0.905em] text-[#666]">
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-[0.79em] whitespace-nowrap text-right shrink-0">
                <div className="text-[#888]">{e.graduationDate}</div>
                {e.gpa?.trim() && (
                  <div className="font-medium text-[#666] mt-0.5">
                    {e.gpa.includes("%") || e.gpa.toLowerCase().includes("gpa")
                      ? e.gpa.trim()
                      : `CGPA: ${e.gpa.trim()}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (has(data.projects)) {
    mainSections.projects = (
      <div className="mb-3">
        <MainLabel>Projects</MainLabel>
        <div className="flex flex-col gap-2">
          {data.projects.map((p, i) => (
            <div key={i} className="break-inside-avoid">
              <div>
                {p.link ? (
                  <a
                    href={p.link.startsWith("http") ? p.link : `https://${p.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#111] hover:underline"
                  >
                    {p.name}
                  </a>
                ) : (
                  <span className="font-semibold text-[#111]">{p.name}</span>
                )}
                {p.link && (
                  <a
                    href={p.link.startsWith("http") ? p.link : `https://${p.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 ml-1.5 text-[0.85em] font-normal text-blue-600 hover:underline"
                  >
                    Link ↗
                  </a>
                )}
                {p.type && (
                  <span className="text-[0.905em] text-[#888]"> · {p.type}</span>
                )}
              </div>
              {hasText(p.description) && (
                <BulletLines text={p.description} className="mt-0.5 text-[#444]" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Custom sections → main area
  (data.customSections ?? []).forEach((cs) => {
    if (!cs.name?.trim() || !cs.entries?.length) return;
    mainSections[cs.id] = (
      <div className="mb-3">
        <MainLabel>{cs.name}</MainLabel>
        <div className="flex flex-col gap-2">
          {cs.entries.map((entry) => (
            <div key={entry.id} className="break-inside-avoid flex justify-between gap-2">
              <div>
                <span className="font-semibold text-[#111]">{entry.title}</span>
                {entry.subtitle && (
                  <span className="text-[0.905em] text-[#888]"> · {entry.subtitle}</span>
                )}
                {hasText(entry.description) && (
                  <p className="text-[0.905em] text-[#555] mt-0.5">{entry.description}</p>
                )}
              </div>
              {entry.date && (
                <div className="text-[0.79em] text-[#888] whitespace-nowrap shrink-0">
                  {entry.date}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  });

  // Skills are in sidebar — exclude from main render
  const mainOrder = order.filter((k) => k !== "skills");

  return (
    /* -m-9 negates the 36px parent padding so sidebar bleeds to page edges */
    <div className="flex -m-9 min-h-[297mm]">

      {/* ══ SIDEBAR ══ */}
      <div
        className="w-[33%] shrink-0 p-7 px-4 text-white box-border"
        style={{ background: "var(--accent)" }}
      >
        {/* Photo */}
        <div className="text-center mb-3.5">
          {pi.photo ? (
            <NextImage
              src={pi.photo}
              alt={pi.fullName ?? "Profile"}
              width={96}
              height={96}
              unoptimized
              className="w-24 h-24 rounded-full object-cover block mx-auto border-[3px] border-white/35"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/[0.18] flex items-center justify-center mx-auto text-[1.75em] font-bold text-white/80">
              {getInitials(pi.fullName)}
            </div>
          )}
        </div>

        {/* Name + Profession */}
        {hasText(pi.fullName) && (
          <div className="text-center mb-[18px] pb-3.5 border-b border-white/25">
            <div className="text-[1.05em] font-bold leading-tight break-words text-white">
              {pi.fullName}
            </div>
            {hasText(pi.profession) && (
              <div className="text-[0.76em] text-white/90 mt-1.5 uppercase tracking-[0.1em]">
                {pi.profession}
              </div>
            )}
          </div>
        )}

        {/* Contact — clickable links */}
        {contactItems.length > 0 && (
          <div className="mb-4">
            <SideLabel>Contact</SideLabel>
            <div className="flex flex-col gap-1.5">
              {contactItems.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.79em] text-white/95 break-all leading-[1.4] no-underline hover:underline"
                >
                  {item.text}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {has(data.skills) && (
          <div>
            <SideLabel>Skills</SideLabel>
            <div className="flex flex-col gap-2">
              {data.skills.map((skill, i) => {
                const [cat, ...rest] = skill.split(":");
                const details = rest.join(":").trim();
                if (!details)
                  return (
                    <div key={i} className="text-[0.81em] text-white">
                      {skill}
                    </div>
                  );
                return (
                  <div key={i}>
                    <div className="text-[0.71em] text-white/75 uppercase tracking-[0.06em] mb-0.5">
                      {cat.trim()}
                    </div>
                    <div className="text-[0.81em] text-white">{details}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ MAIN AREA ══ */}
      <div className="flex-1 pt-7 pb-7 pr-6 pl-5 bg-white text-[#111] box-border overflow-hidden">
        {mainOrder.map((key) =>
          mainSections[key]
            ? <Fragment key={key}>{mainSections[key]}</Fragment>
            : null
        )}
      </div>
    </div>
  );
}
