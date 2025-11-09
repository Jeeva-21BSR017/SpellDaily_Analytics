// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { GameMode, QuestionFormData } from '../types';
import {FirebaseQuestionData} from '../types/index';

// Firebase configuration - Demo mode (no real Firebase connection)
// To use with a real Firebase project, replace these with your actual config values
const firebaseConfig = {
        apiKey: "AIzaSyCr7qtAYPckGP5vHM_Kmk5bG_x8ercatwg",
        authDomain: "spell-daily.firebaseapp.com",
        projectId: "spell-daily",
        storageBucket: "spell-daily.firebasestorage.app",
        messagingSenderId: "322219140242",
        appId: "1:322219140242:web:2dd5f7d0cfb9914829b24b",
        measurementId: "G-1BH4H225YY"
      };
// Initialize Firebase in demo mode
const app = initializeApp(firebaseConfig);

// Create Firestore instance with offline settings to prevent connection attempts
export const db = getFirestore(app);

// Collection names
export const COLLECTIONS = {
  QUESTIONS: 'questions',
  ANALYTICS: 'analytics',
  SYLLABLES: 'syllables'
};

// Firebase service functions
export class FirebaseService {
  
  // Submit question data
  static async submitQuestion(data: FirebaseQuestionData): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.QUESTIONS, data.code);
      await setDoc(docRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error submitting question:', error);
      throw error;
    }
  }

  // Fetch question data by UID
  static async fetchQuestionByUID(uid: string): Promise<FirebaseQuestionData | null> {
    try {
      const docRef = doc(db, COLLECTIONS.QUESTIONS, uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          code: data.code || uid,
          date: data.date || '',
          reviewWords: data.words || [],
          gameSequence: data.gameSequence || [],
          wordHints: data.wordHints || '',
          wordDistractors: data.wordDistractors || '',
          sentenceTemplates: data.sentenceTemplates || '',
          wordPartsData: data.wordPartsData || '',
          fillupsBlankPositions: data.fillupsBlankPositions || '',
          twoOptionDistractors: data.twoOptionDistractors || '',
          wordMeanings: data.wordMeanings || '',
          contextChoice: data.contextChoice || '',
          correctSentence: data.correctSentence || '',
          syllableData: data.syllableData || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching question:', error);
      throw error;
    }
  }

  // Check if question exists by UID
  static async checkQuestionExists(uid: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.QUESTIONS, uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking question existence:', error);
      throw error;
    }
  }

  // Update existing question
  static async updateQuestion(data: FirebaseQuestionData): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.QUESTIONS, data.code);
      await setDoc(docRef, {
        ...data,
        words: data.reviewWords,
        updatedAt: new Date()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }


  // Delete question by UID
  static async deleteQuestion(uid: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.QUESTIONS, uid);
      await setDoc(docRef, { deleted: true, deletedAt: new Date() }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }
}