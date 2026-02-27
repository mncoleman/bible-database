-- Add beam background settings columns to user_settings
ALTER TABLE user_settings
  ADD COLUMN beam_color_light TEXT,
  ADD COLUMN beam_color_dark TEXT,
  ADD COLUMN beam_width REAL,
  ADD COLUMN beam_height REAL,
  ADD COLUMN beam_count INTEGER,
  ADD COLUMN beam_speed REAL,
  ADD COLUMN beam_noise_intensity REAL,
  ADD COLUMN beam_noise_scale REAL,
  ADD COLUMN beam_rotation REAL;
