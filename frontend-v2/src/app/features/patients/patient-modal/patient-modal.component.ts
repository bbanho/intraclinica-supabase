import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { PatientService, Patient } from '../../../core/services/patient.service';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-patient-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col h-full max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
      <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ isEditing() ? 'Editar Paciente' : 'Novo Paciente' }}
        </h2>
        <button (click)="close()" class="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100 outline-none">
          <lucide-icon [img]="XIcon" class="w-5 h-5"></lucide-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="p-6 flex-1 overflow-y-auto space-y-4">
        @if (error()) {
          <div class="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {{ error() }}
          </div>
        }

        <div class="space-y-1">
          <label for="name" class="block text-sm font-medium text-gray-700">Nome Completo <span class="text-red-500">*</span></label>
          <input 
            type="text" 
            id="name" 
            formControlName="name"
            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60"
            [class.border-red-300]="isFieldInvalid('name')"
            placeholder="Ex: João da Silva"
          />
          @if (isFieldInvalid('name')) {
            <p class="text-xs text-red-500 mt-1">Nome é obrigatório</p>
          }
        </div>

        <div class="space-y-1">
          <label for="cpf" class="block text-sm font-medium text-gray-700">CPF</label>
          <input 
            type="text" 
            id="cpf" 
            formControlName="cpf"
            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60"
            placeholder="000.000.000-00"
          />
        </div>

        <div class="space-y-1">
          <label for="phone" class="block text-sm font-medium text-gray-700">Telefone</label>
          <input 
            type="text" 
            id="phone" 
            formControlName="phone"
            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div class="space-y-1">
          <label for="birth_date" class="block text-sm font-medium text-gray-700">Data de Nascimento</label>
          <input 
            type="date" 
            id="birth_date" 
            formControlName="birth_date"
            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60"
          />
        </div>
      </form>

      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
        <button 
          type="button" 
          (click)="close()" 
          [disabled]="isSaving()"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-60 outline-none"
        >
          Cancelar
        </button>
        <button 
          (click)="save()"
          [disabled]="form.invalid || isSaving()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60 flex items-center gap-2 outline-none"
        >
          @if (isSaving()) {
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Salvando...
          } @else {
            Salvar
          }
        </button>
      </div>
    </div>
  `
})
export class PatientModalComponent {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private dialogRef = inject(DialogRef);
  private data: { patient?: Patient } = inject(DIALOG_DATA) || {};

  readonly XIcon = X;

  isSaving = signal(false);
  isEditing = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    cpf: [''],
    phone: [''],
    birth_date: ['']
  });

  patientId: string | null = null;

  constructor() {
    if (this.data.patient) {
      this.isEditing.set(true);
      this.patientId = this.data.patient.id;
      this.form.patchValue({
        name: this.data.patient.actor?.name || '',
        cpf: this.data.patient.cpf || '',
        phone: this.data.patient.phone || '', 
        birth_date: this.data.patient.birth_date || ''
      });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

  close() {
    this.dialogRef.close();
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.form.disable();

      const payload = this.form.getRawValue() as any;

      if (this.isEditing() && this.patientId) {
        await this.patientService.updatePatient(this.patientId, payload);
      } else {
        await this.patientService.createPatient(payload);
      }

      this.dialogRef.close(true);
    } catch (err: any) {
      console.error(err);
      this.error.set(err.message || 'Erro ao salvar paciente. Tente novamente.');
      this.form.enable();
    } finally {
      this.isSaving.set(false);
    }
  }
}
