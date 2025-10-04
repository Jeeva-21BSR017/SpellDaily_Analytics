# Game Analytics System

## Overview
The game analytics system stores one record per user in Firebase Firestore to track game progress, enable resume functionality, and clean up data after completion.

## Database Structure

### Collection: `game-analytics`
- **Document ID**: User code (e.g., "user123")
- **Fields**:
  - `usercode`: String - The user's unique code
  - `currentQuestionIndex`: Number - Current question position (0-based)
  - `stats`: Object - Game statistics (correct, total, failed words, etc.)
  - `allQuestions`: Array - Complete question sequence
  - `isPracticeMode`: Boolean - Whether in practice mode
  - `consecutiveCorrect`: Number - Current streak count
  - `failedWordsTracker`: Array - Words that failed (converted from Set)
  - `sessionId`: String - Session identifier
  - `lastUpdated`: String - ISO timestamp of last update
  - `gameStarted`: String - ISO timestamp when game started
  - `isCompleted`: Boolean - Whether game is completed
  - `completedAt`: String - ISO timestamp when completed (only when isCompleted is true)

## Key Functions

### 1. `loadGameProgress()`
- Called during game initialization
- Checks if user has existing progress
- If game is already completed, deletes analytics and starts fresh
- If progress exists, restores game state from Firebase

### 2. `updateGameAnalytics()`
- Called after each question completion
- Updates the single record with current progress
- Saves all game state data

### 3. `markGameCompleted()`
- Called when game is finished
- Sets `isCompleted: true` and `completedAt` timestamp
- Automatically deletes analytics after 2 seconds

### 4. `deleteGameAnalytics()`
- Removes the user's analytics record from Firebase
- Called after game completion

### 5. `setupProgressSaving()`
- Sets up automatic progress saving:
  - Saves on page unload (beforeunload event)
  - Saves every 30 seconds during gameplay
- Only saves for main game (not practice mode)

## Resume Functionality

When a user enters their code and starts the game:

1. **Fresh Start**: If no analytics record exists, starts new game
2. **Resume**: If analytics record exists and `isCompleted: false`, resumes from saved position
3. **Completed Game**: If `isCompleted: true`, deletes old analytics and starts fresh

## Data Flow

```
User enters code → loadGameProgress() → 
  ├─ No record: Start fresh game
  ├─ Record exists + not completed: Resume from saved position
  └─ Record exists + completed: Delete record, start fresh

During gameplay → updateGameAnalytics() (after each question)

Game completion → markGameCompleted() → deleteGameAnalytics() (after 2s)
```

## Benefits

1. **Single Record**: Only one document per user, efficient storage
2. **Resume Capability**: Users can leave and return to continue
3. **Automatic Cleanup**: Completed games are automatically deleted
4. **Real-time Updates**: Progress saved after each question
5. **Crash Recovery**: Periodic saves prevent data loss

## Usage Example

```javascript
// User enters code "ABC123"
// System checks Firebase for document with ID "ABC123"
// If found and not completed, resumes from question 5 of 16
// If not found, starts from question 1
// After completion, document is deleted
```

## Error Handling

- All Firebase operations are wrapped in try-catch blocks
- Errors are logged to console but don't break game flow
- If Firebase is unavailable, game continues without saving
- Failed saves don't prevent game progression
