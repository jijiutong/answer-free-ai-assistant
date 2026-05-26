<template>
  <div class="sidepanel" :data-theme="theme">
    <nav class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="panel-content">
      <CaptureView v-if="currentTab === 'capture'" />
      <HistoryView v-if="currentTab === 'history'" />
      <ExportView v-if="currentTab === 'export'" />
      <SettingsView v-if="currentTab === 'settings'" @theme-change="updateTheme" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import CaptureView from './views/CaptureView.vue';
import HistoryView from './views/HistoryView.vue';
import ExportView from './views/ExportView.vue';
import SettingsView from './views/SettingsView.vue';
import { getSettings } from '@/shared/storage';

const tabs = [
  { id: 'capture', label: '抓题' },
  { id: 'history', label: '历史' },
  { id: 'export', label: '导出' },
  { id: 'settings', label: '设置' },
];

const currentTab = ref('capture');
const theme = ref('light');

function updateTheme(newTheme) {
  theme.value = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
}

onMounted(async () => {
  try {
    const settings = await getSettings();
    theme.value = settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme.value);
  } catch {}

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'switchTab' && message.tab) {
      currentTab.value = message.tab;
    }
  });

  chrome.storage.local.get('_pendingCapture', (result) => {
    if (result._pendingCapture) {
      window._capturedContent = result._pendingCapture;
      chrome.storage.local.remove('_pendingCapture');
      currentTab.value = 'capture';
    }
  });
});
</script>

<style scoped>
.sidepanel {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}
</style>
