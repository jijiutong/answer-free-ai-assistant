<template>
  <div class="settings-view">
    <div class="settings-header">
      <span>设置</span>
    </div>

    <!-- Theme -->
    <section class="settings-section card">
      <h3 class="section-title">外观</h3>
      <div class="setting-row">
        <span class="setting-label">主题</span>
        <div class="toggle-buttons">
          <button
            :class="['btn btn-sm', settings.theme === 'light' ? 'btn-primary' : 'btn-secondary']"
            @click="setTheme('light')"
          >
            浅色
          </button>
          <button
            :class="['btn btn-sm', settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary']"
            @click="setTheme('dark')"
          >
            深色
          </button>
        </div>
      </div>
    </section>

    <!-- Model Management -->
    <section class="settings-section card">
      <div class="section-title-row">
        <h3 class="section-title">模型配置</h3>
        <div class="model-header-actions">
          <button class="btn btn-sm btn-secondary" @click="showJsonImport = true">JSON 导入</button>
          <button class="btn btn-sm btn-primary" @click="showAddModel = true">+ 新增</button>
        </div>
      </div>

      <div v-if="models.length === 0" class="empty-hint">
        还没有配置模型，点击「新增」或「JSON 导入」开始配置
      </div>

      <div v-for="model in models" :key="model.id" class="model-item">
        <div class="model-info">
          <div class="model-name">
            {{ model.name }}
            <span v-if="model.isDefault" class="badge badge-success">默认</span>
          </div>
          <div class="model-detail">{{ model.apiUrl }} · {{ model.modelName }}</div>
        </div>
        <div class="model-actions">
          <button class="btn btn-sm btn-secondary" @click="editModel(model)">编辑</button>
          <button class="btn btn-sm btn-danger" @click="removeModel(model.id)">删除</button>
        </div>
      </div>
    </section>

    <!-- Prompt Template -->
    <section class="settings-section card">
      <div class="section-title-row">
        <h3 class="section-title">Prompt 模板</h3>
        <button class="btn btn-sm btn-secondary" @click="resetPrompt">恢复默认</button>
      </div>
      <textarea
        v-model="promptTemplate"
        class="textarea prompt-textarea"
        rows="6"
        placeholder="自定义 AI 解析提示词..."
      ></textarea>
      <button class="btn btn-sm btn-primary" @click="savePromptTemplate" style="margin-top: 8px;">
        保存模板
      </button>
    </section>

    <!-- Features -->
    <section class="settings-section card">
      <h3 class="section-title">功能开关</h3>
      <div class="setting-row">
        <span class="setting-label">自动解除网页限制</span>
        <label class="switch">
          <input type="checkbox" v-model="settings.restrictionsRemoval" @change="saveSetting('restrictionsRemoval')">
          <span class="slider"></span>
        </label>
      </div>
    </section>

    <!-- Code Languages -->
    <section class="settings-section card">
      <h3 class="section-title">代码题返回语言</h3>
      <div class="lang-checkboxes">
        <label v-for="lang in availableLangs" :key="lang.key" class="checkbox-label">
          <input type="checkbox"
            :checked="settings.codeLanguages.includes(lang.key)"
            @change="toggleLang(lang.key)"
          />
          {{ lang.label }}
        </label>
      </div>
    </section>

    <!-- Explanation Config -->
    <section class="settings-section card">
      <div class="section-title-row">
        <h3 class="section-title">讲题配置</h3>
      </div>
      <div class="setting-row">
        <span class="setting-label">开启讲解</span>
        <label class="switch">
          <input type="checkbox" v-model="settings.explanation.enabled" @change="saveSetting('explanation')">
          <span class="slider"></span>
        </label>
      </div>
      <div class="exp-config" :class="{ disabled: !settings.explanation.enabled }">
        <div class="form-group">
          <label class="form-label">讲题风格</label>
          <select v-model="settings.explanation.teacher" @change="saveSetting('explanation')" class="input">
            <option v-for="t in teacherOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">讲解内容（多选）</label>
          <div class="exp-sections-grid">
            <label v-for="s in sectionOptions" :key="s" class="checkbox-label">
              <input type="checkbox"
                :checked="settings.explanation.sections.includes(s)"
                @change="toggleSection(s)"
                :disabled="!settings.explanation.enabled"
              />
              {{ s }}
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- Data Management -->
    <section class="settings-section card">
      <h3 class="section-title">数据管理</h3>
      <div class="data-actions">
        <button class="btn btn-secondary" @click="clearCache">清除缓存</button>
        <button class="btn btn-danger" @click="resetAll">重置所有数据</button>
      </div>
    </section>

    <!-- Disclaimer -->
    <div class="disclaimer">
      <strong>免责声明</strong><br>
      本插件仅作为个人学习、知识检索、课后复盘辅助工具使用。严禁用于各类正式考试作弊、平台违规刷分、恶意爬取数据等违规违法场景。用户使用本工具产生的一切行为与后果由使用者自行承担，开发者不承担任何连带责任。
    </div>

    <!-- Model Edit Dialog -->
    <div v-if="showAddModel || editingModel" class="modal-overlay" @click.self="closeDialog">
      <div class="modal card">
        <h3 class="modal-title">{{ editingModel ? '编辑模型' : '新增模型' }}</h3>

        <div class="form-group">
          <label class="form-label">名称</label>
          <input v-model="form.name" class="input" placeholder="例如：DeepSeek-V3" />
        </div>

        <div class="form-group">
          <label class="form-label">API 地址</label>
          <input v-model="form.apiUrl" class="input" placeholder="https://api.deepseek.com/v1" />
        </div>

        <div class="form-group">
          <label class="form-label">API 密钥</label>
          <input v-model="form.apiKey" class="input" type="password" placeholder="sk-..." />
        </div>

        <div class="form-group">
          <label class="form-label">模型名称</label>
          <input v-model="form.modelName" class="input" placeholder="deepseek-chat" />
        </div>

        <div class="form-group">
          <label class="form-label">最大 Token 数</label>
          <input v-model.number="form.maxTokens" type="number" class="input" placeholder="100000" min="1000" max="200000" />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.isDefault" />
            设为默认模型
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveModelForm" :disabled="!form.name || !form.apiUrl">
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- JSON Import Dialog -->
    <div v-if="showJsonImport" class="modal-overlay" @click.self="closeJsonImport">
      <div class="modal card modal-lg">
        <h3 class="modal-title">JSON 导入模型</h3>
        <div class="json-example">
          <div class="json-example-title">示例：</div>
          <pre class="json-example-code">{
  "name": "DeepSeek",
  "api_url": "https://api.deepseek.com/v1",
  "api_key": "sk-xxxxxxxxxxxxx",
  "model_name": "deepseek-chat"
}</pre>
          <div class="json-example-hint">支持单个或多个模型数组 <code>[{...}, {...}]</code><br>
            字段名灵活匹配：name / apiUrl / api_url / api_base_url 均可识别</div>
        </div>
        <div class="form-group">
          <textarea
            v-model="jsonImportText"
            class="textarea json-textarea"
            rows="8"
            placeholder='粘贴你的 JSON 数据...'
          ></textarea>
        </div>
        <div v-if="jsonImportError" class="json-error">{{ jsonImportError }}</div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeJsonImport">取消</button>
          <button class="btn btn-primary" @click="doJsonImport" :disabled="!jsonImportText.trim()">
            解析并导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import {
  getModels, saveModels, addModel, updateModel, deleteModel,
  getSettings, updateSettings, getPrompt, savePrompt,
  clear as clearStorage, DEFAULT_PROMPT,
} from '@/shared/storage';

