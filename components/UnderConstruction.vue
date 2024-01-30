<template>
  <div class="hero min-h-screen" style="background-image: url(https://images.pexels.com/photos/41951/solar-system-emergence-spitzer-telescope-telescope-41951.jpeg?auto=compress&cs=tinysrgb&w=600);">
  <div class="hero-overlay bg-opacity-60"></div>
  <div class="hero-content text-center text-neutral-content">
    <div class="max-w-md">
      <h1 class="mb-5 text-5xl font-bold">{{prependSentence}}under construction</h1>
      <p class="mb-5">All good things take time. Time is forever scarce. Hence why wait until you finish before publishing. Let the world see your eternal work in progress</p>
    </div>
  </div>
  </div>
</template>

<script lang="ts" setup>
  interface IProps {
    pageTitle: string
  }

  const props = withDefaults(defineProps<IProps>(), {
    pageTitle: ''
  })

  const prependSentence = props.pageTitle.length ? `${props.pageTitle} page is ` : ""
</script>

<style>

</style>