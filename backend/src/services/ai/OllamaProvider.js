const AIProvider = require('./AIProvider');

class OllamaProvider extends AIProvider {
  constructor(baseUrl, model) {
    super('ollama');
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.model = model;
  }

  extractJsonPayload(text) {
    if (!text) return null;

    const cleaned = text.trim();
    const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1] : cleaned;

    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      return candidate.slice(firstBrace, lastBrace + 1);
    }

    return candidate;
  }

  async generateContent(prompt, options = {}) {
    const responseFormat = options.responseFormat || 'text';
    const finalPrompt = responseFormat === 'json' ? `${prompt}\n\nReturn valid JSON only.` : prompt;

    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: finalPrompt,
          stream: false,
          format: responseFormat === 'json' ? 'json' : undefined,
          options: { temperature: options.temperature || 0.1 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.response || '';
      
      const latency = Date.now() - startTime;

      if (responseFormat === 'json') {
        const payload = this.extractJsonPayload(rawText);
        if (!payload) {
          throw new Error('Failed to extract JSON from Ollama response');
        }
        return {
          parsed: JSON.parse(payload),
          raw: rawText,
          latency,
          provider: this.name,
          model: this.model
        };
      }

      return {
        text: rawText,
        latency,
        provider: this.name,
        model: this.model
      };
    } catch (error) {
      console.error(`[OllamaProvider] Error:`, error.message);
      throw error;
    }
  }

  async generateVisionContent(prompt, imagePath, mimeType, options = {}) {
    // Ollama vision models (like llava) exist but are not configured by default in our setup.
    // For now, throw an error so the factory handles fallback or indicates limitation.
    throw new Error('OllamaProvider currently does not support vision tasks in this configuration.');
  }
}

module.exports = OllamaProvider;
