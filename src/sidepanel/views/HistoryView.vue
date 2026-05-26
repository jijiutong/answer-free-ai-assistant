<template>
  <div class="history-view">
    <div class="history-header">
      <span>历史记录 ({{ records.length }})</span>
      <button
        v-if="records.length > 0"
        class="btn btn-sm btn-danger"
        @click="clearAll"
      >
        清空全部
      </button>
    </div>

    <div v-if="records.length === 0" class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div>暂无历史记录</div>
      <div class="empty-hint">去抓题页面开始解析题目吧</div>
    </div>

    <div v-else class="history-list">
      <div
        v-for="record in records"
        :key="record.id"
        class="history-item card"
      >
        <div class="history-item-header" @click="toggleDetail(record.id)">
          <div class="history-item-info">
            <div class="history-item-title">{{ getTitle(record) }}</div>
            <div class="history-item-answers">
              <span v-for="(q, i) in (record.result?.questions || []).slice(0, 3)" :key="i" class="answer-badge">
                <strong>{{ i + 1 }}.</strong> {{ q.answer || '未知' }}
              </span>
              <span v-if="(record.result?.questions || []).length > 3" class="answer-badge more">+{{ (record.result?.questions || []).length - 3 }}</span>
            </div>
            <div class="history-item-meta">
              {{ formatTime(record.timestamp) }} · {{ record.modelUsed || '未知模型' }}
            </div>
          </div>
          <button class="btn btn-sm btn-danger" @click.stop="deleteRecord(record.id)">
            删除
          </button>
        </div>

        <div v-if="expandedId === record.id" class="history-item-detail">
          <div v-for="(q, i) in record.result?.questions || []" :key="i" class="detail-question">
            <div class="detail-q-header">
              <span class="question-num">#{{ i + 1 }}</span>
              <span class="badge badge-accent">{{ q.type || '未知' }}</span>
            </div>
            <div class="detail-q-content">{{ q.content }}</div>
            <div v-if="q.options?.length" class="detail-q-options">
              <div v-for="(opt, j) in q.options" :key="j">{{ opt }}</div>
            </div>

            <div class="detail-q-answer">
              <strong>答案:</strong> {{ q.answer || '未知' }}
              <button class="btn btn-sm btn-secondary copy-answer-btn" @click="copyText(q.answer)">复制</button>
            </div>

            <div v-if="q.code" class="detail-code-section">
              <div class="detail-code-tabs">
                <button
                  v-for="lang in getLangs(q.code)"
                  :key="lang"
                  :class="['detail-code-tab', { active: getSelectedLang(q.code, record.id + '_' + i) === lang }]"
                  @click="codeLangs[record.id + '_' + i] = lang"
                >
                  {{ lang === 'cpp' ? 'C++' : lang.toUpperCase() }}
                </button>
                <button class="btn btn-sm btn-secondary copy-code-btn" @click="copyText(q.code[getSelectedLang(q.code, record.id + '_' + i)])">复制代码</button>
              </div>
              <pre class="detail-code-block"><code>{{ q.code[getSelectedLang(q.code, record.id + '_' + i)] || '' }}</code></pre>
            </div>

            <div v-if="q.explanation" class="detail-q-explanation">
              <strong>解析:</strong> {{ q.explanation }}
            </div>
          </div>
        </div>

        <button
          v-if="expandedId !== record.id"
          class="btn btn-sm btn-secondary detail-toggle"
          @click="toggleDetail(record.id)"
        >
          查看详情
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getRecords, deleteRecord as deleteRecordStorage, clearRecords } from '@/shared/storage';
import { formatTime } from '@/shared/utils';

const records = ref([]);
const expandedId = ref(null);
const codeLangs = ref({});

function getTitle(record) {
  const result = record.result?.questions?.[0];
  if (result) {
    const c = result.content || '';
    return c.slice(0, 50) + (c.length > 50 ? '...' : '');
  }
  return record.sourceUrl ? new URL(record.sourceUrl).hostname : '未命名记录';
}

function getLangs(code) {
  const langs = [];
  if (code.java) langs.push('java');
  if (code.python) langs.push('python');
  if (code.cpp || code.c) langs.push('cpp');
  if (!langs.length && Object.keys(code).length) langs.push(Object.keys(code)[0]);
  return langs;
}

function getSelectedLang(code, key) {
  let lang = codeLangs.value[key];
  if (!lang) {
    const langs = getLangs(code);
    lang = langs[0] || '';
    codeLangs.value[key] = lang;
  }
  return lang;
}

function copyText(text) {
  if (text) navigator.clipboard.writeText(text);
}

function toggleDetail(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

async function deleteRecord(id) {
  if (!confirm('确定删除此记录？')) return;
  await deleteRecordStorage(id);
  records.value = records.value.filter(r => r.id !== id);
}

async function clearAll() {
  if (!confirm('确定清空所有历史记录？此操作不可撤销。')) return;
  await clearRecords();
  records.value = [];
  expandedId.value = null;
}

onMounted(async () => {
  records.value = await getRecords();
});
</script>

<style scoped>
.history-view {
  padding: var(--space-4);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  font-weight: 600;
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  padding: var(--space-3);
  transition: box-shadow var(--transition-fast);
}

.history-item:hover {
  box-shadow: var(--shadow-sm);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.history-item-info {
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-answers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.answer-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  background: var(--success-light);
  border: 1px solid var(--success);
  border-radius: var(--radius-xs);
  font-size: 11px;
  color: var(--success);
  font-weight: 500;
}

.answer-badge.more {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-muted);
}

.history-item-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.detail-toggle {
  margin-top: 8px;
  width: 100%;
}

.history-item-detail {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-color);
}

.detail-question {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-light);
}

.detail-question:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.detail-q-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-2);
}

.question-num {
  font-weight: 700;
  color: var(--accent);
  font-size: 12px;
}

.detail-q-content {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 6px;
  white-space: pre-wrap;
}

.detail-q-options {
  font-size: 13px;
  margin-bottom: 6px;
  padding-left: 8px;
  color: var(--text-secondary);
}

.detail-q-answer {
  padding: 10px 12px;
  background: var(--success-light);
  border: 1px solid var(--success);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: var(--space-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--success);
}

.copy-answer-btn {
  flex-shrink: 0;
  font-weight: 400;
  color: var(--success);
}

.detail-code-section {
  margin-bottom: var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
}

.detail-code-tabs {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  padding: 4px;
  gap: 4px;
}

.detail-code-tab {
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

.detail-code-tab:hover {
  color: var(--text-primary);
}

.detail-code-tab.active {
  background: var(--accent);
  color: white;
}

.copy-code-btn {
  margin-left: auto;
  flex-shrink: 0;
}

.detail-code-block {
  margin: 0;
  padding: 12px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  color: var(--text-primary);
  background: var(--bg-primary);
}

.detail-q-explanation {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-light);
}
</style>
