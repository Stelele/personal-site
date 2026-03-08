<template>
  <div class="flex flex-col grow items-center justify-center">
    <Giphy class="mt-3" :width="600" name="work in progress" />
  </div>
</template>

<script lang="ts" setup>
import Giphy from "@/components/Giphy.vue";
import { useSeoMeta } from "@unhead/vue";

useSeoMeta({
  title: "Projects in Development - Coming Soon",
  description:
    "Explore my work-in-progress projects and experiments. Building the future, one feature at a time.",
  ogTitle: "Projects in Development - Coming Soon",
  ogDescription:
    "Explore my work-in-progress projects and experiments. Building the future, one feature at a time.",
  ogImage: "/assets/logo.png",
  twitterCard: "summary_large_image",
  twitterTitle: "Projects in Development - Coming Soon",
  twitterDescription:
    "Explore my work-in-progress projects and experiments. Building the future, one feature at a time.",
  twitterImage: "/assets/logo.png",
});
</script>
