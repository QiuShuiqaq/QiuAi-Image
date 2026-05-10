<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  as: {
    type: String,
    default: 'input'
  }
})

const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()

const tagName = computed(() => {
  return props.as === 'textarea' ? 'textarea' : 'input'
})

const stringValue = computed(() => {
  return String(props.modelValue ?? '')
})

function handleInput(event) {
  emit('update:modelValue', event?.target?.value ?? '')
}
</script>

<template>
  <component
    :is="tagName"
    v-bind="attrs"
    :value="stringValue"
    @input="handleInput"
  />
</template>
