import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { LucideAngularModule, X } from 'lucide-angular';
import { ProcedureService, ProcedureType, CreateProcedureDto } from '../../../core/services/procedure.service';
import { IamService } from '../../../core/services/iam.service';

export interface ProcedureModalData {
  procedure: ProcedureType | null;
  clinicId: string;
}

@Component({
  selector: 'app-procedure-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ editingProcedure() ? 'Editar Procedimento' : 'Novo Procedimento' }}
        </h2>
        <button 
          (click)="close()" 
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          type="button"
          data-testid="procedure-modal-close-button"
        >
          <lucide-icon [img]="XIcon" size="20"></lucide-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6">
        @if (error()) {
          <div class="mb-6 p-4 rounded-md bg-rose-50 text-rose-700 text-sm flex items-start gap-2 border border-rose-100">
            <div>
              <p class="font-medium">Erro ao salvar</p>
              <p class="opacity-90 mt-0.5">{{ error() }}</p>
            </div>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              Nome do Procedimento <span class="text-rose-500">*</span>
            </label>
            <input 
              id="name" 
              type="text" 
              formControlName="name"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
              [class.border-rose-300]="isFieldInvalid('name')"
              placeholder="Ex: Toxina Botulínica"
              data-testid="procedure-name-input"
            />
            @if (isFieldInvalid('name')) {
              <p class="mt-1 text-xs text-rose-600">O nome é obrigatório</p>
            }
          </div>

          <div>
            <label for="code" class="block text-sm font-medium text-gray-700 mb-1">
              Código (TUSS/Interno)
            </label>
            <input 
              id="code" 
              type="text" 
              formControlName="code"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow font-mono text-indigo-600 font-bold"
              placeholder="Ex: 10101010"
              data-testid="procedure-code-input"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="price" class="block text-sm font-medium text-gray-700 mb-1">
                Preço (R$) <span class="text-rose-500">*</span>
              </label>
              <input 
                id="price" 
                type="number" 
                step="0.01"
                min="0"
                formControlName="price"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow font-bold"
                [class.border-rose-300]="isFieldInvalid('price')"
                data-testid="procedure-price-input"
              />
              @if (isFieldInvalid('price')) {
                <p class="mt-1 text-xs text-rose-600">Preço inválido</p>
              }
            </div>
            <div class="flex items-center pt-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  formControlName="active"
                  class="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  data-testid="procedure-active-checkbox"
                />
                <span class="text-sm font-medium text-gray-700">Procedimento Ativo</span>
              </label>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="pt-6 mt-6 border-t border-gray-100 flex items-center justify-end gap-3">
            <button 
              type="button" 
              (click)="close()"
              [disabled]="submitting()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              data-testid="procedure-modal-cancel-button"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              [disabled]="form.invalid || submitting()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              data-testid="procedure-modal-save-button"
            >
              @if (submitting()) {
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
        </form>
      </div>
    </div>
  `
})
export class ProcedureModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(DialogRef<ProcedureModalComponent>);
  private procedureService = inject(ProcedureService);
  private iam = inject(IamService);
  private data = inject<ProcedureModalData>(DIALOG_DATA);

  readonly XIcon = X;

  get editingProcedure() { return this.data.procedure; }

  submitting = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    active: [true]
  });

  constructor() {
    const proc = this.data.procedure;
    if (proc) {
      this.form.patchValue({
        name: proc.name,
        code: proc.code || '',
        price: proc.price,
        active: proc.active
      });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return control ? control.invalid && control.touched : false;
  }

  close(result?: any) {
    this.dialogRef.close(result);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.iam.can('inventory.write')) {
      this.error.set('Você não tem permissão para gerenciar procedimentos.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const raw = this.form.getRawValue();
      const dto: CreateProcedureDto = {
        name: raw.name,
        code: raw.code || null,
        price: raw.price,
        active: raw.active
      };

      let result: ProcedureType;
      const editing = this.data.procedure;
      
      if (editing) {
        result = await this.procedureService.updateProcedureType(editing.id, dto);
      } else {
        result = await this.procedureService.createProcedureType(dto);
      }
      
      this.close(result);
    } catch (err: any) {
      console.error('Failed to save procedure:', err);
      this.error.set(err?.message || 'Ocorreu um erro ao salvar o procedimento.');
    } finally {
      this.submitting.set(false);
    }
  }
}
