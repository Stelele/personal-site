<template>
  <UPage>
    <template #left>
      <UPageAside>
        <UTree
          v-model="sideBarStore.currentLink"
          :items="sideBarStore.links"
          class="bg-transparent w-full fixed max-w-60"
        />
      </UPageAside>
    </template>
    <UPageBody class="h-screen">
      <slot />
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import { useSideBarStore } from "@/stores/sidebar-store";

const sideBarStore = useSideBarStore();
</script>
