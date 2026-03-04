import { TreeItem } from "@nuxt/ui";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useArticlesStore } from "./aritcles-store";
import { Detail } from "../components/navigation/details";

export const useSideBarStore = defineStore("SideBarStore", () => {
  const router = useRouter();
  const articlesStore = useArticlesStore();
  const show = ref(false);
  const currentGroupId = ref("home");

  const blogNavs = computed<Detail[]>(() => {
    const medium: Detail = {
      title: "Medium Blog",
      iconOn: "fa-door-open",
      iconOff: "fa-door-closed",
      children: [],
    };

    const hashnode: Detail = {
      title: "Hashnode Blog",
      iconOn: "fa-door-open",
      iconOff: "fa-door-closed",
      children: [],
    };

    for (const post of articlesStore.posts) {
      if (medium.children.length >= 10 && hashnode.children.length >= 10) break;

      const section = post.blogSite === "medium" ? medium : hashnode;
      if (section.children.length >= 10) continue;

      section.children.push({
        name: post.title,
        path: `/blog/${post.blogSite}/${post.id}`,
      });
    }

    if (medium.children.length >= 10) {
      medium.children.push({
        name: "See more articles",
        path: `/blog/medium`,
      });
    }
    if (hashnode.children.length >= 10) {
      hashnode.children.push({
        name: "See more articles",
        path: `/blog/hashnode`,
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
        { label: "Overview", to: "/", onSelect: () => router.push("/") },
        { label: "CV", to: "/cv", onSelect: () => router.push("/cv") },
        { label: "My Journey", to: "/my-journey", onSelect: () => router.push("/my-journey") },
      ],
    },
    {
      label: "Blog",
      icon: "i-heroicons-document-text",
      defaultExpanded: currentGroupId.value === "blog",
      children: blogNavs.value
        .filter(
          (d) =>
            d.title.toLowerCase().includes("medium") ||
            d.title.toLowerCase().includes("hashnode"),
        )
        .map((detail) => ({
          label: detail.title,
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: detail.children.map((child) => ({
            label:
              child.name.length < 20
                ? child.name
                : `${child.name.slice(0, 17)}...`,
            to: child.path,
            onSelect: () => router.push(child.path),
          })),
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
            { label: "Web GPU Game Engine", to: "/web-gpu", onSelect: () => router.push("/web-gpu") },
            { label: "Shader Land", to: "/shader-land", onSelect: () => router.push("/shader-land") },
          ],
        },
        {
          label: "Game Dev Projects",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "Pets", to: "/pets", onSelect: () => router.push("/pets") },
            { label: "Fight Night", to: "/fight-night", onSelect: () => router.push("/fight-night") },
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
            { label: "God of fishing", to: "/god-of-fishing", onSelect: () => router.push("/god-of-fishing") },
            { label: "Martial World", to: "/martial-world", onSelect: () => router.push("/martial-world") },
          ],
        },
        {
          label: "Western Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "Discworld Series", to: "/discworld", onSelect: () => router.push("/discworld") },
            { label: "Imajica", to: "/imajica", onSelect: () => router.push("/imajica") },
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
  };
});
