/**
 * Profile Extractor Service
 * Uses Gemini to extract structured profile data from interview conversations
 */

import { supabase } from './supabase';
import { ChatMessage } from './geminiService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Use gemini-2.0-flash - available on free tier
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Extraction prompt for Gemini
const EXTRACTION_PROMPT = `Tu es un expert en extraction de données. Analyse cette conversation d'entretien de carrière et extrait TOUTES les informations mentionnées de manière EXHAUSTIVE.

## INSTRUCTIONS CRITIQUES:
1. Extrait CHAQUE information mentionnée, même si elle semble mineure
2. Pour les dates, convertis les formats français (ex: "septembre 2022" → "2022-09", "mars 2025" → "2025-03")
3. Si une date de fin n'est pas mentionnée et c'est en cours, mets is_current: true
4. Génère une bio professionnelle de 2-3 phrases basée sur le profil global
5. Déduis les informations implicites (ex: si quelqu'un dit "je suis en 3ème année", calcule la date de début)
6. Ne crée PAS de doublons - chaque expérience/formation/projet doit apparaître UNE SEULE fois
7. Enrichis les descriptions en reformulant de manière professionnelle

## ATTENTION PARTICULIÈRE - PROJETS:
- Les PROJETS sont souvent mentionnés comme "projet", "travail de groupe", "initiative", "j'ai créé", "j'ai développé"
- Même un projet scolaire ou personnel DOIT être extrait
- Si le candidat mentionne un nom de projet (ex: "EcoStart"), c'est un projet à extraire

## ATTENTION PARTICULIÈRE - CERTIFICATIONS:
- Le TOEIC, TOEFL, permis de conduire, certifications Google, Microsoft, etc. sont des CERTIFICATIONS
- Extrait chaque certification mentionnée avec son score si disponible

## FORMAT DE SORTIE (JSON uniquement, pas de texte avant ou après):
{
  "general": {
    "first_name": "Prénom",
    "last_name": "Nom",
    "birthdate": "YYYY-MM-DD",
    "nationality": "Nationalité",
    "phone": "+33...",
    "location": "Ville, Pays",
    "bio": "Bio professionnelle générée de 2-3 phrases décrivant le profil",
    "linkedin_url": "https://linkedin.com/in/...",
    "portfolio_url": "https://...",
    "career_goals": "Objectifs de carrière détaillés (court et long terme)"
  },
  "education": [
    {
      "institution": "Nom de l'école",
      "degree": "Type de diplôme (Bachelor, Master, Licence...)",
      "field_of_study": "Domaine/Spécialisation",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM ou null si en cours",
      "is_current": true/false,
      "location": "Ville",
      "gpa": "Note si mentionnée",
      "description": "Description enrichie de la formation, matières étudiées, compétences acquises"
    }
  ],
  "work_experience": [
    {
      "position": "Intitulé exact du poste",
      "company": "Nom de l'entreprise",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM ou null",
      "is_current": true/false,
      "location": "Ville",
      "description": "Description détaillée des missions, responsabilités et contexte (3-5 phrases)",
      "achievements": ["Réalisation 1 avec résultats concrets", "Réalisation 2..."]
    }
  ],
  "skills": [
    { "name": "Nom de la compétence", "level": 1-5, "category": "technique/soft/outil/framework" }
  ],
  "languages": [
    { "name": "Langue", "level": "Notions/Intermédiaire/Avancé/Courant/Bilingue/Natif" }
  ],
  "projects": [
    {
      "name": "Nom du projet",
      "organization": "Contexte (école, entreprise, personnel)",
      "description": "Description complète du projet, objectifs et résultats",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "is_current": false,
      "url": "URL si mentionnée",
      "technologies": ["Tech 1", "Tech 2"],
      "key_learnings": ["Apprentissage clé 1", "Apprentissage clé 2"]
    }
  ],
  "certifications": [
    {
      "name": "Nom certification (ex: TOEIC 905/990, Permis B, Google Analytics...)",
      "provider": "Organisme (ex: ETS, Google, Préfecture...)",
      "date_obtained": "YYYY-MM",
      "score": "Score si mentionné (ex: 905/990)"
    }
  ],
  "sports": [
    {
      "name": "Sport/Activité",
      "club": "Nom du club si mentionné",
      "position": "Poste/Rôle",
      "level": "Niveau (Loisir/Club/Compétition/Régional/National)",
      "start_date": "YYYY",
      "is_current": true/false,
      "description": "Description de la pratique et ce que ça apporte",
      "achievements": ["Réalisation sportive"],
      "key_learnings": ["Ce que le sport m'a appris: travail d'équipe, discipline..."]
    }
  ]
}

## RÈGLES DE CONVERSION DES DATES:
- "septembre 2022" → "2022-09"
- "2022" → "2022-01"
- "actuellement" / "en cours" / "présent" → is_current: true, end_date: null
- "depuis 2020" → start_date: "2020-01", is_current: true

## RÈGLES POUR LES NIVEAUX:
- Compétences: 1=Notions, 2=Débutant, 3=Intermédiaire, 4=Avancé, 5=Expert
- Si "maîtrise", "expert" → 5
- Si "bonne connaissance", "avancé" → 4
- Si aucune indication → 3

## IMPORTANT:
- Génère une bio professionnelle cohérente basée sur l'ensemble du profil
- Enrichis les descriptions pour qu'elles soient professionnelles
- NE DUPLIQUE JAMAIS les entrées
- Retourne UNIQUEMENT le JSON, sans texte avant ou après`;

