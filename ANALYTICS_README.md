# Analytics System Documentation

## Overview
The spelling game now includes a comprehensive analytics tracking system that captures detailed information about each question and user interaction during gameplay.

## Analytics Data Structure

The analytics data follows this format:

```json
{
  "questions": [
    {
      "word": "culture",
      "timeTaken": 10,
      "answerCorrectly": true,
      "type": "mcq",
      "attempts": [
        {
          "attempt": 1,
          "answer": "cultur",
          "timeTaken": 5,
          "answerCorrectly": false
        },
        {
          "attempt": 2,
          "answer": "culture",
          "timeTaken": 10,
          "answerCorrectly": true
        }
      ],
      "hasUsedSoundHint": true,
      "hasUsedSoundHintTimes": 1,
      "startTime": "2025-01-01T12:00:00.000Z",
      "endTime": "2025-01-01T12:00:10.000Z"
    }
  ]
}
```

## Data Fields

### Question Level
- `word`: The target word for the question
- `timeTaken`: Total time spent on the question (seconds)
- `answerCorrectly`: Whether the question was answered correctly overall
- `type`: Question type (`mcq`, `typing`, `letter-scramble`, `fillups`, `2-option`, `word-parts`, `correct-word`)
- `attempts`: Array of all attempts made for this question
- `hasUsedSoundHint`: Whether the sound button was clicked
- `hasUsedSoundHintTimes`: Number of times the sound button was clicked
- `startTime`: ISO timestamp when question started
- `endTime`: ISO timestamp when question ended

### Attempt Level
- `attempt`: Attempt number (1, 2, etc.)
- `answer`: The user's answer for this attempt
- `timeTaken`: Time from question start to this attempt (seconds)
- `answerCorrectly`: Whether this specific attempt was correct

## How to Access Analytics

### During Development/Testing

1. **Console Output**: Analytics are automatically logged to console when the game completes
2. **Global Access**: Use `app.analytics` to access current analytics data
3. **Window Object**: Analytics are also available as `window.gameAnalytics` after game completion
4. **Validation**: Use `validateAnalytics(app.analytics)` to verify data structure

### In Browser Console

```javascript
// Access current analytics
console.log(app.analytics);

// Validate analytics structure
validateAnalytics(app.analytics);

// Access analytics after game completion
console.log(window.gameAnalytics);
```

## Implementation Details

### Analytics Tracking Flow

1. **Question Start**: `startQuestionAnalytics()` initializes tracking when a new question begins
2. **Sound Hints**: `trackSoundHintUsage()` records when the sound button is clicked
3. **Attempts**: `trackAttempt()` records each answer attempt with timing
4. **Question End**: `finalizeQuestionAnalytics()` packages the complete question data
5. **Game End**: `outputFinalAnalytics()` logs the complete results to console

### Key Features

- **Real-time tracking**: Each interaction is tracked as it happens
- **Multiple attempts**: Records all attempts for typing and other multi-attempt games
- **Accurate timing**: Precise timestamps and time calculations
- **Sound hint tracking**: Counts each use of the audio hint
- **Type-aware**: Different game types are handled appropriately
- **Validation**: Built-in validation function to verify data integrity

## Testing

1. Start a game and complete a few questions
2. Check the browser console for analytics output
3. Use the validation function to verify data structure
4. Access analytics programmatically during gameplay

## Example Usage

```javascript
// After completing a game, you can:

// 1. View the complete analytics
console.log(JSON.stringify(window.gameAnalytics, null, 2));

// 2. Get specific question data
const firstQuestion = window.gameAnalytics.questions[0];
console.log(`Question: ${firstQuestion.word}`);
console.log(`Time taken: ${firstQuestion.timeTaken} seconds`);
console.log(`Attempts: ${firstQuestion.attempts.length}`);

// 3. Calculate overall statistics
const totalQuestions = window.gameAnalytics.questions.length;
const correctAnswers = window.gameAnalytics.questions.filter(q => q.answerCorrectly).length;
const accuracy = (correctAnswers / totalQuestions * 100).toFixed(1);
console.log(`Overall accuracy: ${accuracy}%`);

// 4. Validate the data structure
validateAnalytics(window.gameAnalytics);
```

## Firebase Integration

✅ **Firebase is fully configured and ready!** The analytics system automatically submits data to Firebase Firestore along with the user-entered code.

**Project:** spellbee-a0a3a  
**Database:** Firestore (spellbee-a0a3a)  
**Collection:** game-analytics

### Automatic Submission
- Analytics are automatically sent to Firebase when game completes
- Includes user code, analytics data, timestamp, and session metadata
- Retry logic handles network failures
- Local backup for offline scenarios

### Testing Firebase
```javascript
// Test Firebase connection
testFirebaseConnection();

// Retry any failed submissions
retryFailedSubmissions();
```

## Notes

- Analytics are automatically enabled for all game sessions
- Data is stored in memory, logged to console, AND submitted to Firebase upon completion
- The validation script helps ensure data integrity
- Analytics do not affect game performance or user experience
- Firebase submission is non-blocking and includes error handling
