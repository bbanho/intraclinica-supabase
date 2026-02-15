
export type ActorType = 'patient' | 'user' | 'clinic' | 'system';

export interface Actor {
  id: string;
  clinicId: string;
  name: string;
  type: ActorType;
  createdAt: string;
}

export interface Product {
  id: string;
  clinicId: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice?: number;
  supplier: string;
  expiryDate?: string;
  batchNumber?: string;
  notes?: string;
  deleted?: boolean;
}

export interface StockTransaction {
  id: string;
  clinicId: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes?: string;
}

export type UserRole = 'ADMIN' | 'RECEPTION' | 'DOCTOR' | 'STOCK' | 'MARKETING' | 'IT' | 'USER' | 'SUPER_ADMIN' | 'CONSULTANT' | 'SUPPORT' | 'ANALYST';

export interface Clinic {
  id: string;
  name: string;
  email: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  status: 'active' | 'inactive' | 'trial';
  nextBilling: string;
  createdAt: string;
}

export interface IamBinding {
  roleId: string;
  resource: string;
  permissions?: string[];
  denied?: string[];
}

export interface AccessRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  clinicId: string;
  clinicName: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  expiresAt?: string;
  requestedRoleId?: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  patientId?: string;
  patientName: string;
  doctorName: string;
  date: string; // Time HH:MM
  status: 'Agendado' | 'Aguardando' | 'Chamado' | 'Em Atendimento' | 'Realizado' | 'Cancelado' | string;
  type: string;
  roomNumber?: string;
  timestamp: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  // Metadata from Actor (mapped in services)
  name: string;
  createdAt: string;
  // Specific Patient Fields
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
}

export interface ClinicalRecord {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  content: string;
  notes?: string;
  type: 'evolucao' | 'receita' | 'atestado' | 'exame' | string;
  timestamp: string;
}

export interface SocialPost {
  id: string;
  clinicId: string;
  title: string;
  content: string;
  platform: 'instagram' | 'facebook' | 'linkedin';
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  imageUrl?: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  actor_id: string;
  clinicId: string;
  name: string; // From Actor
  email: string;
  role: UserRole; 
  iam?: IamBinding[];
  avatar?: string;
  assignedRoom?: string;
}

export interface LabelConfig {
  cols: 2 | 3 | 4;
  size: 'standard' | 'compact';
  showPrice: boolean;
}

export interface GeneratedPost {
  caption: string;
  hashtags: string[];
  imageUrl?: string;
}
