/**
 * Domain constants — single source of truth for all hardcoded enums used across the app.
 * Components should import from here instead of repeating string literals inline.
 */

// ---------------------------------------------------------------------------
// Appointment statuses (ordered by workflow progression)
// ---------------------------------------------------------------------------
export const APPOINTMENT_STATUSES = [
  'Agendado',
  'Aguardando',
  'Chamado',
  'Em Atendimento',
  'Realizado',
  'Cancelado',
] as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

// ---------------------------------------------------------------------------
// Appointment types
// ---------------------------------------------------------------------------
export const APPOINTMENT_TYPES = [
  'Consulta',
  'Retorno',
  'Procedimento',
  'Exame',
] as const;

export type AppointmentType = typeof APPOINTMENT_TYPES[number];

// ---------------------------------------------------------------------------
// Workstations / rooms used by reception & clinical flow
// ---------------------------------------------------------------------------
export const WORKSTATIONS = [
  'Box 1',
  'Box 2',
  'Box 3',
  'Sala de Exames',
  'Consultório Principal',
] as const;

export type Workstation = typeof WORKSTATIONS[number];

// ---------------------------------------------------------------------------
// SaaS plans
// ---------------------------------------------------------------------------
export const SAAS_PLANS = ['Starter', 'Pro', 'Enterprise'] as const;

export type SaasPlan = typeof SAAS_PLANS[number];

// ---------------------------------------------------------------------------
// Social / marketing content tones
// ---------------------------------------------------------------------------
export const SOCIAL_TONES = [
  { value: 'friendly',     label: 'Amigável e Acolhedor' },
  { value: 'professional', label: 'Profissional e Técnico' },
  { value: 'urgent',       label: 'Alerta / Importante' },
] as const;

export type SocialToneValue = typeof SOCIAL_TONES[number]['value'];
