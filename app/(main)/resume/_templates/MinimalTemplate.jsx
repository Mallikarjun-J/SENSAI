"use client";
import { Fragment } from "react";
import { BulletLines, ContactLine, has, hasText } from "../_templates/shared";
import { DEFAULT_SECTION_ORDER } from "../_components/SectionOrderForm";

/** Minimal section header — thin left accent bar + small muted caps label */
function MinSection({ label, children }) {
  return (
    <section className="break-inside-avoid mt-4 first:mt-0">
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-[3px] h-3.5 rounded-sm shrink-0"
          style={{ backgroundColor: "var(--accent)" }}
        />
        <span className="text-[0.91em] font-semibold uppercase tracking-[0.18em] text-black">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

export function MinimalTemplate({ data }) {
  const pi = data.personalInfo ?? {};
  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;

  const customMap = {};
  (data.customSections ?? []).forEach((cs) => {
    if (!cs.name?.trim() || !cs.entries?.length) return;
    customMap[cs.id] = (
      <MinSection label={cs.name} key={cs.id}>
        <div className="space-y-2">
          {cs.entries.map((entry) => (
            <div
              key={entry.id}
              className="break-inside-avoid grid grid-cols-[1fr_auto] gap-4"
            >
              <div>
                <div className="font-semibold text-gray-900">{entry.title}</div>
                {entry.subtitle && (
                  <div className="text-[0.905em] text-gray-500">{entry.subtitle}</div>
                )}
                {hasText(entry.description) && (
                  <p className="text-[0.905em] text-gray-600 mt-0.5">{entry.description}</p>
                )}
              </div>
              {entry.date && (
                <div className="text-[0.81em] text-gray-400 whitespace-nowrap text-right">
                  {entry.date}
                </div>
              )}
            </div>
          ))}
        </div>
      </MinSection>
    );
  });

  const sections = {
    summary: hasText(data.professionalSummary) ? (
      <MinSection label="About">
        <p className="text-[0.952em] text-gray-600 leading-relaxed">
          {data.professionalSummary}
        </p>
      </MinSection>
    ) : null,

    experience: has(data.experience) ? (
      <MinSection label="Experience">
        <div className="space-y-3">
          {data.experience.map((e, i) => (
            <div
              key={i}
              className="break-inside-avoid grid grid-cols-[1fr_auto] gap-4"
            >
              <div>
                <div className="font-semibold text-gray-900">{e.position}</div>
                <div className="text-[0.905em] text-gray-500">{e.company}</div>
                {hasText(e.description) && (
                  <BulletLines
                    text={e.description}
                    className="mt-1 text-gray-600 text-[0.952em]"
                  />
                )}
              </div>
              <div className="text-[0.81em] text-gray-400 whitespace-nowrap text-right shrink-0">
                {e.startDate}
                {(e.endDate || e.isCurrent)
                  ? ` – ${e.isCurrent ? "Present" : e.endDate}`
                  : ""}
              </div>
            </div>
          ))}
        </div>
      </MinSection>
    ) : null,

    education: has(data.education) ? (
      <MinSection label="Education">
        <div className="space-y-2">
          {data.education.map((e, i) => (
            <div
              key={i}
              className="break-inside-avoid grid grid-cols-[1fr_auto] gap-4"
            >
              <div>
                <div className="font-semibold text-gray-900">{e.institution}</div>
                <div className="text-[0.905em] text-gray-500">
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-[0.81em] whitespace-nowrap text-right shrink-0">
                <div className="text-gray-400">{e.graduationDate}</div>
                {e.gpa?.trim() && (
                  <div className="text-gray-500 font-medium mt-0.5">
                    {e.gpa.includes("%") || e.gpa.toLowerCase().includes("gpa")
                      ? e.gpa.trim()
                      : `CGPA: ${e.gpa.trim()}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </MinSection>
    ) : null,

    projects: has(data.projects) ? (
      <MinSection label="Projects">
        <div className="space-y-2">
          {data.projects.map((p, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="font-semibold text-gray-900">
                {p.link ? (
                  <a
                    href={p.link.startsWith("http") ? p.link : `https://${p.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-900 transition-colors"
                  >
                    {p.name}
                  </a>
                ) : (
                  p.name
                )}
                {p.link && (
                  <a
                    href={p.link.startsWith("http") ? p.link : `https://${p.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.85em] font-normal text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1.5"
                  >
                    <span>Link</span>
                    <span className="text-[0.85em]">↗</span>
                  </a>
                )}
                {p.type && (
                  <span className="font-normal text-gray-400 text-[0.905em]">
                    {" "}/ {p.type}
                  </span>
                )}
              </div>
              {hasText(p.description) && (
                <BulletLines
                  text={p.description}
                  className="mt-0.5 text-gray-600 text-[0.952em]"
                />
              )}
            </div>
          ))}
        </div>
      </MinSection>
    ) : null,

    skills: has(data.skills) ? (
      <MinSection label="Skills">
        <div className="space-y-1 text-[0.905em]">
          {data.skills.map((skill, i) => {
            const [category, ...rest] = skill.split(":");
            const details = rest.join(":").trim();
            if (!details) return <div key={i} className="text-gray-700">{skill}</div>;
            return (
              <div key={i} className="flex gap-1">
                <span className="text-black font-semibold uppercase tracking-wide text-[0.88em] shrink-0 pt-px">
                  {category.trim()}
                </span>
                <span className="text-gray-400 shrink-0">—</span>
                <span className="text-gray-900">{details}</span>
              </div>
            );
          })}
        </div>
      </MinSection>
    ) : null,

    ...customMap,
  };

  return (
    <div className="text-gray-900">
      {/* ── Left-aligned ultra-clean header ── */}
      {(hasText(pi.fullName) || hasText(pi.profession)) && (
        <header className="mb-4 pb-3 border-b border-gray-200">
          <h1 className="text-[2.38em] font-light tracking-tight leading-none text-gray-900">
            {pi.fullName}
          </h1>
          {hasText(pi.profession) && (
            <div
              className="text-[0.76em] uppercase tracking-[0.18em] mt-1.5 font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {pi.profession}
            </div>
          )}
          <div className="mt-1.5 text-[0.81em] text-black">
            <ContactLine pi={pi} />
          </div>
        </header>
      )}

      {order.map((key) =>
        sections[key]
          ? <Fragment key={key}>{sections[key]}</Fragment>
          : null
      )}
    </div>
  );
}
