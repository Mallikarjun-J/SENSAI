"use client";
import { Fragment } from "react";
import { BulletLines, ContactLine, has, hasText } from "../_templates/shared";
import { DEFAULT_SECTION_ORDER } from "../_components/SectionOrderForm";

/** Classic section header — bold ALL CAPS label with a thick accent bottom border */
function ClassicSection({ label, children }) {
  return (
    <section className="break-inside-avoid mt-3 first:mt-0">
      <div
        className="text-[0.76em] font-bold uppercase tracking-[0.14em] pb-[3px] mb-2 border-b-2 text-gray-800"
        style={{ borderColor: "var(--accent)" }}
      >
        {label}
      </div>
      {children}
    </section>
  );
}

function GpaLabel({ gpa }) {
  if (!gpa?.trim()) return null;
  const label = gpa.includes("%") ? gpa.trim() : `GPA ${gpa.trim()}`;
  return <span className="text-gray-500"> · {label}</span>;
}

export function ClassicTemplate({ data }) {
  const pi = data.personalInfo ?? {};
  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;

  const customMap = {};
  (data.customSections ?? []).forEach((cs) => {
    if (!cs.name?.trim() || !cs.entries?.length) return;
    customMap[cs.id] = (
      <ClassicSection label={cs.name} key={cs.id}>
        <div className="space-y-2">
          {cs.entries.map((entry) => (
            <div key={entry.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-bold">{entry.title}</span>
                  {entry.subtitle && (
                    <span className="text-gray-600"> · <em>{entry.subtitle}</em></span>
                  )}
                </div>
                {entry.date && (
                  <div className="text-[0.81em] text-gray-500 whitespace-nowrap shrink-0">
                    {entry.date}
                  </div>
                )}
              </div>
              {hasText(entry.description) && (
                <p className="text-[0.905em] text-gray-700 mt-0.5">{entry.description}</p>
              )}
            </div>
          ))}
        </div>
      </ClassicSection>
    );
  });

  const sections = {
    summary: hasText(data.professionalSummary) ? (
      <ClassicSection label="Profile Summary">
        <p className="text-justify leading-relaxed">{data.professionalSummary}</p>
      </ClassicSection>
    ) : null,

    experience: has(data.experience) ? (
      <ClassicSection label="Professional Experience">
        <div className="space-y-2.5">
          {data.experience.map((e, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-bold">{e.position}</span>
                  {e.company && (
                    <span className="text-gray-600"> · <em>{e.company}</em></span>
                  )}
                </div>
                <div className="text-[0.81em] text-gray-500 whitespace-nowrap shrink-0">
                  {e.startDate}
                  {(e.endDate || e.isCurrent)
                    ? ` – ${e.isCurrent ? "Present" : e.endDate}`
                    : ""}
                </div>
              </div>
              {hasText(e.description) && <BulletLines text={e.description} className="mt-0.5" />}
            </div>
          ))}
        </div>
      </ClassicSection>
    ) : null,

    education: has(data.education) ? (
      <ClassicSection label="Education">
        <div className="space-y-1.5">
          {data.education.map((e, i) => (
            <div key={i} className="break-inside-avoid flex justify-between gap-4">
              <div>
                <div className="font-bold">{e.institution}</div>
                <div className="text-[0.952em] text-gray-600">
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                  <GpaLabel gpa={e.gpa} />
                </div>
              </div>
              <div className="text-[0.81em] text-gray-500 whitespace-nowrap text-right shrink-0">
                {e.graduationDate}
              </div>
            </div>
          ))}
        </div>
      </ClassicSection>
    ) : null,

    projects: has(data.projects) ? (
      <ClassicSection label="Projects">
        <div className="space-y-1.5">
          {data.projects.map((p, i) => (
            <div key={i} className="break-inside-avoid">
              <span className="font-bold">{p.name}</span>
              {p.type && (
                <span className="text-gray-500 text-[0.905em]"> · {p.type}</span>
              )}
              {hasText(p.description) && (
                <BulletLines text={p.description} className="mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </ClassicSection>
    ) : null,

    skills: has(data.skills) ? (
      <ClassicSection label="Technical Skills">
        <div className="mt-1 space-y-1 text-[0.905em]">
          {data.skills.map((skill, i) => {
            const [category, ...rest] = skill.split(":");
            const details = rest.join(":").trim();
            if (!details) return <div key={i}>{skill}</div>;
            return (
              <div key={i}>
                <span className="font-bold">{category.trim()}:</span>{" "}
                {details}
              </div>
            );
          })}
        </div>
      </ClassicSection>
    ) : null,

    ...customMap,
  };

  return (
    <div className="text-gray-900">
      {/* ── Centered formal header ── */}
      {(hasText(pi.fullName) || hasText(pi.profession)) && (
        <header className="text-center pb-2 mb-0">
          <h1
            className="text-[2em] font-bold tracking-[0.08em] uppercase"
          >
            {pi.fullName}
          </h1>
          {hasText(pi.profession) && (
            <div
              className="text-[0.81em] tracking-[0.12em] uppercase mt-0.5"
              style={{ color: "var(--accent)" }}
            >
              {pi.profession}
            </div>
          )}
          <div
            className="mt-1.5 mb-2 border-b-2 pb-2 text-[0.81em] text-gray-500"
            style={{ borderColor: "var(--accent)" }}
          >
            <ContactLine pi={pi} />
          </div>
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
