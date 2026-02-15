import { Component, inject, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../core/services/gemini.service';
import { DatabaseService } from '../../core/services/database.service';
import { PatientStore } from '../../core/store/patient.store';
import { LocalAiService, LocalModel } from '../../core/services/local-ai.service';
import { LucideAngularModule, FileText, Clock, Save, History, PlusCircle, Mic, MicOff, Loader2, Shield, Cloud, Monitor, Settings2, Download, DoorOpen, Users, User, ArrowRight, CheckCircle2, Wand2, Trash2 } from 'lucide-angular';
import { LiveServerMessage } from "@google/genai";
import { IAM_PERMISSIONS } from '../../core/config/iam-roles';

// Helper for Audio Blobs
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

@Component({
  selector: 'app-clinical',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6 p-6 animate-fade-in">
      @if (!canViewClinicalRecords()) {
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[40px] border border-slate-200 shadow-sm animate-scale-in">
            <div class="p-6 bg-rose-50 text-rose-600 rounded-3xl mb-6">
                <lucide-icon [img]="Shield" [size]="48"></lucide-icon>
            </div>
            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
            <p class="text-slate-500 max-w-md mx-auto mb-8 font-medium">Você não possui permissão para visualizar dados clínicos desta unidade. Caso seja um consultor ou administrador, solicite acesso ao gestor local.</p>
        </div>
      } @else {
        <div class="flex justify-between items-center border-b border-slate-200 pb-4">
            <div class="flex items-center gap-6">
                <div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight uppercase">Prontuário Médico</h2>
                    @if (currentPatient()) {
                      <div class="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit mt-1 border border-indigo-100 shadow-sm animate-scale-in">
                          <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                          <span class="text-xs font-bold uppercase">Em Atendimento: {{currentPatient()?.patientName}}</span>
                      </div>
                    }
                </div>
                
                <div class="h-12 w-px bg-slate-200"></div>

                <!-- Room Assignment for Doctor -->
                <div class="flex items-center gap-3">
                    <div class="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                        <lucide-icon [img]="DoorOpen" [size]="20"></lucide-icon>
                    </div>
                    <div>
                        <label class="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Seu Consultório</label>
                        <select 
                            [ngModel]="db.currentUser()?.assignedRoom" 
                            (ngModelChange)="db.assignRoom($event)"
                            class="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer min-w-[150px]"
                        >
                            <option [ngValue]="null">Nenhum (Liberar)</option>
                            @for (room of availableRooms; track room) {
                                <option [value]="room" [disabled]="roomOccupancy()[room] && roomOccupancy()[room] !== db.currentUser()?.name">
                                    {{room}} {{ roomOccupancy()[room] && roomOccupancy()[room] !== db.currentUser()?.name ? '(Ocupado: ' + roomOccupancy()[room] + ')' : '(Livre)' }}
                                </option>
                            }
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- AI SELECTOR -->
            <div class="flex gap-4 items-center">
                <div class="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                    <button (click)="aiMode.set('cloud')" [class.bg-white]="aiMode() === 'cloud'" [class.shadow-sm]="aiMode() === 'cloud'" [class.text-indigo-600]="aiMode() === 'cloud'" class="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">
                        <lucide-icon [img]="Cloud" [size]="14"></lucide-icon> IA Nuvem
                    </button>
                    <button (click)="aiMode.set('local')" [class.bg-white]="aiMode() === 'local'" [class.shadow-sm]="aiMode() === 'local'" [class.text-teal-600]="aiMode() === 'local'" class="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">
                        <lucide-icon [img]="Shield" [size]="14"></lucide-icon> IA Local
                    </button>
                </div>

                @if (aiMode() === 'local') {
                    <div class="animate-fade-in flex items-center gap-2">
                        <select 
                            [ngModel]="selectedLocalModel()" 
                            (ngModelChange)="onModelChange($event)"
                            class="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer hover:bg-white transition-all"
                            [disabled]="localAi.isLoaded()"
                        >
                            <option [ngValue]="null" disabled>Selecione o Modelo</option>
                            @for (model of localAi.availableModels; track model.id) {
                                <option [ngValue]="model">{{model.name}}</option>
                            }
                        </select>
                        
                        @if (selectedLocalModel() && !localAi.isLoaded()) {
                             <button 
                                (click)="loadLocalModel()" 
                                [disabled]="isInitializing()"
                                class="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50"
                            >
                                @if (isInitializing()) {
                                    <lucide-icon [img]="Loader2" [size]="14" class="animate-spin"></lucide-icon>
                                } @else {
                                    <lucide-icon [img]="Download" [size]="14"></lucide-icon> Carregar
                                }
                            </button>
                        }

                        @if (localAi.isLoaded()) {
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">
                                    Online
                                </span>
                                <button (click)="unloadLocalModel()" class="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100" title="Descarregar Modelo (Liberar Memória)">
                                    <lucide-icon [img]="Trash2" [size]="16"></lucide-icon>
                                </button>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>

        <div class="grid lg:grid-cols-4 gap-6">
            <!-- WAITING LIST SIDEBAR -->
            <div class="space-y-4">
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-[600px] overflow-y-auto custom-scrollbar flex flex-col">
                    <h3 class="font-black text-slate-400 mb-4 text-[10px] uppercase tracking-widest sticky top-0 bg-white pb-2 border-b border-slate-50 flex items-center gap-2">
                        <lucide-icon [img]="Users" [size]="14"></lucide-icon> Pacientes em Espera
                    </h3>
                    
                    <div class="space-y-3 flex-1">
                        @for (app of waitingList(); track app.id) {
                            <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group relative overflow-hidden">
                                @if (app.status === 'Chamado') {
                                    <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                }
                                <div class="flex justify-between items-start mb-2">
                                    <span class="text-xs font-black text-slate-800">{{app.date}}</span>
                                    <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded" 
                                          [class.bg-indigo-100]="app.status === 'Chamado'" [class.text-indigo-600]="app.status === 'Chamado'" 
                                          [class.bg-amber-100]="app.status === 'Aguardando'" [class.text-amber-600]="app.status === 'Aguardando'">
                                        {{app.status}}
                                    </span>
                                </div>
                                <div class="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                    <lucide-icon [img]="User" [size]="14" class="text-slate-400"></lucide-icon>
                                    {{app.patientName}}
                                </div>
                                
                                <div class="flex gap-2">
                                    @if (app.status === 'Aguardando') {
                                        <button (click)="callPatient(app)" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 opacity-0 group-hover:opacity-100">
                                            <lucide-icon [img]="Monitor" [size]="12"></lucide-icon> Chamar
                                        </button>
                                    }
                                    
                                    @if (app.status === 'Chamado') {
                                        <button (click)="startConsultation(app)" class="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 animate-pulse">
                                            Iniciar <lucide-icon [img]="ArrowRight" [size]="12"></lucide-icon>
                                        </button>
                                    }
                                </div>
                            </div>
                        } @empty {
                            <div class="flex flex-col items-center justify-center py-10 text-slate-300 text-center">
                                <lucide-icon [img]="Users" [size]="32" class="opacity-20 mb-2"></lucide-icon>
                                <p class="text-[10px] font-bold uppercase tracking-widest">Nenhum paciente aguardando seu atendimento</p>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <!-- MAIN EDITOR -->
            <div class="lg:col-span-2 space-y-4">
                <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <div class="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span class="text-xs font-black uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                            <lucide-icon [img]="FileText" [size]="14"></lucide-icon> Evolução Clínica
                        </span>
                        
                        <div class="flex gap-2">
                            <button 
                                (click)="formatProntuario()" 
                                [disabled]="!currentNotes || isFormatting()"
                                class="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                @if (isFormatting()) {
                                    <lucide-icon [img]="Loader2" [size]="14" class="animate-spin"></lucide-icon> Processando...
                                } @else {
                                    <lucide-icon [img]="Wand2" [size]="14"></lucide-icon> Padronizar Documento
                                }
                            </button>
                            @if (aiMode() === 'local' && localAi.isLoaded()) {
                                <button (click)="refineWithLocalAi()" class="bg-white border border-teal-200 text-teal-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-teal-50 transition-all flex items-center gap-2">
                                    <lucide-icon [img]="Settings2" [size]="14"></lucide-icon> Refinar Localmente
                                </button>
                            }
                            <button 
                                (click)="toggleRecording()"
                                [disabled]="!currentPatient()"
                                [class.bg-rose-600]="isRecording()"
                                [class.animate-pulse]="isRecording()"
                                [class.bg-indigo-600]="!isRecording() && aiMode() === 'cloud'"
                                [class.bg-teal-600]="!isRecording() && aiMode() === 'local'"
                                class="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm text-white hover:opacity-90 disabled:opacity-30 disabled:grayscale"
                            >
                                @if (isRecording()) {
                                <lucide-icon [img]="MicOff" [size]="14"></lucide-icon> Gravando...
                                } @else {
                                <lucide-icon [img]="Mic" [size]="14"></lucide-icon> Ditado IA
                                }
                            </button>
                        </div>
                    </div>
                    <textarea 
                        class="flex-1 p-8 outline-none resize-none text-slate-700 leading-relaxed text-lg font-medium disabled:bg-slate-50 disabled:text-slate-400"
                        placeholder="Selecione um paciente na fila ao lado para iniciar a evolução..."
                        [disabled]="!currentPatient()"
                        [(ngModel)]="currentNotes"
                    ></textarea>
                    <div class="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <div class="flex gap-2">
                            @if (currentPatient()) {
                                <button (click)="finishConsultation()" class="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 font-bold text-xs uppercase transition-all flex items-center gap-2">
                                    <lucide-icon [img]="CheckCircle2" [size]="16"></lucide-icon> Finalizar Consulta
                                </button>
                            }
                        </div>
                        <button (click)="saveNotes()" [disabled]="!currentPatient() || !currentNotes" class="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 disabled:shadow-none uppercase text-xs">
                            <lucide-icon [img]="Save" [size]="18"></lucide-icon> Salvar Evolução
                        </button>
                    </div>
                </div>
            </div>

            <!-- HISTORY SIDEBAR -->
            <div class="space-y-4">
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-[600px] overflow-y-auto custom-scrollbar flex flex-col">
                    <h3 class="font-black text-slate-400 mb-4 text-[10px] uppercase tracking-widest sticky top-0 bg-white pb-2 border-b border-slate-50">Histórico Recente</h3>
                    
                    @if (patientHistory().length > 0) {
                      <div class="space-y-6 relative mt-4 flex-1">
                          <div class="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                          @for (hist of patientHistory(); track hist.id) {
                              <div class="relative pl-6 animate-fade-in">
                                  <div class="absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-indigo-500 bg-white"></div>
                                  <div class="text-[10px] font-black text-slate-400 mb-1">
                                    {{hist.timestamp | date:'short'}} • {{hist.type | uppercase}}
                                  </div>
                                  <p class="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic font-medium">
                                      "{{hist.content}}"
                                  </p>
                              </div>
                          }
                      </div>
                    } @else {
                      <div class="flex flex-col items-center justify-center flex-1 text-slate-300">
                        <lucide-icon [img]="History" [size]="48" class="opacity-20 mb-2"></lucide-icon>
                        <p class="text-[10px] font-bold text-center uppercase tracking-widest">Sem histórico prévio</p>
                      </div>
                    }
                </div>
            </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    .animate-scale-in { animation: scaleIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class ClinicalComponent implements OnDestroy {
  db = inject(DatabaseService);
  patientStore = inject(PatientStore);
  gemini = inject(GeminiService);
  localAi = inject(LocalAiService);
  
  readonly IAM_PERMISSIONS = IAM_PERMISSIONS;

  readonly canViewClinicalRecords = computed(() => 
    this.db.checkPermission(
      this.IAM_PERMISSIONS.CLINICAL_READ_RECORDS, 
      this.db.selectedContextClinic() || this.db.currentUser()?.clinicId
    )
  );

  // State
  aiMode = signal<'cloud' | 'local'>('cloud');
  audioSource = signal<'native' | 'live'>('native');
  currentNotes = '';
  isRecording = signal(false);
  isInitializing = signal(false);
  isFormatting = signal(false);
  selectedLocalModel = signal<LocalModel | null>(null);

  // Rooms
  availableRooms = ['Consultório 01', 'Consultório 02', 'Consultório 03', 'Procedimento 01'];

  // Computed: Room Occupancy
  roomOccupancy = computed(() => {
    const users = this.db.users();
    const occupancy: Record<string, string> = {};
    users.forEach(u => {
      if (u.assignedRoom && u.id !== this.db.currentUser()?.id) {
        occupancy[u.assignedRoom] = u.name;
      }
    });
    return occupancy;
  });
  
  session: any = null;
  private recognition: any = null;

  constructor() {
    this.selectedLocalModel.set(this.localAi.availableModels[0]);
    this.initNativeSpeech();

    // Sync Data Effect
    effect(() => {
        const clinicId = this.db.selectedContextClinic();
        if (clinicId) {
            this.patientStore.loadPatients(clinicId);
            this.patientStore.loadAppointments(clinicId);
        }
    });

    // Load Records Effect
    effect(() => {
        const patient = this.currentPatient();
        if (patient) {
            this.patientStore.loadClinicalRecords(patient.id);
        }
    });
  }

  async unloadLocalModel() {
    await this.localAi.unloadModel();
    this.selectedLocalModel.set(null);
  }

  async formatProntuario() {
    if (!this.currentNotes || this.isFormatting()) return;
    
    this.isFormatting.set(true);
    const systemInstruction = `
      Você é um assistente especializado em transcrição e padronização de prontuários médicos.
      Sua tarefa é transformar anotações informais ou transcrições de áudio em um documento formal, padronizado e profissional.
      Utilize uma estrutura clara (Ex: Queixa Principal, Exame Físico, Conduta).
      Mantenha um tom técnico e preciso.
    `;

    try {
      if (this.aiMode() === 'cloud') {
        const result = await this.gemini.generateContent(this.currentNotes, systemInstruction);
        this.currentNotes = result;
      } else {
        const result = await this.localAi.generate(`Aja como um transcritor médico. Transforme o texto a seguir em um prontuário formal e padronizado: ${this.currentNotes}`);
        this.currentNotes = result;
      }
    } catch (error) {
      console.error('Erro ao formatar prontuário:', error);
    } finally {
      this.isFormatting.set(false);
    }
  }

  // Computed: Waiting List (from PatientStore)
  waitingList = computed(() => {
    const user = this.db.currentUser();
    return this.patientStore.appointments().filter(a => 
      (a.status === 'Aguardando' || a.status === 'Chamado') && 
      (a.doctorName === user?.name || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'CONSULTANT')
    );
  });

  // Computed: Get active patient (from PatientStore)
  currentPatient = computed(() => {
    const user = this.db.currentUser();
    return this.patientStore.appointments().find(a => 
      a.status === 'Em Atendimento' && 
      (a.doctorName === user?.name || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'CONSULTANT')
    );
  });

  // Computed: Get history (from PatientStore)
  patientHistory = computed(() => {
    return this.patientStore.records();
  });

  // Icons
  FileText = FileText; Clock = Clock; Save = Save; History = History; 
  PlusCircle = PlusCircle; Mic = Mic; MicOff = MicOff; Loader2 = Loader2;
  Shield = Shield; Cloud = Cloud; Monitor = Monitor; Download = Download;
  Settings2 = Settings2; DoorOpen = DoorOpen; Users = Users; User = User; ArrowRight = ArrowRight;
  CheckCircle2 = CheckCircle2; Wand2 = Wand2; Trash2 = Trash2;

  // Audio Refs (Gemini Live)
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  ngOnDestroy(): void {
    this.stopRecording();
  }

  async callPatient(app: any) {
    const user = this.db.currentUser();
    if (!user?.assignedRoom) {
      alert("Por favor, selecione seu consultório antes de chamar o paciente.");
      return;
    }
    this.patientStore.updateAppointmentStatus(app.id, 'Chamado');
    this.patientStore.updateAppointmentRoom(app.id, user.assignedRoom);
  }

  async startConsultation(app: any) {
    const user = this.db.currentUser();
    if (!user?.assignedRoom) {
      alert("Por favor, selecione seu consultório antes de iniciar o atendimento.");
      return;
    }
    this.patientStore.updateAppointmentStatus(app.id, 'Em Atendimento');
    this.patientStore.updateAppointmentRoom(app.id, user.assignedRoom);
  }

  async finishConsultation() {
    const patient = this.currentPatient();
    if (!patient) return;

    if (this.currentNotes.trim()) {
      await this.saveNotes();
    }

    this.patientStore.updateAppointmentStatus(patient.id, 'Realizado');
  }

  initNativeSpeech() {
    // Check for browser support
    if (typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';

        this.recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                this.currentNotes += event.results[i][0].transcript + ' ';
            }
            }
        };
        }
    }
  }

  async loadLocalModel() {
    if (!this.selectedLocalModel()) return;
    this.isInitializing.set(true);
    await this.localAi.loadModel(this.selectedLocalModel()!.id);
    this.isInitializing.set(false);
  }

  async onModelChange(model: LocalModel) {
    this.selectedLocalModel.set(model);
  }

  async refineWithLocalAi() {
    if (!this.currentNotes) return;
    const refined = await this.localAi.generate(this.currentNotes);
    this.currentNotes = refined;
  }

  async saveNotes() {
    const patient = this.currentPatient();
    if (!patient || !this.currentNotes) return;

    this.patientStore.createRecord({
      clinicId: patient.clinicId,
      patientId: patient.patientId!, // Ensure ID exists
      patientName: patient.patientName,
      doctorName: patient.doctorName,
      type: 'evolucao', // Default type
      content: this.currentNotes
    });

    this.currentNotes = '';
  }

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      if (this.aiMode() === 'local' || this.audioSource() === 'native') {
        this.startNativeSpeech();
      } else {
        await this.startGeminiLive();
      }
    }
  }

  startNativeSpeech() {
    if (!this.recognition) {
      alert("Seu navegador não suporta reconhecimento de voz nativo.");
      return;
    }
    this.isRecording.set(true);
    this.recognition.start();
  }

  stopRecording() {
    if (this.source) this.source.disconnect();
    if (this.processor) this.processor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioContext) this.audioContext.close();
    if (this.session) {
      this.session.close();
      this.session = null;
    }

    if (this.recognition) {
      this.recognition.stop();
    }

    this.isRecording.set(false);
  }

  async startGeminiLive() {
    this.isRecording.set(true);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });

      const sessionPromise = this.gemini.connectLive({
        model: 'gemini-2.0-flash-exp', 
        config: {
          responseModalities: ['AUDIO'],
          inputAudioTranscription: {},
          systemInstruction: "You are a medical scribe. Transcribe the doctor's dictation accurately.",
        },
        callbacks: {
          onopen: () => {
            if (!this.audioContext || !this.stream) return;
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(sess => sess.sendRealtimeInput({ media: pcmBlob }));
            };
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
          },
          onmessage: (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              if (text) this.currentNotes += text;
            }
          },
          onclose: () => this.isRecording.set(false),
          onerror: (e: any) => this.stopRecording()
        }
      });
      this.session = await sessionPromise;
    } catch (error) {
      this.stopRecording();
    }
  }
}
