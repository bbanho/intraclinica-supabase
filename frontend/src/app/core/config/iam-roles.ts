import { UserRole } from '../models/types';

export interface IamRole {
    id: string;
    name: string;
    description: string;
    permissions: string[];
}

export const IAM_ROLE_TO_DISPLAY_MAP: Record<string, UserRole> = {
    'roles/super_admin': 'SUPER_ADMIN',
    'roles/clinic_admin': 'ADMIN',
    'roles/doctor': 'DOCTOR',
    'roles/reception': 'RECEPTION',
    'roles/stock_manager': 'STOCK',
    'roles/consultant': 'CONSULTANT',
    'roles/saas_support': 'SUPPORT',
    'roles/saas_analyst': 'ANALYST',
    'roles/marketing': 'MARKETING'
};

export function getDisplayRole(roleId: string): UserRole {
    return IAM_ROLE_TO_DISPLAY_MAP[roleId] || 'USER';
}

export const IAM_PERMISSIONS = {
    // --- ESTOQUE & SUPRIMENTOS ---
    // Acesso básico: ver lista, quantidade e validade
    INVENTORY_READ: 'inventory.read',
    // Operação: dar baixa, adicionar itens
    INVENTORY_WRITE: 'inventory.write',
    // Financeiro do Estoque: ver preço de custo e fornecedor
    INVENTORY_VIEW_COST: 'inventory.view_cost',
    
    // --- CLÍNICO & PACIENTES ---
    // Recepção: ver dados cadastrais (nome, cpf, contato)
    PATIENTS_READ_DEMOGRAPHICS: 'patients.read_demographics',
    // Recepção: cadastrar/editar pacientes
    PATIENTS_WRITE: 'patients.write',
    // Médico: ver histórico clínico (evoluções, exames)
    CLINICAL_READ_RECORDS: 'clinical.read_records',
    // Médico: criar evoluções, receitas
    CLINICAL_WRITE: 'clinical.write',
    
    // --- AGENDAMENTO ---
    APPOINTMENTS_READ: 'appointments.read',
    APPOINTMENTS_WRITE: 'appointments.write',
    
    // --- MARKETING (CRM) ---
    MARKETING_READ: 'marketing.read',
    MARKETING_WRITE: 'marketing.write',
    
    // --- FINANCEIRO GERAL ---
    // Dashboards de faturamento, DRE
    FINANCE_READ: 'finance.read',
    FINANCE_WRITE: 'finance.write',
    
    // --- ADMINISTRAÇÃO ---
    USERS_MANAGE: 'users.manage', // Criar usuários, resetar senhas
    CLINICS_MANAGE: 'clinics.manage', // Configurações da unidade
    
    // --- IAM & SISTEMA ---
    ACCESS_REQUEST: 'access.request',
    ACCESS_APPROVE: 'access.approve',
    REPORTS_VIEW: 'reports.view'
};

