import { notFound } from "next/navigation";
import { getResumeById } from "@/actions/resume";
import { BuilderClient } from "@/app/(main)/resume/_components/BuilderClient";

export default async function BuilderPage({ params }) {
  const { id } = await params;

  let resume;
  try {
    resume = await getResumeById(id);
  } catch {
    notFound();
  }

  const initial = {
    template: resume.template ?? "classic",
    ascentColor: resume.ascentColor ?? "#a78bfa",
    professionalSummary: resume.professionalSummary ?? "",
    skills: Array.isArray(resume.skills) ? resume.skills : [],
    personalInfo: typeof resume.personalInfo === "object" && resume.personalInfo ? resume.personalInfo : {},
    experience: Array.isArray(resume.experience) ? resume.experience : [],
    projects: Array.isArray(resume.projects) ? resume.projects : [],
    education: Array.isArray(resume.education) ? resume.education : [],
    sectionOrder: Array.isArray(resume.sectionOrder) && resume.sectionOrder.length
      ? resume.sectionOrder
      : ["summary", "experience", "education", "projects", "skills"],
    customSections: Array.isArray(resume.customSections) ? resume.customSections : [],
  };

  return <BuilderClient resumeId={id} initial={initial} />;
}
