<template>
    <div class="min-w-full min-h-full flex flex-col m-0 p-0">
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
export interface Props {
    label?: string;
    icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
    label: "",
    icon: "",
});
</script>
