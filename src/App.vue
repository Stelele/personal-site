<template>
  <div class="mockup-browser bg-base-200 flex flex-col min-h-[100vh]">
    <div class="mockup-browser-toolbar">
      <div class=" input">Gift Personal Site</div>
    </div>
    <div class="flex flex-grow bg-base-100">
      <SideBar ref="sideBar" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SideBar from './components/navigation/SideBar.vue';

const sideBar = ref<InstanceType<typeof SideBar>>()

</script>
