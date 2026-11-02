export type Role = 'customer' | 'provider' | 'admin';

export type Lang = 'en' | 'fr' | 'rw';

export type Currency = 'RWF' | 'USD';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  district?: string;
  language?: Lang;
  is_diaspora?: boolean;
  avatar_color?: string;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_fr: string;
  name_rw: string;
  tagline_en: string;
  tagline_fr: string;
  tagline_rw: string;
  description_en: string;
  description_fr: string;
  description_rw: string;
  icon: string;
  base_price: number;
  unit: string;
  duration: string;
  popular?: boolean;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface Provider {
  id: string;
  user_id?: string;
  full_name: string;
  business_name: string;
  category_slugs: string[];
  skills: string[];
  bio: string;
  verification_status: VerificationStatus;
  rating: number;
  reviews_count: number;
  jobs_completed: number;
  hourly_rate: number;
  district: string;
  sector: string;
  phone: string;
  email: string;
  languages: string[];
  id_document: string;
  certificate: string;
  years_experience: number;
  available: boolean;
  verified_at?: string | null;
  created_at: string;
}

export type BookingStatus =
  | 'pending'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'pending';
export type PaymentMethod = 'mtn_momo' | 'airtel_money' | 'bank_transfer' | 'card' | 'cash';

export interface Booking {
  id: string;
  ref: string;
  customer_id: string;
  customer_name: string;
  provider_id?: string | null;
  provider_name?: string | null;
  category_slug: string;
  category_name: string;
  status: BookingStatus;
  scheduled_date: string;
  time_slot: string;
  address: string;
  district: string;
  sector: string;
  notes?: string;
  amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  for_family: boolean;
  property_id?: string | null;
  family_member_id?: string | null;
  recurring?: string;
  photo_report_requested?: boolean;
  completion_report?: string | null;
  media_urls?: string[];
  created_at: string;
  completed_at?: string | null;
}

export interface Quotation {
  id: string;
  booking_id: string;
  booking_ref: string;
  provider_id: string;
  provider_name: string;
  amount: number;
  message: string;
  eta_days: number;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id?: string | null;
  booking_ref: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  provider_ref: string;
  description: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  provider_id: string;
  provider_name: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export type ComplaintStatus = 'open' | 'investigating' | 'resolved';

export interface Complaint {
  id: string;
  ref: string;
  customer_id: string;
  customer_name: string;
  booking_id?: string | null;
  booking_ref?: string | null;
  subject: string;
  message: string;
  category: string;
  priority: 'low' | 'normal' | 'urgent';
  status: ComplaintStatus;
  resolution?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  audience: Role | 'all';
  title: string;
  body: string;
  kind: 'booking' | 'payment' | 'verification' | 'report' | 'system' | 'complaint';
  read: boolean;
  link?: string;
  created_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  type: 'residence' | 'apartment' | 'farm' | 'commercial';
  address: string;
  district: string;
  sector: string;
  bedrooms: number;
  plot_size?: string;
  caretaker_name: string;
  caretaker_phone: string;
  access_notes?: string;
  last_inspection?: string | null;
  status: 'managed' | 'monitoring' | 'vacant';
  created_at: string;
}

export interface FamilyMember {
  id: string;
  owner_id: string;
  full_name: string;
  relationship: string;
  age: number;
  phone: string;
  address: string;
  property_id?: string | null;
  needs: string[];
  notes?: string;
  monthly_budget: number;
  status: 'active' | 'paused';
  created_at: string;
}

export interface CareReport {
  id: string;
  owner_id: string;
  property_id?: string | null;
  family_member_id?: string | null;
  booking_ref?: string | null;
  title: string;
  summary: string;
  type: 'inspection' | 'companionship' | 'maintenance' | 'delivery';
  media: { kind: 'photo' | 'video'; label: string; url?: string }[];
  status: 'submitted' | 'reviewed';
  author_name: string;
  date: string;
  created_at: string;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price_rwf: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  best_for: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  customer_name: string;
  plan_slug: string;
  plan_name: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  price: number;
  started_at: string;
  renews_at: string;
  payment_method: PaymentMethod;
  auto_renew: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  subject: string;
  message: string;
  status: 'new' | 'replied';
  created_at: string;
}

export interface Account {
  profile: Profile;
  password?: string;
}
