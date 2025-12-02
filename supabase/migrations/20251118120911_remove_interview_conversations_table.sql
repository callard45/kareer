/*
  # Remove AI Interview Tables

  1. Changes
    - Drop `interview_conversations` table and all its data
    - Remove all associated RLS policies
  
  2. Security
    - No security concerns as we're removing the table entirely
*/

DROP TABLE IF EXISTS interview_conversations CASCADE;
