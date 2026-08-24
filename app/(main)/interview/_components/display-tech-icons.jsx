"use client";
import Image from "next/image";
import { techMappings } from "@/constants/interview";

const CDN_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

/**
 * Resolves a tech name to its devicon CDN URL.
 * Falls back to /tech.svg if the name isn't in the mapping.
 */
function getTechIconUrl(tech) {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  const normalized = techMappings[key] ?? null;
  if (!normalized) return "/tech.svg";
  return `${CDN_BASE}/${normalized}/${normalized}-original.svg`;
}

/**
 * Renders up to 3 tech stack icons from the devicon CDN.
 */
const DisplayTechIcons = ({ techStack }) => {
  if (!techStack?.length) return null;

  const visible = techStack.slice(0, 3);
  const extra = techStack.length - visible.length;

  return (
    <div className="flex items-center gap-1.5">
      {visible.map((tech, index) => {
        const iconSrc = getTechIconUrl(tech);

        return (
          <div
            key={tech}
            className="relative group"
            style={{ zIndex: visible.length - index }}
          >
            <div className="flex items-center justify-center size-8 rounded-full bg-white/10 border border-white/20 overflow-hidden">
              {/* Use <img> to avoid Next.js domain restrictions for CDN */}
              <img
                src={iconSrc}
                alt={tech}
                width={20}
                height={20}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/tech.svg";
                }}
              />
            </div>
            {/* Tooltip */}
            <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-0.5 text-xs text-white bg-gray-800 rounded-md shadow-md whitespace-nowrap z-50">
              {tech}
            </span>
          </div>
        );
      })}

      {extra > 0 && (
        <div className="flex items-center justify-center size-8 rounded-full bg-white/10 border border-white/20 text-xs text-muted-foreground font-medium">
          +{extra}
        </div>
      )}
    </div>
  );
};

export default DisplayTechIcons;