const emit = defineEmits(['theme-change']);

const models = ref([]);
const settings = reactive({
  theme: 'light',
  restrictionsRemoval: true,
  codeLanguages: ['java', 'python', 'cpp'],
  explanation: {
    enabled: true,
    teacher: '严谨型',
    sections: ['题干分析', '考点定位', '解题步骤', '易错提醒', '知识点总结', '同类题技巧'],
  },
});

const availableLangs = [
  { key: 'java', label: 'Java' },
  { key: 'python', label: 'Python' },
  { key: 'cpp', label: 'C++' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'go', label: 'Go' },
  { key: 'rust', label: 'Rust' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'kotlin', label: 'Kotlin' },
  { key: 'ruby', label: 'Ruby' },
  { key: 'swift', label: 'Swift' },
  { key: 'csharp', label: 'C#' },
  { key: 'c', label: 'C' },
];

const teacherOptions = [
  { value: '严谨型', label: '严谨型 — 逻辑缜密，步步推导' },
  { value: '通俗型', label: '通俗型 — 大白话讲解，一听就懂' },
  { value: '启发型', label: '启发型 — 引导思考，授人以渔' },
  { value: '精简型', label: '精简型 — 直击要点，不说废话' },
  { value: '详细型', label: '详细型 — 事无巨细，滴水不漏' },
];

