# Firebase Integration Setup Guide

## Overview
The spelling game now automatically submits analytics data to Firebase Firestore along with the user-entered code when each game session completes.

## Firebase Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional but recommended)

### 2. Set Up Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development) or "Start in production mode"
4. Select a location for your database

### 3. Add Web App to Firebase Project
1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Give your app a nickname
5. Copy the configuration object

### 4. Firebase Configuration (Already Configured)
✅ **Firebase is already configured with your project settings:**

The Firebase configuration is set up in `index.html` using the modern ES6 modules approach:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCr7qtAYPckGP5vHM_Kmk5bG_x8ercatwg",
  authDomain: "spell-daily.firebaseapp.com",
  projectId: "spell-daily",
  storageBucket: "spell-daily.firebasestorage.app",
  messagingSenderId: "322219140242",
  appId: "1:322219140242:web:2dd5f7d0cfb9914829b24b",
  measurementId: "G-1BH4H225YY"
};
```

No further configuration changes are needed.

### 5. Configure Firestore Security Rules
In the Firebase Console, go to Firestore Database > Rules and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow writes to game-analytics collection
    match /game-analytics/{document} {
      allow create: if true; // Allow anyone to create analytics documents
      allow read: if false;  // Restrict reading for privacy
      allow update, delete: if false; // Prevent modifications
    }
    
    // Allow connection tests (for development)
    match /connection-test/{document} {
      allow create, delete: if true;
      allow read, update: if false;
    }
  }
}
```

## Data Structure in Firebase

Each analytics submission creates a document in the `game-analytics` collection with this structure:

```json
{
  "userCode": "ABC123",
  "gameSession": "unique-session-id",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "url": "https://your-domain.com/",
    "gameVersion": "1.0.0"
  },
  "analytics": {
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
}
```

## Testing Firebase Integration

### 1. Test Firebase Connection
Open browser console and run:
```javascript
testFirebaseConnection()
```

### 2. Test Analytics Submission
```javascript
// Submit test analytics
const testAnalytics = {
  questions: [{
    word: "test",
    timeTaken: 5,
    answerCorrectly: true,
    type: "test",
    attempts: [],
    hasUsedSoundHint: false,
    hasUsedSoundHintTimes: 0,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString()
  }]
};

submitAnalyticsToFirebase(testAnalytics, "TEST123");
```

### 3. Check Failed Submissions
```javascript
// Check for any failed submissions stored locally
retryFailedSubmissions()
```

## Features

### Automatic Submission
- Analytics are automatically submitted when a game session completes
- Includes user code, analytics data, timestamp, and session metadata

### Error Handling
- **Retry Logic**: Automatically retries failed submissions up to 3 times
- **Local Storage Backup**: Saves failed submissions locally for later retry
- **Graceful Degradation**: Game continues normally even if Firebase is unavailable

### Offline Support
- Failed submissions are stored in browser localStorage
- Can be retried when connection is restored
- Use `retryFailedSubmissions()` to manually retry

### Security
- Only allows creating new analytics documents
- Prevents reading other users' data
- No sensitive data is transmitted

## Monitoring and Analytics

### Firebase Console
1. Go to Firestore Database in Firebase Console
2. Browse the `game-analytics` collection to see submitted data
3. Use Firebase Analytics (if enabled) for usage insights

### Browser Console Logs
The system provides detailed console logging:
- `📤 Submitting analytics to Firebase...`
- `✅ Analytics successfully submitted to Firebase`
- `❌ Failed to submit analytics to Firebase`
- `🔄 Retrying submission...`
- `💾 Analytics saved locally due to submission failure`

## Troubleshooting

### Common Issues

1. **Firebase not initialized**
   - Check that Firebase SDK is loaded
   - Verify firebaseConfig is correct
   - Check browser console for initialization errors

2. **Permission denied**
   - Update Firestore security rules
   - Ensure rules allow writes to 'game-analytics' collection

3. **Network errors**
   - Check internet connection
   - Analytics will be saved locally and can be retried

4. **Configuration errors**
   - Verify all Firebase config values are correct
   - Check that project ID matches your Firebase project

### Debug Commands

```javascript
// Check if Firebase is initialized
console.log(db); // Should not be null

// Check current analytics data
console.log(app.analytics);

// Test Firebase connection
testFirebaseConnection();

// Check for failed submissions
console.log(Object.keys(localStorage).filter(k => k.startsWith('failed-analytics-')));

// Retry failed submissions
retryFailedSubmissions();
```

## Privacy and Data Protection

- Only game performance data is collected
- No personal information is transmitted
- User codes are the only identifier submitted
- All data is anonymized and aggregated
- Users can clear localStorage to remove any cached failed submissions

## Production Deployment

1. Update Firestore security rules for production
2. Enable Firebase Security Rules testing
3. Set up Firebase monitoring and alerts
4. Consider implementing data retention policies
5. Set up regular backups of analytics data
