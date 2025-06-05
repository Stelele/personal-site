import { defineStore } from "pinia";
import { Post } from "../helpers/type";
import { Ref, ref } from "vue";
import { getBlogFeeds } from "../helpers/downloader";

export const useArticlesStore = defineStore("ArticlesStore", () => {
  const posts = ref<Post[]>([]);
  const isDownloading = ref(true);

  function update() {
    updatePosts(posts, isDownloading);
  }

  return {
    posts,
    update,
    isDownloading,
  };
});

async function updatePosts(posts: Ref<Post[]>, isDownloading: Ref<boolean>) {
  isDownloading.value = true;
  posts.value = await getBlogFeeds();
  isDownloading.value = false;
}

