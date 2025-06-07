<template>
  <PageBase label="CV" icon="fc-opened-folder">
    <div class="flex flex-col flex-grow items-center">
      <div class="prose text-center">
        <h3><a href="#">Here</a> is the official one page CV</h3>
        <h2>Below is the overly dramatized timeline</h2>
      </div>
      <Timeline :elements="timelineDetails" />
    </div>
  </PageBase>
</template>

<script lang="ts" setup>
import { useSeoMeta } from "@unhead/vue";
import PageBase from "../../components/PageBase.vue";
import Timeline from "../../components/timeline/Timeline.vue";
import { timelineDetails } from "../../components/timeline/details";

useSeoMeta({
  title: `CV`,
  description: `I mean I do still have a professional life. So, what kind of personal site would it be if I don't put my CV somewhere.`,
});
</script>

