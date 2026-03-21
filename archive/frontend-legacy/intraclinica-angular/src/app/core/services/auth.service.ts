import { Injectable, inject } from '@angular/core';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { UserProfile } from '../models/types';
import { DatabaseService } from './database.service';
import { Router } from '@angular/router';
import { firebaseConfig } from '../../../environments/firebase-config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = getAuth();
  private db = getFirestore();
  private dbService = inject(DatabaseService);
  private router = inject(Router);

  constructor() {
    onAuthStateChanged(this.auth, async (fbUser) => {
      if (fbUser) {
        // Try to get profile by UID, fallback to Email for association
        let userProfile = await this.getUserProfile(fbUser.uid, fbUser.email || undefined);

        if (userProfile) {
          this.dbService.currentUser.set(userProfile);
          localStorage.setItem('sc_user', JSON.stringify(userProfile));
        } else {
            // No profile found, ensure session is clean
            console.warn('Login attempt with no profile for:', fbUser.email);
            this.dbService.currentUser.set(null);
        }
      } else {
        this.dbService.currentUser.set(null);
        localStorage.removeItem('sc_user');
      }
    });
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      if (user) {
        // Associate by email if profile not found by UID
        let userProfile = await this.getUserProfile(user.uid, user.email || undefined);

        if (userProfile) {
            this.dbService.currentUser.set(userProfile);
            return true;
        }

        // Block login for any user without a pre-existing profile.
        console.error('Access denied. User profile not found for:', user.email);
        await signOut(this.auth);
        return false;
      }
    } catch (e) {
      console.error('Google Login failed', e);
    }
    return false;
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  async createFirebaseUser(
    user: UserProfile,
    password: string
  ): Promise<string> {
    const cred = await createUserWithEmailAndPassword(
      this.auth,
      user.email,
      password
    );
    const { id, ...data } = user;
    // We use the new UID from Firebase Auth to store the profile
    await setDoc(doc(this.db, 'users', cred.user.uid), { ...data, id: cred.user.uid }, { merge: true });
    return cred.user.uid;
  }

  private async getUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
    try {
        // 1. Check by UID (Standard)
        const userRef = doc(this.db, 'users', uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          return { id: uid, ...userDoc.data() } as UserProfile;
        }

        // 2. Check by Email (Association/Migration)
        // If we found a user with the same email but different UID, we migrate the profile atomically
        if (email) {
            const q = query(collection(this.db, 'users'), where('email', '==', email), limit(1));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const oldDoc = snap.docs[0];
                const oldData = oldDoc.data() as UserProfile;
                const oldUid = oldDoc.id;
                
                if (oldUid !== uid) {
                  console.log(`Associating login for ${email}: Migrating profile from ${oldUid} to ${uid}`);
                  
                  await runTransaction(this.db, async (transaction) => {
                      const newDocRef = doc(this.db, 'users', uid);
                      const oldDocRef = doc(this.db, 'users', oldUid);
                      
                      // Double check existence in transaction
                      const oldDocSnap = await transaction.get(oldDocRef);
                      if (oldDocSnap.exists()) {
                          const newProfile = { ...oldData, id: uid };
                          transaction.set(newDocRef, newProfile);
                          transaction.delete(oldDocRef);
                      }
                  });
                  
                  return { ...oldData, id: uid };
                }
            }
        }
    } catch (e) {
        console.error("Critical: Could not fetch or associate user profile", e);
    }
    return null;
  }
}

