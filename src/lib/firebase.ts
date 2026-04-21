import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection test as per instructions
async function testConnection() {
  try {
    // Calling getDocFromServer on a public path to verify connectivity
    await getDocFromServer(doc(db, 'public', 'health'));
  } catch (error) {
    // We only log if it's a network/offline error
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Kupay: Firebase is offline. Please check your connection.");
    }
  }
}
testConnection();
