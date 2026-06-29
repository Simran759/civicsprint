const AI_PROVIDER = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

function isAiEnabled() {
  return AI_PROVIDER !== 'off';
}

function useGeminiVision() {
  return AI_PROVIDER !== 'off'; // We'll always attempt Gemini for vision since Ollama vision isn't fully configured here, unless AI is off completely.
}

function getPrimaryProvider() {
  return AI_PROVIDER === 'gemini' ? 'gemini' : 'ollama';
}

module.exports = {
  AI_PROVIDER,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  isAiEnabled,
  useGeminiVision,
  getPrimaryProvider,
};
