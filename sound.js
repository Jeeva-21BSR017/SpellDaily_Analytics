// Sound Manager for downloading and caching audio files
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.soundCache = new Map(); // Cache for storing decoded audio buffers
        this.baseUrl = 'https://ark-polly-test.s3.ap-south-1.amazonaws.com/audio';
        this.isInitialized = false;
    }

    // Initialize the audio context (must be called after user interaction)
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            console.log('SoundManager initialized');
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    // Download and cache a single sound
    async downloadSound(word) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.soundCache.has(word)) {
            return this.soundCache.get(word);
        }

        try {
            const url = `${this.baseUrl}/${word}/${word}.mp3`;
            console.log(`Downloading sound for: ${word}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Cache the decoded audio buffer
            this.soundCache.set(word, audioBuffer);
            console.log(`Sound cached for: ${word}`);
            
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to download sound for ${word}:`, error);
            return null;
        }
    }

    // Download multiple sounds concurrently
    async downloadSounds(words) {
        if (!Array.isArray(words)) {
            console.error('Words must be an array');
            return;
        }

        console.log(`Downloading ${words.length} sounds...`);
        
        const downloadPromises = words.map(word => this.downloadSound(word));
        
        try {
            const results = await Promise.allSettled(downloadPromises);
            
            const successful = results.filter(result => result.status === 'fulfilled' && result.value !== null);
            const failed = results.filter(result => result.status === 'rejected' || result.value === null);
            
            console.log(`Successfully downloaded: ${successful.length} sounds`);
            console.log(`Failed to download: ${failed.length} sounds`);
            
            return {
                successful: successful.length,
                failed: failed.length,
                total: words.length
            };
        } catch (error) {
            console.error('Error downloading sounds:', error);
        }
    }

    // Play a cached sound
    async playSound(word, volume = 1.0) {
        if (!this.isInitialized) {
            console.warn('SoundManager not initialized. Call initialize() first.');
            throw new Error("SoundManager not initialized. Call initialize() first.")
        }

        let audioBuffer = this.soundCache.get(word);
        
        // If not cached, try to download it
        if (!audioBuffer) {
            console.log(`Sound not cached for ${word}, downloading...`);
            audioBuffer = await this.downloadSound(word);
        }

        if (!audioBuffer) {
            console.error(`Cannot play sound for: ${word}`);
            throw new Error(`Cannot play sound for: ${word}`)
        }

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = audioBuffer;
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start(0);
            console.log(`Playing sound for: ${word}`);
        } catch (error) {
            console.error(`Error playing sound for ${word}:`, error);
            throw error;
        }
    }

    // Check if a sound is cached
    isCached(word) {
        return this.soundCache.has(word);
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cachedSounds: this.soundCache.size,
            cachedWords: Array.from(this.soundCache.keys())
        };
    }

    // Clear the cache
    clearCache() {
        this.soundCache.clear();
        console.log('Sound cache cleared');
    }

}

// Create a global instance
const soundManager = new SoundManager();

// Legacy function for backward compatibility
async function downloadSound(words) {
    if (typeof words === 'string') {
        return await soundManager.downloadSound(words);
    } else if (Array.isArray(words)) {
        return await soundManager.downloadSounds(words);
    } else {
        console.error('Invalid input: words must be a string or array of strings');
    }
}

// Utility functions for easy access
async function playWordFromS3(word, volume = 1.0) {
    return await soundManager.playSound(word, volume);
}


function initializeSounds() {
    return soundManager.initialize();
}

window.initializeSounds = initializeSounds;
window.playWordFromS3 = playWordFromS3;
window.downloadSound = downloadSound;

