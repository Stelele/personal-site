<template>
  <div class="min-w-full min-h-full p-8">
    <UBreadcrumb :items="breadcrumbLinks" class="mb-4" />
    <UPageHeader :title="capitalizedSite" :description="siteDescription" class="mb-8" />
    <template v-if="!articlesStore.isDownloading">
      <UBlogPosts
        orientation="vertical"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <UBlogPost
          v-for="post in posts"
          :key="post.id"
          :title="post.title"
          :image="post.coverImage || '/blog-empty.jpg'"
          :date="post.publishDate"
          :badge="post.tags[0]"
          :to="`/blog/${blogSite}/${post.id}`"
        />
      </UBlogPosts>
    </template>
    <template v-if="articlesStore.isDownloading">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="i in 6" :key="i" class="bg-[--ui-bg-alt] rounded-lg overflow-hidden">
          <USkeleton class="w-full h-48" />
          <div class="p-4 space-y-3">
            <USkeleton class="w-3/4 h-5" />
            <div class="flex gap-2">
              <USkeleton class="w-16 h-5" />
              <USkeleton class="w-16 h-5" />
            </div>
            <USkeleton class="w-1/2 h-4" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { Post } from "@/helpers/type";
import { useSeoMeta } from "@unhead/vue";
import type { BreadcrumbItem } from "@nuxt/ui";
import { useSideBarStore } from "@/stores/sidebar-store";

const route = useRoute();
const articlesStore = useArticlesStore();
const sidebarStore = useSideBarStore();

const blogSite = computed(() => {
  const site = route.params.site;
  return Array.isArray(site) ? site[0] : site;
});

const capitalizedSite = computed(() => {
  return blogSite.value?.charAt(0).toUpperCase() + blogSite.value?.slice(1) || "";
});

const siteDescription = computed(() => {
  if (blogSite.value === "hashnode") {
    return "Exploring web development, JavaScript, programming concepts, and software engineering insights.";
  }
  return "Thoughts on technology, personal growth, and the creative journey.";
});

const breadcrumbLinks = computed<BreadcrumbItem[]>(() => {
  return [
    {
      label: "Home",
      to: "/",
      onClick: () => sidebarStore.init("/"),
    },
    { label: capitalizedSite.value },
  ];
});

const posts = computed<Post[]>(() => {
  if (articlesStore.isDownloading) return [];

  return articlesStore.posts.filter((post) => post.blogSite === blogSite.value);
});

useSeoMeta({
  title: () => `${capitalizedSite.value} Articles by Gift Mugweni`,
  description: () =>
    `Browse all ${blogSite.value} articles on web development, JavaScript, programming tutorials, and tech insights.`,
  ogTitle: () => `${capitalizedSite.value} Articles by Gift Mugweni`,
  ogDescription: () =>
    `Browse all ${blogSite.value} articles on web development, JavaScript, programming tutorials, and tech insights.`,
  ogImage: "/assets/logo.png",
  twitterCard: "summary_large_image",
  twitterTitle: () => `${capitalizedSite.value} Articles by Gift Mugweni`,
  twitterDescription: () =>
    `Browse all ${blogSite.value} articles on web development, JavaScript, programming tutorials, and tech insights.`,
  twitterImage: "/assets/logo.png",
});
</script>
