export interface Participant {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface ScheduleRow {
  id: string;
  participant_id: string;
  talk_date: string; // YYYY-MM-DD
  created_at: string;
}
