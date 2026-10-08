import { DEFAULT_SECTION_ORDER } from "@/app/(main)/resume/_components/SectionOrderForm";

function gpaLabel(gpa) {
  if (!gpa?.trim()) return "";
  return gpa.includes("%") ? gpa.trim() : `GPA ${gpa.trim()}`;
}

function contactLine(pi) {
  const parts = [];
  if (pi.phone?.trim()) parts.push(pi.phone.trim());
  if (pi.email?.trim()) parts.push(`[${pi.email.trim()}](mailto:${pi.email.trim()})`);
  if (pi.link1Label?.trim() && pi.link1Url?.trim()) {
    const url = /^https?:\/\//i.test(pi.link1Url) ? pi.link1Url : `https://${pi.link1Url}`;
    parts.push(`[${pi.link1Label.trim()}](${url.trim()})`);
  }
  if (pi.link2Label?.trim() && pi.link2Url?.trim()) {
    const url = /^https?:\/\//i.test(pi.link2Url) ? pi.link2Url : `https://${pi.link2Url}`;
    parts.push(`[${pi.link2Label.trim()}](${url.trim()})`);
  }
  if (pi.location?.trim()) parts.push(pi.location.trim());
  return parts.join(" · ");
}

function bulletLines(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `- ${l.startsWith("●") ? l.slice(1).trim() : l}`)
    .join("\n");
}

export function generateMarkdown(data) {
  const pi = data.personalInfo ?? {};
  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;
  const lines = [];

  if (pi.fullName?.trim()) lines.push(`# ${pi.fullName.trim()}`);
  if (pi.profession?.trim()) lines.push(`**${pi.profession.trim()}**`);
  const contact = contactLine(pi);
  if (contact) lines.push(`\n${contact}`);
  lines.push("");

  const sectionMap = {
    summary: () => {
      if (!data.professionalSummary?.trim()) return;
      lines.push("## Professional Summary", "");
      lines.push(data.professionalSummary.trim());
      lines.push("");
    },
    experience: () => {
      if (!data.experience?.length) return;
      lines.push("## Professional Experience", "");
      for (const e of data.experience) {
        const title = [e.position, e.company].filter(Boolean).join(" — ");
        const dates = [e.startDate, e.isCurrent ? "Present" : e.endDate].filter(Boolean).join(" – ");
        lines.push(`### ${title}`);
        if (dates) lines.push(`*${dates}*`);
        lines.push("");
        if (e.description?.trim()) {
          lines.push(bulletLines(e.description));
          lines.push("");
        }
      }
    },
    education: () => {
      if (!data.education?.length) return;
      lines.push("## Education", "");
      for (const e of data.education) {
        lines.push(`### ${e.institution}`);
        const deg = [e.degree, e.field].filter(Boolean).join(", ");
        const gpa = gpaLabel(e.gpa);
        const meta = [deg, gpa].filter(Boolean).join(" · ");
        if (meta) lines.push(meta);
        if (e.graduationDate) lines.push(`*${e.graduationDate}*`);
        lines.push("");
      }
    },
    projects: () => {
      if (!data.projects?.length) return;
      lines.push("## Projects", "");
      for (const p of data.projects) {
        const name = [p.name, p.type].filter(Boolean).join(" — ");
        if (p.link?.trim()) {
          const url = /^https?:\/\//i.test(p.link.trim()) ? p.link.trim() : `https://${p.link.trim()}`;
          lines.push(`### [${name}](${url})`);
        } else {
          lines.push(`### ${name}`);
        }
        lines.push("");
        if (p.description?.trim()) {
          lines.push(bulletLines(p.description));
          lines.push("");
        }
      }
    },
    skills: () => {
      if (!data.skills?.length) return;
      lines.push("## Skills", "");
      for (const s of data.skills) {
        const [cat, ...rest] = s.split(":");
        const detail = rest.join(":").trim();
        lines.push(detail ? `- **${cat.trim()}:** ${detail}` : `- ${s}`);
      }
      lines.push("");
    },
  };

  for (const key of order) {
    sectionMap[key]?.();
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function downloadMarkdown(data) {
  const md = generateMarkdown(data);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = (data.personalInfo?.fullName ?? "resume").toLowerCase().replace(/\s+/g, "_");
  a.download = `${name}_resume.md`;
  a.click();
  URL.revokeObjectURL(url);
}
