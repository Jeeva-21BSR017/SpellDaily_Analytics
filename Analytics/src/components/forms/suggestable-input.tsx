import React, { useState, useRef, useEffect, useCallback } from "react";

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

const SuggestableInput: React.FC<SuggestableInputProps> = ({
  label,
  id,
  value,
  onChange,
  placeholder = "",
  suggestions = [],
  onSuggestionsFetch,
  maxSuggestions = 10,
  minQueryLength = 1,
  debounceDelay = 300,
  required = false,
  disabled = false,
  className = "",
  highlightMatch = true,
  caseSensitive = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    SuggestionItem[]
  >([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Convert string array to SuggestionItem array
  const normalizeSuggestions = useCallback(
    (items: SuggestionItem[] | string[]): SuggestionItem[] => {
      return items.map((item) =>
        typeof item === "string" ? { value: item, label: item } : item
      );
    },
    []
  );

  // Filter suggestions based on input value
  const filterSuggestions = useCallback(
    (query: string, items: SuggestionItem[]): SuggestionItem[] => {
      if (!query || query.length < minQueryLength) return [];

      const searchQuery = caseSensitive ? query : query.toLowerCase();

      return items
        .filter((item) => {
          const itemValue = caseSensitive
            ? item.value
            : item.value.toLowerCase();
          const itemLabel = caseSensitive
            ? item.label || item.value
            : (item.label || item.value).toLowerCase();
          return (
            itemValue.includes(searchQuery) || itemLabel.includes(searchQuery)
          );
        })
        .slice(0, maxSuggestions);
    },
    [minQueryLength, maxSuggestions, caseSensitive]
  );

  // Highlight matching text in suggestions
  const highlightMatchingText = useCallback(
    (text: string, query: string): JSX.Element => {
      if (!highlightMatch || !query) {
        return <span>{text}</span>;
      }

      const searchQuery = caseSensitive ? query : query.toLowerCase();
      const searchText = caseSensitive ? text : text.toLowerCase();
      const index = searchText.indexOf(searchQuery);

      if (index === -1) {
        return <span>{text}</span>;
      }

      const before = text.slice(0, index);
      const match = text.slice(index, index + query.length);
      const after = text.slice(index + query.length);

      return (
        <span>
          {before}
          <mark className="suggestion-highlight">{match}</mark>
          {after}
        </span>
      );
    },
    [highlightMatch, caseSensitive]
  );

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!onSuggestionsFetch || query.length < minQueryLength) return;

      setIsLoading(true);
      setError(null);

      try {
        const fetchedSuggestions = await onSuggestionsFetch(query);
        const normalizedSuggestions = normalizeSuggestions(fetchedSuggestions);
        setFilteredSuggestions(normalizedSuggestions);
      } catch (err) {
        setError("Failed to fetch suggestions");
        console.error("Error fetching suggestions:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuggestionsFetch, minQueryLength, normalizeSuggestions]
  );

  // Update suggestions when input changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= minQueryLength) {
      if (onSuggestionsFetch) {
        // Use async fetching
        debounceRef.current = setTimeout(() => {
          fetchSuggestions(value);
        }, debounceDelay);
      } else {
        // Use local suggestions
        const normalizedSuggestions = normalizeSuggestions(suggestions);
        const filtered = filterSuggestions(value, normalizedSuggestions);
        setFilteredSuggestions(filtered);
      }
      setActiveSuggestionIndex(-1);
    } else {
      setFilteredSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    value,
    suggestions,
    minQueryLength,
    debounceDelay,
    onSuggestionsFetch,
    fetchSuggestions,
    filterSuggestions,
    normalizeSuggestions,
  ]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SuggestionItem) => {
    console.log("Selected suggestion:", suggestion);
    onChange(suggestion.value);
    setActiveSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        console.log("Key down event:", e.key, filteredSuggestions[0]);
        if (activeSuggestionIndex >= 0) {
          handleSuggestionSelect(filteredSuggestions[activeSuggestionIndex]);
        } else {
            handleSuggestionSelect(filteredSuggestions[0]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveSuggestionIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (value.length >= minQueryLength && filteredSuggestions.length > 0) {
      setIsOpen(true);
    }
    // Scroll into view on mobile to ensure input is visible above keyboard
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    }
  };

  // Handle input blur (with delay to allow suggestion clicks)
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setActiveSuggestionIndex(-1);
    }, 150);
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestionIndex >= 0 && suggestionsRef.current) {
      const activeElement = suggestionsRef.current.children[
        activeSuggestionIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeSuggestionIndex]);

  return (
    <div className={`suggestable-input-container ${className}`}>
      <div className="form-group">
        {label && (
          <label htmlFor={id} className="form-label">
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}

        <div className="input-wrapper">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`form-input ${isOpen ? "suggestions-open" : ""}`}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${id}-suggestions`}
            aria-owns={`${id}-suggestions`}
            aria-activedescendant={
              activeSuggestionIndex >= 0
                ? `${id}-suggestion-${activeSuggestionIndex}`
                : undefined
            }
          />

          {isLoading && (
            <div className="input-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>

        {isOpen && (
          <div
            ref={suggestionsRef}
            id={`${id}-suggestions`}
            className={`suggestions-dropdown ${window.innerWidth <= 768 ? 'mobile-dropdown' : ''}`}
            role="listbox"
          >
            {error && <div className="suggestion-error">{error}</div>}

            {!error && filteredSuggestions.length > 0 && (
              <ul className="suggestions-list">
                {filteredSuggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion.value}-${index}`}
                    id={`${id}-suggestion-${index}`}
                    className={`suggestion-item ${
                      index === activeSuggestionIndex ? "active" : ""
                    }`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                  >
                    <div className="suggestion-content">
                      <span className="suggestion-value">
                        {highlightMatchingText(
                          suggestion.label || suggestion.value,
                          value
                        )}
                      </span>
                      {suggestion.description && (
                        <span className="suggestion-description">
                          {suggestion.description}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!error &&
              filteredSuggestions.length === 0 &&
              !isLoading &&
              value.length >= minQueryLength && (
                <div className="no-suggestions">No suggestions found</div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestableInput;
