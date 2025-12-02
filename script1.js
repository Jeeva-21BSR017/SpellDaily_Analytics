// Firebase initialization (modern v9+ SDK)
// Firebase is initialized in HTML as a module, we just need to wait for it
let db = null;

// const customDate = "2025-10-06";
const customDate = null;

// Common function to get today's date in YYYY-MM-DD format
function getTodayDate() {
  if (customDate) {
    return new Date(customDate);
  }

  return new Date();
}

function getTodayDateNow() {
  if (customDate) {
    return new Date(customDate).getTime();
  }

  return Date.now();
}

function getTodayDateISOString() {
  return getTodayDate().toISOString();
}

function getTodayDateString() {
  const today = getTodayDate();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Wait for Firebase to be initialized from the module in HTML
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkFirebase = () => {
      console.log("🔍 Checking Firebase initialization...", {
        firebaseInitialized: window.firebaseInitialized,
        firebaseDb: !!window.firebaseDb,
      });

      if (window.firebaseInitialized && window.firebaseDb) {
        db = window.firebaseDb;
        console.log("✅ Firebase connected to script1.js?v=0.0.1");
        resolve(true);
      } else {
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
}

// Initialize Firebase connection
waitForFirebase().catch((error) => {
  console.error("Firebase initialization error:", error);
});

class SpellingApp {
  constructor(
    usercode,
    words,
    wordHints,
    wordPartsData,
    sentenceTemplates,
    wordDistractors,
    finalSequence,
    fillupsBlankPositions,
    twoOptionDistractors,
    wordMeanings,
    contextChoice,
    correctSentence,
    wordsWithStreak
  ) {
    this.usercode = usercode;
    if (window.LogRocket) {
      LogRocket.identify(usercode, {
        name: usercode || "Spelling Drill Player",
        gameType: "spelling_drill",
      });
    }

    // Check if this is test mode (code ends with 'test')
    this.isTestMode = usercode && usercode.toLowerCase().endsWith("test");
    if (this.isTestMode) {
      console.log(`🧪 TEST MODE ACTIVATED for user: ${this.usercode}`);
      console.log("📝 Data will NOT be saved to Firebase in test mode");

      // Show test mode indicator in UI
      showTestModeIndicator();
    }

    // Default words (fallback if no game code is used)
    this.words = words || [];

    this.learningWords = [];

    // Log the username for tracking
    console.log(`Starting game for user: ${this.usercode}`);

    // Auto-play flag to prevent multiple auto-plays
    this.shouldAutoPlay = true;

    // Analytics tracking for typing games
    this.typingAnalytics = {
      code: this.usercode,
      word: null,
      speakerClicks: 0,
      check: [],
      backspace: [],
    };

    // Word hints for better understanding
    this.wordHints = JSON.parse(wordHints) || {};

    // Word meanings data for the words-meaning game
    this.wordMeanings = wordMeanings || {};

    // Context choice data for the context-choice game
    this.contextChoiceData = contextChoice || {};

    // Correct sentence data for the correct-sentence game
    this.correctSentenceData = correctSentence || {};

    // Word parts data for the word parts puzzle game
    this.wordPartsData = JSON.parse(wordPartsData) || {};

    this.allQuestions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.wrongWords = [];
    this.isPracticeMode = false;
    this.practiceWords = [];
    this.currentAttempt = 1;
    this.maxAttempts = 2;
    this.typedWord = "";
    this.maxLength = 0;
    this.selectedOption = null;
    this.wordsWithStreak = {};

    // Word parts game state
    this.wordPartsAttempt = 1;
    this.wordPartsMaxAttempts = 1;
    this.wordPartsChosen = [];

    // Audio configuration
    this.audioPath = "./audio/"; // Default audio folder path
    this.audioFormat = ".mp3"; // Default audio format

    // Initialize stats object
    this.stats = {
      correct: 0,
      total: 0,
      wordsToLearn: [],
      failedWords: [],
    };

    // Initialize other missing properties
    this.practiceQuestions = [];
    this.practiceCompleted = false;
    // Learning mode removed as requested

    // Hat-trick (3-in-a-row) tracking
    this.consecutiveCorrect = 0;
    this.pendingStreakCelebration = 0; // Track pending streak celebrations

    // Session management for resume functionality
    this.sessionId = this.generateSessionId();

    // Session management for resume functionality
    this.progressCheckComplete = false;

    // Preload Lottie animations for streak celebrations
    this.preloadLottieAnimations();

    // Initialize sentence templates and word distractors for correct-word game
    this.sentenceTemplates = JSON.parse(sentenceTemplates) || {};

    this.wordDistractors = JSON.parse(wordDistractors) || {};

    // Create dynamic finalSequence - can handle any number of games
    if (finalSequence && finalSequence.length > 0) {
      this.finalSequence = finalSequence;
      console.log(`🎮 Using provided sequence with ${finalSequence.length} games`);
    }

    this.fillupsBlankPositions = JSON.parse(fillupsBlankPositions) || {};

    this.twoOptionDistractors = JSON.parse(twoOptionDistractors) || {};
    this.wordsWithStreak = wordsWithStreak|| {};

    this.initializeQuestions();
    this.bindEvents();

    // Add beforeunload event to save progress when user leaves
    this.setupProgressSaving();

    // Check for existing progress before starting the game
    this.initializeGame();

    // console.log("🔍 Word hints:",  wordHints);
    // console.log("🔍 Word parts data:",  wordPartsData);
    // console.log("🔍 Sentence templates:",  sentenceTemplates);
    // console.log("🔍 Word distractors:",  wordDistractors);
    // console.log("🔍 Final sequence:",  finalSequence);
    // console.log("🔍 Fillups blank positions:",  fillupsBlankPositions);
    // console.log("🔍 Two option distractors:",  twoOptionDistractors);
  }

  async initializeGame() {
    try {
      // Skip progress check for practice sessions
      if (this.isPracticeMode) {
        console.log("🎯 Skipping progress check - Practice mode active");
        this.progressCheckComplete = true;
        this.displayCurrentQuestion();
        return;
      }

      // Check for existing progress first (only for main game)
      // await this.loadGameProgress();
      this.progressCheckComplete = true;

      // Now start the game
      this.displayCurrentQuestion();
    } catch (error) {
      console.error("❌ Error during game initialization:", error);
      // Start fresh game on error
      this.progressCheckComplete = true;
      this.displayCurrentQuestion();
    }
  }

  initializeQuestions() {
    if (this.isPracticeMode) {
      // In practice mode, only show the failed words as 4-option MCQs
      this.allQuestions = [...this.practiceQuestions];
      return;
    }

    // Clear any existing questions
    this.allQuestions = [];

    // Combine all words into a single pool (no separation between review/new)
    const allWords = [...this.words];

    // Create a flexible word map that can handle any number of words
    const wordMap = {};
    for (let i = 0; i < allWords.length; i++) {
      wordMap[`word${i + 1}`] = allWords[i] || "";
    }

    console.log(`📝 Created word map for ${allWords.length} words`);
    console.log(`🎯 Final sequence has ${this.finalSequence.length} games`);

    // Initialize failed words tracking for review system
    if (!this.failedWordsTracker) {
      this.failedWordsTracker = new Set();
    }

    // Create questions based on the sequence
    this.finalSequence.forEach((item, index) => {
      const wordKey = item.word;
      const actualWord = wordMap[wordKey];

      // Skip if the word doesn't exist (in case we have fewer words than expected)
      if (!actualWord) {
        console.log(`⚠️ Skipping game ${index + 1}: No word found for ${wordKey}`);
        return;
      }

      // For word-parts type, check if data exists
      if (item.type === "word-parts" && !this.wordPartsData[actualWord]) {
        // Skip if no word parts data
        return;
      }

      // Add the question to the sequence
      this.allQuestions.push({
        word: actualWord,
        type: item.type,
      });
    });
  }

  bindEvents() {
    document.getElementById("soundButton").addEventListener("click", () => {
      // When sound button is clicked manually, play sound regardless of auto-play flag
      const question = this.allQuestions[this.currentQuestionIndex];
      const word = question.word;
      this.playWordAudio(word);

      // Track speaker clicks for typing games
      if (question.type === "typing") {
        this.typingAnalytics.speakerClicks++;
      }
    });

    document.getElementById("slowSoundButton").addEventListener("click", () => {
      // When slow sound button is clicked, play sound at slower speed
      const question = this.allQuestions[this.currentQuestionIndex];
      const word = question.word;
      this.playSlowWordAudio(word);

      // Track speaker clicks for typing games
      if (question.type === "typing") {
        this.typingAnalytics.speakerClicks++;
      }
    });
    updateEmojiInProgressBar("by_rating/2");
    document.getElementById("checkButton").addEventListener("click", () => this.checkAnswer());
    document.getElementById("continueButton").addEventListener("click", async () => await this.nextQuestion());
    document.getElementById("startPracticeButton").addEventListener("click", () => this.startPracticeMode());
    document.getElementById("showCardButton").addEventListener("click", () => this.showCard());
    document.getElementById("wordInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.checkAnswer();
    });
    document.getElementById("wordInput").addEventListener("input", (e) => {
      // Play sound for direct typing in the input field
      if (e.inputType === "insertText" || e.inputType === "deleteContentBackward") {
        this.playKeyClickSound();
      }
      this.resetInputState();
    });

    // Keyboard events
    document.addEventListener("keydown", (e) => this.handlePhysicalKeyboard(e));
    document.querySelectorAll(".key").forEach((key) => {
      key.addEventListener("click", () => this.handleVirtualKeyboard(key.dataset.key));
    });
  }

  playSound() {
    const question = this.allQuestions[this.currentQuestionIndex];
    // Skip sound for correct-word game type if it exists
    if (question && question.type !== "correct-word") {
      const word = question.word;
      this.playWordAudio(word);
    }
  }

  playWordAudio(word) {
    // First try to play external audio file
    const audioFileName = word.toLowerCase() + ".mp3";
    const audioPath = "./audio/" + audioFileName; // You can change this path as needed

    const audio = new Audio();

    // Set up success handler
    audio.addEventListener("canplaythrough", () => {
      console.log(`Playing audio file: ${audioPath}`);
      audio.play().catch((error) => {
        console.log("Audio file play failed, falling back to speech synthesis:", error);
        this.fallbackToSpeechSynthesis(word);
      });
    });

    // Set up error handler for file not found
    audio.addEventListener("error", (error) => {
      console.log(`Audio file not found: ${audioPath}, using speech synthesis`);
      this.fallbackToSpeechSynthesis(word);
    });

    // Try to load the audio file
    audio.src = audioPath;
    audio.load();
  }

  fallbackToSpeechSynthesis(word) {
    // Fallback to Web Speech API if audio file is not available
    try {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.7;
      utterance.volume = 1;
      utterance.lang = "en-US"; // Set language explicitly

      // Add error handling for speech synthesis
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
      };

      utterance.onstart = () => {
        console.log(`Speaking word: ${word}`);
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Speech synthesis failed:", error);
      // Could add a visual indicator here that audio is not available
    }
  }

  playSlowWordAudio(word) {
    // First try to play external audio file at slower speed
    const audioFileName = word.toLowerCase() + ".mp3";
    const audioPath = "./audio/" + audioFileName;

    const audio = new Audio();

    // Set up success handler
    audio.addEventListener("canplaythrough", () => {
      console.log(`Playing slow audio file: ${audioPath}`);
      audio.playbackRate = 0.5; // Play at half speed
      audio.play().catch((error) => {
        console.log("Slow audio file play failed, falling back to slow speech synthesis:", error);
        this.fallbackToSlowSpeechSynthesis(word);
      });
    });

    // Set up error handler for file not found
    audio.addEventListener("error", (error) => {
      console.log(`Audio file not found: ${audioPath}, using slow speech synthesis`);
      this.fallbackToSlowSpeechSynthesis(word);
    });

    // Try to load the audio file
    audio.src = audioPath;
    audio.load();
  }

  fallbackToSlowSpeechSynthesis(word) {
    // Fallback to Web Speech API at slower speed if audio file is not available
    try {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.3; // Much slower rate for slow sound
      utterance.volume = 1;
      utterance.lang = "en-US"; // Set language explicitly

      // Add error handling for speech synthesis
      utterance.onerror = (event) => {
        console.error("Slow speech synthesis error:", event.error);
      };

      utterance.onstart = () => {
        console.log(`Speaking word slowly: ${word}`);
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Slow speech synthesis failed:", error);
      // Could add a visual indicator here that audio is not available
    }
  }

  playCorrectSound() {
    // Create a pleasant success sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create a sequence of ascending notes for success
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)

    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = "sine";

      // Fade in and out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + index * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + index * 0.1 + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + index * 0.1 + 0.3);

      oscillator.start(audioContext.currentTime + index * 0.1);
      oscillator.stop(audioContext.currentTime + index * 0.1 + 0.3);
    });
  }

  playIncorrectSound() {
    // Create a gentle error sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create a descending tone for incorrect answer
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start high and go low (disappointed sound)
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.5);
    oscillator.type = "sine";

    // Fade in and out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  generateOptions(correctWord, count) {
    const options = [correctWord];
    // Word-specific distractors for all words used in the game
    const wordDistractors = this.wordDistractors;
    // Get word-specific distractors
    if (!wordDistractors[correctWord]) {
      console.error(`No distractors found for word: ${correctWord}`);
      return [correctWord]; // Return just the correct word if no distractors are defined
    }

    const availableDistractors = [...wordDistractors[correctWord]];

    // Add distractors until we have enough options
    while (options.length < count && availableDistractors.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableDistractors.length);
      const distractor = availableDistractors.splice(randomIndex, 1)[0];
      if (distractor !== correctWord && !options.includes(distractor)) {
        options.push(distractor);
      }
    }

    // Only return options if we have the requested number, otherwise return just the correct word
    if (options.length < count) {
      console.warn(`Not enough distractors for word: ${correctWord}. Only found ${options.length} options.`);
    }

    return this.shuffleArray(options);
  }

  generateSimilarWords(word) {
    const variations = [];
    const vowels = ["a", "e", "i", "o", "u"];
    const consonants = [
      "b",
      "c",
      "d",
      "f",
      "g",
      "h",
      "j",
      "k",
      "l",
      "m",
      "n",
      "p",
      "q",
      "r",
      "s",
      "t",
      "v",
      "w",
      "x",
      "y",
      "z",
    ];

    // Create variations by changing vowels
    for (let i = 0; i < word.length; i++) {
      if (vowels.includes(word[i].toLowerCase())) {
        vowels.forEach((vowel) => {
          if (vowel !== word[i].toLowerCase()) {
            const variation = word.substring(0, i) + vowel + word.substring(i + 1);
            variations.push(variation);
          }
        });
      }
    }

    // Create variations by removing letters
    for (let i = 1; i < word.length - 1; i++) {
      const variation = word.substring(0, i) + word.substring(i + 1);
      variations.push(variation);
    }

    for (let i = 0; i < word.length - 1; i++) {
      const variation = word.substring(0, i) + word[i + 1] + word[i] + word.substring(i + 2);
      variations.push(variation);
    }

    return variations.slice(0, 6); // Return up to 6 variations
  }

  createWordVariation(word, index) {
    const variations = [
      word.slice(0, -1), // Remove last letter
      word + word[word.length - 1], // Double last letter
      word.substring(0, 1) + word.substring(2), // Remove second letter
      word + "e", // Add 'e' at the end
      word.replace(/e/g, "a"), // Replace 'e' with 'a'
      word.replace(/i/g, "e"), // Replace 'i' with 'e'
    ];

    return variations[index % variations.length] || word + "s";
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  displayCurrentQuestion() {
    // Learning mode has been disabled as requested

    // Stop all speech synthesis when starting a new question
    if (speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    if (this.currentQuestionIndex >= this.allQuestions.length) {
      console.log(`🏁 Game completed! Question ${this.currentQuestionIndex + 1} of ${this.allQuestions.length}`);
      this.showCompletion();
      return;
    }

    console.log(`🎮 Displaying question ${this.currentQuestionIndex + 1} of ${this.allQuestions.length}`);

    const question = this.allQuestions[this.currentQuestionIndex];
    this.currentAnswer = question.word;
    this.isAnswered = false;
    this.currentAttempt = 1;
    this.previousAttempts = [];

    // Reset auto-play flag for new question
    this.shouldAutoPlay = true;

    // Reset all game-specific state variables to ensure clean transitions
    this.resetAllGameStates();

    // Update progress
    const progress = (this.currentQuestionIndex / this.allQuestions.length) * 100;
    document.getElementById("progressFill").style.width = progress + "%";
    // Keep question counter empty as requested
    document.getElementById("questionCounter").textContent = "";

    // Show mode indicators
    const modeIndicator = document.getElementById("modeIndicator");
    if (this.isPracticeMode) {
      modeIndicator.textContent = "Practice Mode";
      modeIndicator.className = "mode-indicator practice-mode";
      modeIndicator.style.display = "inline-block";
      // Learning mode removed as requested
    } else {
      modeIndicator.style.display = "none";
    }

    // Display word hint
    this.displayWordHint(question.word);

    // Reset UI
    this.resetUI();

    // Reset keyboard colors for new question
    this.resetKeyboardColors();

    // Show or hide sound buttons based on game type
    const soundButton = document.getElementById("soundButton");
    const slowSoundButton = document.getElementById("slowSoundButton");
    const soundButtonsContainer = document.querySelector(".sound-buttons-container");

    if (question.type === "correct-word") {
      // Hide sound buttons for correct-word game only
      soundButtonsContainer.style.display = "none";
    } else {
      // Show sound buttons for all other game types including 2-option
      soundButtonsContainer.style.display = "flex";
    }

    if(this.wordsWithStreak[question.word] > 3){
      question.type = "full-typing";
    }

    // Display based on question type
    switch (question.type) {
      case "typing":
        this.displayTypingQuestion();
        break;
      case "4-option":
        this.displayMCQ(4);
        break;
      case "correct-word":
        this.displayCorrectWordGame(question.word);
        break;
      case "letter-scramble":
        this.displayLetterScramble(question.word, document.getElementById("optionsContainer"));
        break;
      case "word-parts":
        this.displayWordParts(question.word);
        break;
      case "fillups":
        this.displayFillupsQuestion();
        break;
      case "2-option":
        this.display2OptionGame(question.word);
        break;
      case "words-meaning":
        this.displayWordsMeaning(question.word);
        break;
      case "context-choice":
        this.displayContextChoice(question.word);
        break;
      case "correct-sentence":
        this.displayCorrectSentence(question.word);
        break;
      case "full-typing":
        this.displayFullTypingQuestion();
        break;
    }

    // Auto-play the word sound after a short delay to ensure UI is ready
    setTimeout(() => {
      if (this.shouldAutoPlay && question.type !== "correct-word") {
        this.playSound();
        // Prevent multiple auto-plays for the same question
        this.shouldAutoPlay = false;
      }
    }, 500);
  }

  // Learning mode questions removed as requested

  // Initialize analytics tracking for typing questions
  initializeTypingAnalytics(word) {
    this.typingAnalytics = {
      code: this.usercode,
      word: word,
      speakerClicks: 0,
      check: [],
      backspace: [],
      startTime: Math.round(getTodayDateNow() / 1000),
      endTime: null,
      submitted: false, // Flag to prevent duplicate submissions
    };
  }

  // Submit typing analytics to Firebase
  async submitTypingAnalyticsToFirebase() {
    if (!this.typingAnalytics || !db || this.typingAnalytics.submitted) {
      return;
    }

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping typing analytics submission to Firebase");
      return;
    }

    try {
      const { doc, setDoc, query, collection, where, getDocs, Timestamp } = await import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
      );

      // Check if this word already has an entry for this user (first-time only rule)
      const existingQuery = query(
        collection(db, "user-activity"),
        where("code", "==", this.usercode),
        where("word", "==", this.typingAnalytics.word),
        where("gameType", "==", "typing"),
        where("submittedAt", ">=", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      );

      const existingDocs = await getDocs(existingQuery);

      if (!existingDocs.empty) {
        console.log(
          `⚠️ Word '${this.typingAnalytics.word}' already has an entry for user ${this.usercode}. Skipping save (first-time only rule).`
        );
        this.typingAnalytics.submitted = true;
        return;
      }

      // Create document ID with timestamp for uniqueness
      const docId = `${this.usercode}-${this.typingAnalytics.word}-${getTodayDateNow()}`;
      const docRef = doc(db, "user-activity", docId);

      const analyticsData = {
        ...this.typingAnalytics,
        submittedAt: getTodayDateString(),
        gameType: "typing",
        sessionId: this.sessionId || "unknown",
        testStartTime: this.gameStarted || getTodayDateISOString(),
      };

      await setDoc(docRef, analyticsData);
      console.log("✅ Typing analytics submitted to Firebase:", docId);

      // Mark as submitted to prevent duplicate submissions
      this.typingAnalytics.submitted = true;
    } catch (error) {
      console.error("❌ Error submitting typing analytics to Firebase:", error);
      logError("❌ Error submitting typing analytics to Firebase:", error);
    }
  }

  displayTypingQuestion() {
    // Remove letter-scramble game class if present
    document.querySelector(".app-container").classList.remove("options-2-active");

    document.getElementById("questionType").textContent = "TYPE WHAT YOU HEAR";
    document.getElementById("inputContainer").style.display = "block";
    document.getElementById("optionsContainer").style.display = "none";

    // Change background to PURPLE
    document.body.style.background = "linear-gradient(135deg, #8B5CF6 0%, #6B21A8 100%)";
    document.body.style.transition = "background 0.5s ease";

    // Ensure wordBoxes is visible for typing games
    const wordBoxes = document.getElementById("wordBoxes");
    if (wordBoxes) wordBoxes.style.display = "flex";

    // Show keyboard for typing games
    const keyboard = document.getElementById("keyboard");
    if (keyboard) keyboard.style.display = "block";

    // Setup word boxes
    const question = this.allQuestions[this.currentQuestionIndex];
    this.maxLength = question.word.length;
    this.typedWord = "";

    // Reset fillups mode flag to ensure typing game doesn't show dashes
    this.fillupsMode = false;

    // Hide previous attempt initially
    document.getElementById("previousAttempt").style.display = "none";

    // Initialize analytics for this typing question
    this.initializeTypingAnalytics(question.word);

    this.createWordBoxes();
    this.updateWordBoxes();

    // Ensure check button is disabled initially since no letters are typed
    document.getElementById("checkButton").disabled = true;
  }

  displayFullTypingQuestion() {
    // Remove letter-scramble game class if present
    document.querySelector(".app-container").classList.remove("options-2-active");

    document.getElementById("questionType").textContent = "TYPE WHAT YOU HEAR - 16 SECONDS";
    document.getElementById("inputContainer").style.display = "block";
    document.getElementById("optionsContainer").style.display = "none";

    // Ensure wordBoxes is visible for typing games
    const wordBoxes = document.getElementById("wordBoxes");
    if (wordBoxes) wordBoxes.style.display = "flex";

    // Show keyboard for typing games
    const keyboard = document.getElementById("keyboard");
    if (keyboard) keyboard.style.display = "block";

    // Setup word boxes
    const question = this.allQuestions[this.currentQuestionIndex];
    this.maxLength = question.word.length;
    this.typedWord = "";

    // Reset fillups mode flag to ensure typing game doesn't show dashes
    this.fillupsMode = false;

    // Hide previous attempt initially
    document.getElementById("previousAttempt").style.display = "none";

    // Initialize analytics for this typing question
    this.initializeTypingAnalytics(question.word);

    // Create long dash display instead of individual letter boxes
    this.createLongDashDisplay();

    // Add NEW label
    this.addNewLabel();

    // Start 16-second timer
    this.startFullTypingTimer();
  }

  createLongDashDisplay() {
    const wordBoxes = document.getElementById("wordBoxes");
    wordBoxes.innerHTML = "";

    const longDash = document.createElement("div");
    longDash.textContent = "";
    longDash.className = "long-dash";
    longDash.id = "longDash";
    longDash.style.cssText = `
    font-size: clamp(32px, 8vw, 72px);
      color: #6b4eff;
      letter-spacing: clamp(4px, 1vw, 8px);
      font-weight: bold;
      min-width: clamp(200px, 60vw, 300px);
      min-height: clamp(50px, 12vh, 80px);
      width: 90%;
      max-width: 400px;
      height: clamp(50px, 12vh, 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px dashed #dee2e6;
      border-radius: 12px;
      background: #f8f9fa;
      margin: 0 auto;
      text-align: center;
      padding: 10px;
      box-sizing: border-box;
    `;

    wordBoxes.appendChild(longDash);

    // Add timer display at the top
    const timerDisplay = document.createElement("div");
    timerDisplay.id = "fullTypingTimer";
    timerDisplay.style.cssText = `
      position: fixed;
      top: clamp(10px, 3vh, 20px);
      left: 50%;
      transform: translateX(-50%);
  background: white;
      color: #8B5CF6;
      padding: clamp(12px, 3vh, 16px) clamp(20px, 5vw, 32px);
      border-radius: clamp(25px, 6vw, 60px);
      font-size: clamp(20px, 5vw, 32px);
      font-weight: 900;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: flex;
      align-items: center;
   gap: clamp(8px, 2vw, 12px);
      border: 4px solid rgba(139, 92, 246, 0.3);
    `;

    // Add clock icon
    const clockIcon = document.createElement("span");
    clockIcon.innerHTML = "⏱️";
    clockIcon.style.fontSize = "clamp(24px, 6vw, 36px)";
    timerDisplay.appendChild(clockIcon);

    const timerText = document.createElement("span");
    timerText.textContent = "16";
    timerText.style.fontWeight = "900";
    timerText.style.letterSpacing = "2px";
    timerDisplay.appendChild(timerText);

    document.body.appendChild(timerDisplay);
  }

  addNewLabel() {
    // Find the question type element
    const questionTypeElement = document.getElementById("questionType");

    // Create NEW label
    const newLabel = document.createElement("span");
    newLabel.textContent = "NEW";
    newLabel.style.cssText = `
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%);
      color: white;
      padding: clamp(2px, 1vh, 4px) clamp(8px, 2vw, 12px);
      border-radius: clamp(10px, 3vw, 20px);
      font-size: clamp(10px, 3vw, 12px);
      font-weight: bold;
      margin-left: clamp(6px, 2vw, 12px);
      display: inline-block;
      animation: pulse 2s infinite;
      box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
      text-transform: uppercase;
      letter-spacing: clamp(0.5px, 0.2vw, 1px);
    `;

    // Append to question type
    questionTypeElement.appendChild(newLabel);
  }

  startFullTypingTimer() {
    let timeLeft = 16;
    const timerDisplay = document.getElementById("fullTypingTimer");

    // Clear any existing timer
    if (this.fullTypingTimer) {
      clearInterval(this.fullTypingTimer);
    }

    this.fullTypingTimer = setInterval(() => {
      timeLeft--;
      const timerText = timerDisplay.querySelector("span:last-child");
      timerText.textContent = timeLeft;

      // Change color based on time left
      if (timeLeft <= 5) {
        timerDisplay.style.background = "linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%)";
        timerDisplay.style.animation = "pulse 1s infinite";
      } else if (timeLeft <= 10) {
        timerDisplay.style.background = "linear-gradient(135deg, #ffc107 0%, #ffdb4d 100%)";
        timerDisplay.style.color = "#212529";
      }

      if (timeLeft <= 0) {
        clearInterval(this.fullTypingTimer);
        this.handleFullTypingTimeout();
      }
    }, 1000);
  }

  handleFullTypingTimeout() {
    // Time's up - mark as incorrect and move to next question
    const question = this.allQuestions[this.currentQuestionIndex];

    // Show the correct answer
    this.showFeedback(false, `Time's up! The correct answer is "${question.word.toUpperCase()}"`);

    // Mark as answered
    this.isAnswered = true;
    this.stats.total++;
    this.consecutiveCorrect = 0;

    // Play incorrect sound
    this.playIncorrectSound();

    // Update the long dash to show the correct answer
    const longDash = document.getElementById("longDash");
    if (longDash) {
      longDash.textContent = question.word.toUpperCase();
      longDash.style.color = "#dc3545";
    }

    // Clear timer
    if (this.fullTypingTimer) {
      clearInterval(this.fullTypingTimer);
    }

    // Remove timer display from DOM
    const timerDisplay = document.getElementById("fullTypingTimer");
    if (timerDisplay) {
      timerDisplay.remove();
    }

    // Show continue button
    document.getElementById("checkButton").style.display = "none";
    document.getElementById("continueButton").style.display = "inline-block";
  }

  updateFullTypingDisplay() {
    const longDash = document.getElementById("longDash");
    if (longDash) {
      if (this.typedWord.length > 0) {
        longDash.textContent = this.typedWord.toUpperCase();
        longDash.style.color = "#6b4eff";
      } else {
        longDash.textContent = "";
        longDash.style.color = "#6b4eff";
      }
    }

    // Update hidden input for compatibility
    document.getElementById("wordInput").value = this.typedWord;

    // Enable/disable check button based on whether word is complete
    const checkButton = document.getElementById("checkButton");
    const isComplete = this.typedWord.length === this.maxLength;
    checkButton.disabled = !isComplete;
  }

  createWordBoxes() {
    const wordBoxes = document.getElementById("wordBoxes");
    wordBoxes.innerHTML = "";

    for (let i = 0; i < this.maxLength; i++) {
      const box = document.createElement("div");
      box.className = "letter-box";
      box.id = `box-${i}`;
      wordBoxes.appendChild(box);
    }
  }

  createPreviousAttemptBoxes(attempt) {
    const previousWordBoxes = document.getElementById("previousWordBoxes");
    previousWordBoxes.innerHTML = "";

    const correctWord = this.currentAnswer.toLowerCase();
    const userWord = attempt.word.toLowerCase();

    // Create boxes first
    const boxes = [];
    for (let i = 0; i < this.maxLength; i++) {
      const box = document.createElement("div");
      box.className = "letter-box disabled";

      if (i < attempt.word.length) {
        box.textContent = attempt.word[i].toUpperCase();
      }

      boxes.push(box);
      previousWordBoxes.appendChild(box);
    }

    // Apply coloring using the same robust algorithm
    if (attempt.isCorrect) {
      // If completely correct, mark all as correct
      for (let i = 0; i < userWord.length; i++) {
        boxes[i].classList.add("correct");
      }
    } else {
      // Use the same two-pass algorithm as the main grid coloring
      const letterMap = {};
      for (const letter of correctWord) {
        letterMap[letter] = (letterMap[letter] || 0) + 1;
      }

      // First pass: mark correct letters (green)
      for (let i = 0; i < correctWord.length && i < userWord.length; i++) {
        const letterInGuess = userWord[i];
        const letterInWord = correctWord[i];

        if (letterInGuess === letterInWord) {
          boxes[i].classList.add("correct-position");
          // Decrement the count for this letter
          letterMap[letterInGuess]--;
        }
      }

      // Second pass: mark present or absent letters
      for (let i = 0; i < correctWord.length && i < userWord.length; i++) {
        const letterInGuess = userWord[i];
        const letterInWord = correctWord[i];

        // Skip letters already marked as correct
        if (letterInGuess === letterInWord) continue;

        if (correctWord.includes(letterInGuess) && letterMap[letterInGuess] > 0) {
          boxes[i].classList.add("wrong-position");
          // Decrement the count for this letter
          letterMap[letterInGuess]--;
        } else {
          boxes[i].classList.add("incorrect");
        }
      }
    }
  }

  updateWordBoxes() {
    // If in fillups mode, use the fillups-specific function
    if (this.fillupsMode) {
      this.updateFillupsBoxes();
      return;
    }

    for (let i = 0; i < this.maxLength; i++) {
      const box = document.getElementById(`box-${i}`);
      if (i < this.typedWord.length) {
        box.textContent = this.typedWord[i].toUpperCase();
        box.classList.add("filled");
        box.classList.remove("current");
      } else if (i === this.typedWord.length) {
        box.textContent = "";
        box.classList.remove("filled");
        box.classList.add("current");
      } else {
        box.textContent = "";
        box.classList.remove("filled", "current");
      }
    }

    // Update hidden input for compatibility
    document.getElementById("wordInput").value = this.typedWord;

    // Enable/disable check button based on whether all letters are typed
    const checkButton = document.getElementById("checkButton");
    if (checkButton) {
      const isComplete = this.typedWord.length === this.maxLength;
      checkButton.disabled = !isComplete;
    }
  }

  updateFillupsBoxes() {
    const question = this.allQuestions[this.currentQuestionIndex];
    const correctWord = question.word;

    for (let i = 0; i < this.maxLength; i++) {
      const box = document.getElementById(`box-${i}`);

      if (this.blankPositions && this.blankPositions.includes(i)) {
        // This is a blank position
        if (this.typedWord[i] && this.typedWord[i] !== " ") {
          // User has filled this blank
          box.textContent = this.typedWord[i].toUpperCase();
          box.classList.add("filled");
          box.classList.add("user-filled"); // Special class for user-filled blanks
          box.classList.remove("current");
        } else {
          // Still blank - always show two dashes for blanks
          box.textContent = "__";
          box.classList.remove("filled");

          // Mark current blank position
          if (this.blankPositions[this.currentBlankIndex] === i) {
            box.classList.add("current");
          } else {
            box.classList.remove("current");
          }
        }
      } else {
        // Pre-filled position
        box.textContent = correctWord[i].toUpperCase();
        box.classList.add("filled");
        box.classList.add("pre-filled"); // Special class for pre-filled letters
        box.classList.remove("current", "user-filled");
      }
    }

    // Update hidden input for compatibility
    document.getElementById("wordInput").value = this.typedWord;

    // Update check button state
    this.updateCheckButtonState();
  }

  handlePhysicalKeyboard(e) {
    const question = this.allQuestions[this.currentQuestionIndex];
    if (
      (question.type !== "typing" && question.type !== "fillups" && question.type !== "full-typing") ||
      this.isAnswered
    )
      return;

    e.preventDefault();

    // Play key click sound for physical keyboard
    this.playKeyClickSound();

    if (e.key === "Backspace") {
      this.handleBackspace();
    } else if (e.key.match(/^[a-zA-Z]$/)) {
      // For fillups mode, we don't need to check typedWord.length < maxLength
      // because we're only filling specific blank positions
      this.handleLetterInput(e.key.toLowerCase());
    }
  }

  handleVirtualKeyboard(key) {
    const question = this.allQuestions[this.currentQuestionIndex];
    if (
      (question.type !== "typing" && question.type !== "fillups" && question.type !== "full-typing") ||
      this.isAnswered
    )
      return;

    // Play key click sound
    this.playKeyClickSound();

    if (key === "backspace") {
      this.handleBackspace();
    } else if (key && key.match(/^[a-zA-Z]$/)) {
      // For fillups mode, we don't need to check typedWord.length < maxLength
      // because we're only filling specific blank positions
      this.handleLetterInput(key.toLowerCase());
    }
  }

  // Play sound when keyboard key is clicked
  playKeyClickSound() {
    const sound = document.getElementById("keyClickSound");
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Sound play error:", e));
  }

  // Play letter-specific sound for typing activity
  playLetterSound(letter) {
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];
    if (currentQuestion && (currentQuestion.type === "typing" || currentQuestion.type === "fillups")) {
      try {
        const utterance = new SpeechSynthesisUtterance(letter.toLowerCase());
        utterance.rate = 0.8;
        utterance.volume = 0.7;
        utterance.lang = "en-US";

        // Add error handling
        utterance.onerror = (event) => {
          console.log("Letter sound error:", event.error);
        };

        speechSynthesis.speak(utterance);
      } catch (error) {
        console.log("Letter sound failed:", error);
      }
    }
  }

  handleLetterInput(letter) {
    const question = this.allQuestions[this.currentQuestionIndex];

    if (question.type === "fillups" && this.fillupsMode) {
      // For fillups, only fill the current blank position
      if (this.currentBlankIndex < this.blankPositions.length) {
        // Play letter sound
        this.playLetterSound(letter);

        // Get the position of the current blank
        const pos = this.blankPositions[this.currentBlankIndex];

        // Create a new typed word with the letter at the blank position
        let newTypedWord = this.typedWord.split("");
        newTypedWord[pos] = letter;
        this.typedWord = newTypedWord.join("");

        // Move to next blank
        this.currentBlankIndex++;

        this.updateFillupsBoxes(); // Use fillups-specific update
        this.resetInputState();
        this.updateCheckButtonState();
      }
    } else if (this.typedWord.length < this.maxLength) {
      // Regular typing behavior
      this.playLetterSound(letter);

      this.typedWord += letter;
      if (question.type === "full-typing") {
        this.updateFullTypingDisplay();
      } else {
        this.updateWordBoxes();
      }
      this.resetInputState();
    }
  }

  handleBackspace() {
    const question = this.allQuestions[this.currentQuestionIndex];

    if (question.type === "fillups" && this.fillupsMode) {
      // For fillups, only remove the current letter if it exists
      if (this.currentBlankIndex > 0) {
        // Move back to previous position
        this.currentBlankIndex--;

        // Get the position of the current blank
        const pos = this.blankPositions[this.currentBlankIndex];

        // Reset the letter at this position
        let newTypedWord = this.typedWord.split("");
        newTypedWord[pos] = " ";
        this.typedWord = newTypedWord.join("");

        this.updateFillupsBoxes(); // Use fillups-specific update
        this.resetInputState();
      }
    } else if (this.typedWord.length > 0) {
      // Track backspace for typing games (capture text BEFORE backspace)
      if (question.type === "typing" && this.typingAnalytics) {
        this.typingAnalytics.backspace.push(this.typedWord);
      }

      // Regular backspace behavior
      this.typedWord = this.typedWord.slice(0, -1);
      // Special handling for full typing - update the long dash display
      if (question.type === "full-typing") {
        this.updateFullTypingDisplay();
      } else {
        this.updateWordBoxes();
      }
      this.resetInputState();
    }
  }

  displayMCQ(optionCount) {
    const question = this.allQuestions[this.currentQuestionIndex];

    // Remove 2-option game class if present
    document.querySelector(".app-container").classList.remove("options-2-active");

    if (this.isPracticeMode) {
      document.getElementById("questionType").textContent = "PRACTICE MODE - CHOOSE THE CORRECT SPELLING";
      // Removed questionText reference
    } else {
      document.getElementById("questionType").textContent =
        optionCount === 4 ? "Choose the correct spelling" : "Pick the right one";
      // Removed questionText reference
    }

    document.getElementById("inputContainer").style.display = "none";

    const optionsContainer = document.getElementById("optionsContainer");
    optionsContainer.style.display = "block";
    optionsContainer.className = `options-container options-${optionCount}`;

    const options = this.generateOptions(question.word, optionCount);
    optionsContainer.innerHTML = "";

    // For 4-option MCQ, disable check button until user selects an option
    if (optionCount === 4) {
      document.getElementById("checkButton").disabled = true;
    }

    // For 4 options, create two rows with two options each
    if (optionCount === 4) {
      // First row
      const row1 = document.createElement("div");
      row1.className = "options-row";

      // Second row
      const row2 = document.createElement("div");
      row2.className = "options-row";

      // Add options to rows
      options.forEach((option, index) => {
        const button = document.createElement("button");
        button.className = "option-btn";
        button.textContent = option.toUpperCase();
        button.style.flex = "1";
        button.addEventListener("click", () => this.selectOption(button, option));

        // First two options in first row, last two in second row
        if (index < 2) {
          row1.appendChild(button);
        } else {
          row2.appendChild(button);
        }
      });

      // Add rows to container
      optionsContainer.appendChild(row1);
      optionsContainer.appendChild(row2);
    } else if (optionCount === 2) {
      // For 2 options, show letter scramble interface instead
      this.displayLetterScramble(question.word, optionsContainer);
    }
  }

  display2OptionGame(word) {
    // Remove other game classes if present
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.remove("options-4-active");
      appContainer.classList.add("options-2-active");
    }

    // Show speaker button for 2-option games
    const soundButton = document.getElementById("soundButton");
    if (soundButton) {
      soundButton.style.display = "block";
    }

    const questionType = document.getElementById("questionType");
    const wordInput = document.getElementById("wordInput");
    const keypad = document.getElementById("keypad");
    const wordBoxes = document.getElementById("wordBoxes");
    const optionsContainer = document.getElementById("optionsContainer");
    const keyboard = document.getElementById("keyboard");

    if (questionType) questionType.textContent = "CHOOSE THE CORRECT SPELLING";
    if (wordInput) wordInput.style.display = "none";
    if (keypad) keypad.style.display = "none";
    if (wordBoxes) wordBoxes.style.display = "none";
    if (keyboard) keyboard.style.display = "none";
    if (optionsContainer) optionsContainer.style.display = "block";

    // Create options (1 correct + 1 specific distractor)
    const options = [word]; // Correct answer

    // Use specific distractor for 2-option game instead of random selection
    const specificDistractor = this.twoOptionDistractors[word.toLowerCase()];
    if (specificDistractor) {
      options.push(specificDistractor);
    } else {
      // Fallback to random distractor if specific one not found
      console.warn(`No specific 2-option distractor found for word: ${word}. Using fallback.`);
      const wordDistractors = this.wordDistractors;
      const distractors = wordDistractors[word.toLowerCase()] || [];
      if (distractors.length > 0) {
        const randomDistractor = distractors[Math.floor(Math.random() * distractors.length)];
        options.push(randomDistractor);
      }
    }

    // Shuffle the two options
    const shuffledOptions = options.sort(() => Math.random() - 0.5);

    // Set options container class for 2-option style
    if (optionsContainer) {
      optionsContainer.className = "options-container options-2";
      optionsContainer.innerHTML = "";
    }

    // Create a single row with two options
    const row = document.createElement("div");
    row.className = "options-row";

    // Reset selected option for this question
    this.selectedOption = null;

    // Ensure check button is disabled initially
    const checkButton = document.getElementById("checkButton");
    if (checkButton) {
      checkButton.disabled = true;
    }

    // Set question type for validation
    const question = this.allQuestions[this.currentQuestionIndex];
    if (question) {
      question.type = "2-option";
    }

    shuffledOptions.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "option-btn";
      button.textContent = option.toUpperCase();
      button.style.flex = "1";
      button.style.margin = "0 10px";

      button.addEventListener("click", () => this.selectOption(button, option));

      row.appendChild(button);
    });

    optionsContainer.appendChild(row);
  }

  displayLetterScramble(correctWord, container) {
    // Ensure clean UI state for letter-scramble
    document.getElementById("inputContainer").style.display = "none";
    document.getElementById("optionsContainer").style.display = "block";

    // Initialize scramble state
    this.currentWord = correctWord.toUpperCase();
    this.playerAnswer = new Array(this.currentWord.length).fill("");
    this.letterTileSlots = [];
    this.usedTileSlots = new Array(this.currentWord.length).fill(null);
    this.selectedSlotIndex = null;
    this.isChecked = false;
    this.selectedOption = ""; // Will be set when word is formed
    this.letterScrambleAttempt = 1; // Track current attempt
    this.letterScrambleAnswers = []; // Store answers for each attempt

    // Add special class to app container for 2-option game button positioning
    document.querySelector(".app-container").classList.add("options-2-active");

    // Create scramble interface
    container.innerHTML = `
                    <div class="letter-scramble-container" style="position: relative;">
                        <div class="scramble-instruction">Click letters below to place them in the word above</div>
                        
                        <div class="word-display" id="wordDisplay"></div>
                        
                        <div class="tiles-container">
                            <div class="tiles-label">Available Letters:</div>
                            <div class="letter-tiles-slots" id="letterTilesSlots"></div>
                        </div>
                    </div>
                `;

    // Initialize elements
    this.wordDisplay = document.getElementById("wordDisplay");
    this.letterTilesSlots = document.getElementById("letterTilesSlots");

    // Start the game
    this.renderWord();
    this.renderLetterTileSlots();

    // Initially disable check button until all letters are placed
    document.getElementById("checkButton").disabled = true;
  }

  renderWord() {
    this.wordDisplay.innerHTML = "";

    for (let i = 0; i < this.currentWord.length; i++) {
      const slot = document.createElement("div");
      slot.className = "letter-slot";
      slot.dataset.position = i;
      slot.textContent = this.playerAnswer[i] || "";

      if (this.playerAnswer[i]) {
        slot.classList.add("filled");
      }

      if (this.selectedSlotIndex === i) {
        slot.classList.add("selected");
      }

      // Click to select slot or remove letter
      slot.addEventListener("click", () => {
        if (!this.isChecked) {
          if (this.playerAnswer[i]) {
            // If slot has a letter, remove it
            this.removeLetter(i);
          } else {
            // If slot is empty, select it
            this.selectSlot(i);
          }
        }
      });

      this.wordDisplay.appendChild(slot);
    }

    // Update selected option for checking
    this.selectedOption = this.playerAnswer.join("");
  }

  selectSlot(slotIndex) {
    this.selectedSlotIndex = slotIndex;
    this.renderWord(); // Re-render to show selection
  }

  renderLetterTileSlots() {
    this.letterTilesSlots.innerHTML = "";

    // Create shuffled letters
    const letters = this.currentWord.split("").sort(() => Math.random() - 0.5);
    this.letterTileSlots = new Array(letters.length).fill(null);

    letters.forEach((letter, index) => {
      const tileSlot = document.createElement("div");
      tileSlot.className = "tile-slot has-letter";
      tileSlot.dataset.slotIndex = index;

      const tile = document.createElement("div");
      tile.className = "click-letter-tile";
      tile.textContent = letter;
      tile.dataset.letter = letter;
      tile.dataset.originalSlot = index;

      tile.addEventListener("click", () => {
        if (!this.isChecked) {
          this.placeLetter(letter, index);
        }
      });

      tileSlot.appendChild(tile);
      this.letterTilesSlots.appendChild(tileSlot);
      this.letterTileSlots[index] = letter;
    });
  }

  placeLetter(letter, originalSlotIndex) {
    let targetPosition;

    if (this.selectedSlotIndex !== null && !this.playerAnswer[this.selectedSlotIndex]) {
      // Place in selected slot if it's empty
      targetPosition = this.selectedSlotIndex;
    } else {
      // Find next empty position if no slot selected or selected slot is filled
      targetPosition = this.playerAnswer.findIndex((pos) => pos === "");
    }

    if (targetPosition !== -1) {
      // If target position already has a letter, return it first
      if (this.playerAnswer[targetPosition]) {
        this.removeLetter(targetPosition);
      }

      // Place letter in target position
      this.playerAnswer[targetPosition] = letter;
      this.usedTileSlots[targetPosition] = originalSlotIndex;

      // Remove letter from tile slot
      const tileSlot = this.letterTilesSlots.children[originalSlotIndex];
      const tile = tileSlot.querySelector(".click-letter-tile");
      if (tile) {
        tile.remove();
        tileSlot.classList.remove("has-letter");
        this.letterTileSlots[originalSlotIndex] = null;
      }

      // Clear selection after placing
      this.selectedSlotIndex = null;

      this.renderWord();
      this.checkIfCanSubmit();
    }
  }

  removeLetter(wordPosition) {
    const letter = this.playerAnswer[wordPosition];
    const originalSlotIndex = this.usedTileSlots[wordPosition];

    if (letter && originalSlotIndex !== null) {
      // Remove letter from this specific position
      this.playerAnswer[wordPosition] = "";
      this.usedTileSlots[wordPosition] = null;

      // Clear selection if this slot was selected
      if (this.selectedSlotIndex === wordPosition) {
        this.selectedSlotIndex = null;
      }

      // Return letter to its original slot
      this.returnLetterToSlot(letter, originalSlotIndex);

      this.renderWord();
      this.checkIfCanSubmit();
    }
  }

  disableLetterTiles() {
    // Disable all letter tiles to prevent further interaction
    const letterTiles = document.querySelectorAll(".click-letter-tile");
    letterTiles.forEach((tile) => {
      tile.style.pointerEvents = "none";
      tile.style.opacity = "0.6";
    });

    // Disable word slots as well
    const wordSlots = document.querySelectorAll(".word-slot");
    wordSlots.forEach((slot) => {
      slot.style.pointerEvents = "none";
    });
  }

  returnLetterToSlot(letter, originalSlotIndex) {
    const tileSlot = this.letterTilesSlots.children[originalSlotIndex];

    if (tileSlot && !this.letterTileSlots[originalSlotIndex]) {
      const tile = document.createElement("div");
      tile.className = "click-letter-tile";
      tile.textContent = letter;
      tile.dataset.letter = letter;
      tile.dataset.originalSlot = originalSlotIndex;

      tile.addEventListener("click", () => {
        if (!this.isChecked) {
          this.placeLetter(letter, originalSlotIndex);
        }
      });

      tileSlot.appendChild(tile);
      tileSlot.classList.add("has-letter");
      this.letterTileSlots[originalSlotIndex] = letter;
    }
  }

  checkIfCanSubmit() {
    const isComplete = this.playerAnswer.every((letter) => letter !== "");
    const checkButton = document.getElementById("checkButton");
    if (checkButton) {
      checkButton.disabled = !isComplete;
    }
  }

  updateScrambleAttemptDisplay(userAnswer) {
    const attemptBox = document.getElementById(`scrambleAttempt${this.letterScrambleAttempt}`);
    if (attemptBox) {
      attemptBox.textContent = userAnswer.toUpperCase();
      attemptBox.classList.add("filled");
    }
  }

  flagScrambleAttemptBox(attemptNumber, state) {
    const attemptBox = document.getElementById(`scrambleAttempt${attemptNumber}`);
    if (attemptBox) {
      attemptBox.classList.remove("correct", "wrong", "active");
      if (state === "correct") {
        attemptBox.classList.add("correct");
      } else if (state === "wrong") {
        attemptBox.classList.add("wrong");
      }
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  displayWordParts(word) {
    const question = this.allQuestions[this.currentQuestionIndex];

    // Set question type
    if (this.isPracticeMode) {
      document.getElementById("questionType").textContent = "PRACTICE MODE - BUILD THE WORD FROM PARTS";
    } else {
      document.getElementById("questionType").textContent = "BUILD THE WORD FROM PARTS";
    }

    // Hide input container and show options container
    document.getElementById("inputContainer").style.display = "none";
    const optionsContainer = document.getElementById("optionsContainer");
    optionsContainer.style.display = "block";
    optionsContainer.className = "options-container";

    // Reset word parts game state
    this.wordPartsAttempt = 1;
    this.wordPartsChosen = [];

    // Get word parts data
    const wordData = this.wordPartsData[word];
    if (!wordData) {
      console.error("No word parts data found for:", word);
      return;
    }

    // Initialize chosen array
    this.wordPartsChosen = new Array(wordData.parts.length).fill(null);

    // Create word parts interface
    optionsContainer.innerHTML = `
                    <div class="word-parts-container">
                        <div class="combined-word-boxes">
                            <div class="combined-word-box">
                                <div class="attempt-label">Your Answer</div>
                                <div id="combinedWordInput1" class="combined-word-input active">___</div>
                            </div>
                        </div>
                        
                        <div class="word-parts-lots" id="wordPartsLots"></div>
                    </div>
                `;

    // Build the word parts lots
    this.buildWordPartsLots(wordData);

    // Disable check button initially
    document.getElementById("checkButton").disabled = false;
  }

  buildWordPartsLots(wordData) {
    const lotsContainer = document.getElementById("wordPartsLots");
    lotsContainer.innerHTML = "";

    wordData.parts.forEach((part, lotIndex) => {
      const lotDiv = document.createElement("div");
      lotDiv.className = "word-part-lot";
      lotDiv.innerHTML = `
                        <div class="lot-title">Part ${lotIndex + 1}</div>
                        <div class="part-options"></div>
                    `;

      const optionsDiv = lotDiv.querySelector(".part-options");

      wordData.options[lotIndex].forEach((option, optionIndex) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "part-option";
        optionDiv.textContent = option.toUpperCase();

        // Add both click and touch events for mobile/tablet support
        optionDiv.addEventListener("click", () => this.selectWordPart(lotIndex, optionIndex, option));
        optionDiv.addEventListener("touchend", (e) => {
          e.preventDefault(); // Prevent double-firing with click
          this.selectWordPart(lotIndex, optionIndex, option);
        });

        // Ensure touch events work properly on mobile
        optionDiv.style.touchAction = "manipulation";

        optionsDiv.appendChild(optionDiv);
      });

      lotsContainer.appendChild(lotDiv);
    });
  }

  selectWordPart(lotIndex, optionIndex, value) {
    // Prevent clicking after both attempts are completed
    if (this.wordPartsAttempt > this.wordPartsMaxAttempts) {
      console.log("Word parts selection disabled: All attempts completed");
      return;
    }

    // Remove previous selection from this lot
    const lotDiv = document.querySelectorAll(".word-part-lot")[lotIndex];
    const options = lotDiv.querySelectorAll(".part-option");
    options.forEach((option) => option.classList.remove("selected"));

    // Select the clicked option
    options[optionIndex].classList.add("selected");

    // Update chosen array
    this.wordPartsChosen[lotIndex] = value;

    // Update the combined word display
    this.updateCombinedWordDisplay();
  }

  updateCombinedWordDisplay() {
    const attemptNumber = this.wordPartsAttempt;
    const combinedInput = document.getElementById(`combinedWordInput${attemptNumber}`);
    const combined = this.wordPartsChosen.map((part) => (part ? part.toUpperCase() : "___")).join("");
    combinedInput.textContent = combined;

    // Add filled class if all parts are selected
    if (!this.wordPartsChosen.includes(null)) {
      combinedInput.classList.add("filled");
    } else {
      combinedInput.classList.remove("filled");
    }
  }

  flagCombinedWordBox(state) {
    const attemptNumber = this.wordPartsAttempt;
    const combinedInput = document.getElementById(`combinedWordInput${attemptNumber}`);
    combinedInput.classList.remove("correct", "wrong");
    if (state === "correct") {
      combinedInput.classList.add("correct");
    } else if (state === "wrong") {
      combinedInput.classList.add("wrong");
    }
  }

  markSelectedWordParts(correctParts) {
    // Apply color coding to user selected word parts and disable further clicking
    console.log("Marking selected word parts with color coding (single attempt)");
    console.log("User selected parts:", this.wordPartsChosen);
    console.log("Correct parts:", correctParts);

    document.querySelectorAll(".word-part-lot").forEach((lot, lotIndex) => {
      lot.querySelectorAll(".part-option").forEach((option) => {
        // Clear previous feedback classes
        option.classList.remove("correct", "wrong");

        if (option.classList.contains("selected")) {
          const userSelection = option.textContent.toLowerCase().trim();
          const correctPart = correctParts[lotIndex].toLowerCase().trim();
          const isCorrect = userSelection === correctPart;
          const feedbackClass = isCorrect ? "correct" : "wrong";
          option.classList.add(feedbackClass);
          console.log(
            `Part ${lotIndex + 1}: "${option.textContent}" is ${isCorrect ? "CORRECT (green)" : "WRONG (red)"}`
          );
        }

        // Disable clicking after single attempt
        option.style.pointerEvents = "none";
        option.style.opacity = "0.6";
        option.style.cursor = "not-allowed";
      });
    });

    // Increment attempt counter to prevent further clicking
    this.wordPartsAttempt++;

    // Also update the combined word display to show partial correctness
    this.updateCombinedWordDisplay();
  }

  updateCombinedWordDisplay() {
    // Update the combined word display to reflect the current selection with color coding
    const currentAttemptId = `combinedWordInput${this.wordPartsAttempt}`;
    const combinedInput = document.getElementById(currentAttemptId);

    if (combinedInput && this.wordPartsChosen) {
      // Create a visual representation of the combined word with color coding
      const combinedWord = this.wordPartsChosen.map((part) => part || "___").join("");
      combinedInput.textContent = combinedWord.toUpperCase();

      // Add visual indicator that this shows partial feedback
      combinedInput.style.fontWeight = "bold";
    }
  }

  highlightCorrectWordParts(correctParts) {
    // Show correct answers and disable further clicking
    document.querySelectorAll(".word-part-lot").forEach((lot, lotIndex) => {
      lot.querySelectorAll(".part-option").forEach((option) => {
        // Clear previous feedback classes but keep selected state
        option.classList.remove("wrong");

        if (option.classList.contains("selected")) {
          // If this option was selected, color it based on correctness
          const userSelection = option.textContent.toLowerCase().trim();
          const correctPart = correctParts[lotIndex].toLowerCase().trim();
          const isCorrect = userSelection === correctPart;

          if (isCorrect) {
            option.classList.add("correct");
            console.log(`Selected option "${option.textContent}" is CORRECT (green)`);
          } else {
            option.classList.add("wrong");
            console.log(`Selected option "${option.textContent}" is WRONG (red)`);
          }
        } else if (option.textContent.toLowerCase().trim() === correctParts[lotIndex].toLowerCase().trim()) {
          // Show correct answer for unselected options (lighter green or different style)
          option.classList.add("correct");
          option.style.opacity = "0.7"; // Lighter to distinguish from selected correct
        }

        // Disable clicking after showing results
        option.style.pointerEvents = "none";
        option.style.cursor = "not-allowed";
      });
    });

    // Increment attempt counter to prevent further clicking
    this.wordPartsAttempt++;
  }

  displayCorrectWordGame(word) {
    // Remove 2-option game class if present
    document.querySelector(".app-container").classList.remove("options-2-active");

    document.getElementById("questionType").textContent = "CHOOSE THE CORRECT SPELLING TO COMPLETE THE SENTENCE";
    document.getElementById("inputContainer").style.display = "none";
    document.getElementById("optionsContainer").style.display = "block";

    // Reset selected option and disable check button initially
    this.selectedOption = null;
    const checkButton = document.getElementById("checkButton");
    if (checkButton) {
      checkButton.disabled = true;
    }

    // Use per-user sentence templates
    const sentenceTemplates = this.sentenceTemplates;

    // Use per-user word distractors
    const wordDistractors = this.wordDistractors;

    // Select a random sentence template
    const templates = sentenceTemplates[word.toLowerCase()] || [`The word is ____________.`];
    const selectedSentence = templates[Math.floor(Math.random() * templates.length)];

    // Create sentence display
    const optionsContainer = document.getElementById("optionsContainer");
    optionsContainer.innerHTML = `
                    <div class="sentence-question" style="font-size: 18px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #58cc02;">
                        ${selectedSentence}
                    </div>
                `;

    // Set options container class to match 4-option MCQ style
    optionsContainer.className = "options-container options-4";

    // Create options (1 correct + 3 distractors)
    const options = [word]; // Correct answer
    const distractors = wordDistractors[word.toLowerCase()] || [];

    // Add 3 random distractors
    const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3 && i < shuffledDistractors.length; i++) {
      options.push(shuffledDistractors[i]);
    }

    // Shuffle all options
    const shuffledOptions = options.sort(() => Math.random() - 0.5);

    // Create two rows with two options each (matching 4-option MCQ style)
    const row1 = document.createElement("div");
    row1.className = "options-row";

    const row2 = document.createElement("div");
    row2.className = "options-row";

    // Add options to rows
    shuffledOptions.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "option-btn";
      button.textContent = option.toUpperCase(); // Convert to uppercase
      button.style.flex = "1";

      // Store the game type as a data attribute to identify in selectOption
      button.dataset.gameType = "correct-word";

      button.addEventListener("click", () => this.selectOption(button, option));

      // First two options in first row, last two in second row
      if (index < 2) {
        row1.appendChild(button);
      } else {
        row2.appendChild(button);
      }
    });

    optionsContainer.appendChild(row1);
    optionsContainer.appendChild(row2);
  }

  shuffleLetters() {
    // Play option click sound
    this.playOptionClickSound();

    // Re-render tiles with new shuffle
    this.renderLetterTileSlots();
  }

  resetLetters() {
    // Play option click sound
    this.playOptionClickSound();

    // Reset the game state
    this.playerAnswer = new Array(this.currentWord.length).fill("");
    this.usedTileSlots = new Array(this.currentWord.length).fill(null);
    this.selectedSlotIndex = null;
    this.selectedOption = "";

    // Re-render both word and tiles
    this.renderWord();
    this.renderLetterTileSlots();

    // Disable check button
    document.getElementById("checkButton").disabled = true;
  }

  resetLetterTiles() {
    // Reset to original state for second attempt
    this.resetLetters();

    // Reset selection
    this.selectedOption = "";

    // Update the current attempt display to show placeholder
    this.updateScrambleAttemptDisplay("");

    // Disable check button until user makes a selection
    document.getElementById("checkButton").disabled = true;
  }

  selectOption(button, option) {
    // Play option click sound
    this.playOptionClickSound();

    // Remove previous selections
    document.querySelectorAll(".option-btn").forEach((btn) => {
      btn.classList.remove("selected");
    });

    // Toggle selection if clicking the same option
    if (this.selectedOption === option) {
      this.selectedOption = null;
      button.classList.remove("selected");
      document.getElementById("checkButton").disabled = true;
      return;
    }

    // Select current option
    button.classList.add("selected");
    this.selectedOption = option;

    // Enable check button only if a valid option is selected
    document.getElementById("checkButton").disabled = !this.selectedOption;

    // Also update the check button state through the main method
    // in case there are other conditions to consider
    this.updateCheckButtonState();
  }

  // Play sound when option is clicked
  playOptionClickSound() {
    const sound = document.getElementById("optionClickSound");
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Sound play error:", e));
  }

  async checkAnswer() {
    if (this.isAnswered) return;
    pushStartedEvent(this.usercode);

    // Clear any existing feedback when user clicks check button
    document.getElementById("feedback").classList.remove("show");

    const question = this.allQuestions[this.currentQuestionIndex];
    let userAnswer;
    let isCorrect;

    if (["mcq", "2-option", "4-option"].includes(question.type)) {
      // For multiple-choice questions, ensure an option is selected
      if (this.selectedOption === null || this.selectedOption === undefined) {
        this.showFeedback(false, "Please select an option.");
        return;
      }

      userAnswer = this.selectedOption;
      isCorrect = userAnswer.toLowerCase() === question.word.toLowerCase();

      // Highlight correct and incorrect answers
      document.querySelectorAll(".option-btn").forEach((btn) => {
        const btnText = btn.textContent.toLowerCase();
        if (btnText === question.word.toLowerCase()) {
          btn.classList.add("correct");
        } else if (btn.classList.contains("selected") && !isCorrect) {
          btn.classList.add("incorrect");
        }
      });
      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }
    } else if (question.type === "typing") {
      userAnswer = this.typedWord.trim().toLowerCase();
      isCorrect = userAnswer === question.word.toLowerCase();

      // Track check button analytics for typing games
      if (this.typingAnalytics) {
        const timeTaken = Math.round(getTodayDateNow() / 1000) - this.typingAnalytics.startTime;
        this.typingAnalytics.check.push({
          word: this.typedWord,
          timeTaken: timeTaken,
          isCorrect: isCorrect,
          isFirstAttempt: this.currentAttempt === 1,
        });
      }

      // Store this attempt
      this.previousAttempts.push({
        word: this.typedWord,
        isCorrect: isCorrect,
        attempt: this.currentAttempt,
      });

      // Always update keyboard colors after each attempt (they persist)
      this.updateKeyboardColors(userAnswer, question.word.toLowerCase());

      // Always color the word boxes after each attempt
      this.colorWordBoxes(isCorrect);

      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }

      if (!isCorrect) {
        if (this.currentAttempt < this.maxAttempts) {
          // Show first attempt and prepare for second attempt
          this.showPreviousAttempt();
          this.prepareNextAttempt();
          return;
        } else {
          // Show correct answer after second failed attempt
          this.showCorrectAnswerWithHighlights(question.word, this.typedWord);
        }
      }
    } else if (question.type === "word-parts") {
      // Word parts game checking logic (single attempt)
      if (this.wordPartsChosen.includes(null)) {
        this.showFeedback(false, "Please select from every part.");
        return;
      }

      const wordData = this.wordPartsData[question.word];
      const correctParts = wordData.parts;
      isCorrect = correctParts.every((part, index) => part === this.wordPartsChosen[index]);

      if (isCorrect) {
        // Mark correct parts and disable further clicking
        this.flagCombinedWordBox("correct");
        this.highlightCorrectWordParts(correctParts);
        userAnswer = correctParts.join("");
      } else {
        // Single attempt failed - show selected parts with color feedback
        this.flagCombinedWordBox("wrong");
        this.markSelectedWordParts(correctParts);
        userAnswer = this.wordPartsChosen.join("");
      }
    } else if (question.type === "full-typing") {
      userAnswer = this.typedWord.trim().toLowerCase();
      isCorrect = userAnswer === question.word.toLowerCase();

      // Clear the timer when answer is checked
      if (this.fullTypingTimer) {
        clearInterval(this.fullTypingTimer);
      }

      // Remove timer display from DOM
      const timerDisplay = document.getElementById("fullTypingTimer");
      if (timerDisplay) {
        timerDisplay.remove();
      }

      // Track check button analytics for typing games
      if (this.typingAnalytics) {
        const timeTaken = Math.round(Date.now() / 1000) - this.typingAnalytics.startTime;
        this.typingAnalytics.check.push({
          word: this.typedWord,
          timeTaken: timeTaken,
          isCorrect: isCorrect,
        });
      }

      // Store this attempt (single attempt only)
      this.previousAttempts.push({
        word: this.typedWord,
        isCorrect: isCorrect,
        attempt: 1,
      });

      // Update keyboard colors
      this.updateKeyboardColors(userAnswer, question.word.toLowerCase());

      // Update the long dash display to show result
      const longDash = document.getElementById("longDash");
      if (longDash) {
        longDash.textContent = this.typedWord.toUpperCase();
        longDash.style.color = isCorrect ? "#28a745" : "#dc3545";
      }

      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }

      // Full typing has no second attempts - always proceed to next question
      if (!isCorrect) {
        this.showFeedback(false, `Incorrect. The correct answer is "${question.word.toUpperCase()}"`);
      }

      // Show continue button
      document.getElementById("checkButton").style.display = "none";
      document.getElementById("continueButton").style.display = "inline-block";
    } else if (question.type === "letter-scramble") {
      // Letter scramble game checking logic (single attempt)
      userAnswer = this.selectedOption;
      isCorrect = userAnswer && userAnswer.toLowerCase() === question.word.toLowerCase();

      // Store this attempt
      this.letterScrambleAnswers[0] = userAnswer;

      // Disable letter tiles after attempt
      this.disableLetterTiles();
      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }
    } else if (question.type === "fillups") {
      userAnswer = this.typedWord.trim().toLowerCase();
      isCorrect = userAnswer === question.word.toLowerCase();

      // Store this attempt
      this.previousAttempts.push({
        word: this.typedWord,
        isCorrect: isCorrect,
        attempt: this.currentAttempt,
      });

      // Always color the word boxes after each attempt
      this.colorWordBoxes(isCorrect);
      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }
    } else if (question.type === "words-meaning") {
      // Words-meaning game checking logic
      if (this.selectedOption === null || this.selectedOption === undefined) {
        this.showFeedback(false, "Please select an option.");
        return;
      }

      userAnswer = this.selectedOption;
      const wordData = this.wordMeanings[question.word];
      isCorrect = userAnswer === wordData.correct;

      // Show correct answer indicator and color the options
      document.querySelectorAll(".sticky-note-option").forEach((note) => {
        const noteText = note.querySelector(".sticky-note-text").textContent;
        // Extract option text more reliably by removing checkmark and prefix
        const optionText = noteText
          .replace(/\s*✅\s*$/, "")
          .substring(4)
          .trim();

        if (optionText === wordData.correct) {
          note.classList.add("correct");
          // Don't show the checkmark - just highlight in green
        } else if (note.classList.contains("selected") && !isCorrect) {
          note.classList.add("incorrect");
        }
      });
      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }
    } else if (question.type === "context-choice") {
      // Context-choice game checking logic
      if (this.selectedOption === null || this.selectedOption === undefined) {
        this.showFeedback(false, "Please select an option.");
        return;
      }

      userAnswer = this.selectedOption;
      const contextData = this.contextChoiceData[question.word];
      isCorrect = userAnswer === contextData.correct;

      // Show correct answer indicator and color the options
      document.querySelectorAll(".context-option-btn").forEach((btn) => {
        const btnText = btn.textContent;
        // Extract option text more reliably by removing checkmark and prefix
        const optionText = btnText
          .replace(/\s*✅\s*$/, "")
          .substring(4)
          .trim();

        if (optionText === contextData.correct) {
          btn.classList.add("correct");
          // Don't show the checkmark - just highlight in green
        } else if (btn.classList.contains("selected") && !isCorrect) {
          btn.classList.add("incorrect");
        }
      });
      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }
    } else if (question.type === "correct-sentence") {
      // Correct-sentence game checking logic
      if (this.selectedOption === null || this.selectedOption === undefined) {
        this.showFeedback(false, "Please select an option.");
        return;
      }

      userAnswer = this.selectedOption;
      const sentenceData = this.correctSentenceData[question.word];
      isCorrect = userAnswer === sentenceData.correct;

      // Show correct answer indicator and color the options
      document.querySelectorAll(".sentence-option-btn").forEach((btn) => {
        const btnText = btn.textContent;
        // Extract sentence text more reliably by removing checkmark and prefix
        const sentenceText = btnText
          .replace(/\s*✅\s*$/, "")
          .substring(4)
          .trim();

        if (sentenceText === sentenceData.correct) {
          btn.classList.add("correct");
          // Don't show the checkmark - just highlight in green
        } else if (btn.classList.contains("selected") && !isCorrect) {
          btn.classList.add("incorrect");
        }
      });
      if (!isCorrect) {
        updateEmojiInProgressBar("by_rating/1");
      } else {
        updateEmojiInProgressBar("by_rating/4");
      }
    } else {
      userAnswer = this.selectedOption;
      isCorrect = userAnswer && userAnswer.toLowerCase() === question.word.toLowerCase();

      // Color the options
      document.querySelectorAll(".option-btn").forEach((btn) => {
        const btnText = btn.textContent.toLowerCase();
        if (btnText === question.word.toLowerCase()) {
          btn.classList.add("correct");
        } else if (btn.classList.contains("selected") && !isCorrect) {
          btn.classList.add("incorrect");
        }
      });
    }

    this.isAnswered = true;
    this.stats.total++;

    // Calculate and submit analytics for typing games BEFORE animation
    if ((question.type === "typing" || question.type === "full-typing") && this.typingAnalytics) {
      this.typingAnalytics.endTime = Math.round(getTodayDateNow() / 1000);
    }

    if (isCorrect) {
      this.stats.correct++;
      this.consecutiveCorrect++; // Track consecutive correct answers

      // Show thunder animation immediately when reaching 3, 5, or 10 in a row
      if (this.consecutiveCorrect === 3 || this.consecutiveCorrect === 5 || this.consecutiveCorrect === 10) {
        this.pendingStreakCelebration = this.consecutiveCorrect; // Store for later Lottie celebration
        this.showRiveThunderAnimation();
      }

      // Add chain reaction effect for letter-scramble and typing games
      if (question.type === "letter-scramble" || question.type === "typing" || question.type === "full-typing") {
        this.playChainReactionAnimation();
      }

      this.playCorrectSound(); // Play success sound
      this.showFeedback(true, "Correct! Well done!");
    } else {
      this.consecutiveCorrect = 0; // Reset consecutive counter on incorrect answer
      this.playIncorrectSound(); // Play error sound

      // For letter scramble games, show correct answer after single attempt
      if (question.type === "letter-scramble") {
        this.showFeedback(false, `Incorrect. The correct answer is "${question.word.toUpperCase()}"`);
      } else if (question.type === "words-meaning") {
        // For words-meaning games, show the correct meaning
        const wordData = this.wordMeanings[question.word];
        this.showFeedback(false, `Incorrect. The correct answer is "${wordData.correct}"`);
      } else if (question.type === "context-choice") {
        // For context-choice games, show the correct phrase
        const contextData = this.contextChoiceData[question.word];
        this.showFeedback(false, `Incorrect. The correct answer is "${contextData.correct}"`);
      } else if (question.type === "correct-sentence") {
        // For correct-sentence games, show the correct sentence
        const sentenceData = this.correctSentenceData[question.word];
        this.showFeedback(false, `Incorrect. The correct answer is "${sentenceData.correct}"`);
      } else if (question.type !== "letter-scramble") {
        // For other game types, show correct answer immediately
        this.showFeedback(false, `Incorrect. The correct answer is "${question.word.toUpperCase()}"`);
      }
      // Note: For letter scramble first attempt, feedback is already shown in the letter-scramble block above

      // Track failed words - any word that fails in any game goes to review
      if (!this.isPracticeMode) {
        // Add to failed words tracker for review system
        this.failedWordsTracker.add(question.word);
        // Just track for learning mode, don't add questions yet
        if (!this.stats.wordsToLearn.includes(question.word)) {
          this.stats.wordsToLearn.push(question.word);
        }
      }

      // Removed code that adds MCQs for new words when typing answers are wrong
      // Now strictly following the predefined sequence
    }

    // Show continue button after single attempt (all game types)
    document.getElementById("checkButton").style.display = "none";
    document.getElementById("continueButton").style.display = "inline-block";
  }

  showPreviousAttempt() {
    const lastAttempt = this.previousAttempts[this.previousAttempts.length - 1];
    this.createPreviousAttemptBoxes(lastAttempt);
    document.getElementById("previousAttempt").style.display = "block";
  }

  showCorrectAnswerWithHighlights(correctWord, userAttempt) {
    const correctBoxes = document.getElementById("correctAnswerBoxes");
    correctBoxes.innerHTML = "";

    // Get the letter box size from the previous attempt
    const previousBoxes = document.querySelectorAll("#previousWordBoxes .letter-box");
    const boxSize = previousBoxes.length > 0 ? window.getComputedStyle(previousBoxes[0]).width : "40px";

    for (let i = 0; i < correctWord.length; i++) {
      const letterBox = document.createElement("div");
      letterBox.className = "letter-box";

      // Match the size of previous attempt boxes
      letterBox.style.width = boxSize;
      letterBox.style.height = boxSize;
      letterBox.style.lineHeight = `calc(${boxSize} - 4px)`; // Account for border

      // Check if this position was incorrect in the user's attempt
      const userChar = userAttempt[i] || "";
      const isIncorrect = userChar !== correctWord[i] && userChar !== "";

      if (isIncorrect) {
        letterBox.classList.add("incorrect-letter");
        letterBox.title = `You wrote: ${userChar || "empty"}`;
      }

      letterBox.textContent = correctWord[i].toUpperCase();
      correctBoxes.appendChild(letterBox);
    }

    // Show the correct answer section
    document.getElementById("correctAnswerSection").style.display = "block";

    // Hide any feedback that might show "INCORRECT" message
    this.hideFeedback();
  }

  prepareNextAttempt() {
    this.currentAttempt++;
    this.typedWord = "";

    // Reset current attempt UI
    this.resetInputState();
    this.createWordBoxes();
    this.updateWordBoxes();

    // Show feedback for incorrect attempt
    this.showFeedback(false, `Try again! Attempt ${this.currentAttempt} of ${this.maxAttempts}`);

    // Reset buttons
    document.getElementById("checkButton").style.display = "inline-block";
    document.getElementById("continueButton").style.display = "none";

    // Clear feedback after showing it briefly
    setTimeout(() => {
      document.getElementById("feedback").classList.remove("show");
    }, 2000);
  }

  colorWordBoxes(isCorrect) {
    const question = this.allQuestions[this.currentQuestionIndex];
    const correctWord = question.word.toLowerCase();
    const userWord = this.typedWord.toLowerCase();

    console.log("Coloring word boxes:", { userWord, correctWord, isCorrect });

    // Clear existing colors
    for (let i = 0; i < this.maxLength; i++) {
      const box = document.getElementById(`box-${i}`);
      if (box) {
        box.classList.remove("current", "correct", "correct-position", "wrong-position", "incorrect");
      }
    }

    if (isCorrect) {
      // If completely correct, mark all as correct
      for (let i = 0; i < userWord.length; i++) {
        const box = document.getElementById(`box-${i}`);
        if (box) {
          box.classList.add("correct");
        }
      }
    } else {
      // Use the same two-pass algorithm as keyboard coloring
      // Create a map to track which letters in the target word have been matched
      const letterMap = {};
      for (const letter of correctWord) {
        letterMap[letter] = (letterMap[letter] || 0) + 1;
      }

      // First pass: mark correct letters (green)
      for (let i = 0; i < correctWord.length; i++) {
        const letterInGuess = userWord[i];
        const letterInWord = correctWord[i];

        if (letterInGuess === letterInWord) {
          const box = document.getElementById(`box-${i}`);
          if (box) {
            box.classList.add("correct-position");
            // Decrement the count for this letter
            letterMap[letterInGuess]--;
          }
        }
      }

      // Second pass: mark present or absent letters
      for (let i = 0; i < correctWord.length; i++) {
        const letterInGuess = userWord[i];
        const letterInWord = correctWord[i];
        const box = document.getElementById(`box-${i}`);

        // Skip letters already marked as correct
        if (letterInGuess === letterInWord) continue;

        if (box) {
          if (correctWord.includes(letterInGuess) && letterMap[letterInGuess] > 0) {
            box.classList.add("wrong-position");
            // Decrement the count for this letter
            letterMap[letterInGuess]--;
          } else {
            box.classList.add("incorrect");
          }
        }
      }
    }

    // Force a repaint to ensure colors show up
    setTimeout(() => {
      for (let i = 0; i < this.maxLength; i++) {
        const box = document.getElementById(`box-${i}`);
        if (box && i < userWord.length) {
          // Force style recalculation
          box.offsetHeight;
        }
      }
    }, 100);
  }

  resetKeyboardColors() {
    // Reset all keyboard keys to their default state
    document.querySelectorAll(".key.letter").forEach((key) => {
      key.classList.remove("correct", "present", "absent");
    });
  }

  updateKeyStatus(letter, status) {
    const key = document.querySelector(`[data-key="${letter.toLowerCase()}"]`);
    if (!key) return;

    // Remove existing status classes
    key.classList.remove("correct", "present", "absent");

    // Don't downgrade a key's status
    if (key.classList.contains("correct")) return;
    if (key.classList.contains("present") && status === "absent") return;

    // Add new status class
    key.classList.add(status);
  }

  updateKeyboardColors(userWord, correctWord) {
    // Handle empty or undefined userWord
    if (!userWord || !correctWord) return;

    // Create a map to track which letters in the target word have been matched
    const letterMap = {};
    for (const letter of correctWord) {
      letterMap[letter] = (letterMap[letter] || 0) + 1;
    }

    // Use the length of the user's word, not the correct word
    const maxLength = Math.max(userWord.length, correctWord.length);

    // First pass: mark correct letters
    for (let i = 0; i < maxLength; i++) {
      const letterInGuess = userWord[i];
      const letterInWord = correctWord[i];

      // Skip if letter doesn't exist in user's word
      if (!letterInGuess) continue;

      if (letterInGuess === letterInWord) {
        // Mark this key on the keyboard
        this.updateKeyStatus(letterInGuess, "correct");
        // Decrement the count for this letter
        letterMap[letterInGuess]--;
      }
    }

    // Second pass: mark present or absent letters
    for (let i = 0; i < maxLength; i++) {
      const letterInGuess = userWord[i];
      const letterInWord = correctWord[i];

      // Skip if letter doesn't exist in user's word
      if (!letterInGuess) continue;

      // Skip letters already marked as correct
      if (letterInGuess === letterInWord) continue;

      if (correctWord.includes(letterInGuess) && letterMap[letterInGuess] > 0) {
        this.updateKeyStatus(letterInGuess, "present");
        // Decrement the count for this letter
        letterMap[letterInGuess]--;
      } else {
        this.updateKeyStatus(letterInGuess, "absent");
      }
    }
  }

  addMCQsForNewWord(word) {
    // Add 4-option MCQ
    const mcq4 = {
      word: word,
      type: "4-option",
      category: "new",
    };

    // Add letter scramble
    const mcq2 = {
      word: word,
      type: "letter-scramble",
      category: "new",
    };

    // Insert after current question
    this.allQuestions.splice(this.currentQuestionIndex + 1, 0, mcq4, mcq2);
  }

  startPracticeMode() {
    // Collect all failed words for practice
    const allFailedWords = [...this.stats.failedWords];

    if (allFailedWords.length === 0) {
      alert("No words to practice!");
      return;
    }

    // Create practice questions (4-option MCQs only)
    this.practiceQuestions = allFailedWords.map((word) => ({
      word: word,
      type: "4-option",
      category: "practice",
    }));

    // Reset for practice mode
    this.isPracticeMode = true;
    this.currentQuestionIndex = 0;
    this.stats = {
      correct: 0,
      total: 0,
      wordsToLearn: [],
      failedWords: this.stats.failedWords,
    };

    // Reinitialize questions for practice mode
    this.initializeQuestions();

    // Show game content and hide completion screen
    document.getElementById("gameContent").style.display = "block";
    document.getElementById("completionScreen").style.display = "none";

    // Start the practice session
    this.displayCurrentQuestion();
  }

  startReviewMode() {
    const allFailedWords = [...this.stats.failedWords];

    if (allFailedWords.length === 0) {
      alert("No wrong words to review yet! Get some questions wrong first.");
      return;
    }

    // Save current game state
    this.savedGameState = {
      allQuestions: [...this.allQuestions],
      currentQuestionIndex: this.currentQuestionIndex,
      isPracticeMode: this.isPracticeMode,
      stats: { ...this.stats },
    };

    // Start practice mode with failed words
    this.isPracticeMode = true;
    this.practiceQuestions = allFailedWords.map((word) => ({
      word: word,
      type: "typing", // Changed from '4-option' to 'typing'
      category: "review",
    }));

    this.allQuestions = [...this.practiceQuestions];
    this.currentQuestionIndex = 0;

    // Reset practice stats (but keep original stats)
    const originalStats = { ...this.stats };
    this.stats.correct = 0;
    this.stats.total = 0;
    this.originalStats = originalStats;

    this.displayCurrentQuestion();
  }

  displayFillupsQuestion() {
    // Remove 2-option game class if present
    document.querySelector(".app-container").classList.remove("options-2-active");

    document.getElementById("questionType").textContent = "FILL IN THE BLANKS";
    document.getElementById("inputContainer").style.display = "block";
    document.getElementById("optionsContainer").style.display = "none";
    // Setup word boxes
    const question = this.allQuestions[this.currentQuestionIndex];
    const word = question.word;
    this.maxLength = word.length;

    // Use predefined blank positions for exact control
    this.blankPositions = this.fillupsBlankPositions[word] || [];

    // Fallback to random positions if word not found in predefined list
    if (this.blankPositions.length === 0) {
      console.warn(`No predefined blank positions found for word: ${word}. Using fallback.`);
      // Calculate number of blanks based on word length as fallback
      let blankCount;
      if (word.length >= 8 && word.length <= 10) {
        blankCount = Math.min(3, Math.max(2, Math.floor(word.length * 0.25)));
      } else {
        blankCount = Math.max(2, Math.floor(word.length * 0.25));
      }

      // Randomly select positions to leave blank as fallback
      const positions = Array.from({ length: word.length }, (_, i) => i);
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      this.blankPositions = positions.slice(0, blankCount).sort((a, b) => a - b);
    }

    // Pre-fill the word with letters except at blank positions
    this.typedWord = "";
    for (let i = 0; i < word.length; i++) {
      if (this.blankPositions.includes(i)) {
        this.typedWord += " "; // Space as placeholder for blank
      } else {
        this.typedWord += word[i];
      }
    }

    this.fillupsMode = true; // Flag to indicate we're in fillups mode
    this.currentBlankIndex = 0; // Start with the first blank

    // Hide previous attempt initially
    document.getElementById("previousAttempt").style.display = "none";

    this.createWordBoxes();
    this.updateFillupsBoxes(); // Use special function for fillups

    // Enable check button only when all blanks are filled
    this.updateCheckButtonState();
  }
  updateFillupsBoxes() {
    for (let i = 0; i < this.maxLength; i++) {
      const box = document.getElementById(`box-${i}`);

      // Check if this position is a blank position
      if (this.blankPositions && this.blankPositions.includes(i)) {
        // This is a blank position
        if (this.typedWord[i] && this.typedWord[i] !== " ") {
          // User has filled this blank
          box.textContent = this.typedWord[i].toUpperCase();
          box.classList.add("filled");
          box.classList.remove("current");
        } else {
          // This blank is not yet filled
          box.textContent = "_";
          // Highlight current blank position
          if (this.blankPositions[this.currentBlankIndex] === i) {
            box.classList.remove("filled");
            box.classList.add("current");
          } else {
            box.classList.remove("filled", "current");
          }
        }
      } else {
        // This is a pre-filled position
        box.textContent = this.typedWord[i].toUpperCase();
        box.classList.add("filled");
        box.classList.remove("current");
      }
    }

    // Update hidden input for compatibility
    document.getElementById("wordInput").value = this.typedWord;

    // Enable/disable check button based on whether all letters are typed
    const checkButton = document.getElementById("checkButton");
    if (checkButton) {
      checkButton.disabled = this.typedWord.length === 0;
    }
  }

  updateCheckButtonState() {
    const checkButton = document.getElementById("checkButton");
    if (!checkButton) return;

    const question = this.allQuestions[this.currentQuestionIndex];
    if (!question) return;

    if (this.fillupsMode && this.blankPositions) {
      // For fillups game, check if all blanks are filled
      let allFilled = true;
      for (const pos of this.blankPositions) {
        if (!this.typedWord[pos] || this.typedWord[pos] === " ") {
          allFilled = false;
          break;
        }
      }
      checkButton.disabled = !allFilled;
    } else if (question.type === "correct-word" || question.type === "2-option" || question.type === "4-option") {
      // For option-based games, check if an option is selected
      checkButton.disabled = !this.selectedOption;
    } else if (question.type === "typing") {
      // For typing games, check if word is complete
      const isComplete = this.typedWord.length === this.maxLength;
      checkButton.disabled = !isComplete;
    } else if (question.type === "full-typing") {
      // For full typing games, allow checking with any input
      checkButton.disabled = this.typedWord.length === 0;
    } else {
      // Default behavior for other game types
      checkButton.disabled = false;
    }
  }

  displayWordsMeaning(word) {
    // Remove other game classes if present
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.remove("options-2-active");
      appContainer.classList.add("words-meaning-active");
    }

    // Show sound buttons for words-meaning game
    const soundButtonsContainer = document.querySelector(".sound-buttons-container");
    if (soundButtonsContainer) {
      soundButtonsContainer.style.display = "flex";
    }

    document.getElementById("questionType").textContent = `Select the correct meaning of the word "${
      word.charAt(0).toUpperCase() + word.slice(1)
    }"`;
    document.getElementById("inputContainer").style.display = "none";

    const optionsContainer = document.getElementById("optionsContainer");
    optionsContainer.style.display = "block";
    optionsContainer.className = "options-container words-meaning-container";

    // Get word meanings data
    const wordData = this.wordMeanings[word];
    if (!wordData) {
      console.error(`No meanings data found for word: ${word}`);
      return;
    }

    const options = [...wordData.options]; // Create a copy to shuffle
    const shuffledOptions = this.shuffleArray(options);

    optionsContainer.innerHTML = "";

    // Disable check button until user selects an option
    document.getElementById("checkButton").disabled = true;

    // Create sticky note styled options
    const stickyColors = [
      "#FFE4B5", // Moccasin (light peach)
      "#E6E6FA", // Lavender (light purple)
      "#F0F8FF", // Alice Blue (light blue)
      "#F5F5DC", // Beige (light yellow)
    ];

    shuffledOptions.forEach((option, index) => {
      const stickyNote = document.createElement("div");
      stickyNote.className = "sticky-note-option";
      stickyNote.style.backgroundColor = stickyColors[index % stickyColors.length];

      const optionText = document.createElement("div");
      optionText.className = "sticky-note-text";
      optionText.textContent = `(${String.fromCharCode(97 + index)}) ${option}`;

      // Add correct answer indicator (✅) for the correct option
      if (option === wordData.correct) {
        const checkmark = document.createElement("span");
        checkmark.className = "correct-indicator";
        checkmark.textContent = " ✅";
        checkmark.style.display = "none"; // Hidden initially
        optionText.appendChild(checkmark);
      }

      stickyNote.appendChild(optionText);

      stickyNote.addEventListener("click", () => this.selectWordsMeaningOption(stickyNote, option, word));

      optionsContainer.appendChild(stickyNote);
    });
  }

  selectWordsMeaningOption(selectedElement, selectedOption, word) {
    // Remove previous selections
    document.querySelectorAll(".sticky-note-option").forEach((option) => {
      option.classList.remove("selected");
    });

    // Mark current selection
    selectedElement.classList.add("selected");
    this.selectedOption = selectedOption;

    // Enable check button
    document.getElementById("checkButton").disabled = false;

    // Play option click sound
    this.playOptionClickSound();
  }

  displayContextChoice(word) {
    // Remove other game classes if present
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.remove("options-2-active", "words-meaning-active");
      appContainer.classList.add("context-choice-active");
    }

    // Show sound buttons for context-choice game
    const soundButtonsContainer = document.querySelector(".sound-buttons-container");
    if (soundButtonsContainer) {
      soundButtonsContainer.style.display = "flex";
    }

    document.getElementById("questionType").textContent = "CONTEXT CHOICE";
    document.getElementById("inputContainer").style.display = "none";

    const optionsContainer = document.getElementById("optionsContainer");
    optionsContainer.style.display = "block";
    optionsContainer.className = "options-container context-choice-container";

    // Get the actual word from the current question
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];
    const actualWord = currentQuestion.word;

    // Get context choice data using the actual word
    const contextData = this.contextChoiceData[actualWord];
    if (!contextData) {
      console.error(`No context choice data found for word: ${actualWord}`);
      console.log("Available context choice words:", Object.keys(this.contextChoiceData));
      return;
    }

    // Create the sentence display
    const sentenceDiv = document.createElement("div");
    sentenceDiv.className = "context-sentence";
    sentenceDiv.innerHTML = `<p>${contextData.sentence}</p><p class="context-question">Which word fits best?</p>`;
    const options = [...contextData.options]; // Create a copy to shuffle
    const shuffledOptions = this.shuffleArray(options);

    // Clear the container first
    optionsContainer.innerHTML = "";

    // Add the sentence div first
    optionsContainer.appendChild(sentenceDiv);

    // Disable check button until user selects an option
    document.getElementById("checkButton").disabled = true;

    // Create option buttons
    const optionsGrid = document.createElement("div");
    optionsGrid.className = "context-options-grid";

    shuffledOptions.forEach((option, index) => {
      const optionButton = document.createElement("button");
      optionButton.className = "context-option-btn";
      optionButton.textContent = `(${String.fromCharCode(97 + index)}) ${option}`;

      // Add correct answer indicator (✅) for the correct option
      if (option === contextData.correct) {
        const checkmark = document.createElement("span");
        checkmark.className = "correct-indicator";
        checkmark.textContent = " ✅";
        checkmark.style.display = "none"; // Hidden initially
        optionButton.appendChild(checkmark);
      }

      optionButton.addEventListener("click", () => this.selectContextChoiceOption(optionButton, option, actualWord));

      optionsGrid.appendChild(optionButton);
    });

    // Add the options grid after the sentence
    optionsContainer.appendChild(optionsGrid);
  }

  selectContextChoiceOption(selectedElement, selectedOption, word) {
    // Remove previous selections
    document.querySelectorAll(".context-option-btn").forEach((option) => {
      option.classList.remove("selected");
    });

    // Mark current selection
    selectedElement.classList.add("selected");
    this.selectedOption = selectedOption;

    // Enable check button
    document.getElementById("checkButton").disabled = false;

    // Play option click sound
    this.playOptionClickSound();
  }

  displayCorrectSentence(word) {
    // Remove other game classes if present
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.remove("options-2-active", "words-meaning-active", "context-choice-active");
      appContainer.classList.add("correct-sentence-active");
    }

    // Show sound buttons for correct-sentence game
    const soundButtonsContainer = document.querySelector(".sound-buttons-container");
    if (soundButtonsContainer) {
      soundButtonsContainer.style.display = "flex";
    }

    // Get the actual word from the current question
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];
    const actualWord = currentQuestion.word;

    // Get correct sentence data using the actual word
    const sentenceData = this.correctSentenceData[actualWord];
    if (!sentenceData) {
      console.error(`No correct sentence data found for word: ${actualWord}`);
      console.log("Available correct sentence words:", Object.keys(this.correctSentenceData));
      return;
    }

    document.getElementById("questionType").textContent = "CORRECT SENTENCE";
    document.getElementById("inputContainer").style.display = "none";

    const optionsContainer = document.getElementById("optionsContainer");
    optionsContainer.style.display = "block";
    optionsContainer.className = "options-container correct-sentence-container";

    const options = [...sentenceData.options]; // Create a copy to shuffle
    const shuffledOptions = this.shuffleArray(options);

    // Clear the container first
    optionsContainer.innerHTML = "";

    // Create the question display
    const questionDiv = document.createElement("div");
    questionDiv.className = "sentence-question";
    questionDiv.innerHTML = `<p>${sentenceData.question}</p>`;

    // Add the question div first
    optionsContainer.appendChild(questionDiv);

    // Disable check button until user selects an option
    document.getElementById("checkButton").disabled = true;

    // Create option buttons for sentences
    shuffledOptions.forEach((option, index) => {
      const optionButton = document.createElement("button");
      optionButton.className = "sentence-option-btn";
      optionButton.innerHTML = `<span class="option-letter">(${String.fromCharCode(97 + index)})</span> ${option}`;

      // Add correct answer indicator (✅) for the correct option
      if (option === sentenceData.correct) {
        const checkmark = document.createElement("span");
        checkmark.className = "correct-indicator";
        checkmark.textContent = " ✅";
        checkmark.style.display = "none"; // Hidden initially
        optionButton.appendChild(checkmark);
      }

      optionButton.addEventListener("click", () => this.selectCorrectSentenceOption(optionButton, option, actualWord));

      optionsContainer.appendChild(optionButton);
    });
  }

  selectCorrectSentenceOption(selectedElement, selectedOption, word) {
    // Remove previous selections
    document.querySelectorAll(".sentence-option-btn").forEach((option) => {
      option.classList.remove("selected");
    });

    // Mark current selection
    selectedElement.classList.add("selected");
    this.selectedOption = selectedOption;

    // Enable check button
    document.getElementById("checkButton").disabled = false;

    // Play option click sound
    this.playOptionClickSound();
  }

  displayWordHint(word) {
    const hintElement = document.getElementById("wordHint");
    const hintTextElement = document.getElementById("hintText");
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];

    // Hide hint for specific game types
    if (
      currentQuestion &&
      (currentQuestion.type === "correct-word" ||
        currentQuestion.type === "words-meaning" ||
        currentQuestion.type === "context-choice" ||
        currentQuestion.type === "correct-sentence")
    ) {
      hintElement.style.display = "none";
      return;
    }
    if (this.wordHints[word]) {
      hintTextElement.textContent = this.wordHints[word];
      hintElement.style.display = "block";
    } else {
      hintElement.style.display = "none";
    }
  }

  showFeedback(isCorrect, message) {
    const feedback = document.getElementById("feedback");
    feedback.className = `feedback ${isCorrect ? "correct" : "incorrect"}`;
    feedback.textContent = message.toUpperCase();
    feedback.classList.add("show");

    // Feedback will persist until user clicks check or continue button
    // No automatic timeout - feedback stays visible until user interaction
  }

  hideFeedback() {
    const feedback = document.getElementById("feedback");
    feedback.classList.remove("show");
  }

  async nextQuestion() {
    // Get references to UI elements
    const feedback = document.getElementById("feedback");
    const correctAnswerSection = document.getElementById("correctAnswerSection");
    const checkButton = document.getElementById("checkButton");
    const continueButton = document.getElementById("continueButton");

    // Immediately hide UI elements to prevent flicker
    feedback.classList.remove("show");
    correctAnswerSection.style.display = "none";
    checkButton.style.display = "none";
    continueButton.style.display = "none";

    // Add a small delay to allow UI to update before heavy operations
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Stop all speech synthesis immediately
    if (speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // Submit typing analytics if needed
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];
    if (currentQuestion && (currentQuestion.type === "typing" || currentQuestion.type === "full-typing") && this.typingAnalytics) {
      await this.submitTypingAnalyticsToFirebase();
    }

    // Handle pending streak celebrations
    if (this.pendingStreakCelebration > 0) {
      const streakToShow = this.pendingStreakCelebration;
      this.pendingStreakCelebration = 0;
      this.showStreakCelebration(streakToShow);
      return;
    }

    // Update question index and save progress
    this.currentQuestionIndex++;
    await this.updateGameAnalytics();

    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
      this.displayCurrentQuestion();
    });
  }

  preloadLottieAnimations() {
    // Define all Lottie animations to preload
    const animations = [
      "lottie/3inarow2.lottie",
      "lottie/3inarow3.lottie",
      "lottie/3inarow4.lottie",
      "lottie/3inarow5.lottie",
      "lottie/3inarow6.lottie",
      "lottie/3inarow7.lottie",
      "lottie/Fire.lottie",
      "lottie/5inarow.lottie",
      "lottie/5inarow2.lottie",
      "lottie/5inarow3.lottie",
      "lottie/5inarow4.lottie",
      "lottie/10inarow.lottie",
      "lottie/10inarow2.lottie",
      "lottie/10inarow3.lottie",
      "lottie/10inarow4.lottie",
      "lottie/10inarow5.lottie",
      "lottie/complete1.lottie",
      "lottie/complete2.lottie",
      "lottie/3inarow8.lottie",
      "lottie/3inarow9.lottie",
      "lottie/3inarow10.lottie",
      "lottie/3inarow11.lottie",
      "lottie/3inarow12.lottie",
      "lottie/3inarow13.lottie",
      "lottie/3inarow14.lottie",
      "lottie/3inarow15.lottie",
      "lottie/3inarow16.lottie",
      "lottie/3inarow17.lottie",
      "lottie/3inarow18.lottie",
      "lottie/3inarow19.lottie",
      "lottie/3inarow20.lottie",
      "lottie/3inarow21.lottie",
      "lottie/3inarow22.lottie",
      "lottie/3inarow23.lottie",
      "lottie/3inarow24.lottie",
      "lottie/3inarow25.lottie",
      "lottie/3inarow26.lottie",
      "lottie/3inarow27.lottie",
      "lottie/5inarow10.lottie",
      "lottie/5inarow11.lottie",
      "lottie/5inarow12.lottie",
      "lottie/5inarow13.lottie",
      "lottie/5inarow14.lottie",
      "lottie/5inarow15.lottie",
      "lottie/5inarow16.lottie",
      "lottie/5inarow17.lottie",
      "lottie/5inarow18.lottie",
      "lottie/5inarow19.lottie",
      "lottie/5inarow20.lottie",
      "lottie/5inarow21.lottie",
      "lottie/10inarow10.lottie",
      "lottie/10inarow11.lottie",
      "lottie/10inarow12.lottie",
      "lottie/10inarow13.lottie",
      "lottie/10inarow14.lottie",
      "lottie/10inarow15.lottie",
      "lottie/10inarow16.lottie",
      "lottie/10inarow17.lottie",
      "lottie/10inarow18.lottie",
      "lottie/10inarow19.lottie",
    ];
    // Create hidden preload container
    const preloadContainer = document.createElement("div");
    preloadContainer.style.cssText = "position: absolute; width: 0; height: 0; overflow: hidden; z-index: -1;";
    document.body.appendChild(preloadContainer);

    // Preload each animation
    animations.forEach((animation) => {
      const player = document.createElement("dotlottie-player");
      player.setAttribute("src", animation);
      player.setAttribute("background", "transparent");
      player.style.width = "0";
      player.style.height = "0";
      player.setAttribute("preload", "");
      preloadContainer.appendChild(player);
    });

    // Store reference to preload container for potential cleanup later
    this.preloadContainer = preloadContainer;
  }

  showStreakCelebration(streakCount) {
    // Hide game content
    document.getElementById("gameContent").style.display = "none";

    // Create streak celebration overlay
    const streakOverlay = document.createElement("div");
    streakOverlay.id = "streakOverlay";

    // Different animations and text for different streak levels, but all with white background
    let title = "";
    let subtitle = "";
    let message = "";
    let animationSrc = "";
    let animationSize = "";

    // Arrays of animations for each streak level

    // Arrays of animations for each streak level
    const threeInARowAnimations = [
      "lottie/3inarow2.lottie",
      "lottie/3inarow3.lottie",
      "lottie/3inarow4.lottie",
      "lottie/Fire.lottie",
      "lottie/3inarow5.lottie",
      "lottie/3inarow6.lottie",
      "lottie/3inarow7.lottie",
      "lottie/3inarow8.lottie",
      "lottie/3inarow9.lottie",
      "lottie/3inarow10.lottie",
      "lottie/3inarow11.lottie",
      "lottie/3inarow12.lottie",
      "lottie/3inarow13.lottie",
      "lottie/3inarow14.lottie",
      "lottie/3inarow15.lottie",
      "lottie/3inarow16.lottie",
      "lottie/3inarow17.lottie",
      "lottie/3inarow18.lottie",
      "lottie/3inarow19.lottie",
      "lottie/3inarow20.lottie",
      "lottie/3inarow21.lottie",
      "lottie/3inarow22.lottie",
      "lottie/3inarow23.lottie",
      "lottie/3inarow24.lottie",
      "lottie/3inarow25.lottie",
      "lottie/3inarow26.lottie",
      "lottie/3inarow27.lottie",
    ];
    const fiveInARowAnimations = [
      "lottie/5inarow.lottie",
      "lottie/5inarow2.lottie",
      "lottie/5inarow3.lottie",
      "lottie/5inarow4.lottie",
      "lottie/5inarow10.lottie",
      "lottie/5inarow11.lottie",
      "lottie/5inarow12.lottie",
      "lottie/5inarow13.lottie",
      "lottie/5inarow14.lottie",
      "lottie/5inarow15.lottie",
      "lottie/5inarow16.lottie",
      "lottie/5inarow17.lottie",
      "lottie/5inarow18.lottie",
      "lottie/5inarow19.lottie",
      "lottie/5inarow20.lottie",
      "lottie/5inarow21.lottie",
    ];

    const tenInARowAnimations = [
      "lottie/10inarow.lottie",
      "lottie/10inarow2.lottie",
      "lottie/10inarow3.lottie",
      "lottie/10inarow4.lottie",
      "lottie/10inarow5.lottie",
      "lottie/10inarow10.lottie",
      "lottie/10inarow11.lottie",
      "lottie/10inarow12.lottie",
      "lottie/10inarow13.lottie",
      "lottie/10inarow14.lottie",
      "lottie/10inarow15.lottie",
      "lottie/10inarow16.lottie",
      "lottie/10inarow17.lottie",
      "lottie/10inarow18.lottie",
      "lottie/10inarow19.lottie",
    ];

    // Randomly select an animation for the current streak level
    function getRandomAnimation(animationArray) {
      const randomIndex = Math.floor(Math.random() * animationArray.length);
      return animationArray[randomIndex];
    }

    if (streakCount === 3) {
      title = " HAT-TRICK! ";
      message = "You're on fire! Keep it up!";
      animationSrc = getRandomAnimation(threeInARowAnimations);
      animationSize = "300px";
    } else if (streakCount === 5) {
      title = "AMAZING!";
      message = "Incredible streak! You're unstoppable!";
      animationSrc = getRandomAnimation(fiveInARowAnimations);
      animationSize = "350px";
    } else if (streakCount === 10) {
      title = "LEGENDARY!";
      message = "Perfect 10! You're a spelling master!";
      animationSrc = getRandomAnimation(tenInARowAnimations);
      animationSize = "350px";
    }

    streakOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    color: #333;
                    text-align: center;
                    font-family: Arial, sans-serif;
                `;

    streakOverlay.innerHTML = `
                    <div style="margin-bottom: 30px;">
                        <dotlottie-player 
                            src="${animationSrc}" 
                            background="transparent" 
                            speed="1" 
                            style="width: ${animationSize}; height: ${animationSize};" 
                            loop 
                            autoplay>
                        </dotlottie-player>
                    </div>
                    <h1 style="font-size: 48px; margin: 20px 0; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); animation: pulse 1.5s infinite;">${title}</h1>
                    <h2 style="font-size: 32px; margin: 10px 0; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${subtitle}</h2>
                    <p style="font-size: 24px; margin: 10px 0; opacity: 0.9;">${message}</p>
                `;

    // Add pulse animation
    const style = document.createElement("style");
    style.textContent = `
                    @keyframes pulse {
                b         0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }
                `;
    document.head.appendChild(style);

    document.body.appendChild(streakOverlay);

    // Reset streak counter after reaching 10 in a row
    if (streakCount === 10) {
      this.consecutiveCorrect = 0;
    }

    // Auto-transition to next question after 3 seconds
    setTimeout(async () => {
      // Remove overlay
      document.body.removeChild(streakOverlay);

      // Show game content
      document.getElementById("gameContent").style.display = "block";

      // Move to next question
      this.currentQuestionIndex++;
      this.displayCurrentQuestion();
    }, 3000);
  }

  playChainReactionAnimation() {
    // Get all relevant elements for chain reaction
    let elements = [];
    const question = this.allQuestions[this.currentQuestionIndex];

    if (question.type === "letter-scramble") {
      // For letter-scramble, animate the letter tiles
      elements = Array.from(document.querySelectorAll(".letter-tile"));
    } else if (question.type === "typing") {
      // For typing, animate the word boxes
      elements = Array.from(document.querySelectorAll(".letter-box"));
    } else if (question.type === "full-typing") {
      // For full typing, animate the long dash display
      elements = [document.getElementById("longDash")].filter(Boolean);
    }

    if (elements.length === 0) return;

    // Reset all elements
    elements.forEach((element) => {
      element.classList.remove("chain-animate");
    });

    // Super fast chain reaction
    elements.forEach((element, i) => {
      setTimeout(() => {
        element.classList.add("chain-animate");
        this.createShockwave(element);

        // Remove animate class after animation
        setTimeout(() => element.classList.remove("chain-animate"), 300);

        // Add screen shake effect for dramatic impact
        if (i === 0 || i === elements.length - 1) {
          document.querySelector(".app-container").classList.add("shake");
          setTimeout(() => document.querySelector(".app-container").classList.remove("shake"), 150);
        }
      }, i * 50); // 50ms delay between each element
    });
  }

  createShockwave(element) {
    const shockwave = document.createElement("div");
    shockwave.className = "shockwave-effect";
    element.style.position = "relative";
    element.appendChild(shockwave);
    setTimeout(() => shockwave.remove(), 400);
  }

  showRiveThunderAnimation() {
    // Create thunder animation overlay within the game content area
    const gameContent = document.getElementById("gameContent");
    if (!gameContent) return;

    // Get current streak count to customize animation
    const streakCount = this.consecutiveCorrect;

    // Play thunder sound only once
    const thunderSound = new Audio("./audio/thunder.mp3");
    thunderSound.volume = 1.0;
    thunderSound.currentTime = 0; // Reset to beginning
    thunderSound.play().catch((e) => console.log("Thunder sound play error:", e));

    const riveOverlay = document.createElement("div");
    riveOverlay.id = "riveThunderOverlay";

    // Customize animation based on streak count
    let scale = 1.5;
    let duration = 4000; // default 4 seconds (slower)

    if (streakCount === 5) {
      scale = 1.8; // Bigger animation for 5-in-a-row
      duration = 5000; // Longer duration (5 seconds)
    } else if (streakCount === 10) {
      scale = 2.2; // Even bigger for 10-in-a-row
      duration = 6000; // Even longer duration (6 seconds)
    }

    riveOverlay.style.cssText = `
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: transparent;
                    pointer-events: none;
                    z-index: 1000;
                    transform: scale(${scale});
                `;

    // Create canvas for Rive animation with mobile-specific settings
    const riveCanvas = document.createElement("canvas");
    riveCanvas.id = "thunderCanvas";

    // Set explicit canvas dimensions for mobile compatibility
    const containerRect = gameContent.getBoundingClientRect();
    const canvasWidth = Math.min(containerRect.width * 2, 800);
    const canvasHeight = Math.min(containerRect.height * 2, 600);

    riveCanvas.width = canvasWidth;
    riveCanvas.height = canvasHeight;
    riveCanvas.style.cssText = `
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                `;

    riveOverlay.appendChild(riveCanvas);

    // Add to the game content area (not hiding the game)
    gameContent.style.position = "relative"; // Ensure relative positioning
    gameContent.appendChild(riveOverlay);

    // Check if Rive is available and initialize animation with mobile fallback
    if (typeof rive !== "undefined" && rive.Rive) {
      // Initialize Rive animation with mobile-optimized settings
      fetch("./rive/thunder2.riv")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.arrayBuffer();
        })
        .then((rivFile) => {
          try {
            const riveInstance = new rive.Rive({
              buffer: rivFile,
              canvas: riveCanvas,
              autoplay: true,
              fit: rive.Fit.Cover, // Use Cover for better mobile compatibility
              alignment: rive.Alignment.Center,
              enableRiveAssetCDN: false, // Disable CDN for local files
              shouldDisableRiveListeners: true, // Optimize for mobile
              onLoad: () => {
                try {
                  riveInstance.resizeDrawingSurfaceToCanvas();
                } catch (e) {
                  console.log("Resize error (non-critical):", e);
                }
              },
              onLoadError: (error) => {
                console.error("Error loading thunder animation:", error);
                this.showFallbackThunderAnimation(riveOverlay, gameContent, duration, scale);
              },
            });

            // Remove the animation after the specified duration
            setTimeout(() => {
              try {
                if (riveInstance && typeof riveInstance.cleanup === "function") {
                  riveInstance.cleanup();
                }
              } catch (e) {
                console.log("Cleanup error (non-critical):", e);
              }
              if (gameContent.contains(riveOverlay)) {
                gameContent.removeChild(riveOverlay);
              }
            }, duration);
          } catch (error) {
            console.error("Error creating Rive instance:", error);
            this.showFallbackThunderAnimation(riveOverlay, gameContent, duration, scale);
          }
        })
        .catch((error) => {
          console.error("Error loading thunder animation file:", error);
          this.showFallbackThunderAnimation(riveOverlay, gameContent, duration, scale);
        });
    } else {
      console.log("Rive not available, showing fallback animation");
      this.showFallbackThunderAnimation(riveOverlay, gameContent, duration, scale);
    }
  }

  showFallbackThunderAnimation(overlay, gameContent, duration, scale) {
    // Fallback CSS animation for when Rive fails on mobile
    overlay.innerHTML = `
                    <div style="
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(45deg, 
                            transparent 40%, 
                            #FFD700 45%, 
                            #FFF700 50%, 
                            #FFD700 55%, 
                            transparent 60%);
                        animation: thunderFlash ${duration}ms ease-in-out;
                        transform-origin: center;
                    "></div>
                `;

    // Add CSS animation for fallback
    const style = document.createElement("style");
    style.textContent = `
                    @keyframes thunderFlash {
                        0% { opacity: 0; transform: translateY(-100%) rotate(-10deg); }
                        10% { opacity: 1; transform: translateY(-50%) rotate(-5deg); }
                        20% { opacity: 0.8; transform: translateY(0%) rotate(0deg); }
                        30% { opacity: 1; transform: translateY(20%) rotate(2deg); }
                        50% { opacity: 0.9; transform: translateY(50%) rotate(5deg); }
                        70% { opacity: 0.7; transform: translateY(80%) rotate(8deg); }
                        90% { opacity: 0.5; transform: translateY(100%) rotate(10deg); }
                        100% { opacity: 0; transform: translateY(120%) rotate(12deg); }
                    }
                `;
    document.head.appendChild(style);

    // Remove the animation after duration
    setTimeout(() => {
      if (gameContent.contains(overlay)) {
        gameContent.removeChild(overlay);
      }
      document.head.removeChild(style);
    }, duration);
  }

  resetAllGameStates() {
    // Reset fillups state
    this.fillupsMode = false;
    this.blankPositions = null;
    this.currentBlankIndex = 0;

    // Reset letter-scramble state
    this.currentWord = "";
    this.playerAnswer = [];
    this.letterTileSlots = [];
    this.usedTileSlots = [];
    this.selectedSlotIndex = null;
    this.letterScrambleAttempt = 1;
    this.letterScrambleAnswers = [];

    // Reset word-parts state
    this.wordPartsAttempt = 1;
    this.wordPartsMaxAttempts = 2;
    this.selectedWordParts = [];

    // Reset general state
    this.selectedOption = null;
    this.typedWord = "";
    this.isChecked = false;

    // Remove all game-specific CSS classes
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.remove("options-2-active", "options-4-active");
    }
  }

  resetUI() {
    // Reset feedback and buttons
    const feedback = document.getElementById("feedback");
    feedback.classList.remove("show", "correct", "incorrect");
    feedback.textContent = "";

    // Reset buttons
    document.getElementById("checkButton").style.display = "inline-block";
    document.getElementById("continueButton").style.display = "none";

    // Reset input and word boxes
    const wordInput = document.getElementById("wordInput");
    if (wordInput) {
      wordInput.value = "";
      wordInput.disabled = false;
    }

    // Clear previous attempts
    const previousAttempt = document.getElementById("previousAttempt");
    if (previousAttempt) {
      previousAttempt.style.display = "none";
      const previousWordBoxes = document.getElementById("previousWordBoxes");
      if (previousWordBoxes) previousWordBoxes.innerHTML = "";
    }

    // Clear current attempt boxes
    const wordBoxes = document.getElementById("wordBoxes");
    if (wordBoxes) wordBoxes.innerHTML = "";

    // Hide correct answer section
    const correctAnswerSection = document.getElementById("correctAnswerSection");
    if (correctAnswerSection) correctAnswerSection.style.display = "none";

    // Reset keyboard state
    this.resetKeyboardColors();

    // Reset any game-specific states
    this.typedWord = "";
    this.currentAttempt = 1;
    this.previousAttempts = [];

    // Don't enable check button for fillups - let updateCheckButtonState handle it
    const question = this.allQuestions[this.currentQuestionIndex];
    if (question && question.type !== "fillups") {
      document.getElementById("checkButton").disabled = false;
    }

    document.getElementById("continueButton").style.display = "none";
    this.resetInputState();
    this.selectedOption = null;

    // Reset attempts display
    document.getElementById("previousAttempt").style.display = "none";

    // Reset keyboard colors
    document.querySelectorAll(".key").forEach((key) => {
      key.classList.remove("correct", "wrong-position", "incorrect");
    });
  }

  resetInputState() {
    const input = document.getElementById("wordInput");
    input.value = "";
    input.classList.remove("correct", "incorrect");

    // Reset word boxes (but keep previous attempt boxes intact)
    document.querySelectorAll("#wordBoxes .letter-box").forEach((box) => {
      box.classList.remove("correct", "incorrect", "correct-position", "wrong-position", "filled", "current");
    });
  }

  async showCompletion() {
    // Set progress bar to 100% on completion
    document.getElementById("progressFill").style.width = "100%";

    // Mark game as completed in analytics
    await this.markGameCompleted();

    // Check if there are failed words and automatically proceed to review
    const allFailedWords = [...this.stats.failedWords];

    if (this.isPracticeMode) {
      // After review completion, show card directly
      await this.showCard();
    } else if (allFailedWords.length > 0) {
      // Main game with failed words - automatically start practice mode (review)
      this.startPracticeMode();
    } else {
      // Perfect score in main game - show card immediately
      await this.showCard();
    }
  }

  async showCard() {
    // Calculate points based on performance
    const accuracy = Math.round((this.stats.correct / this.stats.total) * 100);
    let points = 50; // Base points

    if (accuracy === 100) {
      points = 150; // Perfect score bonus
    } else if (accuracy >= 80) {
      points = 100; // Good performance
    } else if (accuracy >= 60) {
      points = 75; // Average performance
    }

    // Hide completion screen
    document.getElementById("completionScreen").style.display = "none";

    await pushCompletedEvent(this.usercode);

    // Redirect to the completion page only when test is completed
    window.location.href = "complete.html?code=" + encodeURIComponent(this.usercode);
  }

  restartGame() {
    // Reset all screens
    document.getElementById("cardScreen").style.display = "none";
    document.getElementById("completionScreen").style.display = "none";
    document.getElementById("gameContent").style.display = "block";

    // Start new game
    window.app = new SpellingApp();
  }

  async clearGameSession() {
    this.sessionId = this.generateSessionId(); // Generate new sessionId
  }

  // Game Analytics Functions
  generateSessionId() {
    // Generate a unique session ID using timestamp and random string
    const timestamp = getTodayDateNow().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${this.usercode}-${timestamp}-${randomStr}`;
  }

  cleanDataForFirebase(data) {
    // Remove undefined values and ensure all fields have valid values
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      } else {
        // Provide default values for undefined fields
        switch (key) {
          case "usercode":
            cleaned[key] = "";
            break;
          case "currentQuestionIndex":
          case "consecutiveCorrect":
            cleaned[key] = 0;
            break;
          case "stats":
            cleaned[key] = { correct: 0, total: 0, wordsToLearn: [], failedWords: [] };
            break;
          case "allQuestions":
          case "failedWordsTracker":
            cleaned[key] = [];
            break;
          case "isPracticeMode":
          case "isCompleted":
            cleaned[key] = false;
            break;
          case "sessionId":
            cleaned[key] = this.generateSessionId();
            break;
          case "gameStarted":
          case "lastUpdated":
          case "completedAt":
            cleaned[key] = getTodayDateISOString();
            break;
          default:
            cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }

  // Helper function to generate date-based document ID (yyyy/mm/dd format)
  getDateBasedDocumentId() {
    return `${this.usercode}#${getTodayDateString()}`;
  }

  async saveGameProgress() {
    if (!db) return;

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping game progress save to Firebase");
      return;
    }

    try {
      const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

      // Use date-based document ID to allow same user code for new questions each day
      const documentId = this.getDateBasedDocumentId();
      const docRef = doc(db, "game-analytics", documentId);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        console.log(
          `⚠️ Game analytics already exists for user ${this.usercode} on ${documentId}. Skipping save (first-time only rule).`
        );
        return;
      }

      const gameAnalyticsData = {
        usercode: this.usercode,
        currentQuestionIndex: this.currentQuestionIndex,
        stats: this.stats,
        allQuestions: this.allQuestions,
        isPracticeMode: this.isPracticeMode,
        consecutiveCorrect: this.consecutiveCorrect,
        failedWordsTracker: Array.from(this.failedWordsTracker || []),
        sessionId: this.sessionId,
        lastUpdated: getTodayDateISOString(),
        gameStarted: this.gameStarted,
        isCompleted: false,
      };

      const cleanedData = this.cleanDataForFirebase(gameAnalyticsData);
      await setDoc(docRef, cleanedData);
      console.log("✅ Game progress saved to Firebase");
    } catch (error) {
      console.error("❌ Error saving game progress:", error);
      logError(`Error saving game progress to Firebase, ${error?.message}`);
    }
  }

  async loadGameProgress() {
    if (!db) return;

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping game progress load from Firebase");
      return;
    }

    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

      // Use date-based document ID to allow same user code for new questions each day
      const documentId = this.getDateBasedDocumentId();
      const docRef = doc(db, "game-analytics", documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Check if game is already completed
        if (data.isCompleted) {
          console.log("🎯 Game already completed, starting fresh");
          return;
        }

        // Restore game state
        this.currentQuestionIndex = data.currentQuestionIndex || 0;
        this.stats = data.stats || this.stats;
        this.allQuestions = data.allQuestions || this.allQuestions;
        this.isPracticeMode = data.isPracticeMode || false;
        this.consecutiveCorrect = data.consecutiveCorrect || 0;
        this.failedWordsTracker = new Set(data.failedWordsTracker || []);
        this.sessionId = data.sessionId || this.sessionId; // Keep existing sessionId or use generated one
        this.gameStarted = data.gameStarted;

        console.log("✅ Game progress loaded from Firebase");
        console.log(`📍 Resuming from question ${this.currentQuestionIndex + 1} of ${this.allQuestions.length}`);
      } else {
        console.log("🆕 No existing progress found, starting fresh game");
        this.gameStarted = getTodayDateISOString();
      }
    } catch (error) {
      console.error("❌ Error loading game progress:", error);
      logError(`Error loading game progress from Firebase, ${error?.message}`);
      this.gameStarted = getTodayDateISOString();
    }
  }

  async updateGameAnalytics() {
    if (!db) return;

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping game analytics update to Firebase");
      return;
    }

    try {
      const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

      // Use date-based document ID to allow same user code for new questions each day
      const documentId = this.getDateBasedDocumentId();
      const docRef = doc(db, "game-analytics", documentId);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        console.log(
          `⚠️ Game analytics already exists for user ${this.usercode} on ${documentId}. Skipping update (first-time only rule).`
        );
        return;
      }

      const gameAnalyticsData = {
        usercode: this.usercode,
        currentQuestionIndex: this.currentQuestionIndex,
        stats: this.stats,
        allQuestions: this.allQuestions,
        isPracticeMode: this.isPracticeMode,
        consecutiveCorrect: this.consecutiveCorrect,
        failedWordsTracker: Array.from(this.failedWordsTracker || []),
        sessionId: this.sessionId,
        lastUpdated: getTodayDateISOString(),
        gameStarted: this.gameStarted,
        isCompleted: false,
      };

      const cleanedData = this.cleanDataForFirebase(gameAnalyticsData);
      console.log("🔍 Cleaned game analytics data:", cleanedData);
      const result = await setDoc(docRef, cleanedData);
      console.log("🔍 Result:", result);
      console.log("✅ Game analytics updated");
    } catch (error) {
      console.error("❌ Error updating game analytics:", error);
      logError(`Error updating game analytics to Firebase, ${error?.message}`);
    }
  }

  async markGameCompleted() {
    if (!db) return;

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping mark game completed to Firebase");
      return;
    }

    try {
      const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

      // Use date-based document ID to allow same user code for new questions each day
      const documentId = this.getDateBasedDocumentId();
      const docRef = doc(db, "game-analytics", documentId);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        console.log(
          `⚠️ Game analytics already exists for user ${this.usercode} on ${documentId}. Skipping mark completed (first-time only rule).`
        );
        return;
      }

      const gameAnalyticsData = {
        usercode: this.usercode,
        currentQuestionIndex: this.currentQuestionIndex,
        stats: this.stats,
        allQuestions: this.allQuestions,
        isPracticeMode: this.isPracticeMode,
        consecutiveCorrect: this.consecutiveCorrect,
        failedWordsTracker: Array.from(this.failedWordsTracker || []),
        sessionId: this.sessionId,
        lastUpdated: getTodayDateISOString(),
        gameStarted: this.gameStarted,
        isCompleted: true,
        completedAt: getTodayDateISOString(),
      };

      const cleanedData = this.cleanDataForFirebase(gameAnalyticsData);
      await setDoc(docRef, cleanedData);
      console.log("✅ Game marked as completed");
    } catch (error) {
      console.error("❌ Error marking game as completed:", error);
      logError(`Error marking game as completed in Firebase, ${error?.message}`);
    }
  }

  setupProgressSaving() {
    // Save progress when user leaves the page
    window.addEventListener("beforeunload", (event) => {
      if (!this.isPracticeMode && this.currentQuestionIndex > 0) {
        // Use synchronous method for beforeunload
        this.saveGameProgressSync();
      }
    });

    // Also save progress periodically (every 30 seconds)
    setInterval(() => {
      if (!this.isPracticeMode && this.currentQuestionIndex > 0) {
        this.updateGameAnalytics();
      }
    }, 30000);
  }

  saveGameProgressSync() {
    // Synchronous version for beforeunload event
    if (!db || this.isPracticeMode) return;

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping sync game progress save to Firebase");
      return;
    }

    try {
      const gameAnalyticsData = {
        usercode: this.usercode,
        currentQuestionIndex: this.currentQuestionIndex,
        stats: this.stats,
        allQuestions: this.allQuestions,
        isPracticeMode: this.isPracticeMode,
        consecutiveCorrect: this.consecutiveCorrect,
        failedWordsTracker: Array.from(this.failedWordsTracker || []),
        sessionId: this.sessionId,
        lastUpdated: getTodayDateISOString(),
        gameStarted: this.gameStarted,
        isCompleted: false,
      };

      const cleanedData = this.cleanDataForFirebase(gameAnalyticsData);

      // Use sendBeacon for reliable data transmission on page unload
      if (navigator.sendBeacon) {
        const data = JSON.stringify(cleanedData);
        navigator.sendBeacon(`/api/save-progress/${this.usercode}`, data);
      }
    } catch (error) {
      console.error("❌ Error saving game progress on unload:", error);
      logError(`Error saving game progress on unload to Firebase, ${error?.message}`);
    }
  }
}

