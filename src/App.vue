<template>
  <div class="mockup-browser bg-base-200 flex flex-col min-h-[100vh]">
    <div class="mockup-browser-toolbar">
      <div class=" input">Gift Personal Site</div>
    </div>
    <div class="flex flex-grow bg-base-100">
      <Navigation />
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import Navigation from './components/navigation/Navigation.vue';
import { RouterView } from 'vue-router'

</script>
