<template>
  <PageBase label="Work In Progress" icon="fc-opened-folder">
    <div class="flex flex-col flex-grow items-center justify-center">
      <Giphy class="mt-3" :width="600" name="work in progress" />
    </div>
  </PageBase>
</template>

<script lang="ts" setup>
import PageBase from "../../components/PageBase.vue";
import Giphy from "../../components/Giphy.vue";
import { useSeoMeta } from "@unhead/vue";

useSeoMeta({
  title: `Work in Progress`,
  description: `Good things take time. This is why you should never trust any hard deadlines given by software developers.`,
});
</script>

