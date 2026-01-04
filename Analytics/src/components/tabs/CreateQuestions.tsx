import React, { useState } from 'react';
import { QuestionFormData, GameMode, StatusType } from '../../types';
import GameModeSelector from '../forms/GameModeSelector';
import FormField from '../forms/FormField';
import { QuestionService } from '../../services/questionService';

interface CreateQuestionsProps {
  formData: QuestionFormData;
  updateFormData: (updates: Partial<QuestionFormData>) => void;
  availableGameModes: GameMode[];
  showStatusMessage: (message: string, type: StatusType) => void;
  clearForm: () => void;
}

const safeParseJSON = (jsonString: string, defaultValue: any) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
}

const getAllReviewWords = (formData: QuestionFormData): string[] => {
  const wordHints = safeParseJSON(formData.wordHints, {});
  const wordDistractors = safeParseJSON(formData.wordDistractors, {});
  const sentenceTemplates = safeParseJSON(formData.sentenceTemplates, {});
  const wordPartsData = safeParseJSON(formData.wordPartsData, {});
  const fillupsBlankPositions = safeParseJSON(formData.fillupsBlankPositions, {});
  const twoOptionDistractors = safeParseJSON(formData.twoOptionDistractors, {});
  const wordMeanings = safeParseJSON(formData.wordMeanings, {});
  const contextChoice = safeParseJSON(formData.contextChoice, {});
  const correctSentence = safeParseJSON(formData.correctSentence, {});
  const syllableData = safeParseJSON(formData.syllableData, {});

  return Object.keys({
    ...wordHints,
    ...wordDistractors,
    ...sentenceTemplates,
    ...wordPartsData,
    ...fillupsBlankPositions,
    ...twoOptionDistractors,
    ...wordMeanings,
    ...contextChoice,
    ...correctSentence,
    ...syllableData,
  }).map(word => word.trim().toLowerCase());

};

