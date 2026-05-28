// AI API client - OpenAI compatible format

const DEFAULT_TIMEOUT = 60000; // 60s timeout

function getHostPattern(apiUrl) {
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error('API 地址格式不正确');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('API 地址必须以 http:// 或 https:// 开头');
  }

  return `${parsed.protocol}//${parsed.hostname}/*`;
}

export async function ensureApiHostPermission(apiUrl) {
  if (typeof chrome === 'undefined' || !chrome.permissions) return true;

  const origins = [getHostPattern(apiUrl)];
  const hasPermission = await chrome.permissions.contains({ origins });
  if (hasPermission) return true;

  const granted = await chrome.permissions.request({ origins });
  if (!granted) {
    throw new Error('需要授权访问该 API 域名后才能发送请求');
  }

  return true;
}

class AIClient {
  constructor() {
    this.controller = null;
  }

  async request({ apiUrl, apiKey, modelName, messages, temperature = 0.3, maxTokens = 100000, onChunk }) {
    this.abort();
    await ensureApiHostPermission(apiUrl);
    this.controller = new AbortController();

    const timeout = setTimeout(() => this.abort(), DEFAULT_TIMEOUT);

    try {
      const url = `${apiUrl.replace(/\/+$/, '')}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          stream: !!onChunk,
        }),
        signal: this.controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text().catch(() => '');
        throw new Error(`API 请求失败 (${response.status}): ${error || response.statusText}`);
      }

      if (onChunk) {
        return this._handleStream(response, onChunk);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      if (err.name === 'TimeoutError' || err.message.includes('AbortError')) {
        throw new Error('请求超时，请检查网络连接');
      }
      throw err;
    }
  }

  async _handleStream(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(fullContent, delta);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      throw err;
    }

    return fullContent;
  }

  abort() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

export const aiClient = new AIClient();
