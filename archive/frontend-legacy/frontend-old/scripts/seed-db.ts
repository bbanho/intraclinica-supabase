import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { firebaseConfig } from '../src/environments/firebase-config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seed = async () => {
  console.log('Seeding Database (Client SDK Mode)...');
  
  const clinicId = 'clinic-aryane';
  const batch = writeBatch(db);

  // 1. Create Clinic
  console.log('Seeding Clinic...');
  const clinicRef = doc(db, 'clinics', clinicId);
  batch.set(clinicRef, {
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
  });

  // 2. Create User Profile
  // We use a fixed ID for the 'owner' to match the developerEmail if possible, 
  // or a temporary one that can be claimed. 
  // Since we can't create Auth users here easily, we create the profile.
  console.log('Seeding User Profile...');
  const userId = 'temp-super-admin'; 
  const userRef = doc(db, 'users', userId);
  batch.set(userRef, {
    id: userId,
    clinicId: clinicId,
    name: 'Bruno Banho',
    email: 'bmbanho@gmail.com',
    role: 'SUPER_ADMIN',
    createdAt: new Date().toISOString(),
    iam: []
  });

  // 3. Create Products
  console.log('Seeding Products...');
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
    const pRef = doc(db, 'products', p.id);
    batch.set(pRef, p);
  }

  // 4. Create Stock Transactions
  console.log('Seeding Transactions...');
  const transactions = [
      {
          id: 'tx-001',
          clinicId: clinicId,
          productId: 'prod-botox-100u',
          type: 'IN',
          quantity: 20,
          timestamp: new Date().toISOString(),
          userId: userId,
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
          userId: userId,
          notes: 'Uso em paciente',
          totalValue: 6000.00
      }
  ];
  
  for (const t of transactions) {
      const tRef = doc(db, 'transactions', t.id);
      batch.set(tRef, t);
  }

  // 5. Create Appointments
  console.log('Seeding Appointments...');
  const appointments = [
      {
          id: 'apt-001',
          clinicId: clinicId,
          patientName: 'Maria Silva',
          patientId: 'pat-001',
          doctorId: userId,
          date: new Date(Date.now() + 86400000).toISOString(),
          type: 'Consulta Avaliação',
          status: 'Agendado',
          roomNumber: 'Sala 1'
      }
  ];

  for (const a of appointments) {
      const aRef = doc(db, 'appointments', a.id);
      batch.set(aRef, a);
  }

  // 6. Create Patients
  console.log('Seeding Patients...');
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
      const pRef = doc(db, 'patients', p.id);
      batch.set(pRef, p);
  }

  await batch.commit();
  console.log('Seeding complete. Login with bmbanho@gmail.com to claim the account (if implemented) or use the data.');
  process.exit(0);
};

seed().catch(console.error);