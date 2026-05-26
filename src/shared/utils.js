// Utility functions

// Smart text chunking - split by natural boundaries
function chunkText(text, maxChunkSize = 3000) {
  if (text.length <= maxChunkSize) return [text];

  const chunks = [];
  // Split by double newlines first (paragraph boundaries)
  const paragraphs = text.split(/\n\s*\n/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      // If single paragraph is too long, split by single newlines
      if (para.length > maxChunkSize) {
        const subChunks = chunkByLines(para.trim(), maxChunkSize);
        chunks.push(...subChunks);
        current = '';
      } else {
        current = para;
      }
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function chunkByLines(text, maxChunkSize) {
  const chunks = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if ((current + '\n' + line).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Try to parse JSON from AI response
function parseAIResult(text) {
  if (!text) return null;

  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract from markdown code blocks (```json, ```, or any language)
    const codeBlockMatch = text.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // Code block content is not valid JSON, continue to next strategy
      }
    }

    // Try extracting from <json> tags
    const tagMatch = text.match(/<json>\s*([\s\S]*?)\s*<\/json>/);
    if (tagMatch) {
      try {
        return JSON.parse(tagMatch[1].trim());
      } catch {
        // Continue to next strategy
      }
    }

    // Try extracting each {...} block individually (handles multiple JSON objects or extra text)
    const blocks = extractJSONBlocks(text);
    for (const block of blocks) {
      try {
        return JSON.parse(block);
      } catch {
        // Try fixing common issues
        const fixed = fixJSON(block);
        try {
          return JSON.parse(fixed);
        } catch {
          // Continue to next block
        }
      }
    }
    return null;
  }
}

// Extract individual {...} blocks respecting nesting depth
function extractJSONBlocks(text) {
  const blocks = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // If unmatched opening brace, take from start to end
  if (depth > 0 && start !== -1) {
    blocks.push(text.slice(start));
  }

  return blocks;
}

// Fix common JSON issues (unescaped newlines in strings, trailing commas)
function fixJSON(str) {
  // Remove trailing commas before } or ]
  str = str.replace(/,\s*([}\]])/g, '$1');
  return str;
}

// Format timestamp
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate filename with timestamp
function generateFilename(ext) {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `AI学习记录_${ts}.${ext}`;
}

// Export formatters
function exportToTXT(records) {
  return records.map(r => {
    const result = r.result || {};
    const questions = result.questions || [];
    const header = `=== ${new Date(r.timestamp).toLocaleString('zh-CN')} ===\n来源: ${r.sourceUrl || '未知'}\n\n`;
    const body = questions.map(q => {
      let text = `【${q.type || '未知'}】\n${q.content}\n`;
      if (q.options?.length) text += q.options.join('\n') + '\n';
      text += `答案: ${q.answer || '未知'}\n`;
      if (q.code?.java) text += `\nJava代码:\n${q.code.java}\n`;
      if (q.code?.python) text += `\nPython代码:\n${q.code.python}\n`;
      if (q.code?.cpp || q.code?.c) text += `\nC++代码:\n${q.code.cpp || q.code.c}\n`;
      if (q.explanation) text += `\n解析: ${q.explanation}\n`;
      return text;
    }).join('\n---\n\n');
    return header + body;
  }).join('\n\n========================\n\n');
}

function exportToMD(records) {
  return records.map(r => {
    const result = r.result || {};
    const questions = result.questions || [];
    const header = `## ${new Date(r.timestamp).toLocaleString('zh-CN')} (来源: ${r.sourceUrl || '未知'})\n\n`;
    const body = questions.map((q, i) => {
      let md = `### ${i + 1}. ${q.type || '未知'}\n\n${q.content}\n\n`;
      if (q.options?.length) md += q.options.join('  \n') + '\n\n';
      md += `**答案:** ${q.answer || '未知'}\n\n`;
      if (q.code?.java) md += `\n\`\`\`java\n${q.code.java}\n\`\`\`\n\n`;
      if (q.code?.python) md += `\n\`\`\`python\n${q.code.python}\n\`\`\`\n\n`;
      if (q.code?.cpp || q.code?.c) md += `\n\`\`\`cpp\n${q.code.cpp || q.code.c}\n\`\`\`\n\n`;
      if (q.explanation) md += `**解析:** ${q.explanation}\n\n`;
      return md;
    }).join('---\n\n');
    return header + body;
  }).join('\n---\n\n');
}

function exportToJSON(records) {
  return JSON.stringify(records.map(r => ({
    timestamp: r.timestamp,
    sourceUrl: r.sourceUrl,
    result: r.result,
  })), null, 2);
}

// Download helper
function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export {
  chunkText,
  parseAIResult,
  formatTime,
  generateFilename,
  exportToTXT,
  exportToMD,
  exportToJSON,
  downloadFile,
};
