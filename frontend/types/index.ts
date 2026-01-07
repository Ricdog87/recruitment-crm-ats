// Enums
export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  RECRUITER = "RECRUITER",
  VIEWER = "VIEWER",
}

export enum WorkModel {
  REMOTE = "REMOTE",
  HYBRID = "HYBRID",
  ONSITE = "ONSITE",
}

export enum Seniority {
  JUNIOR = "JUNIOR",
  MEDIOR = "MEDIOR",
  SENIOR = "SENIOR",
  LEAD = "LEAD",
  PRINCIPAL = "PRINCIPAL",
}

export enum ProjectStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
}

export enum SubmissionStatus {
  SUBMITTED = "SUBMITTED",
  IN_REVIEW = "IN_REVIEW",
  INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED",
  OFFER_SENT = "OFFER_SENT",
  HIRED = "HIRED",
  REJECTED = "REJECTED",
}

export enum ActivityType {
  NOTE = "NOTE",
  EMAIL = "EMAIL",
  CALL = "CALL",
  MEETING = "MEETING",
  TASK = "TASK",
}

// Main entities
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  team_memberships?: TeamMember[];
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  team?: Team;
  user?: User;
}

export interface Company {
  id: string;
  team_id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact[];
  projects?: Project[];
}

export interface Contact {
  id: string;
  team_id: string;
  company_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Project {
  id: string;
  team_id: string;
  company_id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  required_languages: string[];
  min_years_experience?: number;
  seniority?: Seniority;
  work_model: WorkModel;
  location?: string;
  plz?: string;
  max_distance_km?: number;
  salary_min?: number;
  salary_max?: number;
  fee_percentage?: number;
  start_date?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  company?: Company;
  submissions?: Submission[];
}

export interface Candidate {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  skills: string[];
  languages: string[];
  years_experience?: number;
  seniority?: Seniority;
  current_position?: string;
  current_company?: string;
  current_salary?: number;
  desired_salary?: number;
  work_model_preference?: WorkModel;
  location?: string;
  plz?: string;
  willing_to_relocate: boolean;
  availability_date?: string;
  cv_url?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  team_id: string;
  project_id: string;
  candidate_id: string;
  status: SubmissionStatus;
  submitted_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  candidate?: Candidate;
}

export interface Activity {
  id: string;
  team_id: string;
  user_id: string;
  related_type: string;
  related_id: string;
  type: ActivityType;
  description: string;
  notes?: string;
  created_at: string;
  user?: User;
}

export interface MatchResult {
  candidate_id: string;
  candidate: Candidate;
  score: number;
  distance_km: number | null;
  short_reason: string;
  hard_filters_passed: boolean;
}

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  team_name: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Dashboard stats
export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_candidates: number;
  total_submissions: number;
  recent_activities: Activity[];
}
