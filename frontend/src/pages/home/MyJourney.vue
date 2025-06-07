<template>
  <PageBase label="My Journey" icon="fc-opened-folder">
    <div class="flex flex-col flex-grow items-center"></div>
  </PageBase>
</template>

<script lang="ts" setup>
import { useSeoMeta } from "@unhead/vue";
import PageBase from "../../components/PageBase.vue";

useSeoMeta({
  title: "My Journey",
  description: `This page contains details on key events in my life that I found meaningful but don't really make sense to to put in a CV.`,
});
</script>

