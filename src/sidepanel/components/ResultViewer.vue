<template>
  <div class="result-viewer">
    <div class="result-header">
      <span>解析结果 ({{ questions.length }} 题)</span>
      <div class="result-actions">
        <button class="btn btn-sm btn-secondary" @click="autoSelect" :disabled="!canAutoSelect">
          自动选中 ({{ autoSelected }})
        </button>
        <button class="btn btn-sm btn-secondary" @click="copyAll">复制全部</button>
      </div>
    </div>

    <!-- Show raw response when JSON parsing failed -->
    <div v-if="questions.length === 0 && rawText" class="raw-response card">
      <div class="raw-header">
        AI 原始回复（JSON 解析失败）
        <button class="btn btn-sm btn-secondary" @click="copyRaw">复制</button>
      </div>
      <div class="raw-hint">
        建议：1) 精简抓取内容，只保留题目部分 2) 设置页「恢复默认」Prompt 3) 切换更强模型
      </div>
      <pre class="raw-text">{{ rawText }}</pre>
    </div>

    <div v-for="(q, index) in questions" :key="q.id || index" class="question-card card">
      <div class="question-header">
        <span class="question-num">#{{ index + 1 }}</span>
        <span class="badge badge-accent">{{ q.type || '未知' }}</span>
      </div>

      <div class="question-content">{{ q.content }}</div>

      <div v-if="q.options?.length" class="question-options">
        <div v-for="(opt, i) in q.options" :key="i" class="option">
          {{ opt }}
        </div>
      </div>

      <!-- Answer -->
      <div class="question-answer">
        <strong>答案:</strong> {{ q.answer || '未知' }}
        <button v-if="q.answer && q.answer !== '未知'" class="btn btn-sm btn-secondary copy-answer" @click="copyText(q.answer)">
          复制
        </button>
      </div>

      <!-- Code blocks for programming questions -->
      <div v-if="q.code" class="code-section">
        <div class="code-tabs">
          <button
            v-for="lang in getAvailableLangs(q.code)"
            :key="lang"
            :class="['code-tab', { active: codeLangs[q.id || index] === lang }]"
            @click="codeLangs[q.id || index] = lang"
          >
            {{ lang === 'cpp' ? 'C++' : lang.toUpperCase() }}
          </button>
          <button class="btn btn-sm btn-secondary copy-code" @click="copyCode(q, index)">
            复制代码
          </button>
        </div>
        <pre class="code-block"><code>{{ getCode(q, index) }}</code></pre>
      </div>

      <!-- Explanation -->
      <div v-if="q.explanation" class="question-explanation">
        <strong>解析:</strong>
        <div class="explanation-text">
          <div v-for="(part, pi) in parseExplanation(q.explanation)" :key="pi" class="exp-part">
            <strong v-if="part.title" class="exp-title">{{ part.title }}</strong>{{ part.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  result: { type: Object, required: true },
  rawText: { type: String, default: '' },
});

const questions = computed(() => props.result?.questions || []);
const codeLangs = ref({});
const autoSelected = ref(0);
const canAutoSelect = computed(() => questions.value.some(q => q.answer && q.answer !== '未知'));

function parseExplanation(text) {
  const parts = [];
  const regex = /【([^】]+)】/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ title: '', content: text.slice(lastIndex, match.index).trim() });
    }
    parts.push({ title: `【${match[1]}】`, content: '' });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      if (parts.length > 0 && !parts[parts.length - 1].title) {
        parts[parts.length - 1].content += remaining;
      } else {
        parts.push({ title: '', content: remaining });
      }
    }
  }
  const merged = [];
  for (const part of parts) {
    if (part.title) {
      merged.push({ title: part.title, content: part.content });
    } else if (merged.length > 0 && !merged[merged.length - 1].content) {
      merged[merged.length - 1].content = part.content;
    } else if (merged.length > 0) {
      merged[merged.length - 1].content += part.content;
    } else {
      merged.push({ title: '', content: part.content });
    }
  }
  return merged.length > 0 ? merged : [{ title: '', content: text }];
}

