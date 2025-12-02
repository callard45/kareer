import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, MoveUpIcon, MoveDownIcon } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { CustomCvDesign, DEFAULT_CV_DESIGN, SECTION_LABELS } from "../../types/customCvTypes";
import { CustomCvPreview } from "./components/CustomCvPreview";
import { jsPDF } from "jspdf";

export const CvDesignEditor: React.FC = () => {
  const navigate = useNavigate();
  const [design, setDesign] = useState<CustomCvDesign>(DEFAULT_CV_DESIGN);

  const cvData = {
    name: "PRÉNOM NOM",
    email: "contact@email.com",
    phone: "+33 6 12 34 56 78",
    location: "Paris, France",
    position: "Poste visé",
    company: "Entreprise cible"
  };

  useEffect(() => {
    const hasGeneratedCv = localStorage.getItem("hasGeneratedCv");
    if (!hasGeneratedCv) {
      navigate("/generator");
    }
  }, [navigate]);

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...design.sectionOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setDesign({ ...design, sectionOrder: newOrder });
  };

  const moveSectionDown = (index: number) => {
    if (index === design.sectionOrder.length - 1) return;
    const newOrder = [...design.sectionOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setDesign({ ...design, sectionOrder: newOrder });
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const { primaryColor, secondaryColor, centerName, showDividers } = design;

    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);

    let y = 20;

    if (centerName) {
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(cvData.name, 105, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`${cvData.email} | ${cvData.phone}`, 105, y, { align: "center" });
      y += 5;
      doc.text(cvData.location, 105, y, { align: "center" });
      y += 12;
    } else {
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(cvData.name, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`${cvData.email} | ${cvData.phone}`, 20, y);
      y += 5;
      doc.text(cvData.location, 20, y);
      y += 12;
    }

    if (showDividers) {
      doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      y += 8;
    }

    design.sectionOrder.forEach((sectionKey) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(SECTION_LABELS[sectionKey] || sectionKey, 20, y);
      y += 7;

      if (showDividers) {
        doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.setLineWidth(0.3);
        doc.line(20, y, 190, y);
        y += 5;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      switch (sectionKey) {
        case "profile":
          const profileText = `Professionnel motivé et dynamique recherchant un poste de ${cvData.position} chez ${cvData.company}.`;
          const splitProfile = doc.splitTextToSize(profileText, 170);
          doc.text(splitProfile, 20, y);
          y += splitProfile.length * 5 + 8;
          break;

        case "experience":
          doc.setFont("helvetica", "bold");
          doc.text("Stage en Stratégie et Développement", 20, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          doc.text("Grande Entreprise Internationale, Paris | Juin 2023 - Août 2023", 20, y);
          y += 5;
          doc.setTextColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
          doc.text("•", 20, y);
          doc.setTextColor(0, 0, 0);
          doc.text("Analyse des opportunités de croissance", 25, y);
          y += 8;
          break;

        case "education":
          doc.setFont("helvetica", "bold");
          doc.text("Master en Management et Stratégie d'Entreprise", 20, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          doc.text("École de Commerce, Paris | 2022-2024", 20, y);
          y += 8;
          break;

        case "skills":
          doc.text("Pack Office, Analyse de données, Gestion de projet, Leadership, Communication", 20, y);
          y += 8;
          break;

        case "languages":
          doc.text("Français : Langue maternelle | Anglais : Courant (C1) | Espagnol : Intermédiaire (B1)", 20, y);
          y += 8;
          break;

        case "projects":
          doc.setFont("helvetica", "bold");
          doc.text("Projet de stratégie marketing", 20, y);
          doc.setFont("helvetica", "normal");
          y += 5;
          doc.text("Développement d'une stratégie complète pour une startup tech", 20, y);
          y += 8;
          break;

        case "interests":
          doc.text("Technologie, Voyages, Lecture, Sport", 20, y);
          y += 8;
          break;

        default:
          y += 5;
      }
    });

    doc.save(`CV_Personnalise_${new Date().getTime()}.pdf`);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  };

  const predefinedColors = [
    { name: "Bleu", value: "#1D4ED8" },
    { name: "Rouge", value: "#DC2626" },
    { name: "Vert", value: "#059669" },
    { name: "Violet", value: "#7C3AED" },
    { name: "Orange", value: "#EA580C" },
    { name: "Gris", value: "#475569" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/generator")}
            className="mb-4 hover:bg-slate-100"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Retour au générateur
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">Éditeur de design de CV</h1>
          <p className="text-slate-600 mt-2">Organisez vos sections et personnalisez les couleurs de votre CV</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Ordre des sections</h3>
                <div className="space-y-2">
                  {design.sectionOrder.map((sectionKey, index) => (
                    <div
                      key={sectionKey}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {SECTION_LABELS[sectionKey] || sectionKey}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSectionUp(index)}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          <MoveUpIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSectionDown(index)}
                          disabled={index === design.sectionOrder.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          <MoveDownIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Couleurs du CV</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Couleur principale
                    </Label>
                    <div className="flex gap-2 mb-3">
                      {predefinedColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setDesign({ ...design, primaryColor: color.value })}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            design.primaryColor === color.value
                              ? "border-slate-800 scale-110"
                              : "border-slate-200"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={design.primaryColor}
                      onChange={(e) => setDesign({ ...design, primaryColor: e.target.value })}
                      className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Couleur secondaire
                    </Label>
                    <div className="flex gap-2 mb-3">
                      {predefinedColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setDesign({ ...design, secondaryColor: color.value })}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            design.secondaryColor === color.value
                              ? "border-slate-800 scale-110"
                              : "border-slate-200"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={design.secondaryColor}
                      onChange={(e) => setDesign({ ...design, secondaryColor: e.target.value })}
                      className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Options supplémentaires</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">Afficher la photo</Label>
                    <button
                      onClick={() => setDesign({ ...design, showPhoto: !design.showPhoto })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        design.showPhoto ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          design.showPhoto ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">Aligner le nom au centre</Label>
                    <button
                      onClick={() => setDesign({ ...design, centerName: !design.centerName })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        design.centerName ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          design.centerName ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">Afficher séparateurs horizontaux</Label>
                    <button
                      onClick={() => setDesign({ ...design, showDividers: !design.showDividers })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        design.showDividers ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          design.showDividers ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="sticky top-4">
              <CustomCvPreview design={design} cvData={cvData} />

              <Button
                onClick={handleDownloadPdf}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              >
                Télécharger ce design
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
