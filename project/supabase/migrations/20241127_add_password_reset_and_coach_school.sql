-- =====================================================
-- Migration: Add password reset table and school_id to coaches
-- Date: 2024-11-27
-- Description: 
--   1. Adds school_id to coaches table for language support
--   2. Creates password_resets table for 6-digit code reset flow
-- =====================================================

-- 1. Add school_id to coaches table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coaches' AND column_name = 'school_id'
    ) THEN
        ALTER TABLE coaches ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
        CREATE INDEX idx_coaches_school_id ON coaches(school_id);
        COMMENT ON COLUMN coaches.school_id IS 'École à laquelle le coach est rattaché';
    END IF;
END $$;

-- 2. Create password_resets table (if not exists)
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_code CHECK (length(code) = 6)
);

-- 3. Create indexes for password_resets
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);

-- 4. Add comment
COMMENT ON TABLE password_resets IS 'Stockage des codes de réinitialisation de mot de passe à 6 chiffres (15 min expiration)';

-- 5. Enable RLS
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- 6. Create policy for service role only
DROP POLICY IF EXISTS "Service role only" ON password_resets;
CREATE POLICY "Service role only" ON password_resets 
    FOR ALL 
    USING (auth.role() = 'service_role');

-- 7. Create function to clean up expired codes (optional, can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void AS $$
BEGIN
    DELETE FROM password_resets 
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_password_resets() TO service_role;

