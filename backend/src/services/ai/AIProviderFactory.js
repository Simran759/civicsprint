const crypto = require('crypto');
const fs = require('fs');
const { AI_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL } = require('../../utils/aiConfig');
const OllamaProvider = require('./OllamaProvider');
const GeminiProvider = require('./GeminiProvider');
const AICache = require('../../models/AICache');

class AIProviderFactory {
  constructor() {
    this.providers = {
      ollama: new OllamaProvider(OLLAMA_BASE_URL, OLLAMA_MODEL),
      gemini: new GeminiProvider(process.env.GEMINI_API_KEY)
    };
  }

  getPrimaryProvider() {
    return AI_PROVIDER === 'gemini' ? this.providers.gemini : this.providers.ollama;
  }

  getVisionProvider() {
    // Ollama vision is not fully configured, so we always prefer Gemini for vision
    return this.providers.gemini;
  }

  _generateCacheKey(prompt, imagePath = null) {
    const hash = crypto.createHash('sha256');
    hash.update(prompt);
    const promptHash = hash.digest('hex');

    let imageHash = null;
    if (imagePath && fs.existsSync(imagePath)) {
      const imgHash = crypto.createHash('sha256');
      imgHash.update(fs.readFileSync(imagePath));
      imageHash = imgHash.digest('hex');
    }

    return { promptHash, imageHash };
  }

  async generateContent(prompt, options = {}) {
    const { promptHash } = this._generateCacheKey(prompt);
    
    try {
      const cached = await AICache.findOne({ promptHash, imageHash: null });
      if (cached) {
        console.log(`[AI Cache Hit] Reusing stored response for prompt from ${cached.provider}.`);
        return cached.response;
      }
    } catch (dbError) {
      console.warn('[AI Cache Warning] Could not connect to cache DB:', dbError.message);
    }

    const primary = this.getPrimaryProvider();
    const secondary = primary.name === 'ollama' ? this.providers.gemini : this.providers.ollama;

    const startTime = Date.now();
    let result;
    let providerName = primary.name;

    try {
      result = await primary.generateContent(prompt, options);
    } catch (error) {
      console.warn(`[AI Fallback] Primary provider ${primary.name} failed. Attempting fallback to ${secondary.name}.`, error.message);
      try {
        result = await secondary.generateContent(prompt, options);
        result.fallbackStatus = true;
        providerName = secondary.name;
      } catch (fallbackError) {
        console.error(`[AI Fallback] Secondary provider ${secondary.name} also failed.`, fallbackError.message);
        throw new Error('All AI providers failed to generate content.');
      }
    }

    const latencyMs = Date.now() - startTime;

    try {
      await AICache.create({
        promptHash,
        imageHash: null,
        provider: providerName,
        response: result,
        latencyMs
      });
    } catch (dbError) {
      console.warn('[AI Cache Warning] Failed to save response to cache:', dbError.message);
    }

    return result;
  }

  async generateVisionContent(prompt, imagePath, mimeType, options = {}) {
    const { promptHash, imageHash } = this._generateCacheKey(prompt, imagePath);
    
    try {
      const cached = await AICache.findOne({ promptHash, imageHash });
      if (cached) {
        console.log(`[AI Cache Hit] Reusing stored response for vision prompt from ${cached.provider}.`);
        return cached.response;
      }
    } catch (dbError) {
      console.warn('[AI Cache Warning] Could not connect to cache DB:', dbError.message);
    }

    const provider = this.getVisionProvider();
    const startTime = Date.now();
    let result;
    
    // We try to call Gemini. If it fails, we retry once.
    let retries = 1;
    while (retries >= 0) {
      try {
        result = await provider.generateVisionContent(prompt, imagePath, mimeType, options);
        break; // Success
      } catch (error) {
        if (retries === 0) {
          console.error(`[AI Vision] Provider ${provider.name} failed after retries.`, error.message);
          throw new Error('Vision AI provider failed to generate content.');
        }
        console.warn(`[AI Vision] Provider ${provider.name} failed. Retrying... (${retries} retries left)`, error.message);
        retries--;
      }
    }

    const latencyMs = Date.now() - startTime;

    try {
      await AICache.create({
        promptHash,
        imageHash,
        provider: provider.name,
        response: result,
        latencyMs
      });
    } catch (dbError) {
      console.warn('[AI Cache Warning] Failed to save vision response to cache:', dbError.message);
    }

    return result;
  }
}

// Export a singleton instance
module.exports = new AIProviderFactory();
