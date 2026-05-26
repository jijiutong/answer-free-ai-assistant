<template>
  <div class="loading-overlay">
    <div class="spinner"></div>
    <span class="loading-message">{{ message }}</span>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: '处理中...' },
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 100;
  animation: fadeIn 0.2s;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-message {
  color: white;
  font-size: 14px;
  font-weight: 500;
}
</style>
