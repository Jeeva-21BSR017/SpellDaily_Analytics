# Spelling Game Admin Panel - React TypeScript

A modern React TypeScript application for creating and managing spelling game questions. This application replaces the HTML-based admin panel with a more maintainable and scalable React solution.

## Features

### 🎯 Create Questions
- **UID Management**: 6-character alphanumeric code generation and validation
- **Word Management**: Add new words and review words separated by commas
- **Game Mode Selection**: Drag & drop or click-to-select interface for game modes:
  - 4-option
  - typing
  - fillups
  - word-parts
  - letter-scramble
  - correct-word
  - 2-option
  - words-meaning
  - context-choice
  - correct-sentence

### 🔧 Advanced Configuration
- **Word Hints**: Custom hints for word assistance
- **Word Distractors**: Incorrect options for multiple-choice questions
- **Sentence Templates**: Template sentences with blanks
- **Word Parts Data**: Syllable and morpheme information
- **Fillups Blank Positions**: Position data for fill-in-the-blank exercises
- **Two Option Distractors**: Binary choice distractors
- **Word Meanings**: Definition-based questions with multiple choice
- **Context Choice**: Sentence context with meaning selection
- **Correct Sentence**: Sentence selection based on word usage
- **Syllable Data**: Phonetic breakdown with pipe separation

### 🔍 Check Code
- **Code Validation**: Check if question codes exist in the database
- **Data Retrieval**: Load existing question data for editing
- **User Links**: Generate test and play links for sharing
- **Link Copying**: One-click clipboard copying for easy sharing

### 📊 Analytics
- User performance tracking
- App usage statistics
- Question difficulty analysis
- Time-based performance metrics

### 🔤 Syllable Test
- Syllable breakdown validation
- Phonetic notation testing
- Audio pronunciation testing
- Pattern analysis

## Technology Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Firebase** - Backend integration (ready for implementation)

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   └── Container.tsx
│   ├── forms/
│   │   ├── FormField.tsx
│   │   └── GameModeSelector.tsx
│   ├── tabs/
│   │   ├── CreateQuestions.tsx
│   │   ├── CheckCode.tsx
│   │   ├── Analytics.tsx
│   │   └── SyllableTest.tsx
│   └── ui/
│       ├── Tabs.tsx
│       └── StatusMessage.tsx
├── types/
│   └── index.ts
├── App.tsx
├── App.css
└── index.tsx
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the create-question directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Building for Production

Create a production build:
```bash
npm run build
```

## Features in Detail

### Game Mode Selector
- **Drag & Drop Interface**: Intuitive drag-and-drop from available modes to selected modes
- **Click to Select**: Alternative click-based selection for accessibility
- **Visual Feedback**: Clear visual indicators for selected modes
- **Removal**: Easy removal of selected modes with × button

### Form Validation
- **UID Validation**: Ensures 6-character alphanumeric format
- **Required Fields**: Visual indicators and validation for required inputs
- **Real-time Feedback**: Immediate validation feedback

### Responsive Design
- **Mobile-First**: Designed to work on all device sizes
- **Flexible Layouts**: CSS Grid and Flexbox for adaptive layouts
- **Touch-Friendly**: Larger touch targets for mobile users

### Status Messages
- **Success Messages**: Green success indicators with auto-dismiss
- **Error Messages**: Red error indicators for user attention
- **Info Messages**: Blue informational messages
- **Warning Messages**: Yellow warning indicators

## Data Formats

### Word Meanings Example
```json
{
  "resilient": {
    "correct": "Quick to recover",
    "options": ["Easy to break", "Quick to recover", "Hard to decide", "Slow to move"]
  }
}
```

### Context Choice Example
```json
{
  "resilient": {
    "sentence": "The boy was resilient. Even after falling many times, he stood up and tried again.",
    "correct": "Kept trying",
    "options": ["Gave up", "Kept trying", "Slept early", "Ran away"]
  }
}
```

### Syllable Data Example
```json
{
  "trivial": "tri|vi|al",
  "admission": "ad|mis|sion"
}
```

Advanced format with phonetic notation:
```json
{
  "trivial": { 
    "syllables": "tri|vi|al", 
    "phonetic": "/ˈtrɪv.i.əl/" 
  }
}
```

## Future Enhancements

- Firebase integration for data persistence
- Real-time collaboration features
- Question preview functionality
- Bulk import/export capabilities
- Question template library
- Advanced analytics dashboard
- Audio recording integration
- Multi-language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Spelling Game application suite.