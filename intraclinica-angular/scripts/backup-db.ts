import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
// Uses GOOGLE_APPLICATION_CREDENTIALS or default environment auth
if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'intraclinica'
    });
}

const db = getFirestore();

const COLLECTIONS = [
  'clinics',
  'users',
  'products',
  'transactions',
  'appointments',
  'patients',
  'clinical_records',
  'social_posts',
  'access_requests'
];

const backup = async () => {
  console.log('Starting Firestore backup (Admin SDK Mode)...');
  const backupData: Record<string, any[]> = {};

  try {
    for (const colName of COLLECTIONS) {
      console.log(`Reading collection: ${colName}...`);
      const snapshot = await db.collection(colName).get();
      
      if (snapshot.empty) {
        console.log(`  - ${colName} is empty.`);
        backupData[colName] = [];
      } else {
        backupData[colName] = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data()
        }));
        console.log(`  - ${colName}: ${snapshot.size} documents.`);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `firestore-backup-${timestamp}.json`;
    const outputPath = path.resolve(process.cwd(), filename);

    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));
    console.log(`
✅ Backup successfully saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
};

backup();