const sectionOptions = ['题干分析', '考点定位', '解题步骤', '易错提醒', '知识点总结', '同类题技巧'];
const promptTemplate = ref('');
const showAddModel = ref(false);
const showJsonImport = ref(false);
const editingModel = ref(null);
const jsonImportText = ref('');
const jsonImportError = ref('');

const form = reactive({
  name: '',
  apiUrl: '',
  apiKey: '',
  modelName: '',
  maxTokens: 100000,
  isDefault: false,
});

async function setTheme(theme) {
  settings.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  emit('theme-change', theme);
  await updateSettings({ theme });
}

async function saveSetting(key) {
  await updateSettings({ [key]: JSON.parse(JSON.stringify(settings[key])) });
}

function toggleLang(key) {
  const idx = settings.codeLanguages.indexOf(key);
  if (idx === -1) {
    settings.codeLanguages.push(key);
  } else {
    settings.codeLanguages.splice(idx, 1);
  }
  updateSettings({ codeLanguages: settings.codeLanguages });
}

function toggleSection(section) {
  const idx = settings.explanation.sections.indexOf(section);
  if (idx === -1) {
    settings.explanation.sections.push(section);
  } else {
    settings.explanation.sections.splice(idx, 1);
  }
  updateSettings({ explanation: settings.explanation });
}

async function resetPrompt() {
  promptTemplate.value = DEFAULT_PROMPT;
  await savePrompt(DEFAULT_PROMPT);
}

async function savePromptTemplate() {
  await savePrompt(promptTemplate.value);
  alert('Prompt 模板已保存');
}

function editModel(model) {
  editingModel.value = model;
  form.name = model.name;
  form.apiUrl = model.apiUrl;
  form.apiKey = model.apiKey;
  form.modelName = model.modelName;
  form.maxTokens = model.maxTokens || 100000;
  form.isDefault = model.isDefault;
}

async function saveModelForm() {
  if (!form.name || !form.apiUrl) return;

  if (editingModel.value) {
    await updateModel(editingModel.value.id, {
      name: form.name,
      apiUrl: form.apiUrl,
      apiKey: form.apiKey,
      modelName: form.modelName,
      maxTokens: form.maxTokens || 100000,
      isDefault: form.isDefault,
    });
  } else {
    await addModel({
      name: form.name,
      apiUrl: form.apiUrl,
      apiKey: form.apiKey,
      modelName: form.modelName,
      maxTokens: form.maxTokens || 100000,
      isDefault: form.isDefault,
    });
  }

  models.value = await getModels();
  closeDialog();
}

async function removeModel(id) {
  if (!confirm('确定删除此模型配置？')) return;
  await deleteModel(id);
  models.value = await getModels();
}

function closeJsonImport() {
  showJsonImport.value = false;
  jsonImportText.value = '';
  jsonImportError.value = '';
}

async function doJsonImport() {
  jsonImportError.value = '';
  try {
    const data = JSON.parse(jsonImportText.value);
    const items = Array.isArray(data) ? data : [data];
    let count = 0;
    for (const item of items) {
      const name = item.name || item.Name || item.model_name || item.ModelName;
      const apiUrl = item.apiUrl || item.api_url || item.apiBaseUrl || item.base_url;
      const apiKey = item.apiKey || item.api_key || item.token || item.key || '';
      const modelName = item.modelName || item.model_name || item.modelName || name;
      const maxTokens = item.maxTokens || item.max_tokens || item.maxTokens || 100000;
      if (!name || !apiUrl) continue;
      await addModel({
        name,
        apiUrl,
        apiKey,
        modelName,
        maxTokens,
        isDefault: item.isDefault || false,
      });
      count++;
    }
    if (count === 0) {
      jsonImportError.value = '没有找到有效的模型数据，请检查 JSON 格式';
      return;
    }
    models.value = await getModels();
    closeJsonImport();
    alert(`成功导入 ${count} 个模型`);
  } catch (err) {
    jsonImportError.value = 'JSON 格式错误: ' + err.message;
  }
}

