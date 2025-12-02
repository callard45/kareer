import React, { useState, useEffect, useRef } from "react";
import { NavigationSection } from "../Dashboard/sections/NavigationSection";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ArrowLeftIcon, ArrowRightIcon, FileIcon, FileTextIcon, SendIcon } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DocumentView } from "./DocumentView";
import { Card, CardContent } from "../../components/ui/card";
import { TwoLevelSectorDropdown } from "../../components/TwoLevelSectorDropdown";
import { GeneratedCvList } from "./components/GeneratedCvList";
import { GeneratedCvHistoryItem } from "../../types/generatedCvHistory";
import { useCvHistory } from "../../hooks/useCvHistory";
import { jsPDF } from "jspdf";

type CvTemplateId = "harvard" | "modern" | "minimal";

// Create arrays for dropdown options
const months = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const years = Array.from({ length: 21 }, (_, i) => 2010 + i);

const experienceTypes = [
  "Temps plein", "Temps partiel", "Stage", "Indépendant",
  "Contrat", "Bénévolat", "Projet Étudiant"
];

const companySectors = [
  "Finance et Assurance",
  "Consulting & Conseil",
  "Technologie & Numérique (IT)",
  "Industrie & Production",
  "Biens de Consommation (FMCG)",
  "Luxe, Mode & Retail",
  "Santé & Biotechnologie",
  "Médias, Art & Culture",
  "Services Publics & Administration",
  "Immobilier & Construction",
  "Éducation & Recherche",
  "Organisations à But Non Lucratif (ONG)",
  "Transports & Logistique"
];

// Sample initial messages for the motivation interview
const initialMessages = [
  {
    sender: "ai",
    content: "Justifiez votre motivation pour ce rôle et cette entreprise"
  }
];

// Sample responses for the motivation interview
const aiResponses = [
  "C'est intéressant, maintenant veuillez justifier votre motivation pour le rôle",
  "Excellent ! Maintenant, parlez-moi d'une fois où vous avez démontré du leadership dans une situation difficile.",
  "Merci d'avoir partagé cela. Quelles compétences spécifiques avez-vous qui font de vous un bon candidat pour ce rôle ?",
  "Intéressant. Comment restez-vous à jour avec les tendances de l'industrie pertinentes pour ce poste ?",
  "C'est impressionnant. Comment géreriez-vous les désaccords avec les membres de l'équipe ?",
  "Vous pouvez continuer à justifier votre motivation ou cliquer ici pour continuer"
];

