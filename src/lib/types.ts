export type LogEntry = {
  id: string;
  user_id: string;
  date: string;
  start_verse_id: number;
  end_verse_id: number;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  id: string;
  user_id: string;
  daily_verse_count_goal: number;
  look_back_date: string | null;
  preferred_bible_version: string;
  preferred_bible_app: string;
  start_page: string;
  theme: string;
  goal_end_date: string | null;
  // Color customization (HSL format: "220 70% 50%")
  primary_light: string | null;
  accent_light: string | null;
  chart_light: string | null;
  primary_dark: string | null;
  accent_dark: string | null;
  chart_dark: string | null;
  // Beam background settings
  beam_color_light: string | null;
  beam_color_dark: string | null;
  beam_width: number | null;
  beam_height: number | null;
  beam_count: number | null;
  beam_speed: number | null;
  beam_noise_intensity: number | null;
  beam_noise_scale: number | null;
  beam_rotation: number | null;
  created_at: string;
  updated_at: string;
};

export type TelegramIdentity = {
  id: string;
  user_id: string;
  telegram_id: string;
  telegram_username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  created_at: string;
};
