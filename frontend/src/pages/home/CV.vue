<template>
  <div class="flex flex-col grow items-center">
    <div class="prose text-center">
      <h3><a href="#">Here</a> is the official one page CV</h3>
      <h2>Below is the overly dramatized timeline</h2>
    </div>
    <Timeline :elements="timelineDetails" />
  </div>
</template>

<script lang="ts" setup>
import { useSeoMeta } from "@unhead/vue";
import Timeline from "@/components/timeline/Timeline.vue";
import { timelineDetails } from "@/components/timeline/details";

useSeoMeta({
  title: "Resume & Professional Experience - Gift Mugweni",
  description:
    "View my professional resume and work experience. Software engineer with expertise in Vue.js, TypeScript, and modern web development.",
  ogTitle: "Resume & Professional Experience - Gift Mugweni",
  ogDescription:
    "View my professional resume and work experience. Software engineer with expertise in Vue.js, TypeScript, and modern web development.",
  ogImage: "/assets/logo.png",
  twitterCard: "summary_large_image",
  twitterTitle: "Resume & Professional Experience - Gift Mugweni",
  twitterDescription:
    "View my professional resume and work experience. Software engineer with expertise in Vue.js, TypeScript, and modern web development.",
  twitterImage: "/assets/logo.png",
});
</script>
