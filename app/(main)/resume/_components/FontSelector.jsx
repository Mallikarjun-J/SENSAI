"use client";

export const FONTS = [
  {
    id: "inter",
    name: "Inter",
    family: "'Inter', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    type: "Sans",
  },
  {
    id: "lato",
    name: "Lato",
    family: "'Lato', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
    type: "Sans",
  },
  {
    id: "roboto",
    name: "Roboto",
    family: "'Roboto', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
    type: "Sans",
  },
  {
    id: "poppins",
    name: "Poppins",
    family: "'Poppins', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
    type: "Sans",
  },
  {
    id: "raleway",
    name: "Raleway",
    family: "'Raleway', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap",
    type: "Sans",
  },
  {
    id: "nunito",
    name: "Nunito",
    family: "'Nunito', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap",
    type: "Sans",
  },
  {
    id: "source-sans",
    name: "Source Sans 3",
    family: "'Source Sans 3', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap",
    type: "Sans",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    family: "'Merriweather', serif",
    url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
    type: "Serif",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    family: "'Playfair Display', serif",
    url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
    type: "Serif",
  },
  {
    id: "eb-garamond",
    name: "EB Garamond",
    family: "'EB Garamond', serif",
    url: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&display=swap",
    type: "Serif",
  },
  {
    id: "georgia",
    name: "Georgia",
    family: "Georgia, serif",
    url: null,
    type: "Serif",
  },
  {
    id: "times",
    name: "Times New Roman",
    family: "'Times New Roman', Times, serif",
    url: null,
    type: "Serif",
  },
];

export function getFontConfig(fontId) {
  return FONTS.find((f) => f.id === fontId) ?? FONTS[0];
}

export function FontSelector({ value, onChange }) {
  return (
    <div className="py-1 px-1 flex flex-col gap-0.5">
      {FONTS.map((font) => {
        const isActive = font.id === (value ?? "inter");
        return (
          <button
            key={font.id}
            type="button"
            onClick={() => onChange(font.id)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all ${
              isActive
                ? "bg-primary/20 border border-primary/40"
                : "border border-transparent hover:bg-white/10"
            }`}
          >
            {/* Font name rendered in that font */}
            <span
              className={`text-sm ${isActive ? "text-primary font-medium" : "text-white"}`}
              style={{ fontFamily: font.family }}
            >
              {font.name}
            </span>
            {/* Type badge */}
            <span className={`text-[10px] ml-3 shrink-0 px-1.5 py-0.5 rounded ${
              isActive
                ? "text-primary/70 bg-primary/10"
                : "text-white/40 bg-white/5"
            }`}>
              {font.type}
            </span>
          </button>
        );
      })}
    </div>
  );
}
