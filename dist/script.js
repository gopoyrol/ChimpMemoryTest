function memoryTest() {
  return {
    // Game state
    gameState: 'start', // start, memorize, recall, success, fail
    level: 1,
    score: 0,
    showSettings: false,
    darkMode: true,

    // Settings
    settings: {
      sound: true,
      vibration: true,
      customMemorizeTime: 3
    },

    // High scores
    highScores: {
      easy: 0,
      medium: 0,
      hard: 0
    },

    // Audio context for sound effects
    audioContext: null,

    // Difficulty settings
    difficulty: 'medium',
    difficulties: {
      easy: {
        label: 'Easy',
        gridSize: 9,
        memorizeTime: 4,
        startingSequence: 2,
        description: '3x3 grid, longer memorization time, starts with 2 numbers'
      },
      medium: {
        label: 'Medium',
        gridSize: 16,
        memorizeTime: 2,
        startingSequence: 3,
        description: '4x4 grid, standard memorization time, starts with 3 numbers'
      },
      hard: {
        label: 'Hard',
        gridSize: 25,
        memorizeTime: 1,
        startingSequence: 4,
        description: '5x5 grid, shorter memorization time, starts with 4 numbers'
      }
    },

    // Game data
    sequence: [],
    selected: [],
    memorizeTimeLeft: 3,
    memorizeTimer: null,

    // Initialize the game
    init() {
      // Load settings from localStorage
      this.loadSettings();
      // Set initial difficulty
      this.setDifficulty('medium');
      // Apply dark mode if enabled
      this.applyDarkMode();
      // Initialize audio context
      this.initAudio();
    },

    // Initialize audio context for sound effects
    initAudio() {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.log('Web Audio API not supported');
      }
    },

    // Play sound effect
    playSound(frequency, duration, type = 'sine') {
      if (!this.settings.sound || !this.audioContext) return;

      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
      } catch (e) {
        console.log('Error playing sound:', e);
      }
    },

    // Vibrate on mobile devices
    vibrate(pattern) {
      if (!this.settings.vibration) return;

      if (navigator.vibrate) {
        try {
          navigator.vibrate(pattern);
        } catch (e) {
          console.log('Vibration not supported');
        }
      }
    },

    // Load settings from localStorage
    loadSettings() {
      const savedData = localStorage.getItem('chimpMemoryGame');

      if (savedData) {
        const data = JSON.parse(savedData);

        // Load settings with defaults
        this.settings = { 
          sound: true,
          vibration: true,
          customMemorizeTime: 3,
          ...data.settings 
        };

        // Load high scores
        this.highScores = {
          easy: 0,
          medium: 0,
          hard: 0,
          ...data.highScores
        };

        // Load dark mode
        this.darkMode = data.darkMode || false;
      }
    },

    // Save settings to localStorage
    saveSettings() {
      const data = {
        settings: this.settings,
        highScores: this.highScores,
        darkMode: this.darkMode
      };

      localStorage.setItem('chimpMemoryGame', JSON.stringify(data));
    },

    // Toggle dark mode
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      this.applyDarkMode();
      this.saveSettings();
    },

    // Apply dark mode to document
    applyDarkMode() {
      if (this.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      }
    },

    // Set difficulty level
    setDifficulty(level) {
      this.difficulty = level;
      this.level = this.difficulties[level].startingSequence;
      this.score = 0;
    },

    // Start a new game
    startGame() {
      this.gameState = 'memorize';
      this.sequence = this.generateSequence();
      this.selected = [];
      // Use custom time if set, otherwise use difficulty default
      this.memorizeTimeLeft = this.settings.customMemorizeTime || this.difficulties[this.difficulty].memorizeTime;
      this.startMemorizeTimer();

      // Play start sound
      this.playSound(523.25, 0.3); // C5
      this.vibrate(100);
    },

    // Generate a random sequence of positions
    generateSequence() {
      const sequence = [];
      const gridSize = this.difficulties[this.difficulty].gridSize;
      const positions = Array.from({length: gridSize}, (_, i) => i + 1);

      // Shuffle positions and take the first 'level' number of items
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      return positions.slice(0, this.level);
    },

    // Start the memorization timer
    startMemorizeTimer() {
      this.memorizeTimer = setInterval(() => {
        this.memorizeTimeLeft--;

        if (this.memorizeTimeLeft <= 0) {
          clearInterval(this.memorizeTimer);
          this.gameState = 'recall';
          // Play transition sound
          this.playSound(659.25, 0.5); // E5
          this.vibrate([100, 50, 100]);
        }
      }, 1000);
    },

    // Check if a selection is correct
    isCorrectSelection(position) {
      const index = this.selected.indexOf(position);
      return index !== -1 && this.sequence[index] === position;
    },

    // Handle grid click during recall phase
    handleGridClick(position) {
      if (this.gameState !== 'recall') return;

      // Add to selected if not already selected
      if (!this.selected.includes(position)) {
        this.selected.push(position);

        // Check if selection is correct so far
        const currentIndex = this.selected.length - 1;
        if (this.selected[currentIndex] !== this.sequence[currentIndex]) {
          // Incorrect selection - game over
          this.gameState = 'fail';
          // Play failure sound
          this.playSound(220, 0.8, 'square'); // A3
          this.vibrate([200, 100, 200, 100, 200]);
          // Update high score if applicable
          this.updateHighScore();
          return;
        }

        // Play correct selection sound
        this.playSound(523.25 + (currentIndex * 100), 0.2); // Ascending tones
        this.vibrate(50);

        // Check if all correct selections have been made
        if (this.selected.length === this.sequence.length) {
          // Level completed successfully
          this.score += this.level * this.difficulties[this.difficulty].gridSize;
          this.gameState = 'success';
          // Play success sound
          this.playSound(1046.50, 0.6); // C6
          this.vibrate([100, 50, 100, 50, 200]);
          this.updateHighScore();
        }
      }
    },

    // Update high score
    updateHighScore() {
      if (this.score > (this.highScores[this.difficulty] || 0)) {
        this.highScores[this.difficulty] = this.score;
        this.saveSettings();
        // Play new high score sound
        if (this.gameState === 'success') {
          setTimeout(() => {
            this.playSound(1318.51, 0.8); // E6
            this.vibrate([300, 100, 300]);
          }, 500);
        }
      }
    },

    // Proceed to next level
    nextLevel() {
      this.level++;
      this.startGame();
    },

    // Reset the game
    resetGame() {
      this.gameState = 'start';
      this.level = this.difficulties[this.difficulty].startingSequence;
      this.score = 0;
      this.sequence = [];
      this.selected = [];
      clearInterval(this.memorizeTimer);
      // Play reset sound
      this.playSound(392, 0.3); // G4
      this.vibrate(150);
    },

    // Reset high scores
    resetHighScores() {
      this.highScores = { easy: 0, medium: 0, hard: 0 };
      this.saveSettings();
      // Play reset sound
      this.playSound(261.63, 0.5); // C4
      this.vibrate(200);
    }
  }
}