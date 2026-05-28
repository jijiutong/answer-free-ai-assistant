// Storage utility - wraps chrome.storage.local with typed access

const DEFAULT_SETTINGS = {
  theme: 'light',
  promptTemplate: '',
  restrictionsRemoval: false,
  activeModelId: '',
  codeLanguages: ['java', 'python', 'cpp'],
  explanation: {
    enabled: true,
    teacher: '严谨型',
    sections: ['题干分析', '考点定位', '解题步骤', '易错提醒', '知识点总结', '同类题技巧'],
  },
};

const DEFAULT_PROMPT = `你是一位专业的题目解析和解题助手。请解析以下网页内容并给出答案/解法。

IMPORTANT: 回复必须严格是合法JSON，不要包含任何其他文字。

JSON格式：
{"questions":[{"id":1,"type":"单选题/多选题/判断题/简答题/填空题/编程题/送分题/其他","content":"题干内容","options":["A. 选项一","B. 选项二"],"answer":"答案","code":{"java":"Java代码","python":"Python代码"},"explanation":"解析说明"}]}

【核心要求】答案和代码必须准确、可运行！编程题代码必须通过编译，单选题答案必须正确。

各题型要求：

【编程题/算法题】
- answer: 解题思路（一句话概括核心方法）
- code: 返回指定语言的完整可运行代码（见【代码语言】要求）
- explanation: 时间复杂度、空间复杂度分析

【单选题】
- answer: 正确选项字母，如"A"
- explanation: 为什么选这个选项，其他选项为什么不对

【多选题】
- answer: 正确选项字母，如"ABD"
- explanation: 逐一说明每个选项对错原因

【判断题】
- answer: "正确"或"错误"
- explanation: 判断依据

【填空题】
- answer: 填入的正确答案
- explanation: 解题过程

【简答题】
- answer: 简明扼要的答案
- explanation: 详细展开说明

【送分题/主观评价题】
- 识别特征：没有标准答案，如满意度评分、主观感受选择（例如"这门课容易理解"选1-5分）
- answer: "你看哪个顺眼就行"
- code: 不需要，不要返回code字段
- explanation: 说明这是一道主观评价题

通用规则：
- 没有选项时 options 为 []
- 答案不确定时 answer 填"未知"
- 不是题目则输出 {"questions":[]}
- 只有编程题才返回code字段，其他题型不需要code`;

async function get(key, defaultValue = null) {
  const result = await chrome.storage.local.get(key);
  return result[key] !== undefined ? result[key] : defaultValue;
}

async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function remove(key) {
  await chrome.storage.local.remove(key);
}

async function clear() {
  await chrome.storage.local.clear();
}

// Models CRUD
async function getModels() {
  return await get('models', []);
}

async function saveModels(models) {
  await set('models', models);
}

async function addModel(model) {
  const models = await getModels();
  model.id = Date.now().toString();
  model.isDefault = model.isDefault || false;
  if (model.isDefault) {
    models.forEach(m => m.isDefault = false);
  }
  models.push(model);
  await saveModels(models);
  return model;
}

async function updateModel(id, updates) {
  const models = await getModels();
  const index = models.findIndex(m => m.id === id);
  if (index === -1) return null;
  if (updates.isDefault) {
    models.forEach(m => m.isDefault = false);
  }
  models[index] = { ...models[index], ...updates };
  await saveModels(models);
  return models[index];
}

async function deleteModel(id) {
  const models = await getModels();
  const filtered = models.filter(m => m.id !== id);
  await saveModels(filtered);
}

async function getDefaultModel() {
  const models = await getModels();
  return models.find(m => m.isDefault) || models[0] || null;
}

// Records CRUD
async function getRecords() {
  return await get('records', []);
}

async function saveRecords(records) {
  await set('records', records);
}

async function addRecord(record) {
  const records = await getRecords();
  record.id = Date.now().toString();
  record.timestamp = new Date().toISOString();
  records.unshift(record);
  await saveRecords(records);
  return record;
}

async function deleteRecord(id) {
  const records = await getRecords();
  await saveRecords(records.filter(r => r.id !== id));
}

async function clearRecords() {
  await saveRecords([]);
}

// Settings
async function getSettings() {
  const stored = await get('settings', {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function updateSettings(updates) {
  const current = await getSettings();
  await set('settings', { ...current, ...updates });
}

// Prompt
const LANG_DISPLAY = {
  java: 'Java', python: 'Python', cpp: 'C++', javascript: 'JavaScript',
  go: 'Go', rust: 'Rust', typescript: 'TypeScript', kotlin: 'Kotlin',
  ruby: 'Ruby', swift: 'Swift', csharp: 'C#', c: 'C',
};

async function getPrompt() {
  const settings = await getSettings();
  const template = settings.promptTemplate || DEFAULT_PROMPT;
  const langs = (settings.codeLanguages || ['java', 'python', 'cpp']).map(k => LANG_DISPLAY[k] || k).join('、');
  const langLine = `\n\n【代码语言】编程题必须返回以下语言的代码：${langs}。非编程题不需要code字段。`;

  const exp = settings.explanation;
  let expLine = '';
  if (exp?.enabled) {
    const teacher = exp.teacher || '严谨型';
    const sections = exp.sections?.length ? exp.sections.join('、') : '';
    expLine = `\n\n【讲解配置】以"${teacher}"风格讲解题目，讲解内容包含：${sections}。讲解内容请放在explanation字段中。`;
  } else {
    expLine = `\n\n【讲解配置】不开启讲解，explanation字段填简短说明即可。`;
  }

  return template + langLine + expLine;
}

async function savePrompt(template) {
  const settings = await getSettings();
  settings.promptTemplate = template;
  await set('settings', settings);
}

// Active model
async function getActiveModelId() {
  const settings = await getSettings();
  return settings.activeModelId || '';
}

async function setActiveModelId(id) {
  const settings = await getSettings();
  settings.activeModelId = id;
  await set('settings', settings);
}

export {
  get, set, remove, clear,
  getModels, saveModels, addModel, updateModel, deleteModel, getDefaultModel,
  getRecords, saveRecords, addRecord, deleteRecord, clearRecords,
  getSettings, updateSettings,
  getPrompt, savePrompt,
  getActiveModelId, setActiveModelId,
  DEFAULT_PROMPT,
};
