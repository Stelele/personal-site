import { defineStore } from "pinia";
import { Blog, Post } from "@/helpers/type";
import { Ref, ref } from "vue";
import { getBlogFeeds } from "@/helpers/downloader";

export const useArticlesStore = defineStore("ArticlesStore", () => {
  const blogs = ref<Blog[]>([]);
  const isDownloading = ref(true);

  function update() {
    updatePosts(blogs, isDownloading);
  }

  function findBlog(blogSlug: string): Blog | undefined {
    return blogs.value.find((b) => b.slug === blogSlug);
  }

  function findPost(blogSlug: string, postId: string): Post | undefined {
    return findBlog(blogSlug)?.posts.find((p) => p.id === postId);
  }

  function getPostsByBlog(blogSlug: string): Post[] {
    return findBlog(blogSlug)?.posts || [];
  }

  return {
    blogs,
    update,
    isDownloading,
    findPost,
    getPostsByBlog,
    findBlog,
  };
});

async function updatePosts(blogs: Ref<Blog[]>, isDownloading: Ref<boolean>) {
  isDownloading.value = true;
  blogs.value = await getBlogFeeds();
  isDownloading.value = false;
}
