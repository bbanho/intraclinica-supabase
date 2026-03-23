import { Injectable, signal } from '@angular/core';

export interface AccessRequest {
  id: string;
  requesterName: string;
  clinicName: string;
  reason: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _pendingRequests = signal<AccessRequest[]>([
    {
      id: 'req-1',
      requesterName: 'Dr. João Silva',
      clinicName: 'Clínica Central',
      reason: 'Necessito de acesso temporário para auditoria de prontuários.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: 'req-2',
      requesterName: 'Maria Souza (Suporte SaaS)',
      clinicName: 'Unidade Sul',
      reason: 'Análise de erro reportado no módulo de faturamento.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
    }
  ]);

  readonly pendingRequests = this._pendingRequests.asReadonly();

  approveRequest(id: string) {
    this._pendingRequests.update(reqs => reqs.filter(r => r.id !== id));
  }

  denyRequest(id: string) {
    this._pendingRequests.update(reqs => reqs.filter(r => r.id !== id));
  }
}
