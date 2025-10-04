# 🎯 Spelling Game Admin Panel

The admin panel (`admin.html`) provides a comprehensive interface for creating questions, managing game codes, and retrieving game data.

## 🚀 Features

### 1. Create Questions Tab
- **Question Builder**: Create comprehensive spelling questions with word parts and multiple-choice options
- **Real-time Preview**: See how your question will look as you build it
- **Word Parts System**: Break words into parts and create distractors for each part
- **Hints Support**: Add helpful hints for each word
- **Firebase Integration**: Questions are automatically saved to Firebase Firestore

### 2. Manage Codes Tab
- **Game Code Generation**: Generate unique 6-character alphanumeric codes
- **Question Assignment**: Assign all created questions to a game code
- **Code Management**: View, preview, and delete existing game codes
- **Real-time Updates**: Automatically refresh the codes list

### 3. Retrieve Data Tab
- **Code Validation**: Enter a game code to retrieve associated questions
- **JSON Preview**: View the complete question data in JSON format
- **Direct Game Launch**: Start the game directly with the retrieved code

## 📝 How to Use

### Creating Questions

1. **Open the Admin Panel**: Navigate to `admin.html` in your browser
2. **Go to "Create Questions" Tab**: This is the default tab
3. **Fill in Question Details**:
   - **Word**: Enter the spelling word (e.g., "culture")
   - **Hint**: Add a helpful hint (e.g., "🎭 The arts, customs, and beliefs of a society")
4. **Add Word Parts**:
   - Enter each part of the word (e.g., "cul", "ture")
   - Click "Add Part" for each segment
5. **Create Options**:
   - For each word part, the system will create 3 options
   - The first option is always the correct one
   - Fill in wrong options for the other two slots
6. **Preview and Submit**:
   - Review your question in the preview section
   - Click "✨ Create Question" to save to Firebase

### Generating Game Codes

1. **Go to "Manage Codes" Tab**
2. **Generate Code**: Click "🎲 Generate New Game Code"
3. **Assign Questions**: Click "📝 Assign Questions" to link all created questions to this code
4. **Copy Code**: Use "📋 Copy Code" to copy the game code for distribution

### Using Game Codes

1. **Go to "Retrieve Data" Tab**
2. **Enter Code**: Type the 6-character game code
3. **Retrieve Data**: Click "🔍 Retrieve Data" to load questions
4. **Start Game**: Click "🎮 Start Game" to launch the main game with this code

### Playing with Game Codes

1. **Open Main Game**: Navigate to `index.html`
2. **Enter Game Code**: Instead of a username, enter the 6-character game code
3. **Play**: The game will automatically load the custom questions associated with that code

## 🔧 Technical Details

### Firebase Collections

The admin panel uses two main Firebase collections:

#### `questions` Collection
```json
{
  "word": "culture",
  "hint": "🎭 The arts, customs, and beliefs of a society",
  "parts": ["cul", "ture"],
  "options": [
    ["cul", "cal", "col"],
    ["ture", "tare", "tire"]
  ],
  "createdAt": "2025-01-01T12:00:00.000Z",
  "createdBy": "admin"
}
```

#### `game-codes` Collection
```json
{
  "code": "ABC123",
  "questions": [...], // Array of question objects
  "createdAt": "2025-01-01T12:00:00.000Z",
  "isActive": true
}
```

### Game Code Format

- **Length**: 6 characters
- **Characters**: Uppercase letters (A-Z) and numbers (0-9)
- **Example**: `ABC123`, `XYZ789`, `DEF456`

### Question Types Supported

The admin panel creates questions that work with all game types:
- **Typing**: Students type what they hear
- **4-Option MCQ**: Multiple choice with 4 options
- **Word Parts**: Interactive word-building with parts

## 🛠️ Setup Requirements

1. **Firebase Project**: Ensure your Firebase project is properly configured
2. **Firestore Database**: Set up Firestore with appropriate security rules
3. **Internet Connection**: Required for Firebase operations
4. **Modern Browser**: Chrome, Firefox, Safari, or Edge

## 🔐 Security Considerations

- **Admin Access**: The admin panel should only be accessible to authorized users
- **Firebase Rules**: Ensure proper Firestore security rules are in place
- **Code Distribution**: Game codes should be distributed securely to intended users

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Not Connected**
   - Check browser console for Firebase initialization errors
   - Verify Firebase configuration in the HTML file

2. **Questions Not Saving**
   - Ensure all required fields are filled
   - Check Firestore security rules allow writes to `questions` collection

3. **Game Codes Not Working**
   - Verify the code exists in Firebase
   - Check that questions were properly assigned to the code
   - Ensure the main game supports game code loading

4. **Permission Denied**
   - Update Firestore security rules
   - Check Firebase authentication settings

### Debug Commands

Open browser console and run:

```javascript
// Check Firebase connection
console.log(window.firebaseInitialized);
console.log(window.db);

// Test creating a question
// (Fill out the form first, then run)
document.getElementById('question-form').dispatchEvent(new Event('submit'));

// Check created game codes
loadGameCodes();
```

## 🎮 Integration with Main Game

The admin panel is fully integrated with the main spelling game:

1. **Automatic Detection**: The game detects 6-character codes and loads from Firebase
2. **Fallback Support**: If a code isn't found, the game uses default words
3. **Seamless Experience**: Players don't need to know they're using custom content

## 📊 Analytics

All games played with admin-created content are tracked in the same analytics system, allowing you to monitor:
- Question difficulty
- Student performance
- Popular words
- Time spent per question

## 🎯 Best Practices

1. **Question Quality**: Create clear, age-appropriate questions
2. **Hint Effectiveness**: Use emojis and clear descriptions for hints
3. **Distractor Balance**: Make wrong options plausible but clearly incorrect
4. **Code Management**: Use descriptive codes when possible (e.g., CLASS1, WEEK01)
5. **Regular Cleanup**: Remove unused game codes periodically

---

**Happy Teaching! 🎓**
