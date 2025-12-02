/*
  # Remove Profile-Related Tables

  1. Changes
    - Drop `education_modules` table
    - Drop `education_years` table
    - Drop `education` table
    - Drop `work_experience` table
    - Drop `projects` table
    - Drop `skills` table
    - Drop `languages` table
    - Drop `certifications` table
    - Drop `sports_activities` table
    - Remove all associated RLS policies and indexes
  
  2. Security
    - No security concerns as we're removing these tables entirely
*/

DROP TABLE IF EXISTS education_modules CASCADE;
DROP TABLE IF EXISTS education_years CASCADE;
DROP TABLE IF EXISTS education CASCADE;
DROP TABLE IF EXISTS work_experience CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS languages CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS sports_activities CASCADE;