export interface ExtractedProfile {
  general: ProfileGeneral;
  education: ProfileEducation[];
  work_experience: ProfileWorkExperience[];
  skills: ProfileSkill[];
  languages: ProfileLanguage[];
  projects: ProfileProject[];
  certifications: ProfileCertification[];
  sports: ProfileSport[];
}

interface ProfileGeneral {
  first_name?: string;
  last_name?: string;
  birthdate?: string;
  nationality?: string;
  phone?: string;
  location?: string;
  bio?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  career_goals?: string;
}

interface ProfileEducation {
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  location?: string;
  gpa?: string;
  description?: string;
}

interface ProfileWorkExperience {
  position: string;
  company: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  location?: string;
  description?: string;
  achievements?: string[];
}

interface ProfileSkill {
  name: string;
  level?: number;
  category?: string;
}

interface ProfileLanguage {
  name: string;
  level: string;
}

interface ProfileProject {
  name: string;
  organization?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  url?: string;
  skills?: string[];
  key_learnings?: string[];
}

interface ProfileCertification {
  name: string;
  provider: string;
  issue_date?: string;
}

interface ProfileSport {
  name: string;
  club?: string;
  position?: string;
  level?: string;
  description?: string;
  achievements?: string[];
  key_learnings?: string[];
}

/**
 * Extract structured profile data from interview conversation
 */
