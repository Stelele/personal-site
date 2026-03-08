<template>
  <div class="flex flex-col grow items-center" />
</template>

<script lang="ts" setup>
import { useSeoMeta } from "@unhead/vue";

useSeoMeta({
  title: "My Journey - Life Story & Milestones",
  description:
    "A timeline of meaningful life events and personal milestones that shaped my path as a software developer.",
  ogTitle: "My Journey - Life Story & Milestones",
  ogDescription:
    "A timeline of meaningful life events and personal milestones that shaped my path as a software developer.",
  ogImage: "/assets/logo.png",
  twitterCard: "summary_large_image",
  twitterTitle: "My Journey - Life Story & Milestones",
  twitterDescription:
    "A timeline of meaningful life events and personal milestones that shaped my path as a software developer.",
  twitterImage: "/assets/logo.png",
});
</script>
