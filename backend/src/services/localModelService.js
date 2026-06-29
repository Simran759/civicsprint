const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

function extractJsonPayload(text) {
  if (!text) return null;

  const cleaned = text.trim();
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : cleaned;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1);
  }

  return candidate;
}

async function generateStructuredLocalResponse(prompt) {
  try {
    const response = await fetch(`${ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: `${prompt}\n\nReturn valid JSON only.`,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.response || '';
    const payload = extractJsonPayload(rawText);

    if (!payload) {
      return null;
    }

    return JSON.parse(payload);
  } catch (error) {
    console.warn('Local Ollama model unavailable, falling back to built-in logic.', error.message);
    return null;
  }
}

module.exports = {
  generateStructuredLocalResponse,
};