export const IAM_ROLES: { [key: string]: IamRole } = {
    'roles/super_admin': {
        id: 'roles/super_admin',
        name: 'Super Admin',
        description: 'Gestão global do SaaS, faturamento e usuários. Não acessa dados clínicos por padrão.',
        permissions: [
            IAM_PERMISSIONS.ACCESS_REQUEST,
            IAM_PERMISSIONS.CLINICS_MANAGE,
            IAM_PERMISSIONS.USERS_MANAGE
        ]
    },
    'roles/clinic_admin': {
        id: 'roles/clinic_admin',
        name: 'Administrador da Clínica',
        description: 'Acesso total e irrestrito aos dados e configurações da unidade.',
        permissions: [
            IAM_PERMISSIONS.ACCESS_APPROVE,
            IAM_PERMISSIONS.APPOINTMENTS_READ,
            IAM_PERMISSIONS.APPOINTMENTS_WRITE,
            IAM_PERMISSIONS.CLINICAL_READ_RECORDS,
            IAM_PERMISSIONS.CLINICAL_WRITE,
            IAM_PERMISSIONS.CLINICS_MANAGE,
            IAM_PERMISSIONS.FINANCE_READ,
            IAM_PERMISSIONS.FINANCE_WRITE,
            IAM_PERMISSIONS.INVENTORY_READ,
            IAM_PERMISSIONS.INVENTORY_VIEW_COST,
            IAM_PERMISSIONS.INVENTORY_WRITE,
            IAM_PERMISSIONS.MARKETING_READ,
            IAM_PERMISSIONS.MARKETING_WRITE,
            IAM_PERMISSIONS.PATIENTS_READ_DEMOGRAPHICS,
            IAM_PERMISSIONS.PATIENTS_WRITE,
            IAM_PERMISSIONS.REPORTS_VIEW,
            IAM_PERMISSIONS.USERS_MANAGE
        ]
    },
    'roles/doctor': {
        id: 'roles/doctor',
        name: 'Médico / Especialista',
        description: 'Foco no atendimento. Vê dados clínicos e estoque (sem custos).',
        permissions: [
            IAM_PERMISSIONS.APPOINTMENTS_READ,
            IAM_PERMISSIONS.CLINICAL_READ_RECORDS,
            IAM_PERMISSIONS.CLINICAL_WRITE,
            IAM_PERMISSIONS.INVENTORY_READ,
            IAM_PERMISSIONS.PATIENTS_READ_DEMOGRAPHICS
        ]
    },
    'roles/reception': {
        id: 'roles/reception',
        name: 'Recepção / Secretariado',
        description: 'Gestão de agenda e cadastro. Sem acesso a dados clínicos sensíveis ou financeiro profundo.',
        permissions: [
            IAM_PERMISSIONS.APPOINTMENTS_READ,
            IAM_PERMISSIONS.APPOINTMENTS_WRITE,
            IAM_PERMISSIONS.PATIENTS_READ_DEMOGRAPHICS,
            IAM_PERMISSIONS.PATIENTS_WRITE
        ]
    },
    'roles/stock_manager': {
        id: 'roles/stock_manager',
        name: 'Gestor de Estoque',
        description: 'Controle de insumos e compras. Acesso a custos.',
        permissions: [
            IAM_PERMISSIONS.INVENTORY_READ,
            IAM_PERMISSIONS.INVENTORY_VIEW_COST,
            IAM_PERMISSIONS.INVENTORY_WRITE,
            IAM_PERMISSIONS.REPORTS_VIEW
        ]
    },
    'roles/finance_viewer': {
        id: 'roles/finance_viewer',
        name: 'Analista Financeiro',
        description: 'Acesso a dashboards, custos e faturamento. Sem acesso clínico.',
        permissions: [
            IAM_PERMISSIONS.FINANCE_READ,
            IAM_PERMISSIONS.INVENTORY_READ,
            IAM_PERMISSIONS.INVENTORY_VIEW_COST,
            IAM_PERMISSIONS.REPORTS_VIEW
        ]
    },
    'roles/marketing': {
        id: 'roles/marketing',
        name: 'Marketing Specialist',
        description: 'Gestão de conteúdo e campanhas.',
        permissions: [
            IAM_PERMISSIONS.MARKETING_READ,
            IAM_PERMISSIONS.MARKETING_WRITE
        ]
    },
    'roles/consultant': {
        id: 'roles/consultant',
        name: 'Consultor Estratégico',
        description: 'Visão gerencial da unidade. Financeiro, estoque e indicadores.',
        permissions: [
            IAM_PERMISSIONS.ACCESS_REQUEST,
            IAM_PERMISSIONS.FINANCE_READ,
            IAM_PERMISSIONS.INVENTORY_READ,
            IAM_PERMISSIONS.INVENTORY_VIEW_COST,
            IAM_PERMISSIONS.MARKETING_READ,
            IAM_PERMISSIONS.PATIENTS_READ_DEMOGRAPHICS,
            IAM_PERMISSIONS.REPORTS_VIEW,
            IAM_PERMISSIONS.USERS_MANAGE
        ]
    },
    'roles/saas_support': {
        id: 'roles/saas_support',
        name: 'SaaS Support',
        description: 'Suporte técnico global. Pode solicitar acesso a clínicas para resolução de problemas.',
        permissions: [
            IAM_PERMISSIONS.ACCESS_REQUEST
        ]
    },
    'roles/saas_analyst': {
        id: 'roles/saas_analyst',
        name: 'SaaS Analyst',
        description: 'Analista de dados global. Solicita acesso a clínicas para auditorias e BI.',
        permissions: [
            IAM_PERMISSIONS.ACCESS_REQUEST,
            IAM_PERMISSIONS.REPORTS_VIEW
        ]
    }
};
