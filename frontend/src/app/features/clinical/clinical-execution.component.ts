import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { PatientService } from '../../core/services/patient.service';
import { DatabaseService } from '../../core/services/database.service';
import { ProcedureType, InventoryMovement } from '../../core/models/inventory.types';
import { Patient } from '../../core/models/types';

@Component({
  selector: 'app-clinical-execution',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clinical-execution.component.html',
  styleUrls: ['./clinical-execution.component.css']
})
export class ClinicalExecutionComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private patientService = inject(PatientService);
  private dbService = inject(DatabaseService);

  procedureTypes: ProcedureType[] = [];
  selectedProcedureId: string = '';
  
  patients: Patient[] = [];
  selectedPatientId: string = '';

  auditLog: (InventoryMovement & { actor?: { name: string } })[] = [];
  
  notes: string = '';
  isLoading: boolean = false;
  message: string = '';
  error: string = '';

  async ngOnInit() {
    await this.loadProcedureTypes();
    await this.loadAuditLog();
    this.loadPatients();
  }

  get clinicId() {
    const ctx = this.dbService.selectedContextClinic();
    // 'all' is SUPER_ADMIN global sentinel — not a valid UUID for clinic-scoped queries
    return ctx === 'all' ? null : ctx;
  }

  async loadProcedureTypes() {
    try {
      this.procedureTypes = await this.inventoryService.getProcedureTypes();
    } catch (err: any) {
      this.error = 'Failed to load procedures: ' + (err.message || err);
    }
  }

  async loadAuditLog() {
    try {
      this.auditLog = await this.inventoryService.getProcedureAuditLog();
    } catch (err: any) {
      console.error('Failed to load audit log', err);
    }
  }

  loadPatients() {
    const cid = this.clinicId;
    if (!cid) return;
    
    this.patientService.getPatients(cid).subscribe({
      next: (data) => this.patients = data,
      error: (err) => console.error('Failed to load patients', err)
    });
  }

  async perform() {
    this.message = '';
    this.error = '';

    if (!this.selectedProcedureId) {
      this.error = 'Please select a procedure.';
      return;
    }
    if (!this.selectedPatientId) {
       this.error = 'Please select a patient.';
       return;
    }

    this.isLoading = true;

    try {
      await this.inventoryService.performProcedure(
        this.selectedProcedureId,
        this.selectedPatientId,
        this.notes
      );
      this.message = 'Procedure performed successfully!';
      this.notes = '';
      await this.loadAuditLog(); // Refresh log
    } catch (err: any) {
      this.error = 'Error performing procedure: ' + (err.message || err);
    } finally {
      this.isLoading = false;
    }
  }
}
