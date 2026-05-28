<template>
  <div class="popup-container">
    <div class="popup-header">
      <div class="popup-brand">
        <span class="brand-icon">📖</span>
        <div>
          <h1>AI 解题伴学</h1>
          <span class="version">v1.0</span>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div v-if="toast" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>

    <div class="popup-actions">
      <button class="btn btn-primary btn-block" @click="captureAndOpen" :disabled="loading">
        {{ loading ? '抓取中...' : '抓取当前页面' }}
      </button>
      <button class="btn btn-secondary btn-block" @click="removeRestrictions" :disabled="loading">
        文本选择辅助
      </button>
      <button class="btn btn-secondary btn-block" @click="openSidePanel">
        打开完整面板
      </button>
    </div>

    <div v-if="captureContent" class="capture-preview card">
      <div class="preview-header">
        <span>抓取预览</span>
        <span class="badge badge-accent">{{ captureContent.length }} 字</span>
      </div>
      <div class="preview-content">{{ captureContent.content?.slice(0, 200) }}...</div>
      <button class="btn btn-primary btn-sm btn-block" @click="openSidePanel">
        打开面板解析
      </button>
    </div>

    <div v-if="recentRecords.length > 0" class="recent-section">
      <div class="recent-header">
        <span>最近记录</span>
      </div>
      <div
        v-for="record in recentRecords"
        :key="record.id"
        class="recent-item"
        @click="openSidePanel"
      >
        <div class="recent-title">{{ getQuestionTitle(record) }}</div>
        <div class="recent-time">{{ formatTime(record.timestamp) }}</div>
      </div>
    </div>

    <div class="popup-footer">
      <a href="#" @click.prevent="openSettings">设置</a>
      <span class="divider">·</span>
      <a href="https://github.com/jijiutong/answer-free-ai-assistant" target="_blank">GitHub</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getRecords } from '@/shared/storage';
import { formatTime } from '@/shared/utils';

const captureContent = ref(null);
const recentRecords = ref([]);
const loading = ref(false);
const toast = ref(null);

function showToast(message, type = 'info') {
  toast.value = { message, type };
  setTimeout(() => { toast.value = null; }, 2500);
}

async function captureAndOpen() {
  loading.value = true;
  try {
    const result = await chrome.runtime.sendMessage({ action: 'triggerExtract' });
    if (result?.success) {
      captureContent.value = result;
      chrome.storage.local.set({ _pendingCapture: result });
      showToast('抓取成功，' + result.length + ' 字', 'success');
    } else {
      showToast(result?.message || '抓取失败', 'error');
    }
  } catch (err) {
    showToast('无法连接页面', 'error');
  } finally {
    loading.value = false;
  }
}

async function removeRestrictions() {
  try {
    await chrome.runtime.sendMessage({ action: 'triggerRemoveRestrictions' });
    showToast('已启用文本选择辅助', 'success');
  } catch {
    showToast('操作失败', 'error');
  }
}

function openSidePanel() {
  chrome.runtime.sendMessage({ action: 'openSidePanel' });
  window.close();
}

function openSettings() {
  chrome.runtime.sendMessage({ action: 'openSidePanel', tab: 'settings' });
  window.close();
}

function getQuestionTitle(record) {
  const result = record.result?.questions?.[0];
  if (result) {
    const content = result.content || '';
    return content.slice(0, 40) + (content.length > 40 ? '...' : '');
  }
  return record.sourceUrl || '未命名记录';
}

onMounted(async () => {
  try {
    const records = await getRecords();
    recentRecords.value = records.slice(0, 3);
  } catch {}
});
</script>

<style scoped>
.popup-container {
  width: 340px;
  padding: 16px;
  background: var(--bg-primary);
  position: relative;
}

.toast {
  position: fixed;
  top: -4px;
  left: 0;
  right: 0;
  padding: 8px 12px;
  font-size: 12px;
  text-align: center;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  z-index: 999;
  animation: fadeIn 0.2s;
  box-shadow: var(--shadow-md);
}

.toast.success {
  background: var(--success-light);
  color: var(--success);
  border: 1px solid var(--success);
}

.toast.error {
  background: var(--danger-light);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.popup-header {
  margin-bottom: 16px;
}

.popup-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 28px;
  line-height: 1;
}

.popup-header h1 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.version {
  font-size: 11px;
  color: var(--text-muted);
}

.popup-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.capture-preview {
  margin-bottom: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 500;
}

.preview-content {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  max-height: 60px;
  overflow: hidden;
  line-height: 1.4;
}

.recent-section {
  margin-bottom: 12px;
}

.recent-header {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.recent-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.recent-item:hover {
  background: var(--bg-secondary);
}

.recent-title {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.popup-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.popup-footer a {
  color: var(--accent);
  text-decoration: none;
}

.popup-footer a:hover {
  text-decoration: underline;
}

.divider {
  color: var(--border-color);
}
</style>
