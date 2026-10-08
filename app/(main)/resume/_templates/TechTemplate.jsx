"use client";
import { Fragment } from "react";
import { BulletLines, ContactLine, has, hasText } from "../_templates/shared";
import { DEFAULT_SECTION_ORDER } from "../_components/SectionOrderForm";

/** Tech section header — clean uppercase label colored with accent, tight margins */
function TechSection({ label, children }) {
  return (
    <section className="break-inside-avoid mt-3 first:mt-1">
      <h2
        className="text-[0.88em] font-bold uppercase tracking-[0.08em] mb-1.5"
        style={{ color: "var(--accent, #2563eb)" }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

export function TechTemplate({ data }) {
  const pi = data.personalInfo ?? {};
  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;

  const customMap = {};
  (data.customSections ?? []).forEach((cs) => {
    if (!cs.name?.trim() || !cs.entries?.length) return;
    customMap[cs.id] = (
      <TechSection label={cs.name} key={cs.id}>
        <div className="space-y-2">
          {cs.entries.map((entry) => (
            <div key={entry.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-[0.952em]">
                  <span className="font-bold text-gray-950">{entry.title}</span>
                  {entry.subtitle && (
                    <span className="text-gray-700"> — {entry.subtitle}</span>
                  )}
                </div>
                {entry.date && (
                  <div className="text-[0.81em] text-gray-500 whitespace-nowrap shrink-0">
                    {entry.date}
                  </div>
                )}
              </div>
              {hasText(entry.description) && (
                <p className="text-[0.905em] text-gray-800 mt-0.5">{entry.description}</p>
              )}
            </div>
          ))}
        </div>
      </TechSection>
    );
  });

  const sections = {
    summary: hasText(data.professionalSummary) ? (
      <TechSection label="Summary">
        <p className="text-[0.905em] text-gray-800 leading-relaxed text-justify">
          {data.professionalSummary}
        </p>
      </TechSection>
    ) : null,

    skills: has(data.skills) ? (
      <TechSection label="Skills">
        <div className="space-y-1 text-[0.905em] leading-snug">
          {data.skills.map((skill, i) => {
            const [category, ...rest] = skill.split(":");
            const details = rest.join(":").trim();
            if (!details) return <div key={i} className="text-gray-800">{skill}</div>;
            return (
              <div key={i} className="text-gray-800">
                <span className="font-bold text-gray-950">{category.trim()}:</span>{" "}
                {details}
              </div>
            );
          })}
        </div>
      </TechSection>
    ) : null,

    projects: has(data.projects) ? (
      <TechSection label="Projects">
        <div className="space-y-2">
          {data.projects.map((p, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="text-[0.952em]">
                <span className="font-bold text-gray-950">
                  {p.link ? (
                    <a
                      href={p.link.startsWith("http") ? p.link : `https://${p.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </span>
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
                  <span className="text-gray-700 font-normal"> — {p.type}</span>
                )}
              </div>
              {hasText(p.description) && (
                <BulletLines
                  text={p.description}
                  className="mt-0.5 text-gray-800 text-[0.905em]"
                />
              )}
            </div>
          ))}
        </div>
      </TechSection>
    ) : null,

    experience: has(data.experience) ? (
      <TechSection label="Professional Experience">
        <div className="space-y-2.5">
          {data.experience.map((e, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-[0.952em]">
                  <span className="font-bold text-gray-950">{e.position}</span>
                  {e.company && (
                    <span className="text-gray-700 font-semibold"> — {e.company}</span>
                  )}
                </div>
                <div className="text-[0.81em] text-gray-500 whitespace-nowrap text-right shrink-0">
                  {e.startDate}
                  {(e.endDate || e.isCurrent)
                    ? ` – ${e.isCurrent ? "Present" : e.endDate}`
                    : ""}
                </div>
              </div>
              {hasText(e.description) && (
                <BulletLines
                  text={e.description}
                  className="mt-0.5 text-gray-800 text-[0.905em]"
                />
              )}
            </div>
          ))}
        </div>
      </TechSection>
    ) : null,

    education: has(data.education) ? (
      <TechSection label="Education">
        <div className="space-y-1.5">
          {data.education.map((e, i) => (
            <div key={i} className="break-inside-avoid flex justify-between gap-4">
              <div>
                <div className="font-bold text-gray-950 text-[0.952em]">{e.institution}</div>
                <div className="text-[0.905em] text-gray-500">
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-[0.81em] whitespace-nowrap text-right shrink-0">
                <div className="text-gray-500">{e.graduationDate}</div>
                {e.gpa?.trim() && (
                  <div className="text-gray-500 mt-0.5">
                    {e.gpa.includes("%") || e.gpa.toLowerCase().includes("gpa")
                      ? e.gpa.trim()
                      : `GPA ${e.gpa.trim()}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </TechSection>
    ) : null,

    ...customMap,
  };

  return (
    <div className="text-gray-900">
      {/* ── Left-aligned Tech header with horizontal accent divider ── */}
      {(hasText(pi.fullName) || hasText(pi.profession)) && (
        <header className="text-left pb-2 mb-2">
          <h1 className="text-[2em] font-bold tracking-tight text-gray-950 uppercase leading-none">
            {pi.fullName}
          </h1>
          {hasText(pi.profession) && (
            <div className="text-[0.88em] font-medium text-gray-600 mt-1 tracking-wide">
              {pi.profession}
            </div>
          )}
          <div className="mt-1.5 pb-2 text-[0.81em] text-gray-500">
            <ContactLine pi={pi} />
          </div>
          <div
            className="w-full h-[1.5px] mt-0.5"
            style={{ backgroundColor: "var(--accent, #2563eb)" }}
          />
        </header>
      )}

      <div>
        {order.map((key) =>
          sections[key]
            ? <Fragment key={key}>{sections[key]}</Fragment>
            : null
        )}
      </div>
    </div>
  );
}
