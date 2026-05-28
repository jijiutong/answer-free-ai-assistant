<template>
  <div class="capture-view">
    <!-- Capture controls -->
    <div class="capture-controls">
      <button class="btn btn-primary" @click="capturePage" :disabled="loading">
        抓取当前页面
      </button>
      <button class="btn btn-secondary" @click="removeRestrictions" :disabled="loading">
        文本选择辅助
      </button>
    </div>

    <!-- Content textarea -->
    <div class="content-section">
      <label class="section-label">抓取内容 <span class="label-hint">(可编辑)</span></label>
      <textarea
        v-model="content"
        class="textarea content-textarea"
        rows="8"
        placeholder="点击「抓取当前页面」自动填充内容，或直接粘贴题目文本..."
      ></textarea>
      <div class="content-info">
        <span v-if="content" class="char-count">{{ content.length }} 字</span>
        <span v-if="sourceUrl" class="source-url">{{ sourceUrl }}</span>
      </div>
    </div>

    <!-- Model selector + Send -->
    <div class="send-controls">
      <ModelSelector @select="selectedModel = $event" />
      <button
        class="btn btn-primary"
        @click="sendToAI"
        :disabled="!content || loading"
      >
        {{ loading ? '解析中...' : 'AI 解析' }}
      </button>
    </div>

    <!-- Loading overlay -->
    <LoadingOverlay v-if="loading" :message="loadingMessage" />

    <!-- Results -->
    <ResultViewer v-if="parsedResult" :result="parsedResult" :raw-text="rawResponseText" />

    <!-- Error message -->
    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
      <button class="btn btn-sm btn-secondary" @click="errorMessage = ''">关闭</button>
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer">
      本插件仅作为个人学习、知识检索、课后复盘辅助工具。严禁用于各类正式考试作弊、平台违规刷分、恶意爬取数据等违规违法场景。
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ModelSelector from '../components/ModelSelector.vue';
import ResultViewer from '../components/ResultViewer.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import { aiClient } from '@/shared/api';
import { addRecord, getPrompt, getActiveModelId, getDefaultModel, getModels, getSettings } from '@/shared/storage';
import { chunkText, parseAIResult } from '@/shared/utils';

const content = ref('');
const sourceUrl = ref('');
const loading = ref(false);
const loadingMessage = ref('正在解析...');
const errorMessage = ref('');
const selectedModel = ref(null);
const parsedResult = ref(null);
const rawResponseText = ref('');

async function capturePage() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'triggerExtract' });
    if (result?.success) {
      content.value = result.content;
      sourceUrl.value = result.url;
    } else {
      errorMessage.value = result?.message || '抓取失败';
    }
  } catch (err) {
    errorMessage.value = '无法连接页面: ' + err.message;
  } finally {
    loading.value = false;
  }
}

async function removeRestrictions() {
  try {
    await chrome.runtime.sendMessage({ action: 'triggerRemoveRestrictions' });
  } catch {}
}

async function sendToAI() {
  if (!content.value || loading.value || !selectedModel.value) return;

  loading.value = true;
  loadingMessage.value = '正在发送请求...';
  errorMessage.value = '';
  parsedResult.value = null;
  rawResponseText.value = '';

  const model = selectedModel.value;
  const prompt = await getPrompt();

  try {
    const chunks = chunkText(content.value);
    let results = [];
    let rawTexts = [];

    if (chunks.length === 1) {
      loadingMessage.value = 'AI 解析中 (1/1)...';
      const response = await aiClient.request({
        apiUrl: model.apiUrl,
        apiKey: model.apiKey,
        modelName: model.modelName,
        maxTokens: model.maxTokens || 100000,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: content.value },
        ],
      });
      results.push(parseAIResult(response));
      rawTexts.push(response);
    } else {
      for (let i = 0; i < chunks.length; i++) {
        loadingMessage.value = `AI 解析中 (${i + 1}/${chunks.length})...`;
        const response = await aiClient.request({
          apiUrl: model.apiUrl,
          apiKey: model.apiKey,
          modelName: model.modelName,
          maxTokens: model.maxTokens || 100000,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `这是第${i + 1}部分，共${chunks.length}部分。请解析为JSON格式。只输出JSON。\n\n内容：\n${chunks[i]}` },
          ],
        });
        results.push(parseAIResult(response));
        rawTexts.push(response);
      }
    }

    const mergedResult = mergeResults(results);
    parsedResult.value = mergedResult;
    rawResponseText.value = rawTexts.join('\n\n');

    if (mergedResult?.questions?.length > 0) {
      await addRecord({
        sourceUrl: sourceUrl.value,
        content: content.value.slice(0, 200),
        result: mergedResult,
        modelUsed: model.name,
      });
    }
  } catch (err) {
    errorMessage.value = err.message || '请求失败，请检查网络或API配置';
  } finally {
    loading.value = false;
  }
}

function mergeResults(results) {
  const allQuestions = [];
  let id = 1;
  for (const result of results) {
    if (result?.questions) {
      for (const q of result.questions) {
        allQuestions.push({ ...q, id: id++ });
      }
    }
  }
  return { questions: allQuestions };
}

onMounted(async () => {
  const activeId = await getActiveModelId();
  const models = await getModels();
  if (activeId) {
    selectedModel.value = models.find(m => m.id === activeId) || models[0] || null;
  } else {
    const defaultModel = await getDefaultModel();
    selectedModel.value = defaultModel;
  }

  if (window._capturedContent) {
    content.value = window._capturedContent.content;
    sourceUrl.value = window._capturedContent.url;
    window._capturedContent = null;
  }
});
</script>

<style scoped>
.capture-view {
  padding: var(--space-4);
  animation: slideUp 0.2s var(--ease-out);
}

.capture-controls {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-3);
}

.content-section {
  margin-bottom: var(--space-3);
}

.section-label {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.label-hint {
  font-weight: 400;
  color: var(--text-muted);
}

.content-textarea {
  min-height: 160px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
}

.content-info {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  align-items: center;
}

.char-count {
  font-weight: 500;
  color: var(--text-secondary);
}

.source-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.send-controls {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-4);
}

.send-controls .btn {
  flex-shrink: 0;
}

.error-box {
  padding: 12px;
  background: var(--danger-light);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 13px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: fadeIn 0.2s;
}

.disclaimer {
  margin-top: var(--space-5);
  padding: var(--space-3);
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  line-height: 1.6;
}
</style>
