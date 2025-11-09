import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { AnalyticsData } from '../types';

export class AnalyticsService {
  
  // Fetch analytics data for a specific code
  static async fetchAnalytics(code: string): Promise<AnalyticsData[]> {
    try {
      const q = query(
        collection(db, "user-activity"),
        where("code", "==", code),
        orderBy("submittedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const analyticsData: AnalyticsData[] = [];

      querySnapshot.forEach((doc) => {
        analyticsData.push({ 
          id: doc.id, 
          ...doc.data() 
        } as AnalyticsData);
      });

      return analyticsData;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate code format
  static validateCode(code: string): { isValid: boolean; error?: string } {
    if (!code.trim()) {
      return { isValid: false, error: 'Please enter a code to fetch analytics.' };
    }

    if (code.length !== 6 || !/^[a-zA-Z0-9]{6}$/.test(code)) {
      return { isValid: false, error: 'Code must be exactly 6 alphanumeric characters.' };
    }

    return { isValid: true };
  }
}