<template>
  <PageBase :label="`${blogTitle} posts`" icon="fc-opened-folder">
    <div class="min-w-full min-h-full gap-16 grid grid-cols-2 p-8">
      <router-link
        v-if="!articlesStore.isDownloading"
        v-for="post in posts"
        :key="post.id"
        :to="`/blog/${blogSite}/${post.id}`"
      >
        <div class="bg-[--ui-bg-alt] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <figure>
            <img
              class="max-h-72 w-full object-cover"
              :src="post.coverImage || `/blog-empty.png`"
              :alt="post.title"
            />
          </figure>
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-2">{{ post.title }}</h2>
            <div class="flex flex-wrap gap-2 mb-2">
              <UBadge
                v-for="tag in post.tags"
                :key="`${post.id}_${tag}`"
                variant="outline"
                color="primary"
              >
                {{ tag }}
              </UBadge>
            </div>
            <p class="text-sm text-[--ui-text-muted]">{{ getFormatedDate(post.publishDate) }}</p>
          </div>
        </div>
      </router-link>
      <div
        v-if="articlesStore.isDownloading"
        v-for="i in 6"
        :key="i"
        class="flex flex-col gap-2"
      >
        <USkeleton class="w-full h-[40vh]" />
        <USkeleton class="w-3/4 h-10" />
      </div>
    </div>
  </PageBase>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import PageBase from "@/components/PageBase.vue";
import { computed } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { Post } from "@/helpers/type";
import moment from "moment";
import { useSeoMeta } from "@unhead/vue";

const route = useRoute();
const articlesStore = useArticlesStore();

const blogSite = computed(() => {
  return route.params.site;
});
const blogTitle = computed(() => {
  return blogSite.value[0]?.toUpperCase() + blogSite.value.slice(1);
});

const posts = computed<Post[]>(() => {
  if (articlesStore.isDownloading) return [];

  return articlesStore.posts.filter(
    (post) => post.blogSite === route.params.site,
  );
});

useSeoMeta({
  title: () => `${blogSite.value} blog articles`,
  description: () =>
    `These are all the articles I've written on ${blogSite.value}.`,
});

function getFormatedDate(date: string) {
  return moment(date).format("MMMM Do YYYY, h:mm:ss a");
}
</script>
