import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as crypto from 'crypto';

// Initialize Firebase Admin
if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'intraclinica'
    });
}

const db = getFirestore();
const auth = getAuth();

const seedFromSql = async () => {
  console.log('Starting database seed (Admin Mode) based on SQL Schema...');

  try {
      // 1. Create Clinic (Tenants)
      const clinicId = 'clinic-aryane';
      const clinicData = {
        id: clinicId,
        name: 'Clínica Dra. Aryane',
        email: 'contato@clinicadraaryane.com.br',
        plan: 'Pro',
        status: 'active',
        nextBilling: '2026-02-17',
        createdAt: new Date().toISOString(),
        settings: {
            theme: { primaryColor: '#be185d', secondaryColor: '#fce7f3' },
            modules: { inventory: true, clinical: true, finance: true }
        }
      };
      await db.collection('clinics').doc(clinicId).set(clinicData);
      console.log('Clinic created:', clinicId);

      // 2. Create User (Super Admin)
      const email = 'bmbanho@gmail.com';
      let uid = 'temp-admin-id';

      try {
          const userRecord = await auth.getUserByEmail(email);
          uid = userRecord.uid;
          console.log('Found existing Auth user:', uid);
      } catch (e: any) {
          if (e.code === 'auth/user-not-found') {
              console.log('Creating new Auth user...');
              const tempPassword = crypto.randomBytes(16).toString('hex');
              const userRecord = await auth.createUser({
                  email: email,
                  emailVerified: true,
                  displayName: 'Bruno Banho',
                  password: tempPassword
              });
              uid = userRecord.uid;
              console.log(`User created. UID: ${uid}. Temporary Password (randomly generated): ${tempPassword}`);
          } else {
              throw e;
          }
      }

      const userData = {
        id: uid,
        clinicId: clinicId,
        name: 'Bruno Banho',
        email: email,
        role: 'SUPER_ADMIN',
        avatar: null,
        createdAt: new Date().toISOString(),
        iam: []
      };
      await db.collection('users').doc(uid).set(userData, { merge: true });
      console.log('User synced to Firestore:', email);

      // 3. Create Products (Inventory)
      const products = [
        {
          id: 'prod-botox-100u',
          clinicId: clinicId,
          name: 'Botox 100U',
          category: 'Toxina Botulínica',
          stock: 15,
          minStock: 5,
          price: 600.00,
          costPrice: 600.00,
          sellPrice: 1200.00,
          supplier: 'Allergan',
          expiryDate: '2026-12-31',
          batchNumber: 'BTX2026',
          unit: 'frasco'
        },
        {
          id: 'prod-preenchedor-1ml',
          clinicId: clinicId,
          name: 'Ácido Hialurônico 1ml',
          category: 'Preenchedores',
          stock: 8,
          minStock: 3,
          price: 450.00,
          costPrice: 450.00,
          sellPrice: 1500.00,
          supplier: 'Galderma',
          expiryDate: '2027-06-30',
          batchNumber: 'AH2027',
          unit: 'seringa'
        }
      ];

      for (const p of products) {
        await db.collection('products').doc(p.id).set(p);
      }
      console.log(`Created ${products.length} products.`);

      // 4. Create Stock Transactions
      const transactions = [
          {
              id: 'tx-001',
              clinicId: clinicId,
              productId: 'prod-botox-100u',
              type: 'IN',
              quantity: 20,
              timestamp: new Date().toISOString(),
              userId: uid,
              notes: 'Estoque inicial',
              totalCost: 12000.00
          },
          {
              id: 'tx-002',
              clinicId: clinicId,
              productId: 'prod-botox-100u',
              type: 'OUT',
              quantity: 5,
              timestamp: new Date().toISOString(),
              userId: uid,
              notes: 'Uso em paciente',
              totalValue: 6000.00
          }
      ];
      
      for (const t of transactions) {
          await db.collection('transactions').doc(t.id).set(t);
      }
      console.log(`Created ${transactions.length} transactions.`);

      // 5. Create Appointments
      const appointments = [
          {
              id: 'apt-001',
              clinicId: clinicId,
              patientName: 'Maria Silva',
              patientId: 'pat-001',
              doctorId: uid,
              date: new Date(Date.now() + 86400000).toISOString(),
              type: 'Consulta Avaliação',
              status: 'Agendado',
              roomNumber: 'Sala 1'
          }
      ];

      for (const a of appointments) {
          await db.collection('appointments').doc(a.id).set(a);
      }
      console.log(`Created ${appointments.length} appointments.`);

      // 6. Create Patients
      const patients = [
        {
            id: 'pat-001',
            clinicId: clinicId,
            name: 'Maria Silva',
            email: 'maria.silva@example.com',
            phone: '11999999999',
            createdAt: new Date().toISOString()
        }
      ];
      for (const p of patients) {
          await db.collection('patients').doc(p.id).set(p);
      }
      console.log(`Created ${patients.length} patients.`);

      console.log('Database seeded successfully based on SQL Schema!');

  } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
  }
};

seedFromSql();