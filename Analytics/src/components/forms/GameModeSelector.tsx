import React, { useState, useEffect } from "react";
import { GameModeSelectorProps, GameMode } from "../../types";
import SuggestableInput from "./suggestable-input";

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  availableModes,
  selectedModes,
  onModeAdd,
  onModeRemove,
  onModeChange,
  onModeReorder,
  onWordsChange,
  reviewWords,
  allReviewWords,
}) => {
  const [draggedMode, setDraggedMode] = useState<GameMode | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Helper function to ensure arrays stay synchronized
  const ensureSynchronizedArrays = (modes: GameMode[], words: string[]) => {
    const synchronizedWords = [...words];
    // Ensure words array has same length as modes array
    while (synchronizedWords.length < modes.length) {
      synchronizedWords.push('');
    }
    // Trim excess words if any
    if (synchronizedWords.length > modes.length) {
      synchronizedWords.splice(modes.length);
    }
    return synchronizedWords;
  };
  const handleOnModeAdd = (mode: GameMode) => {
    onModeAdd(mode);
    // Ensure review words array is synchronized with selected modes
    const updatedWords = ensureSynchronizedArrays([...selectedModes, mode], reviewWords);
    onWordsChange(updatedWords);
  }

  const handleOnModeRemove = (index: number) => {
    onModeRemove(index);
    const updatedWords = reviewWords.filter((_, i) => i !== index);
    onWordsChange(updatedWords);
  }

  const handleDragStart = (e: React.DragEvent, mode: GameMode) => {
    setDraggedMode(mode);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedMode) {
      handleOnModeAdd(draggedMode);
    }
    setDraggedMode(null);
  };

  const handleModeClick = (mode: GameMode) => {
    handleOnModeAdd(mode);
  };

  const handleRemoveMode = (index: number) => {
    handleOnModeRemove(index);
  };

  // Reordering handlers
  const handleReorderDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // For Firefox compatibility
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
    
    // Add a custom drag image or text to indicate mode + word is being moved
    e.dataTransfer.setData("text/html", `Moving: ${selectedModes[index]} + "${reviewWords[index] || 'word'}"`);
    
    // Add haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleReorderDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    // Reset visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleReorderDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleReorderDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      // Validate indices are within bounds
      if (draggedIndex >= 0 && draggedIndex < selectedModes.length && 
          toIndex >= 0 && toIndex < selectedModes.length) {
        
        // Reorder both modes and their corresponding review words
        const newSelectedModes = [...selectedModes];
        const synchronizedWords = ensureSynchronizedArrays(selectedModes, reviewWords);
        const newReviewWords = [...synchronizedWords];
        
        // Remove items from their original positions
        const [movedMode] = newSelectedModes.splice(draggedIndex, 1);
        const [movedWord] = newReviewWords.splice(draggedIndex, 1);
        
        // Insert items at their new positions
        newSelectedModes.splice(toIndex, 0, movedMode);
        newReviewWords.splice(toIndex, 0, movedWord || '');
        
        // Log the reordering action for debugging
        console.log('Reordering:', {
          from: draggedIndex,
          to: toIndex,
          movedMode: movedMode,
          movedWord: movedWord || 'empty',
          newModes: newSelectedModes,
          newWords: newReviewWords
        });
        
        // Update both the modes and words synchronously
        onModeReorder(draggedIndex, toIndex);
        onWordsChange(newReviewWords);
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="game-mode-selector">
      <div className="form-group">
        <label>Game Mode Sequence (Drag & Drop or Click)</label>

        <div className="available-game-modes">
          <div className="modes-container">
            {availableModes.map((mode) => (
              <div
                key={mode}
                className={`game-mode-tag `}
                draggable
                onDragStart={(e) => handleDragStart(e, mode)}
                onClick={() => handleModeClick(mode)}
              >
                {mode}
              </div>
            ))}
          </div>
        </div>

        <div className="selected-label">
          <strong>Selected Game Modes:</strong>
          {isMobile && selectedModes.length > 0 && (
            <small style={{ display: 'block', marginTop: '4px', color: '#6c757d' }}>
              Touch and hold ⋮⋮ to reorder items
            </small>
          )}
        </div>

        <div
          className="selected-game-modes"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {selectedModes.length === 0 ? (
            <div className="drop-hint">
              Drag game modes here to select them or click on them above
            </div>
          ) : (
            <div className="selected-modes-list">
              {selectedModes.map((mode, index) => (
                <div 
                  key={`${mode}-${index}`} 
                  className={`selected-mode-tag ${
                    dragOverIndex === index ? 'drag-over' : ''
                  } ${draggedIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleReorderDragStart(e, index)}
                  onDragEnd={handleReorderDragEnd}
                  onDragOver={(e) => handleReorderDragOver(e, index)}
                  onDragLeave={handleReorderDragLeave}
                  onDrop={(e) => handleReorderDrop(e, index)}
                >
                  <div className="mode-header">
                    <div className="mode-header-top">
                      <div className="mode-controls">
                        <span 
                          className="drag-handle" 
                          title={isMobile ? "Touch and hold to reorder" : "Drag to reorder mode and word together"}
                        >
                          ⋮⋮
                        </span>
                        <select 
                          className="mode-name" 
                          onChange={(e) => {
                            const amode = e.target.value as GameMode;
                            const updatedModes = selectedModes.map((m, idx) =>
                              idx === index ? amode : m
                            );
                            onModeChange?.(updatedModes);
                          }}
                          value={selectedModes[index]}
                        >
                        {
                          availableModes?.map((amode) => (
                            <option 
                              key={amode} 
                              value={amode} 
                              selected={amode === mode}
                            >
                              {amode}
                            </option>
                          ))
                        }
                        </select>
                        <span className="word-indicator" title={`Connected word: ${reviewWords[index] || 'none'}`}>
                          {reviewWords[index] ? '🔗' : '○'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="remove-mode-btn"
                        onClick={() => handleRemoveMode(index)}
                        title="Remove this mode and its word"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mode-input-section">
                      <SuggestableInput
                        id={`suggest-review-word-${index}`}
                        label=""
                        placeholder="Type to suggest review words"
                        suggestions={allReviewWords}
                        value={reviewWords[index]}
                        onChange={(value) => {
                          const updateWords = reviewWords.map((r, idx) =>
                            idx === index ? value : r
                          );
                          onWordsChange(updateWords);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameModeSelector;
