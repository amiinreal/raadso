-- Migration: Add rejection template columns to jobs table
ALTER TABLE jobs 
ADD COLUMN rejection_subject TEXT,
ADD COLUMN rejection_message TEXT;
