-- Add CHECK constraints for input validation

-- Clamp daily verse goal to valid Bible range (1–31,102 verses)
ALTER TABLE user_settings
  ADD CONSTRAINT daily_verse_count_goal_range
  CHECK (daily_verse_count_goal >= 1 AND daily_verse_count_goal <= 31102);

-- Clamp beam settings to sensible display ranges
ALTER TABLE user_settings
  ADD CONSTRAINT beam_count_range
  CHECK (beam_count IS NULL OR (beam_count >= 1 AND beam_count <= 50)),
  ADD CONSTRAINT beam_speed_range
  CHECK (beam_speed IS NULL OR (beam_speed >= 0 AND beam_speed <= 10)),
  ADD CONSTRAINT beam_width_range
  CHECK (beam_width IS NULL OR (beam_width >= 0 AND beam_width <= 1000)),
  ADD CONSTRAINT beam_height_range
  CHECK (beam_height IS NULL OR (beam_height >= 0 AND beam_height <= 5000)),
  ADD CONSTRAINT beam_noise_intensity_range
  CHECK (beam_noise_intensity IS NULL OR (beam_noise_intensity >= 0 AND beam_noise_intensity <= 1)),
  ADD CONSTRAINT beam_noise_scale_range
  CHECK (beam_noise_scale IS NULL OR (beam_noise_scale >= 0 AND beam_noise_scale <= 100)),
  ADD CONSTRAINT beam_rotation_range
  CHECK (beam_rotation IS NULL OR (beam_rotation >= -360 AND beam_rotation <= 360));
