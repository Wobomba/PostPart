-- PostPart Database Schema
-- B2B Childcare Access Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (Admin-only)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  plan_type TEXT CHECK (plan_type IN ('basic', 'standard', 'premium', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  contract_start_date TIMESTAMP WITH TIME ZONE,
  contract_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (Parent users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Children table
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Centers table (Daycare centers/schools)
CREATE TABLE centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  description TEXT,
  hours_of_operation TEXT,
  amenities TEXT[], -- Array of amenities
  capacity INTEGER,
  age_range TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  images TEXT[], -- Array of image URLs for slideshow (max 3)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Center QR Codes table
CREATE TABLE center_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  qr_code_value TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Check-ins table
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  qr_code_id UUID NOT NULL REFERENCES center_qr_codes(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'reminder', 'approval', 'center_update', 'alert')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'organization', 'center', 'individual')),
  target_id UUID, -- Can reference organization_id, center_id, or parent_id depending on target_type
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Parent Notifications junction table (tracks read status)
CREATE TABLE parent_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, parent_id)
);

-- Allocations table (Admin-only, tracks visit limits)
CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  visit_limit INTEGER NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'annually')),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  visits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (parent_id IS NOT NULL OR organization_id IS NOT NULL)
);

-- Reports table (Admin-only)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL CHECK (report_type IN ('usage', 'billing', 'compliance', 'custom')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_checkins_parent ON checkins(parent_id);
CREATE INDEX idx_checkins_center ON checkins(center_id);
CREATE INDEX idx_checkins_child ON checkins(child_id);
CREATE INDEX idx_checkins_time ON checkins(check_in_time);
CREATE INDEX idx_qr_codes_center ON center_qr_codes(center_id);
CREATE INDEX idx_qr_codes_value ON center_qr_codes(qr_code_value);
CREATE INDEX idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX idx_parent_notifications_parent ON parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_unread ON parent_notifications(parent_id, is_read);
CREATE INDEX idx_allocations_org ON allocations(organization_id);
CREATE INDEX idx_allocations_parent ON allocations(parent_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Children policies
CREATE POLICY "Parents can view own children"
  ON children FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own children"
  ON children FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own children"
  ON children FOR DELETE
  USING (auth.uid() = parent_id);

-- Centers policies (parents can view verified centers)
CREATE POLICY "Anyone can view verified centers"
  ON centers FOR SELECT
  USING (is_verified = TRUE);

-- Center QR codes policies (read-only for validation)
CREATE POLICY "Anyone can view active QR codes"
  ON center_qr_codes FOR SELECT
  USING (is_active = TRUE);

-- Check-ins policies
CREATE POLICY "Parents can view own check-ins"
  ON checkins FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own check-ins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- Notifications policies
CREATE POLICY "Parents can view notifications targeted to them"
  ON notifications FOR SELECT
  USING (
    target_type = 'all' OR
    (target_type = 'individual' AND target_id = auth.uid()) OR
    (target_type = 'organization' AND target_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ))
  );

-- Parent notifications policies
CREATE POLICY "Parents can view own notification status"
  ON parent_notifications FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update own notification status"
  ON parent_notifications FOR UPDATE
  USING (auth.uid() = parent_id);

-- Admin-only tables: organizations, allocations, reports
-- These will be accessed via service role or admin claims
-- No public RLS policies

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocations_updated_at
  BEFORE UPDATE ON allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to create parent notification records when a notification is created
CREATE OR REPLACE FUNCTION create_parent_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_type = 'all' THEN
    INSERT INTO parent_notifications (notification_id, parent_id)
    SELECT NEW.id, p.id FROM profiles p;
  ELSIF NEW.target_type = 'organization' THEN
    INSERT INTO parent_notifications (notification_id, parent_id)
    SELECT NEW.id, p.id FROM profiles p WHERE p.organization_id = NEW.target_id;
  ELSIF NEW.target_type = 'individual' THEN
    INSERT INTO parent_notifications (notification_id, parent_id)
    VALUES (NEW.id, NEW.target_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_parent_notifications
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION create_parent_notifications();

