<template>
    <div class="min-w-full min-h-full flex flex-col bg-base-100 m-0 p-0">
        <Tab icon="fc-opened-folder" label="Overview" />
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
import Tab from './Tab.vue';
</script>