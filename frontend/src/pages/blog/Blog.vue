<template>
  <div class="min-w-full min-h-full lg:p-8">
    <UContainer class="lg:max-w-9/10">
      <UBreadcrumb :items="breadcrumbLinks" class="mb-4" />
      <PostSkeleton v-if="isLoading" />
      <UCard v-else-if="isNotFound" variant="ghost" class="w-full">
        <p class="text-muted text-center py-8">The requested article could not be found.</p>
      </UCard>

      <UCard v-else-if="post" variant="ghost" class="w-full">
        <template #header>
          <h1 class="text-2xl md:text-3xl font-bold">
            {{ post.title }}
          </h1>
          <p v-if="post.publishDate" class="text-lg font-medium text-muted mt-1">
            {{ formatDate(post.publishDate) }}
          </p>
          <UButton v-if="showCanonical" :to="post.link" target="_blank" variant="link" color="primary"
            icon="i-heroicons-arrow-top-right-on-square-20-solid" class="mt-1 px-0">
            View original article
          </UButton>
          <img v-if="post.coverImage" :src="post.coverImage" :alt="post.title" class="w-full mt-4 rounded-lg" />
        </template>

        <div ref="contentRef" class="post-body">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <article class="prose prose-xl prose-slate prose-invert max-w-none text-justify leading-relaxed" v-html="augmentedContent" />
        </div>
      </UCard>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useRoute } from "vue-router";
import { useSideBarStore } from "@/stores/sidebar-store";
import { usePostRenderer } from "@/composables/usePostRenderer";
import { usePlyrAudio } from "@/composables/usePlyrAudio";
import PostSkeleton from "@/components/PostSkeleton.vue";
import type { BreadcrumbItem } from "@nuxt/ui";
import "plyr/dist/plyr.css";

const articlesStore = useArticlesStore();
const sidebarStore = useSideBarStore();
const route = useRoute();

const post = computed(() => {
  return articlesStore.findPost(
    route.params.site as string,
    route.params.id as string,
  );
});

const capitalizedSite = computed(() => {
  const site = route.params.site as string;
  return site?.charAt(0).toUpperCase() + site?.slice(1) || "";
});

const contentType = computed<"markdown" | "html">(() => {
  const blog = articlesStore.findBlog(route.params.site as string);
  return blog?.contentType ?? "html";
});

const isDataReady = computed(() => !articlesStore.isDownloading);

const { augmentedContent, isLoading, isNotFound, showCanonical, formatDate } = usePostRenderer({
  post,
  contentType,
  isDataReady,
});

const contentRef = ref<HTMLElement | null>(null);
usePlyrAudio({
  containerRef: contentRef,
  contentChanged: augmentedContent,
});

const breadcrumbLinks = computed<BreadcrumbItem[]>(() => {
  return [
    { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
    {
      label: capitalizedSite.value,
      to: `/blog/${route.params.site}`,
      onClick: () => sidebarStore.init(`/blog/${route.params.site}`),
    },
    { label: post.value?.title || "" },
  ];
});
</script>
