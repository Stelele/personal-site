import { defineStore } from "pinia";
import { Blog } from "@/helpers/type";
import { Ref, ref } from "vue";
import { getBlogFeeds } from "@/helpers/downloader";

export const useArticlesStore = defineStore("ArticlesStore", () => {
  const blogs = ref<Blog[]>([]);
  const isDownloading = ref(true);

  function update() {
    updatePosts(blogs, isDownloading);
  }

  function findPost(blogSlug: string, postId: string): Blog["posts"][0] | undefined {
    const blog = blogs.value.find((b) => b.slug === blogSlug);
    return blog?.posts.find((p) => p.id === postId);
  }

  function getPostsByBlog(blogSlug: string): Blog["posts"] {
    const blog = blogs.value.find((b) => b.slug === blogSlug);
    return blog?.posts ?? [];
  }

  return {
    blogs,
    update,
    isDownloading,
    findPost,
    getPostsByBlog,
  };
});

async function updatePosts(blogs: Ref<Blog[]>, isDownloading: Ref<boolean>) {
  isDownloading.value = true;
  blogs.value = await getBlogFeeds();
  isDownloading.value = false;
}