function restartApp() {
  document.getElementById("gameContent").style.display = "block";
  document.getElementById("completionScreen").style.display = "none";
  document.getElementById("cardScreen").style.display = "none";
  app = new SpellingApp();
}

// Check for URL parameters and auto-populate usercode
function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromURL = urlParams.get("code");

  if (codeFromURL) {
    document.getElementById("usernameInput").value = codeFromURL;
    // Optionally auto-start the game
    // document.getElementById("startGameBtn").click();
  }
}

// Initialize URL parameter check when page loads
document.addEventListener("DOMContentLoaded", checkURLParameters);

// Initialize the app after getting code
let app;
document.getElementById("startGameBtn").addEventListener("click", async function () {
  const code = document.getElementById("usernameInput").value.trim();
  if (code) {
    // Disable the start button to prevent multiple clicks
    const startBtn = document.getElementById("startGameBtn");
    startBtn.disabled = true;
    startBtn.textContent = "Loading...";

    try {
      // Fetch questions from Firebase for this user code
      console.log("🚀 Starting game for user code:", code);
      const questionData = await fetchQuestionsFromFirebase(code);

      // Only proceed if questions were successfully loaded
      if (questionData) {
        console.log("✅ Questions loaded successfully, starting game...");
        document.getElementById("usernameScreen").style.display = "none";
        document.querySelector(".app-container").style.display = "block";
        // Safe parsing function to handle both strings and objects
        const safeParse = (data) => {
          if (typeof data === "string") {
            try {
              return JSON.parse(data);
            } catch (e) {
              console.warn("Failed to parse JSON string:", data);
              logError(`Error parsing JSON string: ${data}, ${e?.message}`);
              return {};
            }
          }
          return data || {};
        };

        app = new SpellingApp(
          code,
          questionData.words,
          safeParse(questionData.wordHints),
          safeParse(questionData.wordPartsData),
          safeParse(questionData.sentenceTemplates),
          safeParse(questionData.wordDistractors),
          questionData.gameSequence,
          safeParse(questionData.fillupsBlankPositions),
          safeParse(questionData.twoOptionDistractors),
          safeParse(questionData.wordMeanings),
          safeParse(questionData.contextChoice),
          safeParse(questionData.correctSentence),
          questionData.wordsWithStreak
        );
      } else {
        console.log("❌ Questions not loaded, staying on username screen");
        startBtn.disabled = false;
        startBtn.textContent = "Start Game";
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      logError(`Error loading questions for user code ${code}, ${error?.message}`);
      // Reset button state on error
      startBtn.disabled = false;
      startBtn.textContent = "Start Game";
      // Don't proceed to game - user stays on username screen
    }
  } else {
    alert("Please enter code to continue");
  }
});

// Allow pressing Enter key to start the game
document.getElementById("usernameInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    document.getElementById("startGameBtn").click();
  }
});

