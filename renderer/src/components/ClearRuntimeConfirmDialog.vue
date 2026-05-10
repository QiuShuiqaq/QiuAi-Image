<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <div v-if="visible" class="clear-runtime-confirm-modal">
    <div class="clear-runtime-confirm-modal__card">
      <header class="clear-runtime-confirm-modal__header">
        <strong>一键清理确认</strong>
        <span>确认执行一键清理吗？将重置参数设置、效果展示与日志缓存，但不会删除输出结果、提示词库、API-Key 和保存目录。</span>
      </header>

      <footer class="clear-runtime-confirm-modal__actions">
        <button class="secondary-action" type="button" :disabled="isProcessing" @click="emit('close')">
          取消
        </button>
        <button class="primary-action" type="button" :disabled="isProcessing" @click="emit('confirm')">
          {{ isProcessing ? '清理中...' : '确认清理' }}
        </button>
      </footer>
    </div>
  </div>
</template>
