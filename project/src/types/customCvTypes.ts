export type CustomCvDesign = {
  sectionOrder: string[];
  primaryColor: string;
  secondaryColor: string;
  showPhoto: boolean;
  centerName: boolean;
  showDividers: boolean;
};

export const DEFAULT_CV_DESIGN: CustomCvDesign = {
  sectionOrder: [
    "profile",
    "experience",
    "education",
    "skills",
    "languages",
    "projects",
    "interests"
  ],
  primaryColor: "#1D4ED8",
  secondaryColor: "#64748B",
  showPhoto: true,
  centerName: false,
  showDividers: true
};

export const SECTION_LABELS: Record<string, string> = {
  profile: "Résumé / Profil",
  experience: "Expériences",
  education: "Formation",
  skills: "Compétences",
  languages: "Langues",
  projects: "Projets",
  interests: "Centres d'intérêt"
};
