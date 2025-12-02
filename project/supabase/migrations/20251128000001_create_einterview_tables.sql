-- =====================================================
-- E-Interview Tables Migration
-- Tables for AI interview feature with Gemini
-- Date: 2025-11-28
-- =====================================================

-- =====================================================
-- 1. INTERVIEW_LOGS TABLE
-- Stores chat history between user and Gemini AI
-- =====================================================
CREATE TABLE IF NOT EXISTS interview_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE interview_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own interview logs
CREATE POLICY "Users can view own interview_logs"
    ON interview_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own interview logs
CREATE POLICY "Users can insert own interview_logs"
    ON interview_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interview_logs_user_id ON interview_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_logs_session_id ON interview_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_logs_created_at ON interview_logs(created_at);

COMMENT ON TABLE interview_logs IS 'Chat history for E-Interview with Gemini AI';
COMMENT ON COLUMN interview_logs.session_id IS 'Groups messages from the same interview session';

-- =====================================================
-- 2. PROFILE_GENERAL TABLE
-- Basic personal information extracted from interview
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_general (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    birthdate DATE,
    nationality TEXT,
    phone TEXT,
    location TEXT,
    bio TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    career_goals TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_general ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_general"
    ON profile_general FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_general"
    ON profile_general FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_general"
    ON profile_general FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_general_user_id ON profile_general(user_id);

COMMENT ON TABLE profile_general IS 'General profile information extracted from E-Interview';

-- =====================================================
-- 3. PROFILE_EDUCATION TABLE
-- Education history extracted from interview
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    location TEXT,
    gpa TEXT,
    description TEXT,
    modules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_education"
    ON profile_education FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_education"
    ON profile_education FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_education"
    ON profile_education FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_education_user_id ON profile_education(user_id);

COMMENT ON TABLE profile_education IS 'Education history extracted from E-Interview';

-- =====================================================
-- 4. PROFILE_WORK_EXPERIENCE TABLE
-- Work experience extracted from interview
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    position TEXT NOT NULL,
    company TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    location TEXT,
    description TEXT,
    achievements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_work_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_work_experience"
    ON profile_work_experience FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_work_experience"
    ON profile_work_experience FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_work_experience"
    ON profile_work_experience FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_work_experience_user_id ON profile_work_experience(user_id);

COMMENT ON TABLE profile_work_experience IS 'Work experience extracted from E-Interview';

-- =====================================================
-- 5. PROFILE_SKILLS TABLE
-- Skills extracted from interview
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    level INTEGER CHECK (level >= 1 AND level <= 5),
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_skills"
    ON profile_skills FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_skills"
    ON profile_skills FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_skills"
    ON profile_skills FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile_skills"
    ON profile_skills FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_skills_user_id ON profile_skills(user_id);

COMMENT ON TABLE profile_skills IS 'Skills extracted from E-Interview';

-- =====================================================
-- 6. PROFILE_LANGUAGES TABLE
-- Languages spoken by user
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('Débutant', 'Intermédiaire', 'Avancé', 'Courant', 'Natif')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_languages"
    ON profile_languages FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_languages"
    ON profile_languages FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_languages"
    ON profile_languages FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile_languages"
    ON profile_languages FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_languages_user_id ON profile_languages(user_id);

COMMENT ON TABLE profile_languages IS 'Languages spoken, extracted from E-Interview';

-- =====================================================
-- 7. PROFILE_PROJECTS TABLE
-- Projects and achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    url TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    key_learnings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_projects"
    ON profile_projects FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_projects"
    ON profile_projects FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_projects"
    ON profile_projects FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile_projects"
    ON profile_projects FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_projects_user_id ON profile_projects(user_id);

COMMENT ON TABLE profile_projects IS 'Projects and achievements from E-Interview';

-- =====================================================
-- 8. PROFILE_CERTIFICATIONS TABLE
-- Professional certifications
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    credential_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_certifications"
    ON profile_certifications FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_certifications"
    ON profile_certifications FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_certifications"
    ON profile_certifications FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile_certifications"
    ON profile_certifications FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_certifications_user_id ON profile_certifications(user_id);

COMMENT ON TABLE profile_certifications IS 'Certifications from E-Interview';

-- =====================================================
-- 9. PROFILE_SPORTS TABLE
-- Sports and extracurricular activities
-- =====================================================
CREATE TABLE IF NOT EXISTS profile_sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    club TEXT,
    position TEXT,
    level TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    achievements JSONB DEFAULT '[]'::jsonb,
    key_learnings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile_sports"
    ON profile_sports FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile_sports"
    ON profile_sports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile_sports"
    ON profile_sports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile_sports"
    ON profile_sports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_sports_user_id ON profile_sports(user_id);

COMMENT ON TABLE profile_sports IS 'Sports and activities from E-Interview';

-- =====================================================
-- 10. TRIGGERS FOR updated_at
-- =====================================================
CREATE TRIGGER update_profile_general_updated_at
    BEFORE UPDATE ON profile_general
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_education_updated_at
    BEFORE UPDATE ON profile_education
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_work_experience_updated_at
    BEFORE UPDATE ON profile_work_experience
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_projects_updated_at
    BEFORE UPDATE ON profile_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_sports_updated_at
    BEFORE UPDATE ON profile_sports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF E-INTERVIEW MIGRATION
-- =====================================================

