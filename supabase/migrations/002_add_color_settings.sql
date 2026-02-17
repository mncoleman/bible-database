-- Add color customization columns to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS primary_light TEXT,
ADD COLUMN IF NOT EXISTS accent_light TEXT,
ADD COLUMN IF NOT EXISTS chart_light TEXT,
ADD COLUMN IF NOT EXISTS primary_dark TEXT,
ADD COLUMN IF NOT EXISTS accent_dark TEXT,
ADD COLUMN IF NOT EXISTS chart_dark TEXT;

-- Add comment explaining the color format
COMMENT ON COLUMN user_settings.primary_light IS 'HSL format: "220 70% 50%" for light mode primary color';
COMMENT ON COLUMN user_settings.accent_light IS 'HSL format: "220 70% 50%" for light mode accent color';
COMMENT ON COLUMN user_settings.chart_light IS 'HSL format: "220 70% 50%" for light mode chart/goal line color';
COMMENT ON COLUMN user_settings.primary_dark IS 'HSL format: "220 70% 50%" for dark mode primary color';
COMMENT ON COLUMN user_settings.accent_dark IS 'HSL format: "220 70% 50%" for dark mode accent color';
COMMENT ON COLUMN user_settings.chart_dark IS 'HSL format: "220 70% 50%" for dark mode chart/goal line color';