// LogRocket initialization - only for non-test mode
function initializeLogRocket() {
  // Check if current user is in test mode
  const urlParams = new URLSearchParams(window.location.search);
  const userCode = urlParams.get("code");
  const isTestMode = userCode && userCode.toLowerCase().endsWith("test");

  if (isTestMode) {
    console.log("🧪 TEST MODE: Skipping LogRocket initialization");
    return;
  }

  // Wait for LogRocket to be available (it loads async)
  function tryInitLogRocket() {
    if (window.LogRocket) {
      try {
        window.LogRocket.init("jsku84/spelldaily");

        // Track spelling drill game view
        LogRocket.track("Spelling Drill Game View");

        if (userCode) {
          LogRocket.identify(userCode, {
            name: userCode || "Spelling Drill Player",
            gameType: "spelling_drill",
          });
        }

        console.log("✅ LogRocket initialized successfully for user:", userCode);
      } catch (error) {
        console.error("❌ LogRocket initialization failed:", error);
        logError(`LogRocket initialization error, ${error?.message}`);
      }
    } else {
      console.log("⏳ LogRocket not yet available, retrying...");
      // Retry after a short delay
      setTimeout(tryInitLogRocket, 500);
    }
  }

  tryInitLogRocket();
}

// Initialize LogRocket with proper timing
setTimeout(initializeLogRocket, 1000); // Give LogRocket script time to load

