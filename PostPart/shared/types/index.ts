// Shared TypeScript types for PostPart platform
// Used across mobile app and admin dashboard

// User Role types
export type UserRole = 'admin' | 'parent' | 'support';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: UserRole;
  role_created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  organization_id?: string | null;
  organization_name?: string | null; // Organization name entered by user (pending validation)
  status: 'active' | 'inactive' | 'suspended';
  status_before_org_change?: string | null; // Stores original status before organization status change
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  allergies?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Center {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string; // District in Uganda (e.g., Kampala, Wakiso, Mukono)
  region?: 'Central' | 'Eastern' | 'Northern' | 'Western'; // Region in Uganda
  description?: string;
  services_offered?: string[]; // Services like infant care, toddler programs, meals, etc.
  operating_schedule?: '6am-6pm' | '24/7' | 'weekdays' | 'weekends' | 'custom';
  custom_hours?: string; // Custom hours description when operating_schedule is 'custom'
  capacity?: number;
  age_range?: string;
  is_verified: boolean;
  verification_date?: string;
  image_url?: string; // Legacy field, kept for backward compatibility
  images?: string[]; // Array of image URLs for slideshow (max 3)
  map_link?: string; // Google Maps or other map link
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface CenterQRCode {
  id: string;
  center_id: string;
  qr_code_value: string;
  is_active: boolean;
  created_at: string;
  activated_at?: string;
  revoked_at?: string;
  created_by: string;
}

export interface CheckIn {
  id: string;
  parent_id: string;
  center_id: string;
  child_id: string;
  qr_code_id: string;
  check_in_time: string;
  check_out_time?: string | null;
  notes?: string;
  created_at: string;
}

export interface CheckInWithDetails extends CheckIn {
  center?: Center;
  child?: Child;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'reminder' | 'approval' | 'center_update' | 'alert';
  priority: 'low' | 'normal' | 'high';
  target_type: 'all' | 'organization' | 'center' | 'individual';
  target_id?: string;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

export interface ParentNotification {
  id: string;
  notification_id: string;
  parent_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationWithStatus extends Notification {
  is_read: boolean;
  read_at?: string;
}

// Admin-only types

export interface Organization {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  plan_type?: 'basic' | 'standard' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  contract_start_date?: string;
  contract_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: string;
  organization_id: string;
  parent_id?: string;
  visit_limit: number;
  period: 'monthly' | 'quarterly' | 'annually';
  period_start_date: string;
  period_end_date: string;
  visits_used: number;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  report_type: 'usage' | 'billing' | 'compliance' | 'custom';
  organization_id?: string;
  date_range_start: string;
  date_range_end: string;
  generated_by: string;
  generated_at: string;
  data: Record<string, any>;
}

// API Response types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Access Log types

export interface AccessLogSummary {
  center_id: string;
  center_name: string;
  visit_count: number;
  last_visit_date: string;
}

export interface AccessLogDetail {
  check_in_id: string;
  center_name: string;
  child_name: string;
  check_in_time: string;
}

// Form types

export interface AuthFormData {
  email: string;
  phone?: string;
}

export interface ChildFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  allergies?: string;
  notes?: string;
}

export interface NotificationFormData {
  title: string;
  message: string;
  type: Notification['type'];
  priority: Notification['priority'];
  target_type: Notification['target_type'];
  target_id?: string;
  expires_at?: string;
}

