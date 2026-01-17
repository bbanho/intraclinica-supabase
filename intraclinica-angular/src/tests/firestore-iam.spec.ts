import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

describe('IntraClinica IAM Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = 'intraclinica';
  const RULES_PATH = path.resolve(__dirname, '../../../intraclinica-firebase/firestore.rules');
  
  if (!fs.existsSync(RULES_PATH)) {
      throw new Error(`Rules file not found at: ${RULES_PATH}`);
  }
  
  const rules = fs.readFileSync(RULES_PATH, 'utf8');

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rules,
        host: '127.0.0.1',
        port: 8080
      },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    
    // Setup Admin Context to seed users
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        
        // --- 1. Seed Clinics ---
        await db.collection('clinics').doc('clinic-alpha').set({ id: 'clinic-alpha', name: 'Alpha Clinic' });
        await db.collection('clinics').doc('clinic-beta').set({ id: 'clinic-beta', name: 'Beta Clinic' });
        
        // --- 2. Seed Users with IAM Roles ---
        
        // Admin: Full Access
        await db.collection('users').doc('u_admin').set({
            id: 'u_admin',
            clinicId: 'clinic-alpha',
            role: 'ADMIN',
            iam: [{ roleId: 'roles/clinic_admin', resource: 'clinic-alpha' }]
        });

        // Doctor: Clinical Read/Write, Inventory Read
        await db.collection('users').doc('u_doctor').set({
            id: 'u_doctor',
            clinicId: 'clinic-alpha',
            role: 'DOCTOR',
            iam: [{ roleId: 'roles/doctor', resource: 'clinic-alpha' }]
        });
        
        // Marketing
        await db.collection('users').doc('u_marketing').set({
            id: 'u_marketing',
            clinicId: 'clinic-alpha',
            role: 'MARKETING',
            iam: [{ roleId: 'roles/marketing', resource: 'clinic-alpha' }]
        });
        
        // Reception
        await db.collection('users').doc('u_reception').set({
            id: 'u_reception',
            clinicId: 'clinic-alpha',
            role: 'RECEPTION',
            iam: [{ roleId: 'roles/reception', resource: 'clinic-alpha' }]
        });

        // Stock Manager
        await db.collection('users').doc('u_stock').set({
            id: 'u_stock',
            clinicId: 'clinic-alpha',
            role: 'STOCK',
            iam: [{ roleId: 'roles/stock_manager', resource: 'clinic-alpha' }]
        });
        
        // Super Admin
        await db.collection('users').doc('u_super').set({
            id: 'u_super',
            role: 'SUPER_ADMIN',
            iam: []
        });

        // Hacker: No IAM bindings
        await db.collection('users').doc('u_hacker').set({
            id: 'u_hacker',
            role: 'USER',
            iam: []
        });
        
        // --- 3. Seed Existing Data ---
        await db.collection('products').doc('prod-1').set({ clinicId: 'clinic-alpha', name: 'Bandages' });
        await db.collection('clinical_records').doc('rec-1').set({ clinicId: 'clinic-alpha', content: 'Secret' });
        await db.collection('patients').doc('pat-1').set({ clinicId: 'clinic-alpha', name: 'John Doe' });
        await db.collection('social_posts').doc('post-1').set({ clinicId: 'clinic-alpha', title: 'Promo' });
        
        // Access Request
        await db.collection('access_requests').doc('req-1').set({ 
            id: 'req-1',
            requesterId: 'u_hacker',
            clinicId: 'clinic-alpha',
            status: 'pending' 
        });
    });
  });

  // ===========================================================================
  // 👥 USERS
  // ===========================================================================
  describe('Users Collection', () => {
     it('User can read their own profile', async () => {
         const db = testEnv.authenticatedContext('u_doctor').firestore();
         await assertSucceeds(db.collection('users').doc('u_doctor').get());
     });

     it('User CANNOT read other profiles', async () => {
         const db = testEnv.authenticatedContext('u_doctor').firestore();
         await assertFails(db.collection('users').doc('u_admin').get());
     });

     it('Super Admin can read any profile', async () => {
         const db = testEnv.authenticatedContext('u_super').firestore();
         await assertSucceeds(db.collection('users').doc('u_admin').get());
     });
     
     it('User CANNOT update their own ROLE or IAM', async () => {
         const db = testEnv.authenticatedContext('u_doctor').firestore();
         await assertFails(db.collection('users').doc('u_doctor').update({ role: 'SUPER_ADMIN' }));
         await assertFails(db.collection('users').doc('u_doctor').update({ iam: [] }));
     });

     it('User CAN update safe fields (e.g. name)', async () => {
         const db = testEnv.authenticatedContext('u_doctor').firestore();
         await assertSucceeds(db.collection('users').doc('u_doctor').update({ name: 'Dr. House' }));
     });

     it('Clinic Admin CAN manage users in their clinic', async () => {
         const db = testEnv.authenticatedContext('u_admin').firestore();
         // Read Doctor (in clinic-alpha)
         await assertSucceeds(db.collection('users').doc('u_doctor').get());
         // Update Doctor
         await assertSucceeds(db.collection('users').doc('u_doctor').update({ name: 'Dr. House (Staff)' }));
     });

     it('Clinic Admin CANNOT manage users in OTHER clinics', async () => {
        // Setup a user in beta
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context.firestore().collection('users').doc('u_beta').set({
                id: 'u_beta',
                clinicId: 'clinic-beta',
                role: 'USER',
                iam: []
            });
        });

        const db = testEnv.authenticatedContext('u_admin').firestore(); // Admin of alpha
        await assertFails(db.collection('users').doc('u_beta').get());
        await assertFails(db.collection('users').doc('u_beta').update({ name: 'Hacked' }));
     });

     it('Super Admin CAN delete users', async () => {
         const db = testEnv.authenticatedContext('u_super').firestore();
         await assertSucceeds(db.collection('users').doc('u_hacker').delete());
     });
  });

  // ===========================================================================
  // 🏥 CLINICS
  // ===========================================================================
  describe('Clinics Collection', () => {
      it('User with binding can read clinic', async () => {
          const db = testEnv.authenticatedContext('u_doctor').firestore();
          await assertSucceeds(db.collection('clinics').doc('clinic-alpha').get());
      });

      it('User without binding CANNOT read clinic', async () => {
          const db = testEnv.authenticatedContext('u_doctor').firestore();
          // Doctor has binding for clinic-alpha, NOT clinic-beta
          await assertFails(db.collection('clinics').doc('clinic-beta').get());
      });
  });

  // ===========================================================================
  // 📦 INVENTORY (Products)
  // ===========================================================================
  describe('Inventory (Products & Transactions)', () => {
      it('Stock Manager can READ and WRITE products', async () => {
          const db = testEnv.authenticatedContext('u_stock').firestore();
          await assertSucceeds(db.collection('products').doc('prod-1').get());
          await assertSucceeds(db.collection('products').add({ clinicId: 'clinic-alpha', name: 'New Item' }));
      });

      it('Reception CANNOT Read Products', async () => {
          const db = testEnv.authenticatedContext('u_reception').firestore();
          await assertFails(db.collection('products').doc('prod-1').get());
      });

      it('Stock Manager can READ and CREATE transactions but NOT UPDATE/DELETE', async () => {
          const db = testEnv.authenticatedContext('u_stock').firestore();
          // Read
          await assertSucceeds(db.collection('transactions').add({ 
              id: 'tx-new', 
              clinicId: 'clinic-alpha', 
              productId: 'prod-1', 
              type: 'IN', 
              quantity: 5 
          }));
          
          // Seed a transaction for read/update tests
          await testEnv.withSecurityRulesDisabled(async (context) => {
              await context.firestore().collection('transactions').doc('tx-old').set({ 
                  clinicId: 'clinic-alpha', 
                  productId: 'prod-1', 
                  type: 'IN' 
              });
          });

          await assertSucceeds(db.collection('transactions').doc('tx-old').get());
          // Update/Delete should FAIL (Audit Log Immutability)
          await assertFails(db.collection('transactions').doc('tx-old').update({ quantity: 100 }));
          await assertFails(db.collection('transactions').doc('tx-old').delete());
      });
  });

  // ===========================================================================
  // 🩺 CLINICAL RECORDS
  // ===========================================================================
  describe('Clinical Records', () => {
      it('Doctor can READ and WRITE', async () => {
          const db = testEnv.authenticatedContext('u_doctor').firestore();
          await assertSucceeds(db.collection('clinical_records').doc('rec-1').get());
          await assertSucceeds(db.collection('clinical_records').add({ clinicId: 'clinic-alpha', content: 'Diagnosis' }));
      });

      it('Reception CANNOT Read or Write', async () => {
          const db = testEnv.authenticatedContext('u_reception').firestore();
          await assertFails(db.collection('clinical_records').doc('rec-1').get());
          await assertFails(db.collection('clinical_records').add({ clinicId: 'clinic-alpha', content: 'Spying' }));
      });
  });
  
  // ===========================================================================
  // 📢 MARKETING (Social Posts)
  // ===========================================================================
  describe('Marketing', () => {
      it('Marketing Specialist can READ, WRITE and DELETE', async () => {
          const db = testEnv.authenticatedContext('u_marketing').firestore();
          await assertSucceeds(db.collection('social_posts').doc('post-1').get());
          await assertSucceeds(db.collection('social_posts').add({ clinicId: 'clinic-alpha', title: 'New Campaign' }));
          await assertSucceeds(db.collection('social_posts').doc('post-1').delete());
      });

      it('Doctor CANNOT Read', async () => {
          const db = testEnv.authenticatedContext('u_doctor').firestore();
          await assertFails(db.collection('social_posts').doc('post-1').get());
      });
  });
  
  // ===========================================================================
  // 🔑 ACCESS REQUESTS
  // ===========================================================================
  describe('Access Requests', () => {
      it('Requester can CANCEL their own request', async () => {
          const db = testEnv.authenticatedContext('u_hacker').firestore();
          await assertSucceeds(db.collection('access_requests').doc('req-1').update({ status: 'cancelled' }));
      });

      it('Requester CANNOT approve their own request', async () => {
          const db = testEnv.authenticatedContext('u_hacker').firestore();
          await assertFails(db.collection('access_requests').doc('req-1').update({ status: 'approved' }));
      });
      
      it('Clinic Admin can APPROVE request', async () => {
          const db = testEnv.authenticatedContext('u_admin').firestore();
          await assertSucceeds(db.collection('access_requests').doc('req-1').update({ status: 'approved' }));
      });
  });

});