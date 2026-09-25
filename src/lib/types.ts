export const DESTINATION_TYPES = [
  "beach",
  "mountain",
  "city",
  "nature",
  "adventure",
  "relaxation",
] as const;

export type DestinationType = (typeof DESTINATION_TYPES)[number];

export type DateRange = {
  start: string; // ISO date (yyyy-mm-dd)
  end: string; // ISO date (yyyy-mm-dd)
};

export type Session = {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO timestamp
  created_at: string;
  locked: boolean;
  max_participants: number | null;
};

export type JoinRequestStatus = "pending" | "approved" | "denied";

export type JoinRequest = {
  id: string;
  session_id: string;
  name: string;
  message: string;
  status: JoinRequestStatus;
  requested_at: string;
  decided_at: string | null;
};

export type Submission = {
  id: string;
  session_id: string;
  name: string;
  budget_min: number;
  budget_max: number;
  date_ranges: DateRange[];
  destination_types: DestinationType[];
  dealbreakers: string;
  submitted_at: string;
  join_request_id: string | null;
};

export type Fit = {
  name: string;
  score: number;
  reason: string;
};

export type DestinationOption = {
  destination: string;
  summary: string;
  fits: Fit[];
};

export type Result = {
  id: string;
  session_id: string;
  generated_at: string;
  options: DestinationOption[];
};
