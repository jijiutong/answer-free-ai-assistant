<template>
  <div class="export-view">
    <div class="export-header">
      <span>导出记录</span>
    </div>

    <div class="export-controls card">
      <!-- Scope selector -->
      <div class="control-group">
        <label class="section-label">导出范围</label>
        <div class="scope-buttons">
          <button
            :class="['btn btn-sm', scope === 'all' ? 'btn-primary' : 'btn-secondary']"
            @click="scope = 'all'"
          >
            全部 ({{ totalRecords }})
          </button>
          <button
            :class="['btn btn-sm', scope === 'selected' ? 'btn-primary' : 'btn-secondary']"
            @click="scope = 'selected'"
          >
            已选 ({{ selectedCount }})
          </button>
        </div>
      </div>

      <!-- Record selection checkboxes -->
      <div v-if="records.length > 0" class="record-selection">
        <div class="selection-header">
          <label class="checkbox-label" @click="toggleSelectAll">
            <input type="checkbox" :checked="allSelected" :indeterminate="someSelected" />
            {{ allSelected ? '取消全选' : '全选' }}
          </label>
        </div>
        <div class="record-checkboxes">
          <label
            v-for="record in records"
            :key="record.id"
            class="record-checkbox"
          >
            <input type="checkbox" v-model="selectedIds" :value="record.id" />
            <div class="record-check-info">
              <span class="record-check-title">{{ getShortTitle(record) }}</span>
              <span class="record-check-time">{{ formatTime(record.timestamp) }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Format selector -->
      <div class="control-group">
        <label class="section-label">导出格式</label>
        <div class="format-buttons">
          <button
            :class="['btn', format === 'txt' ? 'btn-primary' : 'btn-secondary']"
            @click="format = 'txt'"
          >
            TXT
          </button>
          <button
            :class="['btn', format === 'md' ? 'btn-primary' : 'btn-secondary']"
            @click="format = 'md'"
          >
            Markdown
          </button>
          <button
            :class="['btn', format === 'json' ? 'btn-primary' : 'btn-secondary']"
            @click="format = 'json'"
          >
            JSON
          </button>
        </div>
      </div>

      <button
        class="btn btn-primary btn-block"
        @click="doExport"
        :disabled="exportRecords.length === 0"
      >
        导出 {{ exportRecords.length }} 条记录
      </button>
    </div>

    <div v-if="records.length === 0" class="empty-state">
      <div class="empty-state-icon">📁</div>
      <div>暂无可导出的记录</div>
      <div class="empty-hint">先解析一些题目再来导出吧</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getRecords } from '@/shared/storage';
import { exportToTXT, exportToMD, exportToJSON, downloadFile, generateFilename, formatTime } from '@/shared/utils';

const records = ref([]);
const selectedIds = ref([]);
const scope = ref('all');
const format = ref('txt');

const totalRecords = computed(() => records.value.length);
const selectedCount = computed(() => selectedIds.value.length);

const exportRecords = computed(() => {
  if (scope.value === 'all') return records.value;
  return records.value.filter(r => selectedIds.value.includes(r.id));
});

const allSelected = computed(() => records.value.length > 0 && selectedIds.value.length === records.value.length);
const someSelected = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < records.value.length);

function getShortTitle(record) {
  const result = record.result?.questions?.[0];
  if (result) {
    const c = result.content || '';
    return c.slice(0, 30) + (c.length > 30 ? '...' : '');
  }
  return '未命名记录';
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = records.value.map(r => r.id);
  }
}

function doExport() {
  const data = exportRecords.value;
  if (data.length === 0) return;

  let content, ext, mimeType;

  switch (format.value) {
    case 'txt':
      content = exportToTXT(data);
      ext = 'txt';
      mimeType = 'text/plain';
      break;
    case 'md':
      content = exportToMD(data);
      ext = 'md';
      mimeType = 'text/markdown';
      break;
    case 'json':
      content = exportToJSON(data);
      ext = 'json';
      mimeType = 'application/json';
      break;
  }

  const filename = generateFilename(ext);
  downloadFile(content, filename, mimeType);
}

onMounted(async () => {
  records.value = await getRecords();
  selectedIds.value = records.value.map(r => r.id);
});
</script>

<style scoped>
.export-view {
  padding: var(--space-4);
}

.export-header {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: var(--space-4);
}

.export-controls {
  margin-bottom: var(--space-4);
}

.control-group {
  margin-bottom: var(--space-3);
}

.section-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.scope-buttons {
  display: flex;
  gap: 8px;
}

.format-buttons {
  display: flex;
  gap: 8px;
}

.btn-block {
  width: 100%;
  margin-top: var(--space-4);
}

.record-selection {
  margin-bottom: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  max-height: 200px;
  overflow-y: auto;
}

.selection-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.selection-header .checkbox-label {
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.record-checkboxes {
  padding: 4px 0;
}

.record-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background var(--transition-fast);
}

.record-checkbox:hover {
  background: var(--bg-tertiary);
}

.record-check-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  min-width: 0;
}

.record-check-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.record-check-time {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
