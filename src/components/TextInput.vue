<template>
  <label class="block">
    <div
      v-if="label"
      class="text-sm font-bold"
    >{{ label }}</div>
    <input
      v-bind="$attrs"
      :value="modelValue"
      :disabled="disabled"
      :class="{
        'border-2 border-indigo-300 focus:border-indigo-500': bordered,
        'pointer-events-none opacity-70': disabled
      }"
      class="w-full p-2 transition-all duration-200 bg-gray-100 border-2 border-transparent rounded-md focus-within:outline-none"
      @input="$emit('update:modelValue', $event.target.value)"
    >
  </label>
</template>

<script>
export default {
  props: {
    modelValue: { type: [String,Number], default: null },
    label: { type: String, default: null },
    disabled: Boolean,
    bordered: Boolean,
  },
  emits:['update:modelValue']
}
</script>