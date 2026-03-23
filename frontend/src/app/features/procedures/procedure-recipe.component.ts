import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { InventoryStore } from '../../core/store/inventory.store';

@Component({
  selector: 'app-procedure-recipe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 h-full flex flex-col">
      @if (clinicId() === 'all' || !clinicId()) {
        <div class="flex-1 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Selecione uma Clínica</h2>
          <p class="text-gray-500 text-center max-w-md">
            Você está visualizando o contexto global ou nenhuma clínica foi selecionada. 
            Por favor, selecione uma clínica específica no topo para visualizar e configurar procedimentos.
          </p>
        </div>
      } @else {
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-800">Procedimentos Clínicos</h1>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (procedure of inventoryStore.procedures(); track procedure.id) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-gray-900">{{ procedure.name }}</h3>
                <p class="text-sm text-gray-500 line-clamp-2 mt-1">{{ procedure.description }}</p>
              </div>

              <div class="mb-6 flex-1">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Itens da Receita:</h4>
                <ul class="space-y-2">
                  @for (item of procedure.items; track item.id) {
                    <li class="flex justify-between items-center text-sm">
                      <span class="text-gray-600">{{ item.name }}</span>
                      <span class="font-medium text-gray-800">{{ item.quantity }} {{ item.unit }}</span>
                    </li>
                  } @empty {
                    <li class="text-sm text-gray-400 italic">Nenhum item configurado</li>
                  }
                </ul>
              </div>

              <button 
                (click)="executeProcedure(procedure.id)"
                class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Executar Procedimento
              </button>
            </div>
          } @empty {
            <div class="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
              <p>Nenhum procedimento configurado.</p>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class ProcedureRecipeComponent {
  private context = inject(ClinicContextService);
  public inventoryStore = inject(InventoryStore);

  // Expose the signal to the template
  public clinicId = this.context.selectedClinicId;

  async executeProcedure(procedureId: string) {
    if (!this.clinicId() || this.clinicId() === 'all') return;
    
    try {
      await this.inventoryStore.deductProcedureStock(procedureId);
      // Optional: Add notification here
    } catch (error) {
      console.error('Failed to deduct stock', error);
    }
  }
}