export const Generator = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCvHistory();

  // Initialize state from localStorage to maintain state between page refreshes
  const [jobInfoSubmitted, setJobInfoSubmitted] = useState<boolean>(false);
  
  const [interviewCompleted, setInterviewCompleted] = useState<boolean>(false);

  // Step management
  const [currentStep, setCurrentStep] = useState<string>(() => {
    return "job-form";
  });

  // Form data for job information
  const [formData, setFormData] = useState({
    company: localStorage.getItem("jobCompany") || "",
    sector: localStorage.getItem("jobSector") || "",
    location: localStorage.getItem("jobLocation") || "",
    position: localStorage.getItem("jobPosition") || "",
    experienceType: localStorage.getItem("jobExperienceType") || "",
    startMonth: localStorage.getItem("jobStartMonth") || "",
    startYear: localStorage.getItem("jobStartYear") || "",
    description: localStorage.getItem("jobDescription") || ""
  });

  const [activeTab, setActiveTab] = useState<string>(jobInfoSubmitted && interviewCompleted ? "cv-generator" : "job-form");

  const [cvTemplate, setCvTemplate] = useState<CvTemplateId>("harvard");
  
  const [generatedFiles, setGeneratedFiles] = useState({
    cv: {
      name: `CV_${formData.position || "Candidat"}_${formData.company || "Entreprise"}.pdf`.replace(/\s+/g, '_'),
      generated: false
    },
    coverLetter: {
      name: `Lettre_Motivation_${formData.position || "Candidat"}_${formData.company || "Entreprise"}.pdf`.replace(/\s+/g, '_'),
      generated: false
    }
  });

  const [isGenerating, setIsGenerating] = useState({
    cv: false,
    coverLetter: false
  });

  // AI Interview state
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if coming from interview with completion flag
  useEffect(() => {
    const interviewCompleted = location.state?.interviewCompleted;
    if (interviewCompleted) {
      // Save interview completion to localStorage
      localStorage.setItem("interviewCompleted", "true");
      setInterviewCompleted(true);
      setCurrentStep("document-generation");
    }
  }, [location.state]);
  
  // Auto-scroll to bottom when messages update in AI interview
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Job form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Job information submitted:", formData);
    setJobInfoSubmitted(true);
    setCurrentStep("ai-interview");
  };

  const handleCancel = () => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler ? Vos modifications ne seront pas enregistrées.")) {
      navigate("/dashboard");
    }
  };

  const resetProgress = () => {
    if (window.confirm("Êtes-vous sûr de vouloir recommencer ? Cela effacera toutes vos informations de poste et votre progression dans l'entretien.")) {
      // Reset state
      setJobInfoSubmitted(false);
      setInterviewCompleted(false);
      setFormData({
        company: "",
        sector: "",
        location: "",
        position: "",
        experienceType: "",
        startMonth: "",
        startYear: "",
        description: ""
      });
      setGeneratedFiles({
        cv: { name: "CV.pdf", generated: false },
        coverLetter: { name: "CoverLetter.pdf", generated: false }
      });
      setIsGenerating({
        cv: false,
        coverLetter: false
      });

      // Reset messages for AI interview
      setMessages(initialMessages);
      setInputText("");
      setIsTyping(false);
      setIsComplete(false);

      // Reset CV template
      setCvTemplate("harvard");

      // Switch to job form step
      setCurrentStep("job-form");
      setActiveTab("job-form");
    }
  };

  // AI Interview handlers
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, {
      sender: "user",
      content: inputText
    }]);
    setInputText("");
    
    // Simulate AI typing
    setIsTyping(true);
    
    // Simulate AI response after a delay
    setTimeout(() => {
      setIsTyping(false);
      
      // Get the next response based on conversation progress
      const responseIndex = Math.min(messages.filter(m => m.sender === "user").length, aiResponses.length - 1);
      const response = aiResponses[responseIndex];
      
      setMessages(prev => [...prev, {
        sender: "ai",
        content: response
      }]);
      
      // Check if this is the last response to show the continue button
      if (responseIndex === aiResponses.length - 1) {
        setIsComplete(true);
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleClearChat = () => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer cette conversation et recommencer ?")) {
      setMessages(initialMessages);
      setIsComplete(false);
    }
  };
  
  const handleSaveTranscript = () => {
    // Create a text version of the chat
    const transcript = messages
      .map(msg => `${msg.sender === 'ai' ? 'AI' : 'You'}: ${msg.content}`)
      .join('\n\n');
    
    // Create a blob and download link
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'motivation-interview-transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleCompleteInterview = () => {
    setInterviewCompleted(true);
    setCurrentStep("document-generation");
  };

  // Document generation handlers
  const handleGenerate = (type: string) => {
    if (!jobInfoSubmitted || !interviewCompleted) {
      alert("Veuillez d'abord compléter le formulaire d'informations sur le poste et l'entretien de motivation.");
      return;
    }

    console.log(`Generating ${type}`);

    // Set loading state
    if (type === "cv") {
      setIsGenerating(prev => ({ ...prev, cv: true }));
    } else {
      setIsGenerating(prev => ({ ...prev, coverLetter: true }));
    }

    // Simulate API call with a delay
    setTimeout(async () => {
      // In a real app, this would call an API to generate the document
      // For now, we'll just simulate a successful generation
      if (type === "cv") {
        const fileName = `CV_${formData.position || "Candidat"}_${formData.company || "Entreprise"}.pdf`.replace(/\s+/g, '_');

        setGeneratedFiles(prev => ({
          ...prev,
          cv: {
            name: fileName,
            generated: true
          }
        }));
        setIsGenerating(prev => ({ ...prev, cv: false }));
        localStorage.setItem("hasGeneratedCv", "true");

        addItem({
          id: Date.now().toString(),
          title: `CV - ${formData.position || "Poste"} chez ${formData.company || "Entreprise"}`,
          createdAt: new Date().toISOString(),
          role: formData.position,
          company: formData.company,
          template: cvTemplate
        });

        console.log("CV généré avec succès !");
      } else {
        setGeneratedFiles(prev => ({
          ...prev,
          coverLetter: {
            name: `Lettre_Motivation_${formData.position || "Candidat"}_${formData.company || "Entreprise"}.pdf`.replace(/\s+/g, '_'),
            generated: true
          }
        }));
        setIsGenerating(prev => ({ ...prev, coverLetter: false }));
        console.log("Lettre de motivation générée avec succès !");
      }
    }, 1500);
  };

  const handleDownload = (type: string) => {
    console.log(`Downloading ${type} file`);

    const today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

    const doc = new jsPDF();

    if (type === "cv") {
      // CV PDF generation with template-specific styles
      const template = cvTemplate;

      if (template === "harvard") {
        // HARVARD STYLE - Classic academic with red accents
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("CURRICULUM VITAE", 105, 20, { align: "center" });

        let y = 35;

        // Header with red line
        doc.setDrawColor(139, 0, 0);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 190, y - 2);
        y += 5;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("PRÉNOM NOM", 20, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Adresse : Paris, France", 20, y);
        y += 5;
        doc.text("Email : contact@email.com | Téléphone : +33 6 12 34 56 78", 20, y);
        y += 10;

        // Section: Professional Objective
        doc.setDrawColor(139, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(20, y, 23, y);
        doc.line(20, y, 20, y + 3);

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 0, 0);
        doc.text("OBJECTIF PROFESSIONNEL", 26, y + 2);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const objective = `Professionnel motivé et dynamique recherchant un poste de ${formData.position} chez ${formData.company}. Fort d'une expérience significative et d'une formation solide, je souhaite contribuer au succès de l'entreprise en apportant mes compétences techniques et mon expertise dans le domaine.`;
        const splitObjective = doc.splitTextToSize(objective, 170);
        doc.text(splitObjective, 20, y);
        y += splitObjective.length * 5 + 8;

        // Section: Education
        doc.setDrawColor(139, 0, 0);
        doc.line(20, y, 23, y);
        doc.line(20, y, 20, y + 3);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 0, 0);
        doc.text("FORMATION", 26, y + 2);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("2022-2024", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text("Master en Management et Stratégie d'Entreprise", 50, y);
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.text("École de Commerce, Paris", 50, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text("• Spécialisation en stratégie d'entreprise, gestion de projet", 50, y);
        y += 5;
        doc.text("• Mention Très Bien", 50, y);
        y += 8;

        doc.setFont("helvetica", "bold");
        doc.text("2019-2022", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text("Licence en Économie et Gestion", 50, y);
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.text("Université Paris-Dauphine", 50, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text("• Major de promotion", 50, y);
        y += 10;

        // Section: Experience
        doc.setDrawColor(139, 0, 0);
        doc.line(20, y, 23, y);
        doc.line(20, y, 20, y + 3);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 0, 0);
        doc.text("EXPÉRIENCE PROFESSIONNELLE", 26, y + 2);
        y += 8;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Juin 2023 - Août 2023", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text("Stage en Stratégie et Développement", 50, y);
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.text("Grande Entreprise Internationale, Paris", 50, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text("• Analyse des opportunités de croissance", 50, y);
        y += 5;
        doc.text("• Collaboration avec les équipes marketing et finance", 50, y);
        y += 10;

        // Section: Skills
        doc.setDrawColor(139, 0, 0);
        doc.line(20, y, 23, y);
        doc.line(20, y, 20, y + 3);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 0, 0);
        doc.text("COMPÉTENCES", 26, y + 2);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text("Compétences Techniques : Pack Office, Analyse de données, Gestion de projet", 20, y);
        y += 6;
        doc.text("Compétences Transversales : Leadership, Communication, Adaptabilité", 20, y);
        y += 10;

        // Section: Languages
        doc.setDrawColor(139, 0, 0);
        doc.line(20, y, 23, y);
        doc.line(20, y, 20, y + 3);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 0, 0);
        doc.text("LANGUES", 26, y + 2);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text("Français : Langue maternelle | Anglais : Courant (C1) | Espagnol : Intermédiaire (B1)", 20, y);

      } else if (template === "modern") {
        // MODERN STYLE - Contemporary with blue accents and geometric elements
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 30, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("PRÉNOM NOM", 105, 15, { align: "center" });
        doc.setFontSize(11);
        doc.text("Paris, France | contact@email.com | +33 6 12 34 56 78", 105, 23, { align: "center" });

        let y = 45;
        doc.setTextColor(0, 0, 0);

        // Section: Professional Objective
        doc.setFillColor(41, 128, 185);
        doc.rect(20, y - 4, 170, 1, "F");

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.text("OBJECTIF PROFESSIONNEL", 20, y + 3);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const objective2 = `Professionnel motivé et dynamique recherchant un poste de ${formData.position} chez ${formData.company}. Fort d'une expérience significative et d'une formation solide, je souhaite contribuer au succès de l'entreprise en apportant mes compétences techniques et mon expertise dans le domaine.`;
        const splitObjective2 = doc.splitTextToSize(objective2, 170);
        doc.text(splitObjective2, 20, y);
        y += splitObjective2.length * 5 + 8;

        // Section: Education
        doc.setFillColor(41, 128, 185);
        doc.rect(20, y - 4, 170, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.setFontSize(14);
        doc.text("FORMATION", 20, y + 3);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Master en Management et Stratégie d'Entreprise", 20, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text("École de Commerce, Paris | 2022-2024", 20, y);
        y += 5;
        doc.text("• Mention Très Bien", 20, y);
        y += 8;

        doc.setFont("helvetica", "bold");
        doc.text("Licence en Économie et Gestion", 20, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text("Université Paris-Dauphine | 2019-2022", 20, y);
        y += 5;
        doc.text("• Major de promotion", 20, y);
        y += 10;

        // Section: Experience
        doc.setFillColor(41, 128, 185);
        doc.rect(20, y - 4, 170, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.setFontSize(14);
        doc.text("EXPÉRIENCE PROFESSIONNELLE", 20, y + 3);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Stage en Stratégie et Développement", 20, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.text("Grande Entreprise Internationale, Paris | Juin 2023 - Août 2023", 20, y);
        y += 5;
        doc.text("• Analyse des opportunités de croissance", 20, y);
        y += 5;
        doc.text("• Collaboration avec les équipes marketing et finance", 20, y);
        y += 10;

        // Section: Skills
        doc.setFillColor(41, 128, 185);
        doc.rect(20, y - 4, 170, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.setFontSize(14);
        doc.text("COMPÉTENCES", 20, y + 3);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text("Pack Office • Analyse de données • Gestion de projet • Leadership • Communication", 20, y);
        y += 10;

        // Section: Languages
        doc.setFillColor(41, 128, 185);
        doc.rect(20, y - 4, 170, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.setFontSize(14);
        doc.text("LANGUES", 20, y + 3);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text("Français : Langue maternelle | Anglais : Courant (C1) | Espagnol : Intermédiaire (B1)", 20, y);

      } else {
        // MINIMAL STYLE - Clean and simple with subtle lines
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text("PRÉNOM NOM", 20, 25);

        let y = 35;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Paris, France | contact@email.com | +33 6 12 34 56 78", 20, y);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, y + 3, 190, y + 3);
        y += 12;

        // Section: Professional Objective
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("OBJECTIF PROFESSIONNEL", 20, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y + 2, 190, y + 2);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const objective3 = `Professionnel motivé et dynamique recherchant un poste de ${formData.position} chez ${formData.company}. Fort d'une expérience significative et d'une formation solide, je souhaite contribuer au succès de l'entreprise en apportant mes compétences techniques et mon expertise dans le domaine.`;
        const splitObjective3 = doc.splitTextToSize(objective3, 170);
        doc.text(splitObjective3, 20, y);
        y += splitObjective3.length * 5 + 8;

        // Section: Education
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FORMATION", 20, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y + 2, 190, y + 2);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("2022-2024", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text("Master en Management et Stratégie d'Entreprise", 45, y);
        y += 5;
        doc.text("École de Commerce, Paris", 45, y);
        y += 5;
        doc.text("Mention Très Bien", 45, y);
        y += 8;

        doc.setFont("helvetica", "bold");
        doc.text("2019-2022", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text("Licence en Économie et Gestion", 45, y);
        y += 5;
        doc.text("Université Paris-Dauphine", 45, y);
        y += 5;
        doc.text("Major de promotion", 45, y);
        y += 10;

        // Section: Experience
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("EXPÉRIENCE PROFESSIONNELLE", 20, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y + 2, 190, y + 2);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Juin 2023 - Août 2023", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text("Stage en Stratégie et Développement", 45, y);
        y += 5;
        doc.text("Grande Entreprise Internationale, Paris", 45, y);
        y += 5;
        doc.text("Analyse des opportunités de croissance", 45, y);
        y += 5;
        doc.text("Collaboration avec les équipes marketing et finance", 45, y);
        y += 10;

        // Section: Skills
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("COMPÉTENCES", 20, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y + 2, 190, y + 2);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Pack Office, Analyse de données, Gestion de projet, Leadership, Communication, Adaptabilité", 20, y);
        y += 10;

        // Section: Languages
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("LANGUES", 20, y);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y + 2, 190, y + 2);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Français : Langue maternelle | Anglais : Courant (C1) | Espagnol : Intermédiaire (B1)", 20, y);
      }

    } else {
      // Cover Letter PDF generation
      doc.setFontSize(11);
      let y = 20;

      // Header
      doc.text("PRÉNOM NOM", 20, y);
      y += 5;
      doc.text("Adresse : Paris, France", 20, y);
      y += 5;
      doc.text("Email : contact@email.com | Téléphone : +33 6 12 34 56 78", 20, y);
      y += 10;

      doc.text(today, 20, y);
      y += 10;

      // Recipient
      doc.text("Service Recrutement", 20, y);
      y += 5;
      doc.text(formData.company, 20, y);
      y += 5;
      doc.text("Adresse de l'entreprise", 20, y);
      y += 15;

      // Subject
      doc.setFontSize(12);
      doc.text(`Objet : Candidature au poste de ${formData.position}`, 20, y);
      y += 10;

      // Body
      doc.setFontSize(11);
      doc.text("Madame, Monsieur,", 20, y);
      y += 10;

      const para1 = `C'est avec un vif intérêt que je vous adresse ma candidature pour le poste de ${formData.position} au sein de ${formData.company}. Attiré(e) par votre entreprise reconnue pour son excellence et son innovation, je suis convaincu(e) que mon profil et mes compétences correspondent parfaitement aux exigences de ce poste.`;
      const splitPara1 = doc.splitTextToSize(para1, 170);
      doc.text(splitPara1, 20, y);
      y += splitPara1.length * 5 + 5;

      const para2 = `Fort(e) d'une formation solide en management et stratégie d'entreprise, complétée par plusieurs expériences professionnelles significatives, j'ai développé une expertise approfondie dans la gestion de projets complexes et le pilotage d'équipes.`;
      const splitPara2 = doc.splitTextToSize(para2, 170);
      doc.text(splitPara2, 20, y);
      y += splitPara2.length * 5 + 5;

      const para3 = `Ce qui m'attire particulièrement chez ${formData.company}, c'est votre engagement pour l'innovation, votre culture d'entreprise dynamique et votre vision stratégique à long terme.`;
      const splitPara3 = doc.splitTextToSize(para3, 170);
      doc.text(splitPara3, 20, y);
      y += splitPara3.length * 5 + 5;

      const para4 = `Je reste à votre disposition pour un entretien au cours duquel je pourrai vous présenter plus en détail mon parcours et ma motivation à rejoindre ${formData.company}. Je vous remercie par avance de l'attention que vous porterez à ma candidature.`;
      const splitPara4 = doc.splitTextToSize(para4, 170);
      doc.text(splitPara4, 20, y);
      y += splitPara4.length * 5 + 10;

      doc.text("Cordialement,", 20, y);
      y += 10;
      doc.text("PRÉNOM NOM", 20, y);
    }

    doc.save(type === "cv" ? generatedFiles.cv.name : generatedFiles.coverLetter.name);
  };

  const handlePreviewCv = (cv: GeneratedCvHistoryItem) => {
    console.log("Preview CV:", cv);

    // Si une URL de téléchargement existe, l'ouvrir dans un nouvel onglet
    if (cv.downloadUrl) {
      window.open(cv.downloadUrl, "_blank");
      return;
    }

    // Sinon, générer un aperçu rapide du CV
    const doc = new jsPDF();
    const template = cv.template || "minimal";

    // Générer le PDF selon le template
    generateCvPdf(doc, cv, template);

    // Ouvrir le PDF dans un nouvel onglet au lieu de le télécharger
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
  };

  const generateCvPdf = (doc: jsPDF, cv: GeneratedCvHistoryItem, template: string) => {
    if (template === "harvard") {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("CURRICULUM VITAE", 105, 20, { align: "center" });

      let y = 35;
      doc.setDrawColor(139, 0, 0);
      doc.setLineWidth(1);
      doc.line(20, y - 2, 190, y - 2);
      y += 5;

      doc.setFontSize(16);
      doc.text("PRÉNOM NOM", 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Adresse : Paris, France", 20, y);
      y += 5;
      doc.text("Email : contact@email.com | Téléphone : +33 6 12 34 56 78", 20, y);
      y += 10;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(139, 0, 0);
      doc.text("CANDIDATURE", 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      if (cv.role) {
        doc.text(`Poste visé : ${cv.role}`, 20, y);
        y += 5;
      }
      if (cv.company) {
        doc.text(`Entreprise : ${cv.company}`, 20, y);
        y += 5;
      }

      y += 5;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(139, 0, 0);
      doc.text("PROFIL", 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const profileText = `Candidat motivé pour rejoindre ${cv.company || "votre entreprise"} en tant que ${cv.role || "professionnel qualifié"}. Prêt à apporter mes compétences et mon expérience pour contribuer au succès de l'équipe.`;
      const splitProfile = doc.splitTextToSize(profileText, 170);
      doc.text(splitProfile, 20, y);
      y += splitProfile.length * 5 + 10;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(139, 0, 0);
      doc.text("EXPÉRIENCE PROFESSIONNELLE", 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("Veuillez compléter cette section avec votre expérience.", 20, y);
      y += 10;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(139, 0, 0);
      doc.text("FORMATION", 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("Veuillez compléter cette section avec votre formation.", 20, y);
    } else if (template === "modern") {
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PRÉNOM NOM", 105, 15, { align: "center" });
      doc.setFontSize(11);
      doc.text("Paris, France | contact@email.com | +33 6 12 34 56 78", 105, 23, { align: "center" });

      let y = 45;
      doc.setTextColor(0, 0, 0);

      doc.setFillColor(41, 128, 185);
      doc.rect(20, y - 4, 170, 1, "F");

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text("CANDIDATURE", 20, y + 3);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      if (cv.role) {
        doc.text(`Poste visé : ${cv.role}`, 20, y);
        y += 5;
      }
      if (cv.company) {
        doc.text(`Entreprise : ${cv.company}`, 20, y);
        y += 5;
      }

      y += 5;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, y - 4, 170, 1, "F");

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text("PROFIL", 20, y + 3);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const profileText = `Candidat motivé pour rejoindre ${cv.company || "votre entreprise"} en tant que ${cv.role || "professionnel qualifié"}.`;
      const splitProfile = doc.splitTextToSize(profileText, 170);
      doc.text(splitProfile, 20, y);
      y += splitProfile.length * 5 + 10;

      doc.setFillColor(41, 128, 185);
      doc.rect(20, y - 4, 170, 1, "F");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text("EXPÉRIENCE", 20, y + 3);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("Veuillez compléter avec votre expérience.", 20, y);
    } else {
      // Template minimal
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("PRÉNOM NOM", 20, 25);

      let y = 35;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Paris, France | contact@email.com | +33 6 12 34 56 78", 20, y);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, y + 3, 190, y + 3);
      y += 12;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("CANDIDATURE", 20, y);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, y + 2, 190, y + 2);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (cv.role) {
        doc.text(`Poste visé : ${cv.role}`, 20, y);
        y += 5;
      }
      if (cv.company) {
        doc.text(`Entreprise : ${cv.company}`, 20, y);
        y += 5;
      }

      y += 7;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PROFIL", 20, y);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y + 2, 190, y + 2);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const profileText = `Candidat motivé pour rejoindre ${cv.company || "votre entreprise"} en tant que ${cv.role || "professionnel qualifié"}.`;
      const splitProfile = doc.splitTextToSize(profileText, 170);
      doc.text(splitProfile, 20, y);
      y += splitProfile.length * 5 + 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("EXPÉRIENCE", 20, y);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y + 2, 190, y + 2);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Veuillez compléter avec votre expérience.", 20, y);
    }
  };

  const handleDownloadStoredCv = (cv: GeneratedCvHistoryItem) => {
    console.log("Download stored CV:", cv);

    if (cv.downloadUrl) {
      window.open(cv.downloadUrl, "_blank");
      return;
    }

    const doc = new jsPDF();
    const template = cv.template || "minimal";

    // Générer le PDF
    generateCvPdf(doc, cv, template);

    // Télécharger le PDF
    doc.save(`${cv.title}.pdf`);
  };

  // Render the job information form
  const renderJobForm = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 ring-1 ring-slate-200/60 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-50 to-white p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <FileTextIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Informations sur le Poste</h2>
                  <p className="text-slate-600 font-medium">Parlez-nous du poste pour lequel vous postulez</p>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Company & Sector Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label htmlFor="company" className="block text-slate-700 font-semibold text-sm tracking-tight">
                    Entreprise
                  </label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="ex: Google, Microsoft, Apple"
                    className="h-12 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl px-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="sector" className="block text-slate-700 font-semibold text-sm tracking-tight">
                    Secteur d'Entreprise
                  </label>
                  <TwoLevelSectorDropdown
                    value={formData.sector}
                    onChange={(value) => handleSelectChange("sector", value)}
                    required
                  />
                </div>
              </div>

              {/* Location Row */}
              <div className="space-y-3">
                <label htmlFor="location" className="block text-slate-700 font-semibold text-sm tracking-tight">
                  Localisation
                </label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="ex: Paris, France"
                  className="h-12 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl px-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
                  required
                />
              </div>

              {/* Position & Experience Type Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label htmlFor="position" className="block text-slate-700 font-semibold text-sm tracking-tight">
                    Intitulé du Poste
                  </label>
                  <Input
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="ex: Ingénieur Logiciel, Chef de Produit"
                    className="h-12 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl px-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="experienceType" className="block text-slate-700 font-semibold text-sm tracking-tight">
                    Type d'Expérience
                  </label>
                  <Select
                    value={formData.experienceType}
                    onValueChange={(value) => handleSelectChange("experienceType", value)}
                    required
                  >
                    <SelectTrigger className="h-12 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl px-4 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200">
                      <SelectValue placeholder="Sélectionnez un type d'expérience" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-0 ring-1 ring-slate-200/60 rounded-2xl shadow-lg">
                      {experienceTypes.map((type) => (
                        <SelectItem 
                          key={type} 
                          value={type}
                          className="rounded-xl hover:bg-blue-50 focus:bg-blue-50 text-slate-700"
                        >
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label htmlFor="startMonth" className="block text-slate-700 font-semibold text-sm tracking-tight">
                    Mois de Début
                  </label>
                  <Select
                    value={formData.startMonth}
                    onValueChange={(value) => handleSelectChange("startMonth", value)}
                    required
                  >
                    <SelectTrigger className="h-12 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl px-4 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200">
                      <SelectValue placeholder="Sélectionnez un mois" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-0 ring-1 ring-slate-200/60 rounded-2xl shadow-lg">
                      {months.map((month) => (
                        <SelectItem 
                          key={month} 
                          value={month}
                          className="rounded-xl hover:bg-blue-50 focus:bg-blue-50 text-slate-700"
                        >
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label htmlFor="startYear" className="block text-slate-700 font-semibold text-sm tracking-tight">
                    Année de Début
                  </label>
                  <Select
                    value={formData.startYear}
                    onValueChange={(value) => handleSelectChange("startYear", value)}
                    required
                  >
                    <SelectTrigger className="h-12 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl px-4 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200">
                      <SelectValue placeholder="Sélectionnez une année" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-0 ring-1 ring-slate-200/60 rounded-2xl shadow-lg">
                      {years.map((year) => (
                        <SelectItem 
                          key={year} 
                          value={year.toString()}
                          className="rounded-xl hover:bg-blue-50 focus:bg-blue-50 text-slate-700"
                        >
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-3">
                <label htmlFor="description" className="block text-slate-700 font-semibold text-sm tracking-tight">
                  Description du Poste
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Collez la description complète du poste ici. Incluez les responsabilités, les exigences et toutes les compétences spécifiques mentionnées..."
                  className="w-full h-40 bg-slate-50/50 border-0 ring-1 ring-slate-200/60 rounded-2xl p-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200 resize-none"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full sm:w-40 h-12 rounded-2xl border-0 ring-1 ring-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200"
                  onClick={handleCancel}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-40 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Continuer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Generated CVs History */}
        <div className="mt-8">
          <GeneratedCvList
            onPreview={(cv) => handlePreviewCv(cv)}
            onDownload={(cv) => handleDownloadStoredCv(cv)}
          />
        </div>

        {/* AI Assistant Tip */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100/50 border-0 ring-1 ring-blue-200/60 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <img
                    src="/logo.png"
                    alt="AI"
                    className="w-6 h-6"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/24x24/white/blue?text=AI";
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-blue-800 font-semibold tracking-tight">Conseil de l'Assistant IA</p>
                <p className="text-slate-700 text-sm leading-relaxed">
                  L'ajout de descriptions de poste détaillées m'aide à générer du contenu plus adapté à votre candidature. Incluez les responsabilités clés, les compétences requises et les détails sur la culture d'entreprise pour de meilleurs résultats.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render the AI Interview
  const renderAIInterview = () => {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Enhanced Header with Full Width */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
          <div className="w-full px-8 py-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent tracking-tight">
                Entretien de Motivation
              </h1>
              <p className="text-slate-600 font-medium">
                Discutons de votre motivation pour ce poste et comprenons pourquoi vous souhaitez rejoindre cette entreprise
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Chat Area - Full Width */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full w-full flex flex-col">
            {/* Messages Container with Full Width */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex animate-fadeIn ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {message.sender === 'ai' && (
                    <div className="flex-shrink-0 mr-4">
                      <img
                        src="/logo.png"
                        alt="AI"
                        className="w-12 h-12 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/48x48/white/blue?text=AI";
                        }}
                      />
                    </div>
                  )}

                  <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                    <div className={`p-5 rounded-3xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-tr-lg shadow-blue-200/50'
                        : 'bg-white/90 text-slate-800 rounded-tl-lg border border-white/40 shadow-slate-200/50'
                    }`}>
                      {message.sender === 'ai' && isComplete && message.content.includes("cliquer ici") ? (
                        <p className="leading-relaxed text-base font-medium">
                          Vous pouvez continuer à justifier votre motivation ou{' '}
                          <button
                            onClick={handleCompleteInterview}
                            className="text-blue-600 underline font-semibold hover:text-blue-700 transition-colors"
                          >
                            cliquer ici pour continuer
                          </button>
                        </p>
                      ) : (
                        <p className="leading-relaxed text-base font-medium">{message.content}</p>
                      )}
                    </div>
                    <div className={`text-xs text-slate-400 mt-2 font-medium ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {message.sender === 'user' ? 'Vous' : 'Agent de Carrière IA'}
                    </div>
                  </div>

                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 ml-4 order-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-slate-200">
                        U
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Enhanced Typing indicator */}
              {isTyping && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex-shrink-0 mr-4">
                    <img
                      src="/logo.png"
                      alt="AI"
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/48x48/white/blue?text=AI";
                      }}
                    />
                  </div>

                  <div className="p-5 bg-white/90 backdrop-blur-sm text-slate-800 rounded-3xl rounded-tl-lg border border-white/40 shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef}></div>
            </div>

            {/* Enhanced Input Area - Full Width */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-t border-white/20 px-8 py-8">
              <div className="flex gap-4 w-full">
                <Input
                  className="flex-1 h-16 rounded-3xl bg-white/90 backdrop-blur-sm border-white/40 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 px-8 text-base placeholder:text-slate-400 shadow-lg font-medium transition-all duration-300"
                  placeholder="Tapez votre réponse ici..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping}
                />
                <Button
                  className="h-16 w-16 rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 ring-2 ring-blue-100 hover:ring-blue-200"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                >
                  <SendIcon className="w-6 h-6 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the document generator UI
  const renderDocumentGenerator = () => {
    // If job info isn't submitted yet, direct user to complete that step first
    if (!jobInfoSubmitted) {
      return (
        <div className="max-w-2xl mx-auto text-center p-8 bg-white rounded-xl shadow-sm">
          <FileTextIcon className="h-16 w-16 mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Informations sur le Poste Requises</h2>
          <p className="text-slate-600 mb-6">
            Veuillez fournir des informations sur le poste pour lequel vous postulez avant de générer les documents.
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setCurrentStep("job-form")}
          >
            Ajouter les Informations du Poste
          </Button>
        </div>
      );
    }
    
    // If interview isn't completed yet, prompt user to complete the interview
    if (!interviewCompleted) {
      return (
        <div className="max-w-2xl mx-auto text-center p-8 bg-white rounded-xl shadow-sm">
          <FileTextIcon className="h-16 w-16 mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Entretien de Motivation Requis</h2>
          <p className="text-slate-600 mb-6">
            Veuillez compléter l'entretien de motivation pour nous aider à personnaliser votre CV et lettre de motivation.
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setCurrentStep("ai-interview")}
          >
            Commencer l'Entretien
          </Button>
        </div>
      );
    }
    
    // If both steps are completed, show the document generator tabs
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Générateur</h1>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="text-red-500 border-red-200"
              onClick={resetProgress}
            >
              Recommencer
            </Button>
          </div>
        </div>
        
        
        
        <Tabs defaultValue="cv-generator" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="cv-generator" className="flex-1">Générateur de CV</TabsTrigger>
            <TabsTrigger value="cl-generator" className="flex-1">Générateur de Lettre de Motivation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cv-generator" className="mt-0">
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-blue-50 p-6 rounded-xl mr-6">
                    <FileIcon className="h-12 w-12 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Générateur de CV</h2>
                    <p className="text-slate-600 mt-1">Générez un CV personnalisé pour {formData.company || "votre entreprise cible"}</p>

                    <Button
                      className="bg-blue-600 mt-4 px-8"
                      onClick={() => handleGenerate("cv")}
                      disabled={isGenerating.cv}
                    >
                      {isGenerating.cv ? "Génération..." : "Générer"}
                    </Button>
                  </div>
                </div>

                {generatedFiles.cv.generated && (
                  <div className="mt-6 p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                    <span className="text-slate-700">{generatedFiles.cv.name}</span>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload("cv")}
                      className="text-blue-600"
                    >
                      Télécharger
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {generatedFiles.cv.generated && (
              <>
                <Card className="mb-8">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Personnaliser le design de votre CV</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Button
                        variant={cvTemplate === "harvard" ? "default" : "outline"}
                        onClick={() => setCvTemplate("harvard")}
                        className={`h-auto py-4 flex flex-col items-center gap-2 ${cvTemplate === "harvard" ? "bg-red-600 hover:bg-red-700" : ""}`}
                      >
                        <span className="font-semibold">Harvard</span>
                        <span className="text-xs opacity-80">Classique académique</span>
                      </Button>
                      <Button
                        variant={cvTemplate === "modern" ? "default" : "outline"}
                        onClick={() => setCvTemplate("modern")}
                        className={`h-auto py-4 flex flex-col items-center gap-2 ${cvTemplate === "modern" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      >
                        <span className="font-semibold">Moderne</span>
                        <span className="text-xs opacity-80">Contemporain et dynamique</span>
                      </Button>
                      <Button
                        variant={cvTemplate === "minimal" ? "default" : "outline"}
                        onClick={() => setCvTemplate("minimal")}
                        className={`h-auto py-4 flex flex-col items-center gap-2 ${cvTemplate === "minimal" ? "bg-slate-600 hover:bg-slate-700" : ""}`}
                      >
                        <span className="font-semibold">Minimal</span>
                        <span className="text-xs opacity-80">Épuré et sobre</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/generator/cv/designer")}
                        className="h-auto py-4 flex flex-col items-center gap-2 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50"
                      >
                        <span className="font-semibold">✏️ Éditer mon design</span>
                        <span className="text-xs opacity-80">Personnalisez la mise en page</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <DocumentView
                  type="cv"
                  template={cvTemplate}
                  data={{
                    name: "Alex Smith",
                    position: formData.position || "Software Engineer",
                    company: formData.company || "Google"
                  }}
                  onDownload={() => handleDownload("cv")}
                />
              </>
            )}
          </TabsContent>
          
          <TabsContent value="cl-generator" className="mt-0">
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-blue-50 p-6 rounded-xl mr-6">
                    <FileTextIcon className="h-12 w-12 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Générateur de Lettre de Motivation</h2>
                    <p className="text-slate-600 mt-1">Générez une lettre de motivation personnalisée pour {formData.company || "votre entreprise cible"}</p>

                    <Button
                      className="bg-blue-600 mt-4 px-8"
                      onClick={() => handleGenerate("coverLetter")}
                      disabled={isGenerating.coverLetter}
                    >
                      {isGenerating.coverLetter ? "Génération..." : "Générer"}
                    </Button>
                  </div>
                </div>
                
                {generatedFiles.coverLetter.generated && (
                  <div className="mt-6 p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                    <span className="text-slate-700">{generatedFiles.coverLetter.name}</span>
                    <Button 
                      variant="outline"
                      onClick={() => handleDownload("coverLetter")}
                      className="text-blue-600"
                    >
                      Télécharger
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {generatedFiles.coverLetter.generated && (
              <DocumentView
                type="coverLetter"
                data={{
                  name: "Alex Smith",
                  position: formData.position || "Internal Communication Manager",
                  company: formData.company || "Google",
                  date: "07/03/2025"
                }}
                onDownload={() => handleDownload("coverLetter")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <main className={`flex ${currentStep === "ai-interview" ? "h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 overflow-hidden" : "min-h-screen bg-gradient-to-br from-slate-50 to-white"}`}>
      <aside className={`${currentStep === "ai-interview" ? "h-full" : "h-full"} w-60 flex-shrink-0`}>
        <NavigationSection />
      </aside>

      {currentStep === "ai-interview" ? (
        renderAIInterview()
      ) : (
        <div className="flex-1 p-8">
          {/* Header with back button for job form */}
          {currentStep === "job-form" && (
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                className="rounded-2xl p-3 h-12 w-12 hover:bg-slate-100 transition-all duration-200"
                onClick={() => navigate(-1)}
              >
                <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Entrer les Informations sur le Poste</h1>
                <p className="text-slate-600 font-medium">Commençons par recueillir des détails sur le poste que vous visez</p>
              </div>
            </div>
          )}

          {/* Render the appropriate content based on the current step */}
          {currentStep === "job-form" && renderJobForm()}
          {currentStep === "document-generation" && renderDocumentGenerator()}
        </div>
      )}
    </main>
  );
};