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

  function findPostBySlug(blogSlug: string, postSlug: string): Post | undefined {
    return findBlog(blogSlug)?.posts.find((p) => p.link === postSlug);
  }

  function getPostsByBlog(blogSlug: string): Post[] {
    return findBlog(blogSlug)?.posts || [];
  }

  return {
    blogs,
    update,
    isDownloading,
    findPost,
    findPostBySlug,
    getPostsByBlog,
    findBlog,
  };
});

async function updatePosts(blogs: Ref<Blog[]>, isDownloading: Ref<boolean>) {
  isDownloading.value = true;
  try {
    blogs.value = await getBlogFeeds();
  } catch (error) {
    // Without this the flag stays true when the download fails, and every
    // consumer renders its loading skeleton forever - which reads as a slow
    // site rather than as a failure, and hides the error entirely.
    console.error("Failed to load blogs", error);
  } finally {
    isDownloading.value = false;
  }
}