// Function to fetch questions from Firebase using user code as document ID
async function fetchQuestionsFromFirebase(userCode = null) {
  try {
    // Check if user code is present
    if (!userCode) {
      console.log("⚠️ No user code provided");
      alert("Test is not active");
      return null;
    }

    // Check if this is test mode and extract base code
    let actualUserCode = userCode;
    const isTestMode = userCode.toLowerCase().endsWith("test");
    if (isTestMode) {
      actualUserCode = userCode.slice(0, -4); // Remove 'test' suffix
      console.log(`🧪 TEST MODE: Using base code '${actualUserCode}' to fetch questions`);
    }

    if (!db) {
      await waitForFirebase();
    }

    if (!db) {
      console.error("❌ Firebase not initialized");
      alert("Test is not active");
      return null;
    }

    // Import Firebase functions
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

    console.log("🔍 Fetching questions from Firebase...");
    console.log("👤 User code (document ID):", actualUserCode);

    // Fetch document directly using actual user code as document ID
    const docRef = doc(db, "questions", actualUserCode);
    const docSnap = await getDoc(docRef);

    // Check if document exists
    if (!docSnap.exists()) {
      if (isTestMode) {
        console.log(`⚠️ No document found for base code '${actualUserCode}' in test mode`);
        alert(`Test document '${actualUserCode}' not found. Please create questions for '${actualUserCode}' first.`);
      } else {
        console.log("⚠️ No document found for user code:", actualUserCode);
        alert("Test is not active");
      }
      return null;
    }

    const documentData = docSnap.data();
    console.log("✅ Successfully fetched questions from Firebase:");
    console.log("👤 Document ID:", actualUserCode);
    console.log("📝 Available fields:", Object.keys(documentData));

    // Check for missing game data fields
    const requiredFields = ["wordMeanings", "contextChoice", "correctSentence"];
    const missingFields = requiredFields.filter((field) => !documentData[field]);
    if (missingFields.length > 0) {
      console.warn("⚠️ Missing game data fields:", missingFields);
    }

    // Return the document data (which should contain the questions)
    return documentData;
  } catch (error) {
    console.error("❌ Error fetching questions from Firebase:", error);
    logError(`Error fetching questions from Firebase for user code ${userCode}, ${error?.message}`);
    alert("Test is not active");
    return null;
  }
}

// Function to fetch questions for current user (if app is initialized)
async function fetchCurrentUserQuestions() {
  if (app && app.usercode) {
    console.log("👤 Fetching questions for current user:", app.usercode);
    return await fetchQuestionsFromFirebase(app.usercode);
  } else {
    console.log("⚠️ No user logged in. Please start the game first or provide a user code.");
    alert("Test is not active");
    return null;
  }
}

// Method to show test mode indicator in UI (outside of class)
function showTestModeIndicator() {
  const testModeIndicator = document.getElementById("testModeIndicator");
  if (testModeIndicator) {
    testModeIndicator.style.display = "block";
  }
}

// Make utility functions available globally for testing
if (typeof window !== "undefined") {
  window.fetchQuestionsFromFirebase = fetchQuestionsFromFirebase;
  window.fetchCurrentUserQuestions = fetchCurrentUserQuestions;
  window.showTestModeIndicator = showTestModeIndicator;
}