function closeDialog() {
  showAddModel.value = false;
  editingModel.value = null;
  form.name = '';
  form.apiUrl = '';
  form.apiKey = '';
  form.modelName = '';
  form.maxTokens = 100000;
  form.isDefault = false;
}

async function clearCache() {
  if (!confirm('确定清除缓存数据？历史记录将被保留。')) return;
  // Clear non-essential data
  await updateSettings({});
  alert('缓存已清除');
}

async function resetAll() {
  if (!confirm('确定重置所有数据？此操作不可撤销！')) return;
  await clearStorage();
  models.value = [];
  settings.theme = 'light';
  settings.restrictionsRemoval = true;
  settings.codeLanguages = ['java', 'python', 'cpp'];
  settings.explanation = {
    enabled: true,
    teacher: '严谨型',
    sections: ['题干分析', '考点定位', '解题步骤', '易错提醒', '知识点总结', '同类题技巧'],
  };
  promptTemplate.value = DEFAULT_PROMPT;
  document.documentElement.setAttribute('data-theme', 'light');
  emit('theme-change', 'light');
  alert('所有数据已重置');
}

onMounted(async () => {
  models.value = await getModels();
  const s = await getSettings();
  settings.theme = s.theme || 'light';
  settings.restrictionsRemoval = s.restrictionsRemoval !== false;
  settings.codeLanguages = s.codeLanguages?.length ? s.codeLanguages : ['java', 'python', 'cpp'];
  settings.explanation = s.explanation || {
    enabled: true,
    teacher: '严谨型',
    sections: ['题干分析', '考点定位', '解题步骤', '易错提醒', '知识点总结', '同类题技巧'],
  };
  promptTemplate.value = s.promptTemplate || DEFAULT_PROMPT;
});
</script>

<style scoped>
.settings-view {
  padding: var(--space-4);
}

.settings-header {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: var(--space-4);
}

.settings-section {
  margin-bottom: var(--space-3);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.model-header-actions {
  display: flex;
  gap: 4px;
}

.section-title-row .section-title {
  margin-bottom: 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
}

.lang-checkboxes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 12px;
}

.lang-checkboxes .checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.exp-config {
  transition: opacity var(--transition-normal);
}

.exp-config.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.exp-config .form-group {
  margin-top: var(--space-3);
}

.exp-sections-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 12px;
}

.exp-sections-grid .checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}

.exp-sections-grid input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exp-sections-grid .checkbox-label:has(input[type="checkbox"]:disabled) {
  opacity: 0.5;
}

.setting-label {
  font-size: 13px;
}

.toggle-buttons {
  display: flex;
  gap: 4px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-3);
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-color);
}

.model-item:last-child {
  border-bottom: none;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
}

.model-detail {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  word-break: break-all;
}

.model-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.prompt-textarea {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.json-textarea {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.json-error {
  padding: 8px;
  background: var(--danger-light);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 12px;
  margin-bottom: 12px;
}

.json-example {
  margin-bottom: 12px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.json-example-title {
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.json-example-code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--accent);
  margin: 0 0 8px 0;
  white-space: pre-wrap;
}

.json-example-hint {
  color: var(--text-muted);
  line-height: 1.5;
}

.json-example-hint code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  background: var(--bg-secondary);
  padding: 1px 4px;
  border-radius: 3px;
}

.data-actions {
  display: flex;
  gap: 8px;
}

.disclaimer {
  padding: var(--space-3);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

/* Toggle switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: var(--transition-normal);
  border-radius: var(--radius-full);
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: var(--transition-normal);
  border-radius: 50%;
  box-shadow: var(--shadow-xs);
}

input:checked + .slider {
  background-color: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.15s;
}

.modal {
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--space-5);
  animation: slideUp 0.2s var(--ease-out);
}

.modal-lg {
  max-width: 560px;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.form-group {
  margin-bottom: var(--space-3);
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: var(--space-4);
}
</style>
