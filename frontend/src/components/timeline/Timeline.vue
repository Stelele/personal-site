<template>
  <div>
    <UTimeline :items="timelineItems" orientation="vertical" class="w-full" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { TimelineItem } from "@nuxt/ui";

export interface Element {
  title: string;
  description: string;
  image: string;
}

export interface Props {
  elements: Element[];
}

const props = defineProps<Props>();

const timelineItems = computed<TimelineItem[]>(() => {
  return props.elements.map((element) => ({
    title: element.title,
    description: element.description,
    icon: "i-heroicons-check-circle",
  }));
});
</script>
