import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';
import { ClinicUiConfig, UiModule } from '../models/ui-config.types';

@Injectable({
  providedIn: 'root'
})
export class UiConfigService {
  private supabase = inject(SupabaseService);
  private context = inject(ClinicContextService);

  private configState = signal<ClinicUiConfig | null>(null);

  // Expose signals for components to consume directly
  readonly allModules = computed(() => this.configState()?.modules || []);
  readonly enabledModules = computed(() => this.allModules().filter(m => m.enabled));
  readonly config = computed(() => this.configState()?.config || {});

  constructor() {
    // Whenever the selected clinic changes, we fetch its UI config
    effect(() => {
      const clinicId = this.context.clinicId();
      if (clinicId) {
        this.fetchConfig(clinicId);
      } else {
        this.configState.set(null);
      }
    });
  }

  private async fetchConfig(clinicId: string) {
    try {
      const { data, error } = await this.supabase.rpc('get_clinic_ui_config', {
        p_clinic_id: clinicId
      });

      if (error) throw error;
      
      this.configState.set(data as ClinicUiConfig);
    } catch (e) {
      console.error('Failed to load clinic UI config:', e);
      this.configState.set(null);
    }
  }

  // Admin mutation methods (for later use in Admin Panel)
  async toggleModule(moduleKey: string, enabled: boolean) {
    const clinicId = this.context.clinicId();
    if (!clinicId) return;

    const { error } = await this.supabase.from('clinic_module').update({ enabled }).eq('clinic_id', clinicId).eq('module_key', moduleKey);
    if (error) {
      console.error('Failed to toggle module:', error);
      return;
    }
    
    // Optimistic update
    this.configState.update(state => {
      if (!state) return state;
      return {
        ...state,
        modules: state.modules.map(m => m.key === moduleKey ? { ...m, enabled } : m)
      };
    });
  }

  async updateConfigValue(key: string, value: unknown) {
    const clinicId = this.context.clinicId();
    if (!clinicId) return;

    // We do an upsert
    const { error } = await this.supabase.from('clinic_config').upsert({
      clinic_id: clinicId,
      key,
      value
    }, { onConflict: 'clinic_id, key' });

    if (error) {
      console.error('Failed to update config:', error);
      return;
    }

    // Optimistic update
    this.configState.update(state => {
      if (!state) return state;
      return {
        ...state,
        config: { ...state.config, [key]: value }
      };
    });
  }
}
