-- =====================================================
-- KAREER Database Creation Script
-- Complete schema for initializing a new Supabase project
-- Date: 2024-11-28
-- =====================================================

-- =====================================================
-- 1. SCHOOLS TABLE
-- Central table for educational institutions
-- =====================================================
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr')),
    logo_url TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Schools are readable by authenticated users
CREATE POLICY "Schools are viewable by authenticated users"
    ON schools FOR SELECT
    TO authenticated
    USING (true);

-- Only super_admins can manage schools
CREATE POLICY "Super admins can manage schools"
    ON schools FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE schools IS 'Educational institutions using the Kareer platform';

-- =====================================================
-- 2. SUPER_ADMINS TABLE
-- Platform-wide administrators
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can view themselves
CREATE POLICY "Super admins can view themselves"
    ON super_admins FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Service role full access super_admins"
    ON super_admins FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE super_admins IS 'Platform-wide administrators with full access';

-- =====================================================
-- 3. SCHOOL_ADMINS TABLE
-- School-specific administrators
-- =====================================================
CREATE TABLE IF NOT EXISTS school_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;

-- School admins can view themselves
CREATE POLICY "School admins can view themselves"
    ON school_admins FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Service role full access school_admins"
    ON school_admins FOR ALL
    USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON school_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_email ON school_admins(email);

COMMENT ON TABLE school_admins IS 'School-specific administrators';

-- =====================================================
-- 4. COACHES TABLE
-- Career coaches associated with schools
-- =====================================================
CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Coaches can view themselves
CREATE POLICY "Coaches can view themselves"
    ON coaches FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Coaches can update their own profile
CREATE POLICY "Coaches can update themselves"
    ON coaches FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access coaches"
    ON coaches FOR ALL
    USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coaches_school_id ON coaches(school_id);
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

COMMENT ON TABLE coaches IS 'Career coaches associated with schools';
COMMENT ON COLUMN coaches.school_id IS 'École à laquelle le coach est rattaché';

-- =====================================================
-- 5. STUDENTS TABLE
-- Students enrolled in schools
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    phone TEXT,
    program TEXT,
    graduation_year TEXT,
    bio TEXT,
    avatar_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    profile_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Students can view themselves
CREATE POLICY "Students can view themselves"
    ON students FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Students can update their own profile
CREATE POLICY "Students can update themselves"
    ON students FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Coaches can view students from their school
CREATE POLICY "Coaches can view students from their school"
    ON students FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM coaches
            WHERE coaches.id = auth.uid()
            AND coaches.school_id = students.school_id
        )
    );

-- School admins can view students from their school
CREATE POLICY "School admins can view students from their school"
    ON students FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM school_admins
            WHERE school_admins.id = auth.uid()
            AND school_admins.school_id = students.school_id
        )
    );

CREATE POLICY "Service role full access students"
    ON students FOR ALL
    USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

COMMENT ON TABLE students IS 'Students enrolled in schools using Kareer';

-- =====================================================
-- 6. PASSWORD_RESETS TABLE
-- Temporary codes for password reset flow
-- =====================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_code CHECK (length(code) = 6)
);

-- Enable RLS
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Only service role can access password_resets
CREATE POLICY "Service role only password_resets"
    ON password_resets FOR ALL
    USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);

COMMENT ON TABLE password_resets IS 'Temporary 6-digit codes for password reset (15 min expiration)';

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void AS $$
BEGIN
    DELETE FROM password_resets
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_expired_password_resets() TO service_role;

-- =====================================================
-- 7. JOB_APPLICATIONS TABLE
-- Student job applications tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'Temps plein',
    status TEXT NOT NULL DEFAULT 'Candidaté',
    applied_date TIMESTAMPTZ DEFAULT NOW(),
    interview_date TIMESTAMPTZ,
    offer_deadline TIMESTAMPTZ,
    rejection_reason TEXT,
    description TEXT DEFAULT '',
    requirements JSONB DEFAULT '[]'::jsonb,
    logo_url TEXT,
    cv_url TEXT,
    cover_letter_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON job_applications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can insert own applications"
    ON job_applications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own applications
CREATE POLICY "Users can update own applications"
    ON job_applications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own applications
CREATE POLICY "Users can delete own applications"
    ON job_applications FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

COMMENT ON TABLE job_applications IS 'Student job applications for career tracking';

-- =====================================================
-- 8. STORAGE BUCKET FOR DOCUMENTS
-- CV and cover letter storage
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-documents', 'job-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-documents bucket
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'job-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'job-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'job-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'job-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'job-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can view job documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-documents');

-- =====================================================
-- 9. UTILITY FUNCTIONS
-- Helper functions for the application
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_super_admins_updated_at
    BEFORE UPDATE ON super_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_admins_updated_at
    BEFORE UPDATE ON school_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at
    BEFORE UPDATE ON coaches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF DATABASE CREATION SCRIPT
-- =====================================================

