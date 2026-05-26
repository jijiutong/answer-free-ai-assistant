<template>
  <div class="model-selector">
    <select
      v-model="selectedId"
      class="input model-select"
      @change="onSelect"
    >
      <option value="" disabled>选择模型</option>
      <option v-for="model in models" :key="model.id" :value="model.id">
        {{ model.name }} ({{ model.modelName }})
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getModels, getActiveModelId, setActiveModelId } from '@/shared/storage';

const emit = defineEmits(['select']);

const models = ref([]);
const selectedId = ref('');

async function onSelect() {
  const model = models.value.find(m => m.id === selectedId.value);
  if (model) {
    emit('select', model);
    await setActiveModelId(model.id);
  }
}

onMounted(async () => {
  models.value = await getModels();
  const activeId = await getActiveModelId();
  if (activeId && models.value.find(m => m.id === activeId)) {
    selectedId.value = activeId;
  } else if (models.value.length > 0) {
    const defaultModel = models.value.find(m => m.isDefault) || models.value[0];
    selectedId.value = defaultModel.id;
    emit('select', defaultModel);
  }
});
</script>

<style scoped>
.model-selector {
  flex: 1;
}

.model-select {
  width: 100%;
  cursor: pointer;
  min-width: 140px;
}
</style>
