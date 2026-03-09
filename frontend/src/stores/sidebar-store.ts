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
  const currentGroupId = ref("home");

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
      defaultExpanded: currentGroupId.value === "home",
      children: [
        { label: "Overview", path: "/", onSelect: () => router.push("/") },
        { label: "Professional Experience", path: "/cv", onSelect: () => router.push("/cv") },
      ],
    },
    {
      label: "Blog",
      icon: "i-heroicons-document-text",
      defaultExpanded: currentGroupId.value === "blog",
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
      defaultExpanded: currentGroupId.value === "projects",
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
      defaultExpanded: currentGroupId.value === "books",
      children: [
        {
          label: "Wuxia Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          path: "/books/wuxia",
          onSelect: () => router.push("/books/wuxia"),
        },
        {
          label: "Western Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          path: "/books/western",
          onSelect: () => router.push("/books/western"),
        },
      ],
    },
  ]);

  function update(path: string) {
    currentGroupId.value = routeToGroupId(path);
  }

  function routeToGroupId(path: string): string {
    let segment = path.slice(1).split("/")[0];
    if (segment === "") {
      segment = window.location.pathname.slice(1).split("/")[0];
    }

    switch (segment) {
      case "":
        return "home";
      case "blog":
        return "blog";
      case "projects":
        return "projects";
      case "books":
        return "books";
      default:
        return "home";
    }
  }
  return {
    show,
    links,
    update,
    blogNavs,
  };
});
