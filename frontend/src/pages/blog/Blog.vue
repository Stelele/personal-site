<template>
  <div class="min-w-full min-h-full p-8">
    <UContainer class="py-6 md:py-10 max-w-9/10">
      <UCard v-if="isLoading" variant="ghost" class="p-4 md:p-6 lg:p-8">
        <template #header>
          <div class="flex flex-col gap-3">
            <USkeleton class="h-8 w-3/4" />
            <USkeleton class="h-5 w-1/2" />
          </div>
        </template>

        <div class="flex flex-col gap-3">
          <div v-for="(_, index) in 6" :key="index" class="flex flex-col gap-2">
            <USkeleton v-if="index % 2 === 0" class="h-4 w-full" />
            <USkeleton v-else class="h-4 w-[90%]" />
          </div>
          <USkeleton class="h-64 w-full rounded-lg mt-2" />
          <div v-for="(_, index) in 4" :key="`p${index}`" class="flex flex-col gap-2">
            <USkeleton class="h-4 w-full" />
          </div>
        </div>
      </UCard>

      <UCard v-else variant="ghost" class="p-4 md:p-6 lg:p-8">
        <template #header>
          <h1 class="text-2xl md:text-3xl font-bold">
            {{ post?.title }}
          </h1>
          <p v-if="post?.publishDate" class="text-lg font-medium text-muted mt-1">
            {{ formatDate(post.publishDate) }}
          </p>
          <UButton
            :to="post?.link"
            target="_blank"
            variant="link"
            color="primary"
            icon="i-heroicons-arrow-top-right-on-square-20-solid"
            class="mt-1 px-0"
          >
            View original article
          </UButton>
          <img
            v-if="post?.coverImage"
            :src="post.coverImage"
            :alt="post.title"
            class="w-full mt-4 rounded-lg"
          />
        </template>

        <article
          class="prose prose-lg dark:prose-invert max-w-none text-justify leading-relaxed"
          v-html="augmentedContent"
        />
      </UCard>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUpdated, ref } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useRoute } from "vue-router";
import { getMediumPostText } from "@/helpers/blogs/medium";
import { useSeoMeta, useHead } from "@unhead/vue";
import moment from "moment";

const articlesStore = useArticlesStore();
const route = useRoute();
const isLoading = ref(true);
const prevRoute = ref({
  site: "",
  id: "",
});

function formatDate(date: string): string {
  return moment(date).format("MMMM D, YYYY");
}

onMounted(() => {
  loadPost();
  prevRoute.value.id = route.params.id as string;
  prevRoute.value.site = route.params.site as string;
});

onUpdated(async () => {
  if (isLoading.value) return;
  if (prevRoute.value.id !== route.params.id || prevRoute.value.site !== route.params.site) {
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
      (x) => x.blogSite === route.params.site && x.id === route.params.id
    );
    if (foundPost) {
      foundPost.content = await getMediumPostText(foundPost.link);
    }
  }

  isLoading.value = false;
}

const post = computed(() => {
  const foundPost = articlesStore.posts.find(
    (x) => x.blogSite === route.params.site && x.id === route.params.id
  );
  if (!foundPost) return;

  const content = new DOMParser().parseFromString(foundPost.content, "text/html");
  content.querySelectorAll("img").forEach((img) => {
    img.style.display = "block";
    img.style.marginLeft = "auto";
    img.style.marginRight = "auto";
    img.style.maxWidth = "400px";
    img.style.borderRadius = "0.5rem";
  });
  content.querySelectorAll("figcaption").forEach((caption) => {
    caption.style.textAlign = "center";
  });

  foundPost.content = new XMLSerializer().serializeToString(content);

  return foundPost;
});

const augmentedContent = computed(() => {
  return post.value?.content;
});

const getAbsoluteImageUrl = (image: string | undefined): string => {
  const img = image || "/assets/logo.png";
  return img.startsWith("http") ? img : `${import.meta.env.VITE_SITE_URL}${img}`;
};

useSeoMeta({
  title: () => `${post.value?.title} - Gift Mugweni`,
  description: () => post.value?.brief,
  ogTitle: () => `${post.value?.title} - Gift Mugweni`,
  ogDescription: () => post.value?.brief,
  ogImage: () => getAbsoluteImageUrl(post.value?.coverImage),
  "og:image:width": "1200",
  "og:image:height": "630",
  "og:image:alt": () => post.value?.title,
  "og:image:secure_url": () => getAbsoluteImageUrl(post.value?.coverImage),
  ogType: "article",
  twitterCard: "summary_large_image",
  twitterTitle: () => `${post.value?.title} - Gift Mugweni`,
  twitterDescription: () => post.value?.brief,
  twitterImage: () => getAbsoluteImageUrl(post.value?.coverImage),
});

useHead(() => {
  if (!post.value) return [];
  return [
    {
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.value.title,
            image: post.value.coverImage ? [post.value.coverImage] : [],
            datePublished: post.value.publishDate,
            dateModified: post.value.updateDate,
            author: {
              "@type": "Person",
              name: "Gift Mugweni",
            },
            description: post.value.brief,
          }),
        },
      ],
    },
  ];
});
</script>
