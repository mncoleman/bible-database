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
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      log_entries: {
        Row: LogEntry;
        Insert: Omit<LogEntry, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<LogEntry, "id" | "created_at" | "updated_at">>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<UserSettings, "id" | "created_at" | "updated_at">
        >;
      };
    };
  };
};
