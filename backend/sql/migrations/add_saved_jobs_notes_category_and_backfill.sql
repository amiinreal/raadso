-- Ensure saved_jobs has notes/category columns and backfill from job_interactions
BEGIN;

-- Add missing columns if not present
ALTER TABLE saved_jobs
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- Backfill saved_jobs from historical job_interactions of type 'saved'
INSERT INTO saved_jobs (candidate_id, job_id, notes, category, saved_at)
SELECT ji.candidate_id,
       ji.job_id,
       NULL AS notes,
       'General' AS category,
       COALESCE(ji.created_at, now()) AS saved_at
FROM job_interactions ji
LEFT JOIN saved_jobs sj
  ON sj.candidate_id = ji.candidate_id
 AND sj.job_id = ji.job_id
WHERE ji.interaction_type = 'saved'
  AND sj.id IS NULL;

COMMIT;
