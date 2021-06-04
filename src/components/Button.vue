<template>
  <button
    v-bind="$attrs"
    :disabled="disabled"
    :class="{'pointer-events-none opacity-70': disabled}"
    class="p-2 font-bold uppercase transition-all duration-200 border-2 border-indigo-300 rounded-md focus:border-indigo-500 focus-within:outline-none hover:border-indigo-500"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    disabled: Boolean,
  }
}
</script>