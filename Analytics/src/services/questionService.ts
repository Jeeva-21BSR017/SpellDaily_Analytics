import { QuestionFormData, GameMode, WordMeanings, ContextChoices } from '../types';
import { FirebaseService } from './firebase';
import {FirebaseQuestionData} from '../types/index';

export class QuestionService {
  
  // Validate UID format
  static validateUID(uid: string): boolean {
    const regex = /^[A-Za-z0-9]{6}$/;
    return regex.test(uid);
  }

  // Validate JSON string
  static validateJSON(jsonString: string): boolean {
    if (!jsonString.trim()) return true; // Empty strings are valid
    
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  // Validate word meanings format
  static validateWordMeanings(wordMeanings: string): { isValid: boolean; error?: string } {
    if (!wordMeanings.trim()) return { isValid: true };
    
    try {
      const parsed = JSON.parse(wordMeanings) as WordMeanings;
      
      for (const [word, meaning] of Object.entries(parsed)) {
        if (!meaning.correct || !Array.isArray(meaning.options)) {
          return { 
            isValid: false, 
            error: `Invalid format for word "${word}". Must have "correct" and "options" array.` 
          };
        }
        
        if (meaning.options.length < 2) {
          return { 
            isValid: false, 
            error: `Word "${word}" must have at least 2 options.` 
          };
        }
        
        if (!meaning.options.includes(meaning.correct)) {
          return { 
            isValid: false, 
            error: `Word "${word}" correct answer must be included in options array.` 
          };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Invalid JSON format for word meanings.' 
      };
    }
  }

  // Validate context choices format
  static validateContextChoices(contextChoice: string): { isValid: boolean; error?: string } {
    if (!contextChoice.trim()) return { isValid: true };
    
    try {
      const parsed = JSON.parse(contextChoice) as ContextChoices;
      
      for (const [word, context] of Object.entries(parsed)) {
        if (!context.sentence || !context.correct || !Array.isArray(context.options)) {
          return { 
            isValid: false, 
            error: `Invalid format for word "${word}". Must have "sentence", "correct", and "options" array.` 
          };
        }
        
        if (!context.options.includes(context.correct)) {
          return { 
            isValid: false, 
            error: `Word "${word}" correct answer must be included in options array.` 
          };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Invalid JSON format for context choices.' 
      };
    }
  }

  // Validate syllable data format
  static validateSyllableData(syllableData: string): { isValid: boolean; error?: string } {
    if (!syllableData.trim()) return { isValid: true };
    
    try {
      const parsed = JSON.parse(syllableData);
      
      for (const [word, data] of Object.entries(parsed)) {
        if (typeof data === 'string') {
          // Simple format: "word": "syl|la|bles"
          if (!data.includes('|')) {
            return { 
              isValid: false, 
              error: `Word "${word}" syllables must be separated by "|" character.` 
            };
          }
        } else if (typeof data === 'object' && data !== null) {
          // Advanced format with syllables and phonetic
          const syllableObj = data as any;
          if (!syllableObj.syllables || !syllableObj.syllables.includes('|')) {
            return { 
              isValid: false, 
              error: `Word "${word}" syllables must be separated by "|" character.` 
            };
          }
        } else {
          return { 
            isValid: false, 
            error: `Invalid format for word "${word}". Must be string or object with syllables.` 
          };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Invalid JSON format for syllable data.' 
      };
    }
  }

  // Comprehensive form validation
  static validateFormData(data: QuestionFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // UID validation
    if (!this.validateUID(data.uid)) {
      errors.push('UID must be exactly 6 alphanumeric characters');
    }

    // Date validation
    if (!data.date) {
      errors.push('Date is required');
    }


    // Game modes validation
    if (data.gameSequence.length === 0) {
      errors.push('At least one game mode must be selected');
    }

    // JSON validation for complex fields
    const jsonFields = [
      { field: 'wordHints', value: data.wordHints },
      { field: 'wordDistractors', value: data.wordDistractors },
      { field: 'sentenceTemplates', value: data.sentenceTemplates },
      { field: 'wordPartsData', value: data.wordPartsData },
      { field: 'fillupsBlankPositions', value: data.fillupsBlankPositions },
      { field: 'twoOptionDistractors', value: data.twoOptionDistractors },
      { field: 'correctSentence', value: data.correctSentence }
    ];

    jsonFields.forEach(({ field, value }) => {
      if (value && !this.validateJSON(value)) {
        errors.push(`${field} contains invalid JSON format`);
      }
    });

    // Word meanings validation
    const wordMeaningsValidation = this.validateWordMeanings(data.wordMeanings);
    if (!wordMeaningsValidation.isValid && wordMeaningsValidation.error) {
      errors.push(`Word meanings: ${wordMeaningsValidation.error}`);
    }

    // Context choices validation
    const contextChoiceValidation = this.validateContextChoices(data.contextChoice);
    if (!contextChoiceValidation.isValid && contextChoiceValidation.error) {
      errors.push(`Context choices: ${contextChoiceValidation.error}`);
    }

    // Syllable data validation
    const syllableValidation = this.validateSyllableData(data.syllableData);
    if (!syllableValidation.isValid && syllableValidation.error) {
      errors.push(`Syllable data: ${syllableValidation.error}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Submit question with validation
  static async submitQuestion(data: FirebaseQuestionData): Promise<{ success: boolean; errors?: string[] }> {
    // Validate form data
    // const validation = this.validateFormData(data);
    // if (!validation.isValid) {
    //   return { success: false, errors: validation.errors };
    // }

    try {
      // Check if question exists
      const exists = await FirebaseService.checkQuestionExists(data.code);
      
      if (exists) {
        // Update existing question
        await FirebaseService.updateQuestion(data);
      } else {
        // Create new question
        await FirebaseService.submitQuestion(data);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error submitting question:', error);
      return { success: false, errors: ['Failed to submit question to database'] };
    }
  }

  // Retrieve question by UID
  static async retrieveQuestion(code: string): Promise<{ success: boolean; data?: FirebaseQuestionData; error?: string }> {
    if (!this.validateUID(code)) {
      return { success: false, error: 'Invalid UID format' };
    }

    try {
      const exists = await FirebaseService.checkQuestionExists(code);
      
      if (!exists) {
        return { success: false, error: 'Question not found' };
      }

      const data = await FirebaseService.fetchQuestionByUID(code);
      
      if (!data) {
        return { success: false, error: 'Question data could not be retrieved' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error retrieving question:', error);
      return { success: false, error: 'Failed to retrieve question from database' };
    }
  }

  // Generate user links
  static generateUserLinks(uid: string, baseUrl: string = window.location.origin): { testLink: string; playLink: string } {
    return {
      testLink: `${baseUrl}/testing/?code=${uid}`,
      playLink: `${baseUrl}/?code=${uid}`
    };
  }

  // Parse words from comma-separated string
  static parseWords(wordsString: string): string[] {
    return wordsString
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);
  }

  // Format words array to comma-separated string
  static formatWords(words: string[]): string {
    return words.join(', ');
  }

  // Get mock data for demo purposes
  static getMockData(uid: string): QuestionFormData {
    return {
      uid: uid,
      date: new Date().toISOString().split('T')[0],
      reviewWords: 'review, study, learn, understand, remember',
      gameSequence: ['4-option', 'typing', 'words-meaning', 'context-choice'] as GameMode[],
      wordHints: JSON.stringify({
        "example": "A thing characteristic of its kind or illustrating a general rule",
        "demonstration": "The action or process of showing the existence or truth of something",
        "sample": "A small part or quantity intended to show what the whole is like",
        "test": "A procedure intended to establish the quality, performance, or reliability",
        "practice": "The actual application or use of an idea, belief, or method"
      }, null, 2),
      wordDistractors: JSON.stringify({
        "example": ["sample", "instance", "model", "pattern"],
        "demonstration": ["proof", "exhibition", "display", "presentation"],
        "sample": ["specimen", "example", "portion", "piece"],
        "test": ["trial", "examination", "assessment", "evaluation"],
        "practice": ["exercise", "training", "rehearsal", "drill"]
      }, null, 2),
      sentenceTemplates: JSON.stringify([
        "This is a good _____ of how to solve the problem.",
        "The teacher gave a clear _____ of the concept.",
        "Please provide a _____ of your work.",
        "We need to _____ this theory before accepting it.",
        "Regular _____ will help you improve your skills."
      ], null, 2),
      wordPartsData: JSON.stringify({
        "example": ["ex", "am", "ple"],
        "demonstration": ["demon", "stra", "tion"],
        "sample": ["sam", "ple"],
        "test": ["test"],
        "practice": ["prac", "tice"]
      }, null, 2),
      fillupsBlankPositions: JSON.stringify({
        "example": [0, 2],
        "demonstration": [1, 3],
        "sample": [0, 1],
        "test": [0],
        "practice": [1]
      }, null, 2),
      twoOptionDistractors: JSON.stringify({
        "example": ["model", "mistake"],
        "demonstration": ["proof", "problem"],
        "sample": ["piece", "whole"],
        "test": ["trial", "final"],
        "practice": ["theory", "exercise"]
      }, null, 2),
      wordMeanings: JSON.stringify({
        "example": {
          "correct": "A thing that shows what something is like",
          "options": ["A thing that shows what something is like", "A mistake or error", "A final result", "A beginning step"]
        },
        "demonstration": {
          "correct": "Showing how something works",
          "options": ["Hiding information", "Showing how something works", "Making a mistake", "Asking a question"]
        },
        "practice": {
          "correct": "Doing something repeatedly to get better",
          "options": ["Doing something repeatedly to get better", "Doing something once", "Avoiding something", "Teaching someone else"]
        }
      }, null, 2),
      contextChoice: JSON.stringify({
        "example": {
          "sentence": "The teacher showed an example of good handwriting on the board.",
          "correct": "A sample to follow",
          "options": ["A sample to follow", "A mistake to avoid", "A rule to break", "A test to take"]
        },
        "demonstration": {
          "sentence": "The scientist gave a demonstration of the experiment to the class.",
          "correct": "Showing how it works",
          "options": ["Hiding the results", "Showing how it works", "Making it harder", "Asking for help"]
        }
      }, null, 2),
      correctSentence: JSON.stringify({
        "example": {
          "question": "Which sentence uses 'example' correctly?",
          "correct": "This math problem is a good example of what we learned today.",
          "options": [
            "This math problem is a good example of what we learned today.",
            "I will example you how to do this.",
            "The example was very difficult to understand.",
            "She exampled the answer on the board."
          ]
        }
      }, null, 2),
      syllableData: JSON.stringify({
        "example": "ex|am|ple",
        "demonstration": "dem|on|stra|tion",
        "sample": "sam|ple",
        "test": "test",
        "practice": "prac|tice"
      }, null, 2)
    };
  }
}