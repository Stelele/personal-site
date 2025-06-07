<template>
  <PageBase :label="`${blogTitle} posts`" icon="fc-opened-folder">
    <div class="min-w-full min-h-full gap-16 grid grid-cols-2 p-8">
      <router-link
        v-if="!articlesStore.isDownloading"
        v-for="post in posts"
        :key="post.id"
        :to="`/blog/${blogSite}/${post.id}`"
      >
        <div class="card bg-base-200 w-full shadow-sm hover:cursor-pointer">
          <figure>
            <img
              class="max-h-72"
              :src="post.coverImage || `/blog-empty.png`"
              :alt="post.title"
            />
          </figure>
          <div class="card-body">
            <h2 class="card-title">{{ post.title }}</h2>
            <div class="flex flex-wrap gap-2 mt-1">
              <div
                v-for="tag in post.tags"
                :key="`${post.id}_${tag}`"
                class="badge badge-outline badge-primary"
              >
                {{ tag }}
              </div>
            </div>
            <p class="mt-1">{{ getFormatedDate(post.publishDate) }}</p>
          </div>
        </div>
      </router-link>
      <div
        v-if="articlesStore.isDownloading"
        v-for="i in 6"
        :key="i"
        class="flex flex-col gap-2"
      >
        <div class="skeleton w-full h-[40vh]"></div>
        <div class="skeleton w-3/4 h-10"></div>
      </div>
    </div>
  </PageBase>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import PageBase from "../../components/PageBase.vue";
import { computed } from "vue";
import { useArticlesStore } from "../../stores/aritcles-store";
import { Post } from "../../helpers/type";
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
