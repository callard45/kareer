import React from "react";
import { CustomCvDesign, SECTION_LABELS } from "../../../types/customCvTypes";

interface CustomCvPreviewProps {
  design: CustomCvDesign;
  cvData: {
    name: string;
    email: string;
    phone: string;
    location: string;
    position: string;
    company: string;
  };
}

export const CustomCvPreview: React.FC<CustomCvPreviewProps> = ({ design, cvData }) => {
  const { sectionOrder, primaryColor, secondaryColor, showPhoto, centerName, showDividers } = design;

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "profile":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <p className="text-slate-700 text-sm leading-relaxed">
              Professionnel motivé et dynamique recherchant un poste de {cvData.position} chez {cvData.company}.
              Fort d'une expérience significative et d'une formation solide, je souhaite contribuer au succès
              de l'entreprise en apportant mes compétences techniques et mon expertise dans le domaine.
            </p>
          </div>
        );

      case "experience":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-slate-800">Stage en Stratégie et Développement</h4>
                  <span className="text-xs text-slate-500">Juin 2023 - Août 2023</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">Grande Entreprise Internationale, Paris</p>
                <ul className="list-none space-y-1">
                  <li className="text-sm text-slate-700 flex items-start">
                    <span style={{ color: secondaryColor }} className="mr-2">•</span>
                    <span>Analyse des opportunités de croissance</span>
                  </li>
                  <li className="text-sm text-slate-700 flex items-start">
                    <span style={{ color: secondaryColor }} className="mr-2">•</span>
                    <span>Collaboration avec les équipes marketing et finance</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case "education":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-slate-800">Master en Management et Stratégie d'Entreprise</h4>
                  <span className="text-xs text-slate-500">2022-2024</span>
                </div>
                <p className="text-sm text-slate-600 mb-1">École de Commerce, Paris</p>
                <p className="text-sm text-slate-700">Mention Très Bien</p>
              </div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-slate-800">Licence en Économie et Gestion</h4>
                  <span className="text-xs text-slate-500">2019-2022</span>
                </div>
                <p className="text-sm text-slate-600 mb-1">Université Paris-Dauphine</p>
                <p className="text-sm text-slate-700">Major de promotion</p>
              </div>
            </div>
          </div>
        );

      case "skills":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">Compétences Techniques</h4>
                <div className="flex flex-wrap gap-2">
                  {["Pack Office", "Analyse de données", "Gestion de projet"].map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">Compétences Transversales</h4>
                <div className="flex flex-wrap gap-2">
                  {["Leadership", "Communication", "Adaptabilité"].map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "languages":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Français</span>
                <span className="text-xs text-slate-500">Langue maternelle</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Anglais</span>
                <span className="text-xs text-slate-500">Courant (C1)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Espagnol</span>
                <span className="text-xs text-slate-500">Intermédiaire (B1)</span>
              </div>
            </div>
          </div>
        );

      case "projects":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Projet de stratégie marketing</h4>
                <p className="text-sm text-slate-700">Développement d'une stratégie complète pour une startup tech</p>
              </div>
            </div>
          </div>
        );

      case "interests":
        return (
          <div key={sectionKey} className="mb-6">
            <h3
              className="font-bold mb-3 text-lg"
              style={{ color: primaryColor }}
            >
              {SECTION_LABELS[sectionKey]}
            </h3>
            {showDividers && (
              <div
                className="h-0.5 mb-3"
                style={{ backgroundColor: primaryColor, opacity: 0.3 }}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {["Technologie", "Voyages", "Lecture", "Sport"].map((interest) => (
                <span
                  key={interest}
                  className="text-sm text-slate-700 px-3 py-1 rounded-full border"
                  style={{ borderColor: secondaryColor }}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 min-h-[800px]">
      <div className={`mb-6 pb-6 border-b ${centerName ? "text-center" : ""}`} style={{ borderColor: primaryColor }}>
        <div className="flex items-center justify-between gap-4">
          {showPhoto && (
            <div
              className="w-24 h-24 rounded-full bg-slate-200 flex-shrink-0"
              style={{ border: `3px solid ${primaryColor}` }}
            />
          )}
          <div className={`flex-1 ${centerName ? "text-center" : ""}`}>
            <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }}>
              {cvData.name || "PRÉNOM NOM"}
            </h1>
            <p className="text-slate-600 text-sm mb-1">{cvData.email || "contact@email.com"} | {cvData.phone || "+33 6 12 34 56 78"}</p>
            <p className="text-slate-600 text-sm">{cvData.location || "Paris, France"}</p>
          </div>
        </div>
      </div>

      <div>
        {sectionOrder.map((sectionKey) => renderSection(sectionKey))}
      </div>
    </div>
  );
};
