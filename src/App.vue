<template>
  <div class="mockup-browser bg-base-200 flex flex-col min-h-[100vh]">
    <div class="mockup-browser-toolbar flex">
      <div class="flex-grow"></div>
      <div class="w-80 text-center bg-base-100 rounded-lg">
        <OhVueIcon name="bi-gift" /> Gift's Personal Site
      </div>
      <div class="flex-grow"></div>
    </div>
    <Navigation>
      <div class="flex flex-grow bg-base-200 gap-0">
        <div class="flex flex-grow justify-center items-center">
          <RouterView />
        </div>
      </div>
    </Navigation>
  </div>
</template>

<script setup lang="ts">
import Navigation from './components/navigation/Navigation.vue';
import { RouterView } from 'vue-router'
import { OhVueIcon } from 'oh-vue-icons';
console.log("")
</script>
