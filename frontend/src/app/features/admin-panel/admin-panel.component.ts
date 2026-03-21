import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, LayoutDashboard, Building2, CreditCard, Users, TrendingUp, AlertCircle, CheckCircle2, MoreVertical, Terminal, Play, Database, Search, ArrowRight, ShieldCheck, Activity, Globe, Plus, XCircle, Trash2, Mail, UserPlus, Shield, Lock, Ban, Check, RefreshCw, Key } from 'lucide-angular';
import { DatabaseService } from '../../core/services/database.service';
import { Clinic, UserProfile, UserRole, IamBinding } from '../../core/models/types';
import { IAM_ROLES, IAM_PERMISSIONS, getDisplayRole } from '../../core/config/iam-roles';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 p-8 animate-fade-in relative">
      <!-- SaaS Governance Header -->
      <div class="max-w-7xl mx-auto mb-10">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">SaaS Controller</span>
                    <span class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">v2.4.0</span>
                </div>
                <h1 class="text-4xl font-black text-slate-900 tracking-tight uppercase">
                    {{ selectedClinic() ? 'Gestão: ' + selectedClinic()?.name : 'Governança IntraClinica' }}
                </h1>
                <p class="text-slate-500 font-medium">
                    {{ selectedClinic() ? 'Administração de recursos e conformidade da unidade.' : 'Monitoramento global de infraestrutura, faturamento e conformidade.' }}
                </p>
            </div>
        </div>

        <!-- Navigation Tabs -->
        @if (db.selectedContextClinic()) {
            <div class="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm mt-8 w-fit">
                @if (db.selectedContextClinic() === 'all') {
                    <button (click)="activeTab.set('global')" [class.bg-slate-900]="activeTab() === 'global'" [class.text-white]="activeTab() === 'global'" class="px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2">
                        <lucide-icon [img]="LayoutDashboard" [size]="14"></lucide-icon> SaaS Global
                    </button>
                    <button (click)="activeTab.set('clinics')" [class.bg-slate-900]="activeTab() === 'clinics'" [class.text-white]="activeTab() === 'clinics'" class="px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all">Clientes / Clínicas</button>
                    <button (click)="activeTab.set('saas-team')" [class.bg-slate-900]="activeTab() === 'saas-team'" [class.text-white]="activeTab() === 'saas-team'" class="px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2">
                        <lucide-icon [img]="Users" [size]="14"></lucide-icon> Equipe SaaS
                    </button>
                    <button (click)="activeTab.set('iam')" [class.bg-slate-900]="activeTab() === 'iam'" [class.text-white]="activeTab() === 'iam'" class="px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2">
                        <lucide-icon [img]="ShieldCheck" [size]="14"></lucide-icon> Segurança / IAM
                    </button>
                    <button (click)="activeTab.set('sql')" [class.bg-slate-900]="activeTab() === 'sql'" [class.text-white]="activeTab() === 'sql'" class="px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2">
                        <lucide-icon [img]="Terminal" [size]="14"></lucide-icon> Raw SQL
                    </button>
                } @else {
                    <button (click)="activeTab.set('clinic-dash')" [class.bg-emerald-600]="activeTab() === 'clinic-dash'" [class.text-white]="activeTab() === 'clinic-dash'" class="px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2">
                        <lucide-icon [img]="LayoutDashboard" [size]="14"></lucide-icon> Dashboard Unidade
                    </button>
                    <button (click)="activeTab.set('clinic-staff')" [class.bg-emerald-600]="activeTab() === 'clinic-staff'" [class.text-white]="activeTab() === 'clinic-staff'" class="px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all">Equipe & Roles</button>
                    <button (click)="activeTab.set('clinic-settings')" [class.bg-emerald-600]="activeTab() === 'clinic-settings'" [class.text-white]="activeTab() === 'clinic-settings'" class="px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all">Configurações SaaS</button>
                }
            </div>
        }
      </div>

      <div class="max-w-7xl mx-auto space-y-8 pb-20">
        
        @if (!db.selectedContextClinic()) {
            <div class="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                    <lucide-icon [img]="Globe" [size]="40"></lucide-icon>
                </div>
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Selecione um Contexto de Gestão</h3>
                <p class="text-slate-500 max-w-md mx-auto font-medium">Utilize o seletor no menu lateral para escolher entre a Visão Global do ecossistema IntraClinica ou gerenciar uma unidade específica.</p>
            </div>
        }

        <!-- GLOBAL SAAS DASHBOARD -->
        @if (db.selectedContextClinic() === 'all' && activeTab() === 'global') {
            <div class="grid md:grid-cols-4 gap-6 animate-scale-in">
                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:border-indigo-500 transition-all">
                    <div class="flex justify-between items-start mb-6">
                        <div class="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <lucide-icon [img]="Building2" [size]="28"></lucide-icon>
                        </div>
                    </div>
                    <div class="text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {{ db.clinics().length }}
                    </div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assinaturas Ativas</div>
                </div>

                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:border-emerald-500 transition-all">
                    <div class="flex justify-between items-start mb-6">
                        <div class="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <lucide-icon [img]="CreditCard" [size]="28"></lucide-icon>
                        </div>
                    </div>
                    <div class="text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {{ db.globalArr() | currency:'BRL' }}
                    </div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ARR (Anualizado)</div>
                </div>

                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:border-amber-500 transition-all">
                    <div class="flex justify-between items-start mb-6">
                        <div class="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                            <lucide-icon [img]="Activity" [size]="28"></lucide-icon>
                        </div>
                        <span class="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">ESTÁVEL</span>
                    </div>
                    <div class="text-4xl font-black text-slate-900 mb-1 tracking-tighter">{{ db.globalUptime() }}%</div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SLA / Uptime Global</div>
                </div>

                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:border-rose-500 transition-all">
                    <div class="flex justify-between items-start mb-6">
                        <div class="p-4 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all">
                            <lucide-icon [img]="AlertCircle" [size]="28"></lucide-icon>
                        </div>
                    </div>
                    <div class="text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {{ db.accessRequests().length }}
                    </div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitações Pendentes</div>
                </div>
            </div>

            <!-- Activity Chart (Static but clean) -->
            <div class="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 p-10 opacity-10">
                    <lucide-icon [img]="TrendingUp" [size]="200"></lucide-icon>
                </div>
                <div class="relative z-10">
                    <h3 class="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3"><span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Requisições ao Cluster</h3>
                    <div class="h-48 flex items-end gap-2 mb-6">
                        @for (i of [40, 60, 45, 90, 85, 70, 100, 80, 65, 95]; track $index) {
                            <div class="flex-1 bg-indigo-500/30 rounded-t-lg hover:bg-indigo-400 transition-all cursor-pointer relative group" [style.height.%]="i"></div>
                        }
                    </div>
                    <div class="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <span>Janeiro 2026</span>
                        <span>Tempo Real (Global SaaS Cluster)</span>
                    </div>
                </div>
            </div>
        }

        <!-- SAAS TEAM MANAGEMENT -->
        @if (db.selectedContextClinic() === 'all' && activeTab() === 'saas-team') {
            <div class="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-scale-in">
                <div class="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Equipe de Operações SaaS</h3>
                        <p class="text-slate-500 font-medium">Gestão de analistas e suporte técnico global.</p>
                    </div>
                    <button (click)="openSaaSTeamModal()" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2">
                        <lucide-icon [img]="UserPlus" [size]="16"></lucide-icon> Adicionar Operador
                    </button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                            <tr>
                                <th class="px-10 py-6">Operador</th>
                                <th class="px-10 py-6">Role Global</th>
                                <th class="px-10 py-6">Vínculos Ativos</th>
                                <th class="px-10 py-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            @for (user of saasTeam(); track user.id) {
                                <tr class="hover:bg-slate-50/80 transition-colors">
                                    <td class="px-10 py-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs">
                                                {{user.avatar || user.name.charAt(0)}}
                                            </div>
                                            <div>
                                                <div class="font-black text-slate-900 uppercase text-xs">{{user.name}}</div>
                                                <div class="text-[10px] text-slate-400 font-bold">{{user.email}}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-10 py-6">
                                        <span class="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded uppercase">
                                            {{ user.role }}
                                        </span>
                                    </td>
                                    <td class="px-10 py-6">
                                        <div class="flex gap-1 flex-wrap max-w-xs">
                                            @for (binding of user.iam; track $index) {
                                                @if (binding.resource !== '*') {
                                                    <span class="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase border border-slate-200">
                                                        {{ binding.resource }}
                                                    </span>
                                                }
                                            } @empty {
                                                <span class="text-[10px] text-slate-300 italic">Sem acesso a unidades</span>
                                            }
                                        </div>
                                    </td>
                                    <td class="px-10 py-6 text-right">
                                        <button (click)="openPermissionsModal(user)" class="text-slate-300 hover:text-indigo-600 p-2 rounded-xl transition-all border border-transparent hover:border-indigo-100">
                                            <lucide-icon [img]="Shield" [size]="18"></lucide-icon>
                                        </button>
                                    </td>
                                </tr>
                            } @empty {
                                <tr>
                                    <td colspan="4" class="px-10 py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum operador de SaaS cadastrado.</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- CLINIC SPECIFIC DASHBOARD -->
        @if (selectedClinic() && activeTab() === 'clinic-dash') {
            <div class="grid md:grid-cols-3 gap-6 animate-scale-in">
                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Volume de Consultas (Total)</div>
                    <div class="text-3xl font-black text-slate-900 mb-1">{{ clinicAppointmentsCount() }}</div>
                    <div class="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Total histórico nesta unidade</div>
                </div>

                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Base de Pacientes</div>
                    <div class="text-3xl font-black text-slate-900 mb-1">{{ clinicPatientsCount() }}</div>
                    <div class="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Cadastros vinculados</div>
                </div>

                <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status da Assinatura</div>
                    <div class="flex items-center gap-2 text-emerald-600 font-black uppercase text-sm mb-1">
                        <lucide-icon [img]="CheckCircle2" [size]="16"></lucide-icon> {{ selectedClinic()?.status }}
                    </div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Plano: {{ selectedClinic()?.plan }}</div>
                </div>
            </div>
        }

        <!-- CLINIC STAFF MANAGEMENT -->
        @if (selectedClinic() && activeTab() === 'clinic-staff') {
            <div class="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-scale-in">
                <div class="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Equipe da Unidade</h3>
                        <p class="text-slate-500 font-medium">Gestão de acesso e roles para {{selectedClinic()?.name}}.</p>
                    </div>
                    <button (click)="openUserModal()" class="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2">
                        <lucide-icon [img]="UserPlus" [size]="16"></lucide-icon> Vincular Profissional
                    </button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                            <tr>
                                <th class="px-10 py-6">Profissional</th>
                                <th class="px-10 py-6">Role Principal</th>
                                <th class="px-10 py-6">Status IAM</th>
                                <th class="px-10 py-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            @for (user of filteredStaff(); track user.id) {
                                <tr class="hover:bg-slate-50/80 transition-colors">
                                    <td class="px-10 py-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                                                {{user.avatar || user.name.charAt(0)}}
                                            </div>
                                            <div>
                                                <div class="font-black text-slate-900 uppercase text-xs">{{user.name}}</div>
                                                <div class="text-[10px] text-slate-400 font-bold">{{user.email}}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-10 py-6 font-bold text-xs text-slate-600">{{user.role}}</td>
                                    <td class="px-10 py-6">
                                        <span class="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">Vínculo Direto</span>
                                    </td>
                                    <td class="px-10 py-6 text-right">
                                        <button (click)="openPermissionsModal(user)" class="text-slate-300 hover:text-indigo-600 p-2 rounded-xl transition-all border border-transparent hover:border-indigo-100">
                                            <lucide-icon [img]="Lock" [size]="18"></lucide-icon>
                                        </button>
                                    </td>
                                </tr>
                            } @empty {
                                <tr>
                                    <td colspan="4" class="px-10 py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum profissional vinculado a esta unidade.</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- GLOBAL CLINICS LIST (SAAS MODE) -->
        @if (db.selectedContextClinic() === 'all' && activeTab() === 'clinics') {
            <div class="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-scale-in">
                <div class="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Portfólio de Clientes</h3>
                        <p class="text-slate-500 font-medium">Gestão global de instâncias SaaS.</p>
                    </div>
                    <button (click)="openClinicModal()" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2">
                        <lucide-icon [img]="Plus" [size]="16"></lucide-icon> Nova Instância
                    </button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                            <tr>
                                <th class="px-10 py-6">Cliente / Clínica</th>
                                <th class="px-10 py-6">Plano</th>
                                <th class="px-10 py-6">Status</th>
                                <th class="px-10 py-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            @for (clinic of db.clinics(); track clinic.id) {
                                <tr class="hover:bg-slate-50/80 transition-colors group">
                                    <td class="px-10 py-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">
                                                {{clinic.name.charAt(0)}}
                                            </div>
                                            <div>
                                                <div class="font-black text-slate-900 uppercase text-sm tracking-tight">{{clinic.name}}</div>
                                                <div class="text-[10px] text-slate-400 font-medium">{{clinic.email}}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-10 py-6">
                                        <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 uppercase tracking-widest">{{clinic.plan}}</span>
                                    </td>
                                    <td class="px-10 py-6 uppercase font-black text-[10px]" [class.text-emerald-600]="clinic.status === 'active'">
                                        {{clinic.status}}
                                    </td>
                                    <td class="px-10 py-6 text-right">
                                        <div class="flex justify-end gap-2">
                                            <button (click)="db.selectedContextClinic.set(clinic.id)" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all flex items-center gap-2">
                                                Analisar <lucide-icon [img]="ArrowRight" [size]="12"></lucide-icon>
                                            </button>
                                            <button (click)="onDeleteClinic(clinic.id)" class="text-slate-300 hover:text-rose-600 p-2 rounded-xl transition-all">
                                                <lucide-icon [img]="Trash2" [size]="18"></lucide-icon>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }

        <!-- SQL PLAYGROUND (Global Only) -->
        @if (db.selectedContextClinic() === 'all' && activeTab() === 'sql') {
            <!-- (Existing SQL Playground Logic - Keep as is but ensured context is 'all') -->
            <div class="bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl animate-scale-in border border-slate-800">
                <div class="p-8 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                    <div class="flex items-center gap-4">
                        <div class="flex gap-2">
                            <div class="w-3 h-3 rounded-full bg-rose-500/50"></div>
                            <div class="w-3 h-3 rounded-full bg-amber-500/50"></div>
                            <div class="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                        </div>
                        <span class="text-slate-400 font-mono text-xs tracking-widest uppercase">SQL SaaS Interface</span>
                    </div>
                    <button (click)="runQuery()" class="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/40">
                        <lucide-icon [img]="Play" [size]="16"></lucide-icon> Run Analytic Query
                    </button>
                </div>
                <div class="flex h-[600px]">
                    <div class="w-1/2 border-r border-slate-800 flex flex-col">
                        <textarea 
                            [(ngModel)]="sqlQuery"
                            class="flex-1 bg-slate-900 text-emerald-400 p-10 font-mono text-sm outline-none resize-none leading-relaxed"
                            spellcheck="false"
                        ></textarea>
                    </div>
                    <div class="w-1/2 flex flex-col bg-slate-950/50">
                        @if (queryResult()) {
                            <div class="flex-1 overflow-auto p-10">
                                <table class="w-full text-left font-mono text-[11px] text-slate-300">
                                    <thead>
                                        <tr class="text-slate-500 border-b border-slate-800">
                                            @for (col of resultColumns(); track col) {
                                                <th class="py-4 px-4 uppercase tracking-widest">{{col}}</th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-900">
                                        @for (row of queryResult(); track $index) {
                                            <tr class="hover:bg-white/5 transition-colors">
                                                @for (col of resultColumns(); track col) {
                                                    <td class="py-4 px-4">{{row[col]}}</td>
                                                }
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        } @else {
                            <div class="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6">
                                <lucide-icon [img]="Database" [size]="64" class="opacity-10"></lucide-icon>
                                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Waiting for execution...</p>
                            </div>
                        }
                    </div>
                </div>
            </div>
        }
      </div>

      <!-- MODAL: NOVA CLÍNICA -->
      @if (isClinicModalOpen()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-in">
                <div class="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <h3 class="text-xl font-black uppercase tracking-tight">Nova Instância Clínica</h3>
                    <button (click)="isClinicModalOpen.set(false)" class="text-white/50 hover:text-white"><lucide-icon [img]="XCircle" [size]="24"></lucide-icon></button>
                </div>
                <div class="p-10 space-y-6">
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome da Unidade</label>
                        <input [(ngModel)]="newClinicData.name" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Ex: Clínica Dermatológica X" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">E-mail Administrativo</label>
                        <input [(ngModel)]="newClinicData.email" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="admin@clinica.com" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Plano SaaS</label>
                            <select [(ngModel)]="newClinicData.plan" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-bold appearance-none">
                                <option value="Starter">Starter</option>
                                <option value="Pro">Pro</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">ID Único</label>
                            <input [(ngModel)]="newClinicData.id" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-mono text-xs font-bold" placeholder="id-unico-clinica" />
                        </div>
                    </div>
                </div>
                <div class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button (click)="onAddClinic()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Provisionar Instância</button>
                </div>
            </div>
        </div>
      }

      <!-- MODAL: NOVO USUÁRIO / VÍNCULO -->
      @if (isUserModalOpen()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-in">
                <div class="bg-emerald-600 p-8 text-white flex justify-between items-center">
                    <h3 class="text-xl font-black uppercase tracking-tight">Vincular Profissional</h3>
                    <button (click)="isUserModalOpen.set(false)" class="text-white/50 hover:text-white"><lucide-icon [img]="XCircle" [size]="24"></lucide-icon></button>
                </div>
                <div class="p-10 space-y-6">
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome do Profissional</label>
                        <input [(ngModel)]="newUserData.name" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" placeholder="Nome Completo" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">E-mail</label>
                        <input [(ngModel)]="newUserData.email" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" placeholder="email@clinica.com" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Função (Role)</label>
                        <select [(ngModel)]="newUserData.role" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-bold appearance-none">
                            <option value="roles/doctor">Médico(a)</option>
                            <option value="roles/reception">Recepção</option>
                            <option value="roles/clinic_admin">Administrador de Clínica</option>
                            <option value="roles/stock_manager">Gestor de Estoque</option>
                            <option value="roles/consultant">Consultor Estratégico</option>
                        </select>
                    </div>
                    <!-- Temporary Password Generator -->
                    <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                        <label class="text-[10px] font-black uppercase text-indigo-400 mb-2 block tracking-widest flex items-center gap-2">
                            <lucide-icon [img]="Key" [size]="14"></lucide-icon> Senha Temporária
                        </label>
                        <div class="flex gap-2">
                            <div class="flex-1 bg-white border border-indigo-100 rounded-xl px-4 py-3 font-mono font-bold text-indigo-600 text-center tracking-widest select-all">
                                {{ newUserData.tempPassword || '----' }}
                            </div>
                            <button (click)="generateTempPassword()" class="p-3 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors" title="Gerar Nova Senha">
                                <lucide-icon [img]="RefreshCw" [size]="20"></lucide-icon>
                            </button>
                        </div>
                        <p class="text-[9px] text-indigo-400 mt-2 font-medium">Esta senha será usada para o primeiro acesso e deve ser informada ao usuário.</p>
                    </div>
                </div>
                <div class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button (click)="onAddUser()" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">Confirmar Vínculo</button>
                </div>
            </div>
        </div>
      }

      <!-- MODAL: PERMISSIONS EDITOR -->
      @if (editingPermissionsUser()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-scale-in max-h-[90vh] overflow-y-auto">
                <div class="bg-indigo-600 p-8 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 class="text-xl font-black uppercase tracking-tight">Editar Permissões</h3>
                        <p class="text-xs text-indigo-200 mt-1">Configuração granular de acesso IAM</p>
                    </div>
                    <button (click)="editingPermissionsUser.set(null)" class="text-white/50 hover:text-white"><lucide-icon [img]="XCircle" [size]="24"></lucide-icon></button>
                </div>
                
                <div class="p-10 space-y-8">
                    <!-- User Info -->
                    <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg">
                            {{editingPermissionsUser()!.name.charAt(0)}}
                        </div>
                        <div>
                            <div class="font-black text-slate-900 uppercase">{{editingPermissionsUser()!.name}}</div>
                            <div class="text-xs text-slate-400 font-bold">{{editingPermissionsUser()!.email}}</div>
                        </div>
                    </div>

                    <!-- Role Selector -->
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Role Principal</label>
                        <select 
                            [ngModel]="getCurrentRole(editingPermissionsUser()!)" 
                            (ngModelChange)="updateRole(editingPermissionsUser()!, $event)"
                            class="w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-700"
                        >
                            @for (roleKey of getRoleKeys(); track roleKey) {
                                <option [value]="roleKey">{{ IAM_ROLES[roleKey].name }}</option>
                            }
                        </select>
                        <p class="text-[10px] text-slate-400 mt-2 italic px-2">
                            {{ IAM_ROLES[getCurrentRole(editingPermissionsUser()!)].description }}
                        </p>
                    </div>

                    <!-- Fine-Grained Permissions -->
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-widest flex items-center gap-2">
                            <lucide-icon [img]="Shield" [size]="14"></lucide-icon> Controle Fino de Permissões
                        </label>
                        
                        <div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            @for (perm of getAllPermissions(); track perm) {
                                <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all group">
                                    <span class="text-xs font-mono font-bold text-slate-600">{{ perm }}</span>
                                    
                                    <div class="flex gap-2">
                                        <!-- Add Override -->
                                        <button 
                                            (click)="togglePermission(editingPermissionsUser()!, perm, 'add')"
                                            class="p-1.5 rounded-lg border transition-all"
                                            [class.bg-emerald-500]="isPermissionAdded(editingPermissionsUser()!, perm)"
                                            [class.text-white]="isPermissionAdded(editingPermissionsUser()!, perm)"
                                            [class.border-emerald-500]="isPermissionAdded(editingPermissionsUser()!, perm)"
                                            [class.text-slate-300]="!isPermissionAdded(editingPermissionsUser()!, perm)"
                                            [class.border-slate-200]="!isPermissionAdded(editingPermissionsUser()!, perm)"
                                            title="Conceder Explicitamente"
                                        >
                                            <lucide-icon [img]="Check" [size]="14"></lucide-icon>
                                        </button>

                                        <!-- Deny Override -->
                                        <button 
                                            (click)="togglePermission(editingPermissionsUser()!, perm, 'deny')"
                                            class="p-1.5 rounded-lg border transition-all"
                                            [class.bg-rose-500]="isPermissionDenied(editingPermissionsUser()!, perm)"
                                            [class.text-white]="isPermissionDenied(editingPermissionsUser()!, perm)"
                                            [class.border-rose-500]="isPermissionDenied(editingPermissionsUser()!, perm)"
                                            [class.text-slate-300]="!isPermissionDenied(editingPermissionsUser()!, perm)"
                                            [class.border-slate-200]="!isPermissionDenied(editingPermissionsUser()!, perm)"
                                            title="Negar Explicitamente"
                                        >
                                            <lucide-icon [img]="Ban" [size]="14"></lucide-icon>
                                        </button>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>

                <div class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button (click)="savePermissions()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Salvar Alterações</button>
                </div>
            </div>
        </div>
      }

      <!-- MODAL: NOVO OPERADOR SAAS -->
      @if (isSaaSTeamModalOpen()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-in">
                <div class="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <h3 class="text-xl font-black uppercase tracking-tight">Adicionar Operador SaaS</h3>
                    <button (click)="isSaaSTeamModalOpen.set(false)" class="text-white/50 hover:text-white"><lucide-icon [img]="XCircle" [size]="24"></lucide-icon></button>
                </div>
                <div class="p-10 space-y-6">
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome do Operador</label>
                        <input [(ngModel)]="newUserData.name" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Nome Completo" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">E-mail Corporativo</label>
                        <input [(ngModel)]="newUserData.email" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="suporte@intraclinica.com" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Role SaaS</label>
                        <select [(ngModel)]="newUserData.role" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-bold appearance-none">
                            <option value="roles/saas_support">SaaS Support (Suporte Técnico)</option>
                            <option value="roles/saas_analyst">SaaS Analyst (BI / Auditoria)</option>
                            <option value="roles/super_admin">Super Admin (Governança Total)</option>
                        </select>
                    </div>
                    <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                        <label class="text-[10px] font-black uppercase text-indigo-400 mb-2 block tracking-widest flex items-center gap-2">
                            <lucide-icon [img]="Key" [size]="14"></lucide-icon> Senha Temporária
                        </label>
                        <div class="flex gap-2">
                            <div class="flex-1 bg-white border border-indigo-100 rounded-xl px-4 py-3 font-mono font-bold text-indigo-600 text-center tracking-widest select-all">
                                {{ newUserData.tempPassword || '----' }}
                            </div>
                            <button (click)="generateTempPassword()" class="p-3 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors" title="Gerar Nova Senha">
                                <lucide-icon [img]="RefreshCw" [size]="20"></lucide-icon>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button (click)="onAddUser()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Provisionar Operador</button>
                </div>
            </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    .animate-scale-in { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
  `]
})
export class AdminPanelComponent {
  db = inject(DatabaseService);
  
  activeTab = signal<string>('global');

  // Modals
  isClinicModalOpen = signal(false);
  isUserModalOpen = signal(false);
  editingPermissionsUser = signal<UserProfile | null>(null);

  newClinicData: Partial<Clinic> = { id: '', name: '', email: '', plan: 'Starter', status: 'active' };
  newUserData: { name?: string; email?: string; role?: string; tempPassword?: string } = { name: '', email: '', role: 'roles/doctor', tempPassword: '' };

  // Constants for Template
  IAM_ROLES = IAM_ROLES;
  IAM_PERMISSIONS = IAM_PERMISSIONS;

  selectedClinic = computed(() => {
    const id = this.db.selectedContextClinic();
    if (id === 'all' || !id) return null;
    return this.db.clinics().find(c => c.id === id);
  });

  filteredStaff = computed(() => {
    const id = this.db.selectedContextClinic();
    if (!id || id === 'all') return [];
    return this.db.users().filter(u => u.clinicId === id);
  });

  saasTeam = computed(() => {
    return this.db.users().filter(u => u.clinicId === 'all' || u.role === 'SUPER_ADMIN' || u.role === 'SUPPORT' || u.role === 'ANALYST');
  });

  isSaaSTeamModalOpen = signal(false);

  clinicAppointmentsCount = computed(() => {
    const id = this.db.selectedContextClinic();
    return this.db.appointments().filter(a => a['clinicId'] === id).length;
  });

  clinicPatientsCount = computed(() => {
    const id = this.db.selectedContextClinic();
    return this.db.patients().filter(p => p['clinicId'] === id).length;
  });

  pendingRequestsCount = computed(() => {
      return this.db.accessRequests().filter(r => r.status === 'pending').length;
  });
  
  sqlQuery = `-- SaaS Analytic Query
SELECT 
  name, 
  plan, 
  status 
FROM clinics 
WHERE status = 'active' 
ORDER BY created_at DESC;`;
  
  queryResult = signal<any[] | null>(null);
  resultColumns = signal<string[]>([]);

  // Icons
  readonly LayoutDashboard = LayoutDashboard; 
  readonly Building2 = Building2; 
  readonly CreditCard = CreditCard; 
  readonly Users = Users; 
  readonly TrendingUp = TrendingUp; 
  readonly AlertCircle = AlertCircle; 
  readonly CheckCircle2 = CheckCircle2; 
  readonly MoreVertical = MoreVertical;
  readonly Terminal = Terminal; 
  readonly Play = Play; 
  readonly Database = Database; 
  readonly Search = Search; 
  readonly ArrowRight = ArrowRight;
  readonly ShieldCheck = ShieldCheck; 
  readonly Activity = Activity; 
  readonly Globe = Globe; 
  readonly Plus = Plus;
  readonly XCircle = XCircle;
  readonly Trash2 = Trash2;
  readonly Mail = Mail;
  readonly UserPlus = UserPlus;
  readonly Shield = Shield;
  readonly Lock = Lock;
  readonly Ban = Ban;
  readonly Check = Check;
  readonly RefreshCw = RefreshCw;
  readonly Key = Key;

  openClinicModal() {
      this.newClinicData = { id: 'clinic-' + crypto.randomUUID(), name: '', email: '', plan: 'Starter', status: 'active' };
      this.isClinicModalOpen.set(true);
  }

  async onAddClinic() {
      if (!this.newClinicData.name || !this.newClinicData.email) return;
      const clinic = {
          ...this.newClinicData,
          createdAt: new Date().toISOString(),
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      } as Clinic;
      await this.db.addClinic(clinic);
      this.isClinicModalOpen.set(false);
  }

  async onDeleteClinic(id: string) {
      if (confirm('Deseja realmente remover esta instância? Todos os dados serão perdidos.')) {
          await this.db.deleteClinic(id);
      }
  }

  openUserModal() {
      this.newUserData = { name: '', email: '', role: 'roles/doctor', tempPassword: '' };
      this.generateTempPassword();
      this.isUserModalOpen.set(true);
  }

  openSaaSTeamModal() {
      this.newUserData = { name: '', email: '', role: 'roles/saas_support', tempPassword: '' };
      this.generateTempPassword();
      this.isSaaSTeamModalOpen.set(true);
  }

  generateTempPassword() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      let pass = '';
      const randomValues = new Uint32Array(8);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < 8; i++) {
          pass += chars.charAt(randomValues[i] % chars.length);
      }
      this.newUserData.tempPassword = pass;
  }

  async onAddUser() {
      let clinicId = this.db.selectedContextClinic();
      const isSaaSModal = this.isSaaSTeamModalOpen();
      
      if (isSaaSModal) {
          // SaaS operators have no clinic — pass null so the RPC skips actor creation
          // and creates a user with SUPER_ADMIN/SUPPORT role at global scope
          clinicId = null;
      }

      if (!clinicId) return;
      if (!this.newUserData.name || !this.newUserData.email || !this.newUserData.role || !this.newUserData.tempPassword) return;

      const roleId = this.newUserData.role; // Now holds IAM ID e.g. 'roles/clinic_admin'

      const user: UserProfile & { tempPassword?: string } = {
          id: 'u-' + crypto.randomUUID(),
          name: this.newUserData.name,
          email: this.newUserData.email,
          role: getDisplayRole(roleId), // Use imported helper
          clinicId: clinicId,
          iam: [{ roleId: roleId, resource: clinicId }]
      };

      // Pass the temp password to service to handle hashing
      await this.db.saveUser(user, this.newUserData.tempPassword);
      this.isUserModalOpen.set(false);
      this.isSaaSTeamModalOpen.set(false);
  }

  // Permissions Logic
  openPermissionsModal(user: UserProfile) {
      // Create a deep copy to avoid direct mutation before save
      this.editingPermissionsUser.set(JSON.parse(JSON.stringify(user)));
  }

  getRoleKeys() {
      return Object.keys(IAM_ROLES);
  }

  getAllPermissions() {
      return Object.values(IAM_PERMISSIONS);
  }

  getCurrentRole(user: UserProfile): string {
      const context = this.db.selectedContextClinic();
      // Find binding for current context
      const binding = user.iam?.find(b => b.resource === context || b.resource === '*');
      if (!binding) return 'roles/doctor';

      const legacyRoleMap: Record<string, string> = {
        'roles/admin': 'roles/clinic_admin',
        'roles/stock': 'roles/stock_manager',
      };
      const roleId = legacyRoleMap[binding.roleId] || binding.roleId;
      return IAM_ROLES[roleId] ? roleId : 'roles/doctor';
  }

  updateRole(user: UserProfile, roleId: string) {
      const context = this.db.selectedContextClinic();
      if (!user.iam) user.iam = [];
      
      const bindingIndex = user.iam.findIndex(b => b.resource === context || b.resource === '*');
      if (bindingIndex > -1) {
          user.iam[bindingIndex].roleId = roleId;
      } else {
          user.iam.push({ roleId, resource: context || '*' });
      }
      this.editingPermissionsUser.set({...user}); // Trigger update
  }

  isPermissionAdded(user: UserProfile, perm: string): boolean {
      const context = this.db.selectedContextClinic();
      const binding = user.iam?.find(b => b.resource === context || b.resource === '*');
      return binding?.permissions?.includes(perm) || false;
  }

  isPermissionDenied(user: UserProfile, perm: string): boolean {
      const context = this.db.selectedContextClinic();
      const binding = user.iam?.find(b => b.resource === context || b.resource === '*');
      return binding?.denied?.includes(perm) || false;
  }

  togglePermission(user: UserProfile, perm: string, type: 'add' | 'deny') {
      const context = this.db.selectedContextClinic();
      if (!user.iam) user.iam = [];
      
      let binding = user.iam.find(b => b.resource === context || b.resource === '*');
      if (!binding) {
          // If no binding exists for this context, creating one is tricky without a Role.
          // We'll assume a default role if creating from scratch, or alert.
          // For now, let's assume binding exists via creation.
          return;
      }

      if (type === 'add') {
          if (!binding.permissions) binding.permissions = [];
          if (binding.permissions.includes(perm)) {
              binding.permissions = binding.permissions.filter(p => p !== perm);
          } else {
              binding.permissions.push(perm);
              // Ensure it's not in denied
              if (binding.denied) binding.denied = binding.denied.filter(p => p !== perm);
          }
      } else {
          if (!binding.denied) binding.denied = [];
          if (binding.denied.includes(perm)) {
              binding.denied = binding.denied.filter(p => p !== perm);
          } else {
              binding.denied.push(perm);
              // Ensure it's not in allowed
              if (binding.permissions) binding.permissions = binding.permissions.filter(p => p !== perm);
          }
      }
      this.editingPermissionsUser.set({...user});
  }

  async savePermissions() {
      const user = this.editingPermissionsUser();
      if (user) {
          await this.db.saveUser(user);
          this.editingPermissionsUser.set(null);
      }
  }

  runQuery() {
    setTimeout(() => {
        const mockResult = this.db.clinics().map(c => ({
            ID: c.id.substring(0, 8),
            CLIENTE: c.name.toUpperCase(),
            PLANO: c.plan,
            STATUS: c.status.toUpperCase()
        }));
        if (mockResult.length > 0) {
            this.resultColumns.set(Object.keys(mockResult[0]));
            this.queryResult.set(mockResult);
        }
    }, 600);
  }
}