import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { AnalyticsData } from "../types";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const BASE_URL = "https://api.spelldaily.com";

export class AnalyticsService {
  // Fetch analytics data for a specific code
  static async fetchAnalytics(code: string): Promise<AnalyticsData[]> {
    try {
      const url = `${BASE_URL}/game/v1/question/${code}`;
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

  // Validate code format
  static validateCode(code: string): { isValid: boolean; error?: string } {
    if (!code.trim()) {
      return {
        isValid: false,
        error: "Please enter a code to fetch analytics.",
      };
    }

    if (code.length !== 6 || !/^[a-zA-Z0-9]{6}$/.test(code)) {
      return {
        isValid: false,
        error: "Code must be exactly 6 alphanumeric characters.",
      };
    }

    return { isValid: true };
  }
}
