-- Add goal end date column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS goal_end_date date;

COMMENT ON COLUMN user_settings.goal_end_date IS 'Target date to finish reading the Bible, used for plan tracking';
