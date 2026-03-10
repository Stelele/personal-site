import { TreeItem } from "@nuxt/ui";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useArticlesStore } from "@/stores/aritcles-store";

interface Detail {
  title: string;
  icon: string;
  path: string;
  children: { name: string; path: string }[];
}

export const useSideBarStore = defineStore("SideBarStore", () => {
  const router = useRouter();
  const articlesStore = useArticlesStore();
  const show = ref(false);
  const currentLink = ref<TreeItem | undefined>();

  const blogNavs = computed<Detail[]>(() => {
    const medium: Detail = {
      title: "Medium Blog",
      icon: "i-simple-icons:medium",
      path: "/blog/medium",
      children: [],
    };

    const hashnode: Detail = {
      title: "Hashnode Blog",
      icon: "i-simple-icons:hashnode",
      path: "/blog/hashnode",
      children: [],
    };

    for (const post of articlesStore.posts) {
      const section = post.blogSite === "medium" ? medium : hashnode;

      section.children.push({
        name: post.title,
        path: `/blog/${post.blogSite}/${post.id}`,
      });
    }
    return [medium, hashnode];
  });

  const links = computed<TreeItem[]>(() => [
    {
      label: "Home",
      icon: "i-heroicons-user",
      defaultExpanded: true,
      children: [
        { label: "Overview", path: "/", onSelect: () => router.push("/") },
        { label: "Professional Experience", path: "/cv", onSelect: () => router.push("/cv") },
      ],
    },
    {
      label: "Blog",
      icon: "i-heroicons-document-text",
      defaultExpanded: true,
      children: blogNavs.value.map((detail) => ({
        label: detail.title,
        icon: detail.icon,
        path: detail.path,
        onSelect: () => router.push(detail.path),
      })),
    },
    {
      label: "Projects",
      icon: "i-heroicons-code-bracket",
      defaultExpanded: true,
      children: [
        {
          label: "Graphics Projects",
          icon: "i-heroicons-folder",
          path: "/projects/graphics",
          onSelect: () => router.push("/projects/graphics"),
        },
        {
          label: "Game Dev Projects",
          icon: "i-heroicons-folder",
          path: "/projects/game-dev",
          onSelect: () => router.push("/projects/game-dev"),
        },
      ],
    },
    {
      label: "Books",
      icon: "i-heroicons-book-open",
      defaultExpanded: true,
      children: [
        {
          label: "Wuxia Books",
          icon: "i-heroicons-folder",
          path: "/books/wuxia",
          onSelect: () => router.push("/books/wuxia"),
        },
        {
          label: "Western Books",
          icon: "i-heroicons-folder",
          path: "/books/western",
          onSelect: () => router.push("/books/western"),
        },
      ],
    },
  ]);

  function init(path: string) {
    const matches: Array<[number, TreeItem]> = [];
    for (const link of links.value) {
      const child = link.children?.find((child) => path.startsWith(child.path));
      if (child) {
        matches.push([child.path.length, child]);
      }
    }
    currentLink.value = matches.sort((a, b) => b[0] - a[0])[0]?.[1];
  }

  function navigateTo(path: string) {
    router.push(path);
    init(path);
  }

  return {
    show,
    links,
    currentLink,
    blogNavs,
    navigateTo,
    init,
  };
});
