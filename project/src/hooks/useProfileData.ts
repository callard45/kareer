/**
 * Hook to fetch and manage profile data from Supabase
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getProfileFromSupabase, ExtractedProfile } from '../lib/profileExtractor';

export interface ProfileData {
  // General info
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthdate: string;
  location: string;
  linkedin: string;
  portfolio: string;
  bio: string;
  careerGoals: string;
  nationality: string;
  
  // Skills
  skills: Array<{ name: string; level: number }>;
  
  // Languages
  languages: Array<{ name: string; level: string }>;
  
  // Education
  education: Array<{
    institution: string;
    degree: string;
    field_of_study?: string;
    period: string;
    location?: string;
    gpa?: string;
    is_current?: boolean;
    description?: string;
    modules?: string[];
  }>;
  
  // Work Experience
  workExperience: Array<{
    position: string;
    company: string;
    period: string;
    location?: string;
    description?: string;
    achievements?: string[];
    is_current?: boolean;
  }>;
  
  // Projects
  projects: Array<{
    name: string;
    organization?: string;
    description?: string;
    period: string;
    url?: string;
    skills?: string[];
    key_learnings?: string[];
  }>;
  
  // Certifications
  certifications: Array<{
    name: string;
    provider: string;
    date: string;
  }>;
  
  // Sports
  sports: Array<{
    name: string;
    club?: string;
    position?: string;
    level?: string;
    period: string;
    description?: string;
    achievements?: string[];
    key_learnings?: string[];
  }>;
  
  // Metadata
  profileCompletion: number;
  hasInterviewData: boolean;
}

const defaultProfileData: ProfileData = {
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthdate: '',
  location: '',
  linkedin: '',
  portfolio: '',
  bio: '',
  careerGoals: '',
  nationality: '',
  skills: [],
  languages: [],
  education: [],
  workExperience: [],
  projects: [],
  certifications: [],
  sports: [],
  profileCompletion: 0,
  hasInterviewData: false,
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatPeriod(startDate?: string, endDate?: string, isCurrent?: boolean): string {
  const start = formatDate(startDate);
  if (isCurrent) return `${start} - Présent`;
  const end = formatDate(endDate);
  return start && end ? `${start} - ${end}` : start || end || '';
}

function calculateCompletion(profile: ExtractedProfile): number {
  let score = 0;
  const weights = {
    general: 20,
    education: 20,
    work_experience: 15,
    skills: 15,
    languages: 10,
    projects: 10,
    certifications: 5,
    sports: 5,
  };

  if (profile.general && Object.values(profile.general).some(v => v)) score += weights.general;
  if (profile.education && profile.education.length > 0) score += weights.education;
  if (profile.work_experience && profile.work_experience.length > 0) score += weights.work_experience;
  if (profile.skills && profile.skills.length > 0) score += weights.skills;
  if (profile.languages && profile.languages.length > 0) score += weights.languages;
  if (profile.projects && profile.projects.length > 0) score += weights.projects;
  if (profile.certifications && profile.certifications.length > 0) score += weights.certifications;
  if (profile.sports && profile.sports.length > 0) score += weights.sports;

  return score;
}

export function useProfileData() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getProfileFromSupabase(user.id);
        if (!data) {
          setIsLoading(false);
          return;
        }

        const hasData = data.education.length > 0 || data.skills.length > 0 || 
                        data.work_experience.length > 0 || 
                        (data.general && Object.values(data.general).some(v => v));
        
        // Transform data to ProfileData format
        const transformed: ProfileData = {
          firstName: data.general?.first_name || '',
          lastName: data.general?.last_name || '',
          name: `${data.general?.first_name || ''} ${data.general?.last_name || ''}`.trim(),
          email: user.email || '',
          phone: data.general?.phone || '',
          birthdate: data.general?.birthdate || '',
          location: data.general?.location || '',
          linkedin: data.general?.linkedin_url || '',
          portfolio: data.general?.portfolio_url || '',
          bio: data.general?.bio || '',
          careerGoals: data.general?.career_goals || '',
          nationality: data.general?.nationality || '',
          
          skills: data.skills.map(s => ({ name: s.name, level: (s.level || 3) * 20 })),
          
          languages: data.languages.map(l => ({ name: l.name, level: l.level })),
          
          education: data.education.map(e => ({
            institution: e.institution,
            degree: e.degree,
            field_of_study: e.field_of_study,
            period: formatPeriod(e.start_date, e.end_date, e.is_current),
            location: e.location,
            gpa: e.gpa,
            is_current: e.is_current,
            description: e.description,
            modules: Array.isArray(e.modules) ? e.modules : [],
          })),
          
          workExperience: data.work_experience.map(w => ({
            position: w.position,
            company: w.company,
            period: formatPeriod(w.start_date, w.end_date, w.is_current),
            location: w.location,
            description: w.description,
            achievements: Array.isArray(w.achievements) ? w.achievements : [],
            is_current: w.is_current,
          })),
          
          projects: data.projects.map(p => ({
            name: p.name,
            organization: p.organization,
            description: p.description,
            period: formatPeriod(p.start_date, p.end_date, p.is_current),
            url: p.url,
            skills: Array.isArray(p.skills) ? p.skills : [],
            key_learnings: Array.isArray(p.key_learnings) ? p.key_learnings : [],
          })),
          
          certifications: data.certifications.map(c => ({
            name: c.name,
            provider: c.provider,
            date: formatDate(c.issue_date),
          })),
          
          sports: data.sports.map(s => ({
            name: s.name,
            club: s.club,
            position: s.position,
            level: s.level,
            period: formatPeriod(s.start_date, s.end_date, s.is_current),
            description: s.description,
            achievements: Array.isArray(s.achievements) ? s.achievements : [],
            key_learnings: Array.isArray(s.key_learnings) ? s.key_learnings : [],
          })),
          
          profileCompletion: calculateCompletion(data),
          hasInterviewData: hasData,
        };

        setProfileData(transformed);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Erreur lors du chargement du profil');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  return { profileData, isLoading, error, refetch: () => setIsLoading(true) };
}

