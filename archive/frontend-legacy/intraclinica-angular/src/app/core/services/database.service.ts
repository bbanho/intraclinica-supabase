import { Injectable, signal, computed, effect } from '@angular/core';
import { Product, StockTransaction, UserProfile, Clinic, IamBinding, AccessRequest, Patient, Appointment, ClinicalRecord, SocialPost } from '../models/types';
import { IAM_ROLES, IAM_PERMISSIONS } from '../config/iam-roles';
import {
  getFirestore,
  collection,
  onSnapshot,
  setDoc,
  doc,
  addDoc,
  query,
  runTransaction,
  where,
  deleteDoc,
  updateDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import {
  getAuth,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { initializeApp, deleteApp, getApp } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db = getFirestore();
  private auth = getAuth();

  products = signal<Product[]>([]);
  transactions = signal<StockTransaction[]>([]);
  users = signal<UserProfile[]>([]);
  clinics = signal<Clinic[]>([]);
  accessRequests = signal<AccessRequest[]>([]);
  appointments = signal<any[]>([]);
  patients = signal<any[]>([]);
  clinicalRecords = signal<any[]>([]);
  socialPosts = signal<any[]>([]);
  
  currentUser = signal<UserProfile | null>(null);
  selectedContextClinic = signal<string | null>(null);

  // Global Metrics (SaaS)
  globalArr = computed(() => {
    const activeClinics = this.clinics().filter(c => c.status === 'active');
    const plans = { 'Starter': 199, 'Pro': 499, 'Enterprise': 1299 };
    const monthlyTotal = activeClinics.reduce((acc, c) => acc + (plans[c.plan as keyof typeof plans] || 0), 0);
    return monthlyTotal * 12;
  });

  globalUptime = signal<number>(99.98);

  accessibleClinics = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    if (user.role === 'SUPER_ADMIN') return this.clinics();
    
    const bindings = user.iam || [];
    const clinicIds = bindings.map(b => b.resource).filter(r => r !== '*');
    
    if (user.clinicId && user.clinicId !== 'all') {
        clinicIds.push(user.clinicId);
    }
    
    const uniqueIds = Array.from(new Set(clinicIds));
    return this.clinics().filter(c => uniqueIds.includes(c.id));
  });

  async approveAccess(requestId: string) {
    const request = this.accessRequests().find(r => r.id === requestId);
    if (!request) return;

    await runTransaction(this.db, async (transaction) => {
        transaction.update(doc(this.db, 'access_requests', requestId), { 
            status: 'approved',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString()
        });

        const userRef = doc(this.db, 'users', request.requesterId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            const currentIam = userData.iam || [];
            const roleId = request.requestedRoleId || 'roles/clinic_admin';

            if (!currentIam.find(b => b.resource === request.clinicId && b.roleId === roleId)) {
                transaction.update(userRef, {
                    iam: [...currentIam, { roleId, resource: request.clinicId }]
                });
            }
        }
    });
  }

  async requestAccess(clinicId: string, clinicName: string, reason: string, requestedRoleId?: string) {
    const user = this.currentUser();
    if (!user) return;

    const request: AccessRequest = {
        id: crypto.randomUUID(),
        requesterId: user.id,
        requesterName: user.name,
        clinicId,
        clinicName,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
        requestedRoleId: requestedRoleId || 'roles/clinic_admin'
    };
    await setDoc(doc(this.db, 'access_requests', request.id), request);
  }

  private unsubscribes: (() => void)[] = [];

  constructor() {
    const savedUser = localStorage.getItem('sc_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      this.currentUser.set(userData);
      
      // Initial context auto-selection logic from cache
      if (userData.role === 'SUPER_ADMIN' && userData.clinicId === 'all') {
          this.selectedContextClinic.set('all');
      } else {
          const initialClinic = (userData.clinicId && userData.clinicId !== 'all') ? userData.clinicId : null;
          this.selectedContextClinic.set(initialClinic);
      }
    }

    // consolidated Effect to handle ALL clinic synchronization logic
    effect(() => {
        const user = this.currentUser();
        if (!user) {
            this.clearAllClinicSync();
            return;
        }

        if (user.role === 'SUPER_ADMIN') {
            this.syncGlobalData();
        } else {
            this.syncAccessibleClinics(user);
        }
    });

    // Effect to handle auto-selection once clinics are loaded/synced
    effect(() => {
        this.evaluateAutoContextSelection();
    });

    effect(() => {
      const clinicId = this.selectedContextClinic();
      this.syncDataForClinic(clinicId);
    });
  }

  private globalUnsubs: (() => void)[] = [];
  private clinicUnsubs: (() => void)[] = [];

  private clearAllClinicSync() {
      this.globalUnsubs.forEach(u => u());
      this.clinicUnsubs.forEach(u => u());
      this.globalUnsubs = [];
      this.clinicUnsubs = [];
      this.clinics.set([]);
  }

  private syncGlobalData() {
      if (this.globalUnsubs.length > 0) return; // Already syncing globally
      this.clearAllClinicSync();
      
      this.globalUnsubs = [
          onSnapshot(collection(this.db, 'clinics'), (snapshot) => {
              this.clinics.set(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Clinic)));
          }),
          onSnapshot(collection(this.db, 'access_requests'), (snapshot) => {
              this.accessRequests.set(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AccessRequest)));
          })
      ];
  }

  private syncAccessibleClinics(user: UserProfile) {
      this.clearAllClinicSync();

      const ids = new Set<string>();
      if (user.clinicId && user.clinicId !== 'all') ids.add(user.clinicId);
      (user.iam || []).forEach(b => {
          if (b.resource !== '*') ids.add(b.resource);
      });

      ids.forEach(id => {
          const unsub = onSnapshot(doc(this.db, 'clinics', id), (snap) => {
              if (snap.exists()) {
                  const clinicData = { ...snap.data(), id: snap.id } as Clinic;
                  this.clinics.update(current => {
                      const filtered = current.filter(c => c.id !== id);
                      return [...filtered, clinicData];
                  });
              }
          });
          this.clinicUnsubs.push(unsub);
      });
  }

  evaluateAutoContextSelection() {
    const clinics = this.clinics();
    const user = this.currentUser();
    const currentContext = this.selectedContextClinic();

    if (user && clinics.length > 0 && !currentContext) {
        const accessible = this.accessibleClinics();
        if (accessible.length === 1) {
            console.log(`Auto-selecting context: ${accessible[0].name}`);
            this.selectedContextClinic.set(accessible[0].id);
        }
    }
  }

  checkPermission(permission: string, resource: string = '*'): boolean {
    const user = this.currentUser();
    if (!user) return false;

    // 1. SUPER_ADMIN has absolute precedence
    if (user.role === 'SUPER_ADMIN') return true;

    const bindings = user.iam || [];

    // 2. Denial Precedence: If any binding explicitly denies the permission, access is denied.
    for (const binding of bindings) {
        if (binding.resource === '*' || binding.resource === resource) {
            if (binding.denied?.includes(permission)) return false;
        }
    }

    // 3. Grant Check: If any binding grants the permission (explicitly or via role), access is granted.
    for (const binding of bindings) {
        if (binding.resource === '*' || binding.resource === resource) {
            if (binding.permissions?.includes(permission)) return true;
            
            const role = IAM_ROLES[binding.roleId];
            if (role && (role.permissions.includes('*') || role.permissions.includes(permission))) return true;
        }
    }

    return false;
  }

  async logout() {

  private syncDataForClinic(clinicId: string | null) {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];

    if (!clinicId || clinicId === 'all') {
      this.products.set([]);
      this.transactions.set([]);
      this.appointments.set([]);
      this.patients.set([]);
      this.clinicalRecords.set([]);
      this.socialPosts.set([]);
      return;
    }

    const collectionsToSync = ['products', 'transactions', 'appointments', 'patients', 'clinical_records', 'social_posts', 'users'];
    const signals: Record<string, any> = {
      products: this.products,
      transactions: this.transactions,
      appointments: this.appointments,
      patients: this.patients,
      clinical_records: this.clinicalRecords,
      social_posts: this.socialPosts,
      users: this.users,
    };

    collectionsToSync.forEach(colName => {
      const q = query(collection(this.db, colName), where('clinicId', '==', clinicId));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs
            .map(doc => ({ ...doc.data(), id: doc.id } as { id: string; [key: string]: any; deleted?: boolean }))
            .filter(item => !item.deleted);
        signals[colName].set(data);
      });
      this.unsubscribes.push(unsub);
    });
  }

  async logout() {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.selectedContextClinic.set(null);
    localStorage.removeItem('sc_user');
  }

  async addClinic(clinic: Clinic) { await setDoc(doc(this.db, 'clinics', clinic.id), clinic); }
  async deleteClinic(id: string) { await deleteDoc(doc(this.db, 'clinics', id)); }
  
  async saveUser(user: UserProfile, tempPassword?: string) { 
      let finalUid = user.id;
      if (tempPassword) {
          // If auth creation fails, we must NOT proceed to save the profile
          // because the IDs will not match or the account was not created.
          finalUid = await this.createUserInFirebaseAuth(user.email, tempPassword);
      }
      const userToSave = { ...user, id: finalUid };
      await setDoc(doc(this.db, 'users', finalUid), userToSave, { merge: true });
  }

  private async createUserInFirebaseAuth(email: string, password: string): Promise<string> {
    const app = getApp();
    let secondaryApp;
    try {
        secondaryApp = getApp('SecondaryApp');
    } catch (e) {
        secondaryApp = initializeApp(app.options, 'SecondaryApp');
    }
    const secondaryAuth = getAuth(secondaryApp);
    try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        return cred.user.uid;
    } finally {
        try {
            await deleteApp(secondaryApp);
        } catch (e) {
            console.error('Failed to delete secondary Firebase app during cleanup', e);
        }
    }
  }

  async addProduct(product: Product) { 
    const data = { ...product };
    if (!data.clinicId) {
        data.clinicId = this.selectedContextClinic() || undefined;
    }
    if (!data.clinicId) throw new Error("Clinic context is required to add products.");
    await setDoc(doc(this.db, 'products', data.id), data); 
  }

  async deleteProduct(id: string) {
    await updateDoc(doc(this.db, 'products', id), { deleted: true });
  }

  async addTransaction(tx: Omit<StockTransaction, 'id' | 'timestamp' | 'clinicId'>) {
    const productsRef = doc(this.db, 'products', tx.productId);
    const clinicId = this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic context is required to add transactions.");
    
    await runTransaction(this.db, async (transaction) => {
      const pDoc = await transaction.get(productsRef);
      if (!pDoc.exists()) throw new Error("Product does not exist!");
      
      const currentData = pDoc.data();
      const newStock = (currentData['stock'] || 0) + (tx.type === 'IN' ? tx.quantity : -tx.quantity);
      
      transaction.set(doc(collection(this.db, 'transactions')), { 
        ...tx, 
        clinicId,
        timestamp: new Date().toISOString() 
      });
      transaction.update(productsRef, { stock: newStock });
    });
  }

  async addPatient(patient: Omit<Patient, 'id' | 'clinicId' | 'createdAt'>) { 
    const clinicId = this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic context is required to add patients.");

    const docRef = await addDoc(collection(this.db, 'patients'), { 
      ...patient, 
      clinicId,
      createdAt: new Date().toISOString() 
    }); 
    return docRef.id;
  }

  async addAppointment(appointment: Omit<Appointment, 'id' | 'clinicId' | 'timestamp'>) { 
    const clinicId = this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic context is required to add appointments.");

    await addDoc(collection(this.db, 'appointments'), { 
      ...appointment, 
      clinicId,
      timestamp: new Date().toISOString() 
    }); 
  }

  async updateAppointmentStatus(id: string, status: string) { await setDoc(doc(this.db, 'appointments', id), { status }, { merge: true }); }
  
  async addClinicalRecord(record: Omit<ClinicalRecord, 'id' | 'clinicId' | 'timestamp'>) { 
    const clinicId = this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic context is required to add clinical records.");

    await addDoc(collection(this.db, 'clinical_records'), { 
      ...record, 
      clinicId,
      timestamp: new Date().toISOString() 
    }); 
  }

  async addSocialPost(post: Omit<SocialPost, 'id' | 'clinicId' | 'timestamp'>) { 
    const clinicId = this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic context is required to add social posts.");

    await addDoc(collection(this.db, 'social_posts'), { 
      ...post, 
      clinicId,
      timestamp: new Date().toISOString() 
    }); 
  }

  async assignRoom(roomId: string | null) {
    const user = this.currentUser();
    if (!user) return;
    await setDoc(doc(this.db, 'users', user.id), { assignedRoom: roomId }, { merge: true });
  }

  async updateAppointmentRoom(appointmentId: string, roomNumber: string) {
    await setDoc(doc(this.db, 'appointments', appointmentId), { roomNumber }, { merge: true });
  }
}