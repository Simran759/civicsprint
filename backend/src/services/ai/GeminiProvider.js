const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const AIProvider = require('./AIProvider');

class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super('gemini');
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.client = new GoogleGenAI({ apiKey });
    } else {
      console.warn('[GeminiProvider] WARNING: GEMINI_API_KEY is not configured or is default.');
      this.client = null;
    }
  }

  isConfigured() {
    return this.client !== null;
  }

  async generateContent(prompt, options = {}) {
    if (!this.isConfigured()) throw new Error('Gemini API key is missing');
    
    const startTime = Date.now();
    try {
      const config = {};
      if (options.responseFormat === 'json') {
        config.responseMimeType = 'application/json';
        if (options.schema) {
          config.responseSchema = options.schema;
        }
      }

      const response = await this.client.models.generateContent({
        model: options.model || 'gemini-2.5-flash',
        contents: prompt,
        config
      });

      const latency = Date.now() - startTime;

      if (options.responseFormat === 'json') {
        return {
          parsed: JSON.parse(response.text),
          raw: response.text,
          latency,
          provider: this.name,
          model: options.model || 'gemini-2.5-flash'
        };
      }

      return {
        text: response.text,
        latency,
        provider: this.name,
        model: options.model || 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error(`[GeminiProvider] Error:`, error.message);
      throw error;
    }
  }

  async generateVisionContent(prompt, imagePath, mimeType, options = {}) {
    if (!this.isConfigured()) throw new Error('Gemini API key is missing');
    
    const startTime = Date.now();
    try {
      const getImageBuffer = async (p) => {
        if (p.startsWith('http://') || p.startsWith('https://')) {
          const res = await fetch(p);
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
        return fs.readFileSync(p);
      };

      const imagePart = {
        inlineData: {
          data: (await getImageBuffer(imagePath)).toString('base64'),
          mimeType,
        },
      };

      const config = {};
      if (options.responseFormat === 'json') {
        config.responseMimeType = 'application/json';
        if (options.schema) {
          config.responseSchema = options.schema;
        }
      }

      let contents = [imagePart, prompt];
      // Support for multiple images (like before/after)
      if (options.additionalImage) {
         const extraImagePart = {
           inlineData: {
             data: (await getImageBuffer(options.additionalImage.path)).toString('base64'),
             mimeType: options.additionalImage.mimeType
           }
         };
         contents = [imagePart, extraImagePart, prompt];
      }

      const response = await this.client.models.generateContent({
        model: options.model || 'gemini-2.5-flash',
        contents,
        config
      });

      const latency = Date.now() - startTime;

      if (options.responseFormat === 'json') {
        return {
          parsed: JSON.parse(response.text),
          raw: response.text,
          latency,
          provider: this.name,
          model: options.model || 'gemini-2.5-flash'
        };
      }

      return {
        text: response.text,
        latency,
        provider: this.name,
        model: options.model || 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error(`[GeminiProvider] Vision Error:`, error.message);
      throw error;
    }
  }
}

module.exports = GeminiProvider;
