<template>
  <PageBase :label="post?.title" icon="fc-opened-folder">
    <div
      v-if="!isLoading"
      class="prose min-w-full text-xl p-4 lg:pb-20 lg:pt-8 lg:px-20"
      v-html="augmentedContent"
    ></div>
    <div
      class="min-w-full min-h-full gap-4 flex flex-col bg-base-100 px-4"
      v-else
    >
      <div class="skeleton h-80 w-3/4 center-fig"></div>
      <div v-for="_ in 4" class="flex flex-col gap-1">
        <div class="skeleton w-[80%] h-5"></div>
        <div class="skeleton w-[80%] h-5"></div>
        <div class="skeleton w-[85%] h-5"></div>
        <div class="skeleton w-[85%] h-5"></div>
        <div class="skeleton w-[90%] h-5"></div>
        <div class="skeleton w-[90%] h-5"></div>
        <div class="skeleton w-[85%] h-5"></div>
        <div class="skeleton w-[85%] h-5"></div>
      </div>
    </div>
  </PageBase>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUpdated, ref } from "vue";
import { useArticlesStore } from "../../stores/aritcles-store";
import { useRoute } from "vue-router";
import PageBase from "../../components/PageBase.vue";
import { getMediumPostText } from "../../helpers/blogs/medium";
import { useSeoMeta } from "@unhead/vue";

const articlesStore = useArticlesStore();
const route = useRoute();
const isLoading = ref(true);
const prevRoute = ref({
  site: "",
  id: "",
});

onMounted(() => {
  loadPost();
  prevRoute.value.id = route.params.id as string;
  prevRoute.value.site = route.params.site as string;
});

onUpdated(async () => {
  if (isLoading.value) return;
  if (
    prevRoute.value.id !== route.params.id ||
    prevRoute.value.site !== route.params.site
  ) {
    isLoading.value = true;
    loadPost();
    prevRoute.value.id = route.params.id as string;
    prevRoute.value.site = route.params.site as string;
  }
});

async function loadPost() {
  if (post.value?.title === undefined || post.value?.title === null) {
    setTimeout(loadPost);
    return;
  } else if (route.params.site === "medium") {
    const foundPost = articlesStore.posts.find(
      (x) => x.blogSite === route.params.site && x.id === route.params.id,
    );
    if (foundPost) {
      foundPost.content = await getMediumPostText(foundPost.link);
    }
  }

  isLoading.value = false;
}

const post = computed(() => {
  const foundPost = articlesStore.posts.find(
    (x) => x.blogSite === route.params.site && x.id === route.params.id,
  );
  if (!foundPost) return;

  const content = new DOMParser().parseFromString(
    foundPost.content,
    "text/html",
  );
  content.querySelectorAll("img").forEach((img) => {
    img.style.display = "block";
    img.style.marginLeft = "auto";
    img.style.marginRight = "auto";
    img.style.maxWidth = "400px";
  });
  content.querySelectorAll("figcaption").forEach((caption) => {
    caption.style.textAlign = "center";
  });

  foundPost.content = new XMLSerializer().serializeToString(content);

  return foundPost;
});

const augmentedContent = computed(() => {
  return `<h3><a target="_blank" href="${post.value?.link}">Here</a> is the link to original article</h3>${post.value?.content}`;
});

useSeoMeta({
  title: () => `${post.value?.title} | ${post.value?.blogSite}`,
  description: () => post.value?.brief,
});
</script>

<style scoped>
.center-fig {
  display: block;
  margin: 0 auto;
}
</style>
