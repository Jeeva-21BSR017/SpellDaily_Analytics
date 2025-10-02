// Firebase initialization (modern v9+ SDK)
// Firebase is initialized in HTML as a module, we just need to wait for it
let db = null;

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
        console.log("✅ Firebase connected to script.js");
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
    reviewWords,
    newWords,
    wordHints,
    wordPartsData,
    sentenceTemplates,
    wordDistractors,
    finalSequence,
    fillupsBlankPositions,
    twoOptionDistractors
  ) {
    this.usercode = usercode;

    // Check if this is test mode (code ends with 'test')
    this.isTestMode = usercode && usercode.toLowerCase().endsWith("test");
    if (this.isTestMode) {
      console.log(`🧪 TEST MODE ACTIVATED for user: ${this.usercode}`);
      console.log("📝 Data will NOT be saved to Firebase in test mode");

      // Show test mode indicator in UI
      showTestModeIndicator();
    }

    // Default words (fallback if no game code is used)
    this.reviewWords = reviewWords || [
      "culture",
      "history",
      "dessert",
      "essay",
      "measure",
      "future",
      "survey",
      "schedule",
    ];
    this.newWords = newWords || [
      "grammar",
      "struggle",
      "fantasy",
      "flavour",
      "visualise",
      "opinion",
      "familiar",
      "envelope",
    ];

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
    this.wordHints = JSON.parse(wordHints) || {
      culture: "🎭 The arts, customs, and beliefs of a society",
      history: "📜 The study of past events and civilizations",
      dessert: "🍰 A sweet course eaten at the end of a meal",
      essay: "📝 A piece of writing on a particular subject",
      measure: "📏 To find the size, amount, or degree of something",
      future: "🔮 The time that is to come",
      survey: "📊 A detailed study or investigation",
      schedule: "📅 A plan for carrying out activities",
      grammar: "📖 The rules of language structure",
      struggle: "💪 To make forceful efforts to get free",
      fantasy: "🧚 The faculty of imagination",
      flavour: "👅 The distinctive taste of food or drink",
      visualise: "👁️ To form a mental image of something",
      opinion: "💭 A view or judgment about something",
      familiar: "🤝 Well-known from long association",
      envelope: "✉️ A flat paper container for a letter",
    };

    // Word parts data for the word parts puzzle game
    this.wordPartsData = JSON.parse(wordPartsData) || {
      culture: {
        parts: ["cul", "ture"],
        options: [
          ["cul", "cal", "col"], // correct: 'cul' (position 0)
          ["ture", "tare", "tire"], // correct: 'ture' (position 0)
        ],
      },
      history: {
        parts: ["his", "to", "ry"],
        options: [
          ["his", "has", "hes"], // correct: 'his' (position 0)
          ["to", "ta", "te"], // correct: 'to' (position 0)
          ["ry", "ra", "re"], // correct: 'ry' (position 0)
        ],
      },
      dessert: {
        parts: ["des", "sert"],
        options: [
          ["des", "dis", "dos"], // correct: 'des' (position 0)
          ["sert", "sort", "sart"], // correct: 'sert' (position 0)
        ],
      },
      essay: {
        parts: ["es", "say"],
        options: [
          ["es", "as", "is"], // correct: 'es' (position 0)
          ["say", "soy", "sey"], // correct: 'say' (position 0)
        ],
      },
      measure: {
        parts: ["mea", "sure"],
        options: [
          ["mea", "mia", "moa"], // correct: 'mea' (position 0)
          ["sure", "sore", "sire"], // correct: 'sure' (position 0)
        ],
      },
      future: {
        parts: ["fu", "ture"],
        options: [
          ["fu", "fa", "fe"], // correct: 'fu' (position 0)
          ["ture", "tare", "tire"], // correct: 'ture' (position 0)
        ],
      },
    };

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
      failedReviewWords: [],
      failedNewWords: [],
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
    this.sentenceTemplates = JSON.parse(sentenceTemplates) || {
      culture: [
        "Every country has its own unique ____________.",
        "The museum displays artifacts from ancient ____________.",
        "Learning about different ____________ broadens your mind.",
      ],
      history: [
        "We study world ____________ in social studies class.",
        "The ____________ of this building dates back 200 years.",
        "She loves reading books about ancient ____________.",
      ],
      dessert: [
        "What would you like for ____________ tonight?",
        "The chocolate cake was a delicious ____________.",
        "Ice cream is my favorite ____________ in summer.",
      ],
      essay: [
        "I need to write a five-page ____________ for English class.",
        "Her ____________ about climate change won first prize.",
        "The teacher assigned a persuasive ____________.",
      ],
      measure: [
        "Please ____________ the length of this table.",
        "We need to ____________ the ingredients carefully.",
        "The doctor will ____________ your blood pressure.",
      ],
      future: [
        "What do you want to be in the ____________?",
        "Technology will shape our ____________.",
        "Planning ahead helps secure your ____________.",
      ],
      survey: [
        "The company conducted a customer satisfaction ____________.",
        "Please fill out this quick ____________ about our service.",
        "The ____________ results showed interesting trends.",
      ],
      schedule: [
        "What's on your ____________ for tomorrow?",
        "The train runs on a strict ____________.",
        "I need to check my ____________ before making plans.",
      ],
      grammar: [
        "Good ____________ is important for clear writing.",
        "The teacher corrected my ____________ mistakes.",
        "English ____________ can be quite challenging.",
      ],
      struggle: [
        "Many students ____________ with math problems.",
        "It's okay to ____________ when learning something new.",
        "She had to ____________ to reach her goals.",
      ],
      fantasy: [
        "Dragons exist only in ____________ stories.",
        "She loves reading ____________ novels about magic.",
        "His ____________ about becoming famous came true.",
      ],
      flavour: [
        "This ice cream has a delicious vanilla ____________.",
        "The soup lacks ____________ and needs more spices.",
        "What ____________ of cake would you prefer?",
      ],
      visualise: [
        "Try to ____________ yourself succeeding in the exam.",
        "Athletes ____________ their performance before competing.",
        "Can you ____________ what the house will look like?",
      ],
      opinion: [
        "What's your ____________ about the new movie?",
        "Everyone is entitled to their own ____________.",
        "In my ____________, this is the best solution.",
      ],
      familiar: [
        "This song sounds ____________ to me.",
        "I'm not ____________ with that author's work.",
        "The neighborhood looks ____________ even after years.",
      ],
      envelope: [
        "Please put the letter in an ____________.",
        "The ____________ was addressed to my grandmother.",
        "Don't forget to seal the ____________ before mailing.",
      ],
    };

    this.wordDistractors = JSON.parse(wordDistractors) || {
      culture: ["cultur", "cultuer", "cultre", "cultire", "cultere", "cultyure"],
      history: ["histery", "histroy", "histary", "histori", "histery", "histery"],
      dessert: ["desert", "desart", "dessart", "deseret", "desseret", "desurt"],
      essay: ["esay", "essai", "essey", "essaye", "essey", "essaay"],
      measure: ["measur", "mesure", "measuer", "meausre", "measrue", "measere"],
      future: ["futur", "futuer", "futre", "futire", "futere", "futyure"],
      survey: ["survay", "survei", "survye", "surway", "survery", "survay"],
      schedule: ["scedule", "schedual", "shedule", "scheduel", "schdule", "schedile"],
      grammar: ["grammer", "gramar", "gramor", "gramer", "grammir", "gramar"],
      struggle: ["strugle", "strugle", "stuggle", "struggel", "strugle", "struggal"],
      fantasy: ["fantacy", "fantasi", "fantasey", "fantazy", "fantaisy", "fantacy"],
      flavour: ["flavor", "flavur", "flavoer", "flavore", "flavoure", "flavir"],
      visualise: ["visualize", "visualis", "visulaize", "visualice", "visualyse", "visualese"],
      opinion: ["opinon", "oppinion", "opinoin", "opnion", "opinien", "opinoin"],
      familiar: ["familar", "familier", "familer", "familair", "familliar", "familar"],
      envelope: ["envelop", "envelupe", "envelpe", "envelop", "enveloppe", "envelupe"],
    };

    this.finalSequence = finalSequence || [
      { word: "word1", type: "4-option" }, // 1. culture - 4-option (easy)
      { word: "word2", type: "correct-word" }, // 2. history - correct-word (easy)
      { word: "word3", type: "word-parts" }, // 3. dessert - word-parts (easy)
      { word: "word4", type: "fillups" }, // 4. survey - fillups (intermediate)
      { word: "word5", type: "4-option" }, // 5. essay - 4-option (easy)
      { word: "word6", type: "letter-scramble" }, // 6. grammar - letter-scramble (intermediate)
      { word: "word7", type: "correct-word" }, // 7. measure - correct-word (easy)
      { word: "word8", type: "typing" }, // 8. flavour - typing (hard)
      { word: "word9", type: "word-parts" }, // 9. future - word-parts (easy)
      { word: "word10", type: "2-option" }, // 10. schedule - 2-option (intermediate)
      { word: "word11", type: "typing" }, // 11. visualise - typing (hard)
      { word: "word12", type: "fillups" }, // 12. struggle - fillups (intermediate)
      { word: "word13", type: "letter-scramble" }, // 13. fantasy - letter-scramble (intermediate)
      { word: "word14", type: "typing" }, // 14. opinion - typing (hard)
      { word: "word15", type: "4-option" }, // 15. familiar - 4-option (hard as exception)
      { word: "word16", type: "typing" }, // 16. envelope - typing (hard)
    ];

    // console.log("🔍 Word hints:", typeof wordHints);
    // console.log("🔍 Word parts data:", typeof wordPartsData);
    // console.log("🔍 Sentence templates:", typeof sentenceTemplates);
    // console.log("🔍 Word distractors:", typeof wordDistractors);
    // console.log("🔍 Final sequence:", typeof finalSequence);

    this.fillupsBlankPositions=JSON.parse(fillupsBlankPositions)||{
      'patience': [2, 3, 4,5],        // p_t_e_ce -> blanks at positions 1, 4, 6 (a, i, n)
      'careful': [1, 4, 6],         // c_r_f_l -> blanks at positions 1, 4, 6 (a, e, u)
      'aggression': [0, 1, 2, 6],   // A___ession -> blanks at positions 0, 1, 2, 6 (g, g, r)
      'architecture': [0, 4, 8, 11], // _rch_tec_ur_ -> blanks at positions 0, 4, 8, 11 (a, i, t, e)
      'petroleum': [1, 3, 6],       // p_t_ol_um -> blanks at positions 1, 3, 6 (e, r, e)
      'receive': [1, 3, 5],         // r_c_i_e -> blanks at positions 1, 3, 5 (e, e, v)
      'weather': [1, 4, 6],         // w_at_e_ -> blanks at positions 1, 4, 6 (e, h, r)
      'success': [1, 4, 6],         // s_cc_s_ -> blanks at positions 1, 4, 6 (u, e, s)
      'leisure': [0, 3, 4],         // L__sure -> blanks at positions 0, 3, 4 (e, i)
      'tolerance': [1, 3, 6, 8],    // t_l_ra_c_ -> blanks at positions 1, 3, 6, 8 (o, e, n, e)
      'necessary': [1, 4, 7],       // n_ce_sa_y -> blanks at positions 1, 4, 7 (e, s, r)
      'feasible': [1, 3, 6],        // f_a_ib_e -> blanks at positions 1, 3, 6 (e, s, l)
      'beginning': [1, 4, 7],       // b_gi_ni_g -> blanks at positions 1, 4, 7 (e, n, n)
      'rhythm': [2, 4],             // rh_th_ -> blanks at positions 2, 4 (y, m)
      'foreign': [3, 4, 5],         // f_r_ig_ -> blanks at positions 1, 3, 6 (o, e, n)
      'vacuum': [1, 3, 5],          // v_c_u_ -> blanks at positions 1, 3, 5 (a, u, m)
      'discipline': [1, 4, 7],      // d_sc_pl_ne -> blanks at positions 1, 4, 7 (i, i, i)
      'imagination': [1, 4, 8],     // i_ag_nat_on -> blanks at positions 1, 4, 8 (m, i, i)
      'sculpture': [1, 4, 7]        // s_ul_tu_e -> blanks at positions 1, 4, 7 (c, p, r)
  }

  this.twoOptionDistractors=JSON.parse(twoOptionDistractors)||{
    'category': 'catagory',        // Use 'catagory' as the distractor for category
    'careful': 'carful',          // Use 'carful' as the distractor for careful
    'aggression': 'agression',    // Use 'agression' as the distractor for aggression
    'architecture': 'architechure', // Use 'architechure' as the distractor for architecture
    'petroleum': 'petrolium',     // Use 'petrolium' as the distractor for petroleum
    'receive': 'recieve',         // Use 'recieve' as the distractor for receive
    'weather': 'wheather',        // Use 'wheather' as the distractor for weather
    'success': 'sucess',          // Use 'sucess' as the distractor for success
    'leisure': 'lishere',         // Use 'liesure' as the distractor for leisure
    'tolerance': 'tolerence',     // Use 'tolerence' as the distractor for tolerance
    'necessary': 'neccessary',    // Use 'neccessary' as the distractor for necessary
    'feasible': 'feasable',       // Use 'feasable' as the distractor for feasible
    'beginning': 'begining',      // Use 'begining' as the distractor for beginning
    'rhythm': 'rythm',            // Use 'rythm' as the distractor for rhythm
    'foreign': 'foriegn',         // Use 'foriegn' as the distractor for foreign
    'vacuum': 'vaccum',           // Use 'vaccum' as the distractor for vacuum
    'discipline': 'disipline',    // Use 'disipline' as the distractor for discipline
    'imagination': 'imagenation', // Use 'imagenation' as the distractor for imagination
    'sculpture': 'sculpcher'      // Use 'sculpcher' as the distractor for sculpture
}

    this.initializeQuestions();
    this.bindEvents();

    // Add beforeunload event to save progress when user leaves
    this.setupProgressSaving();

    // Check for existing progress before starting the game
    this.initializeGame();
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
      await this.loadGameProgress();
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
    const allWords = [...this.reviewWords, ...this.newWords];

    // Create a flexible word map that can handle any number of words up to 16
    const wordMap = {};
    for (let i = 0; i < Math.min(allWords.length, 16); i++) {
      wordMap[`word${i + 1}`] = allWords[i] || "";
    }

    // Initialize failed words tracking for review system
    if (!this.failedWordsTracker) {
      this.failedWordsTracker = new Set();
    }

    // Create questions based on the sequence
    this.finalSequence.forEach((item) => {
      const wordKey = item.word;
      const actualWord = wordMap[wordKey];

      // Skip if the word doesn't exist (in case we have fewer words than expected)
      if (!actualWord) return;

      // For word-parts type, check if data exists
      if (item.type === "word-parts" && !this.wordPartsData[actualWord]) {
        // Skip if no word parts data
        return;
      }

      // Add the question to the sequence
      this.allQuestions.push({
        word: actualWord,
        type: item.type,
        category: item.category || null,
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
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    if (this.currentQuestionIndex >= this.allQuestions.length) {
      this.showCompletion();
      return;
    }

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
      startTime: Math.round(Date.now() / 1000),
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
      const { doc, setDoc, query, collection, where, getDocs } = await import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
      );

      // Check if this word already has an entry for this user (first-time only rule)
      const existingQuery = query(
        collection(db, "user-activity"),
        where("usercode", "==", this.usercode),
        where("word", "==", this.typingAnalytics.word),
        where("gameType", "==", "typing")
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
      const docId = `${this.usercode}-${this.typingAnalytics.word}-${Date.now()}`;
      const docRef = doc(db, "user-activity", docId);

      const analyticsData = {
        ...this.typingAnalytics,
        submittedAt: new Date().toISOString(),
        gameType: "typing",
        sessionId: this.sessionId || "unknown",
      };

      await setDoc(docRef, analyticsData);
      console.log("✅ Typing analytics submitted to Firebase:", docId);

      // Mark as submitted to prevent duplicate submissions
      this.typingAnalytics.submitted = true;
    } catch (error) {
      console.error("❌ Error submitting typing analytics to Firebase:", error);
    }
  }

  displayTypingQuestion() {
    // Remove letter-scramble game class if present
    document.querySelector(".app-container").classList.remove("options-2-active");

    document.getElementById("questionType").textContent = "TYPE WHAT YOU HEAR";
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

    this.createWordBoxes();
    this.updateWordBoxes();

    // Ensure check button is disabled initially since no letters are typed
    document.getElementById("checkButton").disabled = true;
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
    if ((question.type !== "typing" && question.type !== "fillups") || this.isAnswered) return;

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
    if ((question.type !== "typing" && question.type !== "fillups") || this.isAnswered) return;

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
      this.updateWordBoxes();
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
      this.updateWordBoxes();
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
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('options-4-active');
        appContainer.classList.add('options-2-active');
    }
    
    // Show speaker button for 2-option games
    const soundButton = document.getElementById('soundButton');
    if (soundButton) {
        soundButton.style.display = 'block';
    }
    
    const questionType = document.getElementById('questionType');
    const wordInput = document.getElementById('wordInput');
    const keypad = document.getElementById('keypad');
    const wordBoxes = document.getElementById('wordBoxes');
    const optionsContainer = document.getElementById('optionsContainer');
    const keyboard = document.getElementById('keyboard');
    
    if (questionType) questionType.textContent = 'CHOOSE THE CORRECT SPELLING';
    if (wordInput) wordInput.style.display = 'none';
    if (keypad) keypad.style.display = 'none';
    if (wordBoxes) wordBoxes.style.display = 'none';
    if (keyboard) keyboard.style.display = 'none';
    if (optionsContainer) optionsContainer.style.display = 'block';
    
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
        optionsContainer.className = 'options-container options-2';
        optionsContainer.innerHTML = '';
    }
    
    // Create a single row with two options
    const row = document.createElement('div');
    row.className = 'options-row';
    
    // Reset selected option for this question
    this.selectedOption = null;
    
    // Ensure check button is disabled initially
    const checkButton = document.getElementById('checkButton');
    if (checkButton) {
        checkButton.disabled = true;
    }
    
    // Set question type for validation
    const question = this.allQuestions[this.currentQuestionIndex];
    if (question) {
        question.type = '2-option';
    }
    
    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option.toUpperCase();
        button.style.flex = '1';
        button.style.margin = '0 10px';
        
        button.addEventListener('click', () => this.selectOption(button, option));
        
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

    // Clear any existing feedback when user clicks check button
    document.getElementById("feedback").classList.remove("show");

    const question = this.allQuestions[this.currentQuestionIndex];
    let userAnswer;
    let isCorrect;

    if (["mcq", "2-option"].includes(question.type)) {
      // For multiple-choice questions, ensure an option is selected
      if (this.selectedOption === null || this.selectedOption === undefined) {
        this.showFeedback(false, "Please select an option.");
        return;
      }

      userAnswer = this.selectedOption;
      isCorrect = userAnswer.toLowerCase() === question.word.toLowerCase();
    } else if (question.type === "typing") {
      userAnswer = this.typedWord.trim().toLowerCase();
      isCorrect = userAnswer === question.word.toLowerCase();

      // Track check button analytics for typing games
      if (this.typingAnalytics) {
        const timeTaken = Math.round(Date.now() / 1000) - this.typingAnalytics.startTime;
        this.typingAnalytics.check.push({
          word: this.typedWord,
          timeTaken: timeTaken,
          isCorrect: isCorrect,
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

      if (!isCorrect && this.currentAttempt < this.maxAttempts) {
        // Show first attempt and prepare for second attempt
        this.showPreviousAttempt();
        this.prepareNextAttempt();
        return;
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
    } else if (question.type === "letter-scramble") {
      // Letter scramble game checking logic (single attempt)
      userAnswer = this.selectedOption;
      isCorrect = userAnswer && userAnswer.toLowerCase() === question.word.toLowerCase();

      // Store this attempt
      this.letterScrambleAnswers[0] = userAnswer;

      // Disable letter tiles after attempt
      this.disableLetterTiles();
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

    // Console log analytics for typing games when question is completed
    if (question.type === "typing" && this.typingAnalytics) {
      this.typingAnalytics.endTime = Math.round(Date.now() / 1000);
      console.log("Typing Game Analytics:", JSON.stringify(this.typingAnalytics, null, 2));
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
      if (question.type === "letter-scramble" || question.type === "typing") {
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
      } else if (question.type !== "letter-scramble") {
        // For other game types, show correct answer immediately
        this.showFeedback(false, `Incorrect. The correct answer is "${question.word.toUpperCase()}"`);
      }
      // Note: For letter scramble first attempt, feedback is already shown in the letter-scramble block above

      // Track failed words - any word that fails in any game goes to review
      if (!this.isPracticeMode) {
        // Add to failed words tracker for review system
        this.failedWordsTracker.add(question.word);

        // Mark word as failed for practice, regardless of category
        if (
          !this.stats.failedReviewWords.includes(question.word) &&
          !this.stats.failedNewWords.includes(question.word)
        ) {
          // Add to both arrays to maintain compatibility with existing code
          this.stats.failedReviewWords.push(question.word);
          console.log(`MARKED: Failed word for practice - ${question.word}`);
        }

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
          console.log(`Box ${i}: Added 'correct' class`);
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
            console.log(`Box ${i}: Added 'correct-position' class for letter '${letterInGuess}'`);
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
            console.log(`Box ${i}: Added 'wrong-position' class for letter '${letterInGuess}'`);
            // Decrement the count for this letter
            letterMap[letterInGuess]--;
          } else {
            box.classList.add("incorrect");
            console.log(`Box ${i}: Added 'incorrect' class for letter '${letterInGuess}'`);
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
    // Create a map to track which letters in the target word have been matched
    const letterMap = {};
    for (const letter of correctWord) {
      letterMap[letter] = (letterMap[letter] || 0) + 1;
    }

    // First pass: mark correct letters
    for (let i = 0; i < correctWord.length; i++) {
      const letterInGuess = userWord[i];
      const letterInWord = correctWord[i];

      if (letterInGuess === letterInWord) {
        // Mark this key on the keyboard
        this.updateKeyStatus(letterInGuess, "correct");
        // Decrement the count for this letter
        letterMap[letterInGuess]--;
      }
    }

    // Second pass: mark present or absent letters
    for (let i = 0; i < correctWord.length; i++) {
      const letterInGuess = userWord[i];
      const letterInWord = correctWord[i];

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
    const allFailedWords = [...this.stats.failedReviewWords, ...this.stats.failedNewWords];

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
      failedReviewWords: this.stats.failedReviewWords,
      failedNewWords: this.stats.failedNewWords,
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
    const allFailedWords = [...this.stats.failedReviewWords, ...this.stats.failedNewWords];

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
      const isComplete = this.typedWord.length === this.maxLength;
      checkButton.disabled = !isComplete;
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
    } else {
      // Default behavior for other game types
      checkButton.disabled = false;
    }
  }

  displayWordHint(word) {
    const hintElement = document.getElementById("wordHint");
    const hintTextElement = document.getElementById("hintText");
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];

    // Hide hint for correct-word game type
    if (currentQuestion && currentQuestion.type === "correct-word") {
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

  async nextQuestion() {
    // Clear any existing feedback when user clicks continue button
    document.getElementById("feedback").classList.remove("show");

    // Stop all speech synthesis immediately when moving to next question
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // Submit typing analytics to Firebase when moving to next question
    const currentQuestion = this.allQuestions[this.currentQuestionIndex];
    if (currentQuestion && currentQuestion.type === "typing" && this.typingAnalytics) {
      await this.submitTypingAnalyticsToFirebase();
    }

    // Check for pending streak celebrations (from thunder animations)
    if (this.pendingStreakCelebration > 0) {
      const streakToShow = this.pendingStreakCelebration;
      this.pendingStreakCelebration = 0; // Clear pending celebration
      this.showStreakCelebration(streakToShow);
      return; // Streak celebration will handle moving to next question
    }

    this.currentQuestionIndex++;

    // Save progress after each question
    await this.updateGameAnalytics();

    this.displayCurrentQuestion();
  }

  preloadLottieAnimations() {
    // Define all Lottie animations to preload
    const animations = [
      "lottie/3inarow2.lottie",
      "lottie/3inarow3.lottie",
      "lottie/3inarow4.lottie",
      "lottie/Fire.lottie",
      "lottie/5inarow.lottie",
      "lottie/5inarow2.lottie",
      "lottie/5inarow3.lottie",
      "lottie/10inarow.lottie",
      "lottie/10inarow2.lottie",
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

      console.log(`Preloading animation: ${animation}`);
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
    const threeInARowAnimations = [
      "lottie/3inarow2.lottie",
      "lottie/3inarow3.lottie",
      "lottie/3inarow4.lottie",
      "lottie/Fire.lottie",
    ];
    const fiveInARowAnimations = ["lottie/5inarow.lottie", "lottie/5inarow2.lottie", "lottie/5inarow3.lottie"];
    const tenInARowAnimations = ["lottie/10inarow.lottie", "lottie/10inarow2.lottie"];

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
    const thunderSound = new Audio("./sound.mp3");
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
      fetch("./thunder2.riv")
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
                console.log(`Thunder animation loaded for ${streakCount}-in-a-row streak`);
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
    document.getElementById("feedback").classList.remove("show");
    document.getElementById("checkButton").style.display = "inline-block";

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
    const allFailedWords = [...this.stats.failedReviewWords, ...this.stats.failedNewWords];

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

    // Save points to localStorage before redirecting
    localStorage.setItem("dailyChallengePoints", points);

    // Redirect to the completion page with user code
    window.location.href = `complete.html?code=${this.usercode}`;
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
    localStorage.removeItem("currentGameSession");
    localStorage.removeItem(`gameProgress-${this.usercode}`);
    this.sessionId = this.generateSessionId(); // Generate new sessionId
  }

  // Game Analytics Functions
  generateSessionId() {
    // Generate a unique session ID using timestamp and random string
    const timestamp = Date.now().toString(36);
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
            cleaned[key] = { correct: 0, total: 0, wordsToLearn: [], failedReviewWords: [], failedNewWords: [] };
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
            cleaned[key] = new Date().toISOString();
            break;
          default:
            cleaned[key] = value;
        }
      }
    }
    return cleaned;
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

      // Check if this user already has game analytics saved (first-time only rule)
      const docRef = doc(db, "game-analytics", this.usercode);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        console.log(
          `⚠️ Game analytics already exists for user ${this.usercode}. Skipping save (first-time only rule).`
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
        lastUpdated: new Date().toISOString(),
        gameStarted: this.gameStarted,
        isCompleted: false,
      };

      const cleanedData = this.cleanDataForFirebase(gameAnalyticsData);
      await setDoc(docRef, cleanedData);
      console.log("✅ Game progress saved to Firebase");
    } catch (error) {
      console.error("❌ Error saving game progress:", error);
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

      const docRef = doc(db, "game-analytics", this.usercode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Check if game is already completed
        if (data.isCompleted) {
          console.log("🎯 Game already completed, starting fresh");
          await this.deleteGameAnalytics();
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
        this.gameStarted = new Date().toISOString();
      }
    } catch (error) {
      console.error("❌ Error loading game progress:", error);
      this.gameStarted = new Date().toISOString();
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

      // Check if this user already has game analytics saved (first-time only rule)
      const docRef = doc(db, "game-analytics", this.usercode);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        console.log(
          `⚠️ Game analytics already exists for user ${this.usercode}. Skipping update (first-time only rule).`
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
        lastUpdated: new Date().toISOString(),
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

      // Check if this user already has game analytics saved (first-time only rule)
      const docRef = doc(db, "game-analytics", this.usercode);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        console.log(
          `⚠️ Game analytics already exists for user ${this.usercode}. Skipping mark completed (first-time only rule).`
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
        lastUpdated: new Date().toISOString(),
        gameStarted: this.gameStarted,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };

      const cleanedData = this.cleanDataForFirebase(gameAnalyticsData);
      await setDoc(docRef, cleanedData);
      console.log("✅ Game marked as completed");

      // Delete analytics after a short delay to allow for any final processing
      setTimeout(() => {
        this.deleteGameAnalytics();
      }, 2000);
    } catch (error) {
      console.error("❌ Error marking game as completed:", error);
    }
  }

  async deleteGameAnalytics() {
    if (!db) return;

    // Skip Firebase operations in test mode
    if (this.isTestMode) {
      console.log("🧪 TEST MODE: Skipping delete game analytics from Firebase");
      return;
    }

    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

      const docRef = doc(db, "game-analytics", this.usercode);
      await deleteDoc(docRef);
      console.log("✅ Game analytics deleted for user:", this.usercode);
    } catch (error) {
      console.error("❌ Error deleting game analytics:", error);
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
        lastUpdated: new Date().toISOString(),
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
    // Record game start time
    const gameStartTime = new Date().toISOString();
    localStorage.setItem('gameStartTime', gameStartTime);
    localStorage.setItem('currentUserCode', code);
    console.log('🎮 Game started at:', gameStartTime, 'for user:', code);
    
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
        app = new SpellingApp(
          code,
          questionData.reviewWords,
          questionData.newWords,
          JSON.parse(questionData.wordHints),
          JSON.parse(questionData.wordPartsData),
          JSON.parse(questionData.sentenceTemplates),
          JSON.parse(questionData.wordDistractors),
          questionData.gameSequence,
          JSON.parse(questionData.fillupsBlankPositions),
          JSON.parse(questionData.twoOptionDistractors)

        );
      } else {
        console.log("❌ Questions not loaded, staying on username screen");
        startBtn.disabled = false;
        startBtn.textContent = "Start Game";
      }
    } catch (error) {
      console.error("Error loading questions:", error);
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
  const userCode = urlParams.get("code") || localStorage.getItem("currentUserCode");
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

        // Identify user if needed
        const logRocketUserId = localStorage.getItem("auth_userId");
        const logRocketUserName = localStorage.getItem("auth_name");
        if (logRocketUserId) {
          LogRocket.identify(logRocketUserId, {
            name: logRocketUserName || "Spelling Drill Player",
            gameType: "spelling_drill",
          });
        }

        console.log("✅ LogRocket initialized successfully for user:", userCode);
      } catch (error) {
        console.error("❌ LogRocket initialization failed:", error);
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
    // console.log("✅ Successfully fetched questions from Firebase:");
    // console.log("👤 Document ID:", userCode);
    // console.log("📝 Document data:", documentData);

    // Return the document data (which should contain the questions)
    return documentData;
  } catch (error) {
    console.error("❌ Error fetching questions from Firebase:", error);
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
