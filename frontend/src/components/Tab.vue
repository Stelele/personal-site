<template>
  <div class="flex w-full gap-0" :class="prop.baseStyles">
    <div
      class="flex w-fit border-t border-primary gap-1 py-1 px-2 items-center justify-center tab-color"
    >
      <div>
        <UIcon :name="prop.iconLeft" class="w-4 h-4" />
      </div>
      <div class="prose">
        <h5>{{ prop.label }}</h5>
      </div>
      <div>
        <UIcon :name="prop.iconRight" class="w-4 h-4" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
export interface Prop {
  iconLeft?: string;
  label?: string;
  iconRight?: string;
  baseStyles?: string;
}

const prop = withDefaults(defineProps<Prop>(), {
  iconLeft: "",
  label: "",
  iconRight: "",
  baseStyles: "",
});
</script>

<style lang="css" scoped>
.tab-color {
  background-color: #22272e;
}
</style>
