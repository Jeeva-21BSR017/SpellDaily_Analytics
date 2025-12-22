// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  where,
  orderBy,
} from "firebase/firestore";
import { GameMode, QuestionFormData } from "../types";
import { FirebaseQuestionData } from "../types/index";
import { BASE_URL } from "./analyticsService";

// Firebase configuration - Demo mode (no real Firebase connection)
// To use with a real Firebase project, replace these with your actual config values
const firebaseConfig = {
  apiKey: "AIzaSyCr7qtAYPckGP5vHM_Kmk5bG_x8ercatwg",
  authDomain: "spell-daily.firebaseapp.com",
  projectId: "spell-daily",
  storageBucket: "spell-daily.firebasestorage.app",
  messagingSenderId: "322219140242",
  appId: "1:322219140242:web:2dd5f7d0cfb9914829b24b",
  measurementId: "G-1BH4H225YY",
};
// Initialize Firebase in demo mode
const app = initializeApp(firebaseConfig);

// Create Firestore instance with offline settings to prevent connection attempts
export const db = getFirestore(app);

// Collection names
export const COLLECTIONS = {
  QUESTIONS: "questions",
  ANALYTICS: "analytics",
  SYLLABLES: "syllables",
};

// Firebase service functions
export class FirebaseService {
  // Submit question data
  static async submitQuestion(data: FirebaseQuestionData): Promise<boolean> {
    try {
      const url = `${BASE_URL}/game/v1/question/${data.code}`;
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }),
      };
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();
      return responseData.data;
    } catch (err) {
      console.log("Error fetching question by test code:", err);
      throw err;
    }
  }

  // Fetch question data by UID
  static async fetchQuestionByUID(
    uid: string
  ): Promise<FirebaseQuestionData | null> {
    try {
      const url = `${BASE_URL}/game/v1/question/${uid}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data.data;
    } catch (err) {
      console.log("Error fetching question by test code:", err);
      throw err;
    }
  }

  // Check if question exists by UID
  static async checkQuestionExists(uid: string): Promise<boolean> {
    try {
      const docSnap = await FirebaseService.fetchQuestionByUID(uid);
      return !!docSnap;
    } catch (error) {
      console.error("Error checking question existence:", error);
      throw error;
    }
  }

  // Update existing question
  static async updateQuestion(data: FirebaseQuestionData): Promise<boolean> {
    try {
      const url = `${BASE_URL}/game/v1/question/${data.code}`;
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: {
            ...data,
            words: data.reviewWords,
            updatedAt: new Date(),
          }
        }),
      };
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();
      return responseData.data;
    } catch (err) {
      console.log("Error fetching question by test code:", err);
      throw err;
    }
  }

  // Delete question by UID
  static async deleteQuestion(uid: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.QUESTIONS, uid);
      await setDoc(
        docRef,
        { deleted: true, deletedAt: new Date() },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Error deleting question:", error);
      throw error;
    }
  }
}
