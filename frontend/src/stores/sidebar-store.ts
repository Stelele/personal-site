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
        { label: "CV", path: "/cv", onSelect: () => router.push("/cv") },
        {
          label: "My Journey",
          path: "/my-journey",
          onSelect: () => router.push("/my-journey"),
        },
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
          defaultExpanded: true,
          children: [
            {
              label: "Web GPU Game Engine",
              path: "/web-gpu",
              onSelect: () => router.push("/web-gpu"),
            },
            {
              label: "Shader Land",
              path: "/shader-land",
              onSelect: () => router.push("/shader-land"),
            },
          ],
        },
        {
          label: "Game Dev Projects",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            {
              label: "Pets",
              path: "/pets",
              onSelect: () => router.push("/pets"),
            },
            {
              label: "Fight Night",
              path: "/fight-night",
              onSelect: () => router.push("/fight-night"),
            },
          ],
        },
      ],
    },
    {
      label: "Books",
      icon: "i-heroicons-book-open",
      defaultExpanded: currentGroupId.value === "book-recommendations",
      children: [
        {
          label: "Wuxia Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            {
              label: "God of fishing",
              path: "/god-of-fishing",
              onSelect: () => router.push("/god-of-fishing"),
            },
            {
              label: "Martial World",
              path: "/martial-world",
              onSelect: () => router.push("/martial-world"),
            },
          ],
        },
        {
          label: "Western Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            {
              label: "Discworld Series",
              path: "/discworld",
              onSelect: () => router.push("/discworld"),
            },
            {
              label: "Imajica",
              path: "/imajica",
              onSelect: () => router.push("/imajica"),
            },
          ],
        },
      ],
    },
  ]);

  function update(path: string) {
    currentGroupId.value = routeToGroupId(path);
  }

  function routeToGroupId(path: string): string {
    const segment = path.slice(1).split("/")[0];
    switch (segment) {
      case "":
        return "home";
      case "blog":
        return "blog";
      case "projects":
        return "projects";
      case "book-recommendations":
        return "book-recommendations";
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
