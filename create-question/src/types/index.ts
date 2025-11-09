// Firebase configuration types
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// Game mode types
export type GameMode = 
  | '4-option'
  | 'typing'
  | 'fillups'
  | 'word-parts'
  | 'letter-scramble'
  | 'correct-word'
  | '2-option'
  | 'words-meaning'
  | 'context-choice'
  | 'correct-sentence';

// Form data interfaces
export interface QuestionFormData {
  uid: string;
  date: string;
  reviewWords: string;
  gameSequence: GameMode[];
  wordHints: string;
  wordDistractors: string;
  sentenceTemplates: string;
  wordPartsData: string;
  fillupsBlankPositions: string;
  twoOptionDistractors: string;
  wordMeanings: string;
  contextChoice: string;
  correctSentence: string;
  syllableData: string;
}

export type FirebaseQuestionData = {
  code: string;
  date: string;
  reviewWords: string[];
  gameSequence: { type: GameMode; word: string }[];
  wordHints: string;
  wordDistractors: string;
  sentenceTemplates: string;
  wordPartsData: string;
  fillupsBlankPositions: string;
  twoOptionDistractors: string;
  wordMeanings: {};
  contextChoice: {};
  correctSentence: {};
  syllableData: {};
}

// Word meanings interface
export interface WordMeaning {
  correct: string;
  options: string[];
}

export interface WordMeanings {
  [word: string]: WordMeaning;
}

// Context choice interface
export interface ContextChoice {
  sentence: string;
  correct: string;
  options: string[];
}

export interface ContextChoices {
  [word: string]: ContextChoice;
}

// Correct sentence interface
export interface CorrectSentence {
  question: string;
  correct: string;
  options: string[];
}

export interface CorrectSentences {
  [word: string]: CorrectSentence;
}

// Syllable data interface
export interface SyllableData {
  syllables: string;
  phonetic?: string;
}

export interface SyllableDataMap {
  [word: string]: string | SyllableData;
}

// Status message types
export type StatusType = 'success' | 'error' | 'info' | 'warning';

export interface StatusMessage {
  message: string;
  type: StatusType;
}

// Tab types
export type TabType = 'create-questions'  | 'analytics';

// Analytics interfaces
export interface UserAnalytics {
  userId: string;
  testCode: string;
  attempts: AttemptData[];
  totalScore: number;
  averageScore: number;
}

export interface AttemptData {
  word: string;
  attempts: number;
  correct: boolean;
  timestamp: Date;
}

// Firebase Analytics Data Structure
export interface AnalyticsAttempt {
  word: string;
  isCorrect: boolean;
  timeTaken: number;
}

export interface AnalyticsData {
  id: string;
  code: string;
  word: string;
  submittedAt: string;
  check: AnalyticsAttempt[];
  backspace: string[];
  speakerClicks: number;
}

export interface WordsByDate {
  [word: string]: {
    [date: string]: AnalyticsData[];
  };
}

export interface AnalyticsModalData {
  word: string;
  date: string;
  dayTotalAttempts: number;
  dayCorrectAttempts: number;
  dayAvgTime: number;
  allWordAttempts: number;
  allWordCorrect: number;
  allWordAvgTime: number;
  attempts: AnalyticsAttempt[];
  speakerClicks: number;
  backspaces: string[];
}

export interface AppUsageData {
  code: string;
  date: string;
  sessions: SessionData[];
  totalUsers: number;
  totalSessions: number;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  wordsPlayed: number;
  score: number;
}

// Code check interfaces
export interface CodeCheckResult {
  exists: boolean;
  data?: QuestionFormData;
  message: string;
}

// Component props interfaces
export interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export interface StatusMessageProps {
  message: string;
  type: StatusType;
  onClose?: () => void;
}

export interface GameModeSelectorProps {
  availableModes: GameMode[];
  selectedModes: GameMode[];
  onModeAdd: (mode: GameMode) => void;
  onModeRemove: (index: number) => void;
  onModeChange?: (modes: GameMode[]) => void;
  onModeReorder: (fromIndex: number, toIndex: number) => void;
  onWordsChange: (words: string[]) => void;
  reviewWords: string[];
  allReviewWords: string[];
}

export interface FormFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'textarea';
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  required?: boolean;
}

export interface SuggestionItem {
  value: string;
  label?: string;
  description?: string;
}

export interface SuggestableInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: SuggestionItem[] | string[];
  onSuggestionsFetch?: (query: string) => Promise<SuggestionItem[] | string[]>;
  maxSuggestions?: number;
  minQueryLength?: number;
  debounceDelay?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  highlightMatch?: boolean;
  caseSensitive?: boolean;
}