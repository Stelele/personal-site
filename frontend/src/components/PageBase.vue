<template>
  <UPage>
    <template #left>
      <UPageAside>
        <UNavigationMenu orientation="vertical" :items="sideBarStore.links" class="bg-transparent w-full max-w-60" />
      </UPageAside>
    </template>
    <UPageBody ref="contentBody" class="h-[85vh] max-h-[85vh] overflow-y-auto">
      <slot />
    </UPageBody>
  </UPage>
</template>

<script setup lang="ts">
import { useSideBarStore } from "@/stores/sidebar-store";
import { usePageScrollStore } from "@/stores/page-scroll-store";
import { onMounted, ref } from "vue";

const sideBarStore = useSideBarStore();
const pageScrollStore = usePageScrollStore();
const contentBody = ref<HTMLElement | null>(null);

onMounted(() => {
  if (contentBody.value) {
    pageScrollStore.setRef(contentBody.value);
  }
});
</script>
