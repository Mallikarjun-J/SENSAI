"use client";
import { SectionLabel, SkillLines, BulletLines, ContactLine, has, hasText } from "../_templates/shared";
import { DEFAULT_SECTION_ORDER } from "../_components/SectionOrderForm";

function GpaLabel({ gpa }) {
  if (!gpa?.trim()) return null;
  const label = gpa.includes("%") ? gpa.trim() : `GPA ${gpa.trim()}`;
  return <div className="font-mono text-[8.5pt] text-gray-500">{label}</div>;
}

export function MinimalTemplate({ data }) {
  const pi = data.personalInfo ?? {};
  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;

  const sections = {
    summary: hasText(data.professionalSummary) ? (
      <section key="summary">
        <SectionLabel>Summary</SectionLabel>
        <p className="mt-1 text-justify">{data.professionalSummary}</p>
      </section>
    ) : null,

    experience: has(data.experience) ? (
      <section key="experience">
        <SectionLabel>Experience</SectionLabel>
        <div className="mt-1 space-y-2">
          {data.experience.map((e, i) => (
            <div key={i} className="break-inside-avoid grid grid-cols-[1fr_auto] gap-4">
              <div>
                <div className="font-semibold text-left">{e.position}</div>
                <div className="text-[10pt] text-gray-500 text-left">{e.company}</div>
                {hasText(e.description) && <BulletLines text={e.description} />}
              </div>
              <div className="font-mono text-[8.5pt] text-gray-500 whitespace-nowrap text-right">
                {e.startDate}{(e.endDate || e.isCurrent) ? ` – ${e.isCurrent ? "Present" : e.endDate}` : ""}
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    education: has(data.education) ? (
      <section key="education">
        <SectionLabel>Education</SectionLabel>
        <div className="mt-1 space-y-1.5">
          {data.education.map((e, i) => (
            <div key={i} className="break-inside-avoid flex justify-between gap-4">
              <div className="text-left min-w-0">
                <div className="font-semibold">{e.institution}</div>
                <div className="text-[10pt] text-gray-500">
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[8.5pt] text-gray-500 whitespace-nowrap">{e.graduationDate}</div>
                <GpaLabel gpa={e.gpa} />
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    projects: has(data.projects) ? (
      <section key="projects">
        <SectionLabel>Projects</SectionLabel>
        <div className="mt-1 space-y-1.5">
          {data.projects.map((p, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="font-semibold text-left">
                {p.name}{p.type ? ` · ${p.type}` : ""}
              </div>
              {hasText(p.description) && <BulletLines text={p.description} />}
            </div>
          ))}
        </div>
      </section>
    ) : null,

    skills: has(data.skills) ? (
      <section key="skills">
        <SectionLabel>Skills</SectionLabel>
        <SkillLines skills={data.skills} />
      </section>
    ) : null,

    ...(() => {
      const m = {};
      (data.customSections ?? []).forEach((cs) => {
        if (!cs.name?.trim() || !cs.entries?.length) return;
        m[cs.id] = (
          <section key={cs.id} className="break-inside-avoid">
            <SectionLabel>{cs.name}</SectionLabel>
            <div className="mt-1 space-y-2">
              {cs.entries.map((entry) => (
                <div key={entry.id} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold text-left">
                      {entry.title}{entry.subtitle ? ` — ${entry.subtitle}` : ""}
                    </div>
                    {entry.date && (
                      <div className="font-mono text-[8.5pt] text-gray-500 whitespace-nowrap ml-4">{entry.date}</div>
                    )}
                  </div>
                  {hasText(entry.description) && (
                    <p className="text-[9.5pt] text-gray-700 mt-0.5 font-mono">{entry.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      });
      return m;
    })(),
  };

  return (
    <div className="space-y-3 text-gray-900">
      {(hasText(pi.fullName) || hasText(pi.profession)) && (
        <header className="text-left border-b pb-2" style={{ borderColor: "var(--accent)" }}>
          <h1 className="text-3xl font-bold tracking-tight">{pi.fullName}</h1>
          {hasText(pi.profession) && (
            <div className="text-sm text-gray-500">{pi.profession}</div>
          )}
          <div className="mt-1 font-mono text-[8.5pt] text-gray-500">
            <ContactLine pi={pi} />
          </div>
        </header>
      )}
      {order.map((key) => sections[key] ?? null)}
    </div>
  );
}