export async function extractProfileFromConversation(
  conversationHistory: ChatMessage[]
): Promise<ExtractedProfile> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not configured');
  }

  // Format conversation for extraction
  const conversationText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Candidat' : 'Agent'}: ${msg.content}`)
    .join('\n\n');

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${EXTRACTION_PROMPT}\n\nConversation:\n${conversationText}` }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  console.log('=== EXTRACTION RESPONSE FROM GEMINI ===');
  console.log('Raw text:', text);

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  console.log('Parsed JSON string:', jsonStr);

  const extracted = JSON.parse(jsonStr);

  console.log('=== EXTRACTED PROFILE ===');
  console.log('Projects:', extracted.projects);
  console.log('Certifications:', extracted.certifications);
  console.log('Skills:', extracted.skills);
  console.log('Sports:', extracted.sports);

  return extracted;
}

/**
 * Helper to clean date strings for Supabase DATE columns
 */
function cleanDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || dateStr === '') return null;

  // Try to parse various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Handle "Month Year" format (e.g., "Septembre 2023")
  const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/);
  if (monthYearMatch) {
    const months: Record<string, string> = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12',
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    const month = months[monthYearMatch[1].toLowerCase()] || '01';
    return `${monthYearMatch[2]}-${month}-01`;
  }

  return null;
}

/**
 * Clean object by removing empty strings and undefined values
 */
function cleanObject(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== '' && value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Save extracted profile to Supabase tables
 */
export async function saveProfileToSupabase(
  userId: string,
  profile: ExtractedProfile
): Promise<void> {
  console.log('Saving profile to Supabase:', profile);

  // Delete old data first to avoid duplicates
  console.log('Deleting old profile data for user:', userId);
  const tablesToClear = [
    'profile_education',
    'profile_work_experience',
    'profile_skills',
    'profile_languages',
    'profile_projects',
    'profile_certifications',
    'profile_sports'
  ];

  for (const table of tablesToClear) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId);
    if (error) console.error(`Error deleting from ${table}:`, error);
  }
  console.log('Old data deleted successfully');

  // Save general profile (upsert)
  if (profile.general && Object.keys(profile.general).length > 0) {
    const cleanedGeneral = cleanObject({
      user_id: userId,
      ...profile.general,
      birthdate: cleanDate(profile.general.birthdate)
    });
    console.log('Saving general:', cleanedGeneral);
    const { error } = await supabase
      .from('profile_general')
      .upsert(cleanedGeneral, { onConflict: 'user_id' });
    if (error) console.error('Error saving profile_general:', error);
  }

  // Save education
  if (profile.education && profile.education.length > 0) {
    for (const edu of profile.education) {
      if (edu.institution && edu.degree) {
        const cleanedEdu = cleanObject({
          user_id: userId,
          institution: edu.institution,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          start_date: cleanDate(edu.start_date),
          end_date: cleanDate(edu.end_date),
          is_current: edu.is_current,
          location: edu.location,
          gpa: edu.gpa,
          description: edu.description
        });
        console.log('Saving education:', cleanedEdu);
        const { error } = await supabase
          .from('profile_education')
          .insert(cleanedEdu);
        if (error) console.error('Error saving profile_education:', error);
      }
    }
  }

  // Save work experience
  if (profile.work_experience && profile.work_experience.length > 0) {
    for (const exp of profile.work_experience) {
      if (exp.position && exp.company) {
        const cleanedExp = cleanObject({
          user_id: userId,
          position: exp.position,
          company: exp.company,
          start_date: cleanDate(exp.start_date),
          end_date: cleanDate(exp.end_date),
          is_current: exp.is_current,
          location: exp.location,
          description: exp.description,
          achievements: exp.achievements && exp.achievements.length > 0 ? exp.achievements : undefined
        });
        console.log('Saving work experience:', cleanedExp);
        const { error } = await supabase
          .from('profile_work_experience')
          .insert(cleanedExp);
        if (error) console.error('Error saving profile_work_experience:', error);
      }
    }
  }

  // Save skills
  if (profile.skills && profile.skills.length > 0) {
    for (const skill of profile.skills) {
      if (skill.name) {
        const cleanedSkill = cleanObject({
          user_id: userId,
          name: skill.name,
          level: typeof skill.level === 'number' ? skill.level : 3,
          category: skill.category || 'technique'
        });
        const { error } = await supabase
          .from('profile_skills')
          .insert(cleanedSkill);
        if (error) console.error('Error saving profile_skills:', error);
      }
    }
  }

  // Save languages
  if (profile.languages && profile.languages.length > 0) {
    for (const lang of profile.languages) {
      if (lang.name && lang.level) {
        const cleanedLang = cleanObject({
          user_id: userId,
          name: lang.name,
          level: lang.level
        });
        const { error } = await supabase
          .from('profile_languages')
          .insert(cleanedLang);
        if (error) console.error('Error saving profile_languages:', error);
      }
    }
  }

  // Save projects
  if (profile.projects && profile.projects.length > 0) {
    for (const project of profile.projects) {
      if (project.name) {
        const cleanedProject = cleanObject({
          user_id: userId,
          name: project.name,
          organization: project.organization,
          start_date: cleanDate(project.start_date),
          end_date: cleanDate(project.end_date),
          is_current: project.is_current,
          description: project.description,
          technologies: project.technologies && project.technologies.length > 0 ? project.technologies : undefined,
          skills: project.skills && project.skills.length > 0 ? project.skills : undefined,
          key_learnings: project.key_learnings && project.key_learnings.length > 0 ? project.key_learnings : undefined,
          url: project.url
        });
        const { error } = await supabase
          .from('profile_projects')
          .insert(cleanedProject);
        if (error) console.error('Error saving profile_projects:', error);
      }
    }
  }

  // Save certifications
  if (profile.certifications && profile.certifications.length > 0) {
    for (const cert of profile.certifications) {
      if (cert.name) {
        const cleanedCert = cleanObject({
          user_id: userId,
          name: cert.name,
          provider: cert.provider || 'Non spécifié',
          date_obtained: cleanDate(cert.date_obtained),
          expiry_date: cleanDate(cert.expiry_date),
          credential_id: cert.credential_id || cert.score,
          credential_url: cert.credential_url
        });
        const { error } = await supabase
          .from('profile_certifications')
          .insert(cleanedCert);
        if (error) console.error('Error saving profile_certifications:', error);
      }
    }
  }

  // Save sports
  if (profile.sports && profile.sports.length > 0) {
    for (const sport of profile.sports) {
      if (sport.name) {
        const cleanedSport = cleanObject({
          user_id: userId,
          name: sport.name,
          club: sport.club,
          position: sport.position,
          level: sport.level,
          start_date: sport.start_date,
          end_date: sport.end_date,
          is_current: sport.is_current,
          description: sport.description,
          achievements: sport.achievements && sport.achievements.length > 0 ? sport.achievements : undefined,
          key_learnings: sport.key_learnings && sport.key_learnings.length > 0 ? sport.key_learnings : undefined
        });
        const { error } = await supabase
          .from('profile_sports')
          .insert(cleanedSport);
        if (error) console.error('Error saving profile_sports:', error);
      }
    }
  }
}

/**
 * Get user's extracted profile from Supabase
 */
export async function getProfileFromSupabase(userId: string): Promise<ExtractedProfile | null> {
  const [general, education, work_experience, skills, languages, projects, certifications, sports] =
    await Promise.all([
      supabase.from('profile_general').select('*').eq('user_id', userId).single(),
      supabase.from('profile_education').select('*').eq('user_id', userId),
      supabase.from('profile_work_experience').select('*').eq('user_id', userId),
      supabase.from('profile_skills').select('*').eq('user_id', userId),
      supabase.from('profile_languages').select('*').eq('user_id', userId),
      supabase.from('profile_projects').select('*').eq('user_id', userId),
      supabase.from('profile_certifications').select('*').eq('user_id', userId),
      supabase.from('profile_sports').select('*').eq('user_id', userId),
    ]);

  return {
    general: general.data || {},
    education: education.data || [],
    work_experience: work_experience.data || [],
    skills: skills.data || [],
    languages: languages.data || [],
    projects: projects.data || [],
    certifications: certifications.data || [],
    sports: sports.data || [],
  };
}

