export interface UiModule {
  key: string;
  label: string;
  icon: string;
  route: string;
  enabled: boolean;
  sort_order: number;
}

export interface ClinicUiConfig {
  modules: UiModule[];
  config: Record<string, unknown>;
}
