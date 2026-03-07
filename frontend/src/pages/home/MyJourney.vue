<template>
  <div class="flex flex-col grow items-center" />
</template>

<script lang="ts" setup>
import { useSeoMeta } from "@unhead/vue";

useSeoMeta({
  title: "My Journey",
  description: `This page contains details on key events in my life that I found meaningful but don't really make sense to to put in a CV.`,
});
</script>