const CreateQuestions: React.FC<CreateQuestionsProps> = ({
  formData,
  updateFormData,
  availableGameModes,
  showStatusMessage,
  clearForm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateUID = (uid: string): boolean => {
    return QuestionService.validateUID(uid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUID(formData.uid)) {
      showStatusMessage('Please enter a valid 6-character alphanumeric UID', 'error');
      return;
    }

    if (!formData.date) {
      showStatusMessage('Please select a date', 'error');
      return;
    }


    if (formData.gameSequence.length === 0) {
      showStatusMessage('Please select at least one game mode', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Parse JSON fields or create empty objects/arrays
      let parsedSentenceTemplates = '';
      let parsedWordDistractors = '';
      let parsedWordHints = '';
      let parsedWordPartsData = '';
      let parsedFillupsBlankPositions = '';
      let parsedTwoOptionDistractors = '';
      let parsedWordMeanings = {};
      let parsedContextChoice = {};
      let parsedCorrectSentence = {};
      let parsedSyllableData = {};

      try {
        if (formData.sentenceTemplates.trim()) {
          JSON.parse(formData.sentenceTemplates);
          parsedSentenceTemplates = JSON.stringify(formData.sentenceTemplates);
        }
      } catch (e) {
        alert('Invalid JSON for sentence templates');
        return;
      }

      try {
        if (formData.wordDistractors.trim()) {
          JSON.parse(formData.wordDistractors);
          parsedWordDistractors = JSON.stringify(formData.wordDistractors);
        }
      } catch (e) {
        alert('Invalid JSON for word distractors');
        return;
      }

      try {
        if (formData.wordHints.trim()) {
          JSON.parse(formData.wordHints);
          parsedWordHints = JSON.stringify(formData.wordHints);
        }
      } catch (e) {
        console.error('Error parsing word hints:', e);
        alert('Invalid JSON for word hints');
        return;
      }

      try {
        if (formData.wordPartsData.trim()) {
          JSON.parse(formData.wordPartsData);
          parsedWordPartsData = JSON.stringify(formData.wordPartsData);
        }
      } catch (e) {
        alert('Invalid JSON for word parts data');
        return;
      }

      try {
        if (formData.fillupsBlankPositions.trim()) {
          JSON.parse(formData.fillupsBlankPositions);
          parsedFillupsBlankPositions = JSON.stringify(formData.fillupsBlankPositions);
        }
      } catch (e) {
        alert('Invalid JSON for fillups blank positions');
        return;
      }

      try {
        if (formData.twoOptionDistractors.trim()) {
          JSON.parse(formData.twoOptionDistractors);
          parsedTwoOptionDistractors = JSON.stringify(formData.twoOptionDistractors);
        }
      } catch (e) {
        alert('Invalid JSON for two option distractors');
        return;
      }

      try {
        if (formData.wordMeanings.trim()) {
          parsedWordMeanings = JSON.parse(formData.wordMeanings);
        }
      } catch (e) {
        alert('Invalid JSON for word meanings');
        return;
      }

      try {
        if (formData.contextChoice.trim()) {
          parsedContextChoice = JSON.parse(formData.contextChoice);
        }
      } catch (e) {
        alert('Invalid JSON for context choice');
        return;
      }

      try {
        if (formData.correctSentence.trim()) {
          parsedCorrectSentence = JSON.parse(formData.correctSentence);
        }
      } catch (e) {
        alert('Invalid JSON for correct sentence');
        return;
      }

      try {
        if (formData.syllableData.trim()) {
          parsedSyllableData = JSON.parse(formData.syllableData);
        }
      } catch (e) {
        alert('Invalid JSON for syllable data');
        return;
      }

      const questionData = {
        code: formData.uid,
        date: formData.date ? formData.date.split('-').reverse().join('/') : '',
        createdAt: new Date().toISOString(),
        reviewWords: formData.reviewWords ? formData.reviewWords.split(',').map((w) => w.trim().toLocaleLowerCase()) : [],
        gameSequence: formData.gameSequence.map((mode, i) => ({
          word: `word${i + 1}`,
          type: mode,
        })),
        wordHints: parsedWordHints,
        wordDistractors: parsedWordDistractors,
        sentenceTemplates: parsedSentenceTemplates,
        wordPartsData: parsedWordPartsData,
        fillupsBlankPositions: parsedFillupsBlankPositions,
        twoOptionDistractors: parsedTwoOptionDistractors,
        wordMeanings: parsedWordMeanings,
        contextChoice: parsedContextChoice,
        correctSentence: parsedCorrectSentence,
        syllableData: parsedSyllableData,
      };

      console.log('Submitting question data:', questionData);
      
      // Submit using QuestionService
      const result = await QuestionService.submitQuestion(questionData);
      
      if (result.success) {
        showStatusMessage('Question submitted successfully!', 'success');
      } else {
        // Show validation errors
        const errorMessage = result.errors?.join('\n') || 'Unknown error occurred';
        showStatusMessage(errorMessage, 'error');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // For demo purposes, if Firebase is not configured
      if (error instanceof Error && error.message.includes('Firebase')) {
        // Simulate successful submission
        await new Promise(resolve => setTimeout(resolve, 1000));
        showStatusMessage('Question submitted successfully! (Demo Mode - Firebase not configured)', 'success');
      } else {
        showStatusMessage('Failed to submit question. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrieveQuestion = async () => {
    if (!formData.uid) {
      showStatusMessage('Please enter a UID to retrieve question', 'error');
      return;
    }

    if (!validateUID(formData.uid)) {
      showStatusMessage('Please enter a valid 6-character alphanumeric UID', 'error');
      return;
    }

    try {
      console.log('Retrieving question for UID:', formData.uid);
      
      // Retrieve using QuestionService
      const result = await QuestionService.retrieveQuestion(formData.uid);
      
      if (result.success && result.data) {
        // Update form with retrieved data
        const data: QuestionFormData = {
          ...result.data,
          uid: result.data.code,
          reviewWords: result.data.reviewWords.join(', ').toLocaleLowerCase(),
          gameSequence: result.data.gameSequence.map(m => m.type),
          wordMeanings: JSON.stringify(result.data.wordMeanings),
          contextChoice: JSON.stringify(result.data.contextChoice),
          correctSentence: JSON.stringify(result.data.correctSentence),
          syllableData: JSON.stringify(result.data.syllableData),
          wordDistractors: JSON.parse(result.data.wordDistractors),
          wordHints: JSON.parse(result.data.wordHints),
          sentenceTemplates: JSON.parse(result.data.sentenceTemplates),
          wordPartsData: JSON.parse(result.data.wordPartsData),
          fillupsBlankPositions: JSON.parse(result.data.fillupsBlankPositions),
          twoOptionDistractors: JSON.parse(result.data.twoOptionDistractors),
        }
        updateFormData(data);
        localStorage.setItem('lastRetrievedQuestion', JSON.stringify(data));
        showStatusMessage('Question retrieved and form populated successfully!', 'success');
      } else {
        showStatusMessage(result.error || 'Question with this UID not found', 'error');
      }
      
    } catch (error) {
      console.error('Error retrieving question:', error);
      
      // For demo purposes, if Firebase is not configured
      if (error instanceof Error && error.message.includes('Firebase')) {
        // Use mock data from QuestionService
        const mockData = QuestionService.getMockData(formData.uid);
        
        updateFormData(mockData);
        showStatusMessage('Question retrieved successfully! (Demo Mode - Firebase not configured)', 'success');
      } else {
        showStatusMessage('Failed to retrieve question. Please check the UID and try again.', 'error');
      }
    }
  };

  return (
    <div className="create-questions">
      <div className="create-questions__header">
        <h2>📝 Create Questions</h2>
        <button
          type="button"
          className="btn btn-success"
          onClick={handleRetrieveQuestion}
          disabled={!formData.uid}
        >
          📥 Retrieve Question
        </button>
      </div>

      <form onSubmit={handleSubmit} className="question-form">
        {/* Admin Configuration Section */}
        <div className="form-section">
          <div className="form-grid">
            <FormField
              label="Enter the UID (6-character alphanumeric code)"
              id="uid"
              value={formData.uid}
              onChange={(value) => updateFormData({ uid: value })}
              type="text"
              placeholder="AbC123"
              maxLength={6}
              required
            />
            <FormField
              label="Date"
              id="date"
              value={formData.date}
              onChange={(value) => updateFormData({ date: value })}
              type="date"
              required
            />
          </div>
        </div>

        {/* Words Section */}
        <div className="form-section">
          <div className="form-grid">
            <FormField
              label="New words"
              id="new-words"
              value={''}
              onChange={(value) => console.log({ newWords: value })}
              type="textarea"
              placeholder="Words separated by comma"
              rows={4}
            />
            <FormField
              label="Review words"
              id="review-words"
              value={formData.reviewWords}
              onChange={(value) => updateFormData({ reviewWords: value })}
              type="textarea"
              placeholder="Words separated by comma"
              rows={4}
            />
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="form-section template-section">
          <h3>📝 Template Configuration</h3>
          <GameModeSelector
            availableModes={availableGameModes}
            selectedModes={formData.gameSequence}
            onModeAdd={(mode: GameMode) => 
              updateFormData({ 
                gameSequence: [...formData.gameSequence, mode] 
              })
            }
            onModeChange={(modes: GameMode[]) =>
              updateFormData({ gameSequence: modes })
            }
            onModeRemove={(index: number) =>
              updateFormData({
                gameSequence: formData.gameSequence.filter((_, i) => i !== index)
              })
            }
            onModeReorder={(fromIndex: number, toIndex: number) => {
              const newGameSequence = [...formData.gameSequence];
              const [movedItem] = newGameSequence.splice(fromIndex, 1);
              newGameSequence.splice(toIndex, 0, movedItem);
              updateFormData({ gameSequence: newGameSequence });
            }}
            reviewWords={formData.reviewWords.split(', ')}
            onWordsChange={(words: string[]) => {
              updateFormData({ reviewWords: words.join(', ') });
            }}
            allReviewWords={getAllReviewWords(formData)}
          />
        </div>

        {/* Advanced Configuration Sections */}
        <div className="advanced-sections">
          <div className="form-grid">
            <div className="form-section word-hints">
              <h3>💡 Word Hints</h3>
              <FormField
                label=""
                id="word-hints"
                value={formData.wordHints}
                onChange={(value) => updateFormData({ wordHints: value })}
                type="textarea"
                rows={6}
              />
            </div>
            <div className="form-section word-distractors">
              <h3>🎯 Word Distractors</h3>
              <FormField
                label=""
                id="word-distractors"
                value={formData.wordDistractors}
                onChange={(value) => updateFormData({ wordDistractors: value })}
                type="textarea"
                rows={6}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-section sentence-templates">
              <h3>📚 Sentence Templates</h3>
              <FormField
                label=""
                id="sentence-templates"
                value={formData.sentenceTemplates}
                onChange={(value) => updateFormData({ sentenceTemplates: value })}
                type="textarea"
                rows={6}
              />
            </div>
            <div className="form-section word-parts-data">
              <h3>🔤 Word Parts Data</h3>
              <FormField
                label=""
                id="word-parts-data"
                value={formData.wordPartsData}
                onChange={(value) => updateFormData({ wordPartsData: value })}
                type="textarea"
                rows={6}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-section fillups-blank">
              <h3>🕳️ Fillups Blank Positions</h3>
              <FormField
                label=""
                id="fillups-blank-positions"
                value={formData.fillupsBlankPositions}
                onChange={(value) => updateFormData({ fillupsBlankPositions: value })}
                type="textarea"
                rows={6}
              />
            </div>
            <div className="form-section two-option-distractors">
              <h3>🎯 Two Option Distractors</h3>
              <FormField
                label=""
                id="two-option-distractors"
                value={formData.twoOptionDistractors}
                onChange={(value) => updateFormData({ twoOptionDistractors: value })}
                type="textarea"
                rows={6}
              />
            </div>
          </div>

          {/* Word Meanings Section */}
          <div className="form-section word-meanings">
            <h3>🧠 Word Meanings (for words-meaning game)</h3>
            <FormField
              label=""
              id="word-meanings"
              value={formData.wordMeanings}
              onChange={(value) => updateFormData({ wordMeanings: value })}
              type="textarea"
              placeholder={`Example format:
{
  "resilient": {
    "correct": "Quick to recover",
    "options": ["Easy to break", "Quick to recover", "Hard to decide", "Slow to move"]
  },
  "abundant": {
    "correct": "Existing in large quantities", 
    "options": ["Very rare", "Existing in large quantities", "Difficult to find", "Small in size"]
  }
}`}
              rows={8}
            />
          </div>

          {/* Context Choice Section */}
          <div className="form-section context-choice">
            <h3>📖 Context Choice (for context-choice game)</h3>
            <FormField
              label=""
              id="context-choice"
              value={formData.contextChoice}
              onChange={(value) => updateFormData({ contextChoice: value })}
              type="textarea"
              placeholder={`Example format:
{
  "resilient": {
    "sentence": "The boy was resilient. Even after falling many times, he stood up and tried again.",
    "correct": "Kept trying",
    "options": ["Gave up", "Kept trying", "Slept early", "Ran away"]
  }
}`}
              rows={10}
            />
          </div>

          {/* Correct Sentence Section */}
          <div className="form-section correct-sentence">
            <h3>📝 Correct Sentence (for correct-sentence game)</h3>
            <FormField
              label=""
              id="correct-sentence"
              value={formData.correctSentence}
              onChange={(value) => updateFormData({ correctSentence: value })}
              type="textarea"
              placeholder={`Example format:
{
  "resilient": {
    "question": "Which sentence shows someone being resilient?",
    "correct": "Rina fell while skating but stood up to try again",
    "options": [
      "Rina fell while skating but stood up to try again",
      "Arjun got a puzzle wrong and threw it away angrily"
    ]
  }
}`}
              rows={12}
            />
          </div>

          {/* Syllable Data Section */}
          <div className="form-section syllable-data">
            <h3>📖 Syllable Data (for syllable-by-syllable pronunciation)</h3>
            <FormField
              label=""
              id="syllable-data"
              value={formData.syllableData}
              onChange={(value) => updateFormData({ syllableData: value })}
              type="textarea"
              placeholder={`Example formats (use pipe | for syllable separation):

Simple format (recommended):
{
  "trivial": "tri|vi|al",
  "admission": "ad|mis|sion",
  "culture": "cul|ture"
}

Advanced format (with phonetic notation):
{
  "trivial": { "syllables": "tri|vi|al", "phonetic": "/ˈtrɪv.i.əl/" }
}`}
              rows={14}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Submitting...' : '✨ Submit Question'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearForm}
            disabled={isSubmitting}
          >
            🗑️ Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuestions;