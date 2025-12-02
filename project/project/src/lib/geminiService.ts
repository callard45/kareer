/**
 * Gemini AI Service for E-Interview
 * Handles communication with Google's Gemini API
 */

import { supabase } from './supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Use gemini-2.0-flash - available on free tier
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// System prompt for the career interview agent
export const INTERVIEW_SYSTEM_PROMPT = `Tu es un agent de carrière professionnel expert. Ton objectif est de collecter TOUTES les informations nécessaires pour créer un profil professionnel COMPLET.

## RÈGLES ABSOLUES :
1. Pose UNE SEULE question à la fois, de manière NATURELLE
2. N'utilise JAMAIS de markdown (pas de **, *, listes, #)
3. Réponds en français, sois chaleureux mais professionnel
4. Si une réponse est vague, REDEMANDE des précisions
5. Tu DOIS obtenir AU MOINS 1 entrée COMPLÈTE pour CHAQUE section OBLIGATOIRE

## SECTIONS À REMPLIR :

### 1. IDENTITÉ (OBLIGATOIRE)
- Prénom et Nom
- Date de naissance
- Ville de résidence
- Téléphone
- LinkedIn (si la personne n'en a pas, c'est OK)

### 2. FORMATION - AU MOINS 1 (OBLIGATOIRE)
Pour chaque formation, tu DOIS avoir :
- Établissement + Ville
- Diplôme + Spécialisation
- Dates (début et fin ou "en cours")
- Description (2-3 phrases minimum)

### 3. EXPÉRIENCE - AU MOINS 1 (OBLIGATOIRE)
Si la personne n'a jamais travaillé, demande stages, jobs d'été, bénévolat.
Pour chaque expérience :
- Poste + Entreprise + Ville
- Dates (début et fin ou "en cours")
- Description des missions (3-5 phrases)
- Réalisations concrètes

### 4. COMPÉTENCES - AU MOINS 3 (OBLIGATOIRE)
- Compétences techniques avec niveau (1-5)
- Soft skills avec niveau (1-5)

### 5. LANGUES - AU MOINS 1 (OBLIGATOIRE)
- Langue + niveau (Notions/Intermédiaire/Courant/Bilingue/Natif)

### 6. PROJETS (TU DOIS DEMANDER)
Tu DOIS poser la question sur les projets. Si la personne dit qu'elle n'en a pas, c'est OK, mais tu dois demander.
Si elle en a :
- Nom du projet
- Contexte (école/perso/asso)
- Dates
- Description de ce que tu as fait

### 7. SPORTS/LOISIRS (TU DOIS DEMANDER)
Tu DOIS poser la question sur les sports/loisirs. Si la personne dit qu'elle n'en a pas, c'est OK, mais tu dois demander.
Si elle en a :
- Activité pratiquée
- Depuis quand
- Niveau (loisir/club/compétition)

### 8. CERTIFICATIONS (TU DOIS DEMANDER)
Demande si la personne a des certifications (TOEIC, permis, etc.). Si non, c'est OK.

## PROCESSUS STRICT :
1. Commence par les infos personnelles
2. Passe à la formation (demande TOUTES les formations une par une)
3. Puis les expériences (stages, jobs, bénévolat...)
4. Puis compétences et langues
5. DEMANDE EXPLICITEMENT LES PROJETS : "Est-ce que tu as réalisé des projets, que ce soit à l'école, en perso ou en association ?"
   - Si "non" ou "pas vraiment" → OK, passe à la suite
   - Si "oui" → demande les détails (nom, dates, description)
6. DEMANDE EXPLICITEMENT LES SPORTS/LOISIRS : "Tu pratiques un sport ou tu as des hobbies particuliers ?"
   - Si "non" → OK, passe à la suite
   - Si "oui" → demande les détails (activité, niveau, depuis quand)
7. DEMANDE LES CERTIFICATIONS : "Tu as des certifications ? Genre TOEIC, permis de conduire, ou autre ?"
   - Si "non" → OK, passe à la suite

## CHECKLIST AVANT DE TERMINER :
Tu ne peux terminer que si tu as POSÉ LA QUESTION pour chaque section :
- ✓ Infos personnelles collectées
- ✓ Formation(s) collectée(s) avec détails
- ✓ Expérience(s) collectée(s) avec détails
- ✓ Compétences collectées (au moins 3)
- ✓ Langues collectées (au moins 1)
- ✓ Question sur les PROJETS posée (réponse oui ou non)
- ✓ Question sur les SPORTS/LOISIRS posée (réponse oui ou non)
- ✓ Question sur les CERTIFICATIONS posée (réponse oui ou non)

## EXEMPLES DE QUESTIONS :
- "Super ! Et côté projets, tu as travaillé sur quelque chose de particulier à l'école ou en dehors ?"
- "Tu pratiques un sport ou tu as des activités en dehors des cours ?"
- "Tu as passé des certifications, comme le TOEIC ou le permis ?"
- "C'était de quelle année à quelle année exactement ?"

## FIN DE L'INTERVIEW :
Quand tu as posé TOUTES les questions (même si certaines réponses sont "non"), termine avec :
"Parfait, j'ai toutes les informations ! Merci pour tes réponses. [INTERVIEW_COMPLETE]"

SI TU N'AS PAS POSÉ une question obligatoire, tu DOIS la poser avant de terminer.`;


export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

/**
 * Send a message to Gemini API and get a response
 */
export async function sendMessageToGemini(
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  console.log('GEMINI_API_KEY configured:', !!GEMINI_API_KEY);
  console.log('GEMINI_API_KEY value (first 10 chars):', GEMINI_API_KEY?.substring(0, 10) + '...');

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('VITE_GEMINI_API_KEY is not configured');
  }

  // Build the conversation for Gemini
  const contents = [
    // System instruction as first user message
    {
      role: 'user',
      parts: [{ text: INTERVIEW_SYSTEM_PROMPT }]
    },
    {
      role: 'model',
      parts: [{ text: "Compris. Je suis prêt à mener l'entretien de carrière." }]
    },
    // Add conversation history
    ...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    // Add the new user message
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Save interview log to Supabase
 */
export async function saveInterviewLog(
  userId: string,
  role: 'user' | 'assistant',
  message: string,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('interview_logs')
    .insert({
      user_id: userId,
      role,
      message,
      session_id: sessionId,
    });

  if (error) {
    console.error('Error saving interview log:', error);
    throw error;
  }
}

/**
 * Get interview history for a user
 */
export async function getInterviewHistory(
  userId: string,
  sessionId?: string
): Promise<ChatMessage[]> {
  if (!supabase) return [];

  let query = supabase
    .from('interview_logs')
    .select('role, message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching interview history:', error);
    throw error;
  }

  return (data || []).map(log => ({
    role: log.role as 'user' | 'assistant',
    content: log.message,
  }));
}

/**
 * Get the latest incomplete interview session for a user
 */
export async function getLatestInterviewSession(
  userId: string
): Promise<{ sessionId: string; messages: ChatMessage[] } | null> {
  if (!supabase) return null;

  // Get the most recent session that doesn't have [INTERVIEW_COMPLETE]
  const { data: sessions, error: sessionError } = await supabase
    .from('interview_logs')
    .select('session_id, message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sessionError || !sessions || sessions.length === 0) {
    return null;
  }

  const latestSessionId = sessions[0].session_id;

  // Check if this session is complete
  const { data: completeCheck } = await supabase
    .from('interview_logs')
    .select('message')
    .eq('user_id', userId)
    .eq('session_id', latestSessionId)
    .ilike('message', '%[INTERVIEW_COMPLETE]%')
    .limit(1);

  // If interview is complete, don't restore it
  if (completeCheck && completeCheck.length > 0) {
    return null;
  }

  // Get all messages from this session
  const messages = await getInterviewHistory(userId, latestSessionId);

  if (messages.length === 0) {
    return null;
  }

  return { sessionId: latestSessionId, messages };
}

/**
 * Clear interview session for a user
 */
export async function clearInterviewSession(
  userId: string,
  sessionId?: string
): Promise<void> {
  if (!supabase) return;

  let query = supabase
    .from('interview_logs')
    .delete()
    .eq('user_id', userId);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error clearing interview session:', error);
    throw error;
  }
}