function getAvailableLangs(code) {
  const langs = [];
  if (code.java) langs.push('java');
  if (code.python) langs.push('python');
  if (code.cpp || code.c) langs.push('cpp');
  if (!langs.length && Object.keys(code).length) langs.push(Object.keys(code)[0]);
  return langs;
}

function getSelectedLang(q, index) {
  const key = q.id || index;
  let lang = codeLangs.value[key];
  if (!lang) {
    const langs = getAvailableLangs(q.code);
    lang = langs[0] || '';
    codeLangs.value[key] = lang;
  }
  return lang;
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}

function copyCode(q, index) {
  const lang = getSelectedLang(q, index);
  const code = q.code?.[lang];
  if (code) navigator.clipboard.writeText(code);
}

function getCode(q, index) {
  const lang = getSelectedLang(q, index);
  return q.code?.[lang] || '';
}

async function autoSelect() {
  try {
    const result = await chrome.runtime.sendMessage({
      action: 'autoSelect',
      questions: questions.value,
    });
    if (result?.success) {
      autoSelected.value = result.count || 0;
    }
  } catch {
    alert('无法连接页面，请确保在当前页面打开');
  }
}

function copyAll() {
  const text = questions.value.map((q, i) => {
    let t = `${i + 1}. [${q.type || '未知'}]\n${q.content}\n`;
    if (q.options?.length) t += q.options.join('\n') + '\n';
    t += `答案: ${q.answer || '未知'}\n`;
    if (q.code?.java) t += `\nJava:\n${q.code.java}\n`;
    if (q.code?.python) t += `\nPython:\n${q.code.python}\n`;
    if (q.code?.cpp || q.code?.c) t += `\nC++:\n${q.code.cpp || q.code.c}\n`;
    if (q.explanation) t += `解析: ${q.explanation}`;
    return t;
  }).join('\n\n---\n\n');

  navigator.clipboard.writeText(text);
}

function copyRaw() {
  navigator.clipboard.writeText(props.rawText);
}
</script>

<style scoped>
.result-viewer {
  margin-top: var(--space-4);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  font-weight: 600;
  font-size: 14px;
}

.result-actions {
  display: flex;
  gap: 6px;
}

.question-card {
  margin-bottom: var(--space-3);
  animation: slideUp 0.2s var(--ease-out);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-2);
}

.question-num {
  font-weight: 700;
  color: var(--accent);
  font-size: 13px;
}

.question-content {
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: var(--space-2);
  white-space: pre-wrap;
  color: var(--text-primary);
}

.question-options {
  margin-bottom: var(--space-2);
}

.option {
  padding: 4px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.question-answer {
  padding: 10px 12px;
  background: var(--success-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: var(--space-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--success);
}

.copy-answer {
  flex-shrink: 0;
}

/* Code section */
.code-section {
  margin-bottom: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
}

.code-tabs {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  padding: 4px;
  gap: 4px;
}

.code-tab {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
}

.code-tab:hover {
  color: var(--text-primary);
}

.code-tab.active {
  background: var(--accent);
  color: white;
}

.copy-code {
  margin-left: auto;
  flex-shrink: 0;
}

.code-block {
  margin: 0;
  padding: 12px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  color: var(--text-primary);
  background: var(--bg-primary);
}

/* Explanation */
.question-explanation {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  padding: var(--space-2) 0 0;
  border-top: 1px solid var(--border-light);
}

.explanation-text {
  margin-top: var(--space-2);
}

.exp-part {
  margin-bottom: var(--space-1);
  line-height: 1.7;
  font-size: 12px;
}

.exp-part:last-child {
  margin-bottom: 0;
}

.exp-title {
  color: var(--accent);
  font-size: 12px;
}

/* Raw response */
.raw-response {
  margin-bottom: var(--space-3);
}

.raw-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--warning);
  font-weight: 600;
}

.raw-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  line-height: 1.5;
}

.raw-text {
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  color: var(--text-secondary);
  margin: 0;
  padding: 10px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}
</style>
