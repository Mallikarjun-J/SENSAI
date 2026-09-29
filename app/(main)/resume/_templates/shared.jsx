"use client";

export function SectionLabel({ children, className = "" }) {
  return (
    <div
      className={`font-mono text-[0.905em] font-semibold text-left uppercase tracking-wide ${className}`}
      style={{ color: "var(--accent)" }}
    >
      {children}
    </div>
  );
}

export function has(v) {
  return !!v && v.length > 0;
}

export function hasText(s) {
  return !!s && s.trim().length > 0;
}

export function ContactLine({ pi }) {
  const items = [];

  if (pi.email?.trim())
    items.push({ label: pi.email.trim(), href: `mailto:${pi.email.trim()}` });
  if (pi.phone?.trim())
    items.push({ label: pi.phone.trim(), href: `tel:${pi.phone.trim()}` });
  if (pi.location?.trim())
    items.push({
      label: pi.location.trim(),
      href: `https://maps.google.com/?q=${encodeURIComponent(pi.location.trim())}`,
    });

  if (Array.isArray(pi.links) && pi.links.length > 0) {
    pi.links.forEach(({ label, url }) => {
      if (label?.trim() && url?.trim()) {
        items.push({
          label: label.trim(),
          href: /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`,
        });
      }
    });
  } else {
    if (pi.link1Label?.trim() && pi.link1Url?.trim())
      items.push({
        label: pi.link1Label.trim(),
        href: /^https?:\/\//i.test(pi.link1Url.trim())
          ? pi.link1Url.trim()
          : `https://${pi.link1Url.trim()}`,
      });
    if (pi.link2Label?.trim() && pi.link2Url?.trim())
      items.push({
        label: pi.link2Label.trim(),
        href: /^https?:\/\//i.test(pi.link2Url.trim())
          ? pi.link2Url.trim()
          : `https://${pi.link2Url.trim()}`,
      });
  }

  if (items.length === 0) return null;

  return (
    <span>
      {items.map((item, idx) => (
        <span key={`${item.href}-${idx}`}>
          {idx > 0 && <span className="mx-1 select-none">·</span>}
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: "inherit" }}
          >
            {item.label}
          </a>
        </span>
      ))}
    </span>
  );
}

export function BulletLines({ text, className = "" }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul className={`mt-0.5 space-y-0.5 ${className}`}>
      {lines.map((line, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="mt-[2px] shrink-0 select-none">●</span>
          <span className="text-justify">
            {line.startsWith("●") ? line.slice(1).trim() : line}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SkillLines({ skills }) {
  return (
    <div className="mt-1 space-y-1 text-[0.905em] text-left">
      {skills.map((skill, i) => {
        const [category, ...rest] = skill.split(":");
        const details = rest.join(":").trim();
        if (!details) return <div key={i}>{skill}</div>;
        return (
          <div key={i}>
            <span className="font-semibold">{category.trim()}:</span> {details}
          </div>
        );
      })}
    </div>
  );
}
