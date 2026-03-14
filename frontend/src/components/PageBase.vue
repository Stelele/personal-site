<template>
  <UPage>
    <template #left>
      <UPageAside>
        <UNavigationMenu
          orientation="vertical"
          :items="sideBarStore.links"
          class="bg-transparent w-full max-w-60"
        />
      </UPageAside>
    </template>
    <UPageBody class="h-[85vh] max-h-[85vh] overflow-y-auto">
      <slot />
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import { useSideBarStore } from "@/stores/sidebar-store";

const sideBarStore = useSideBarStore();
</script>
