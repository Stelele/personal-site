<template>
  <UTree :items="treeItems" class="bg-transparent p-2" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { TreeItem } from "@nuxt/ui";

const route = useRoute();

export interface Detail {
  iconOn: string;
  iconOff: string;
  title: string;
  children: Array<{
    name: string;
    path: string;
  }>;
}

export interface Props {
  details?: Array<Detail>;
}

const props = withDefaults(defineProps<Props>(), {
  details: () => [],
});

const routeToGroupId = (path: string): string => {
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
};

const treeItems = computed<TreeItem[]>(() => {
  const currentGroupId = routeToGroupId(route.path);

  const groups: TreeItem[] = [
    {
      label: "Home",
      icon: "i-heroicons-user",
      defaultExpanded: currentGroupId === "home",
      children: [
        {
          label: "Who am I",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "Overview", to: "/" },
            { label: "CV", to: "/cv" },
            { label: "My Journey", to: "/my-journey" },
          ],
        },
      ],
    },
    {
      label: "Blog",
      icon: "i-heroicons-document-text",
      defaultExpanded: currentGroupId === "blog",
      children: props.details
        .filter(
          (d) =>
            d.title.toLowerCase().includes("medium") ||
            d.title.toLowerCase().includes("hashnode")
        )
        .map((detail) => ({
          label: detail.title,
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: detail.children.map((child) => ({
            label: child.name.length < 20 ? child.name : `${child.name.slice(0, 17)}...`,
            to: child.path,
          })),
        })),
    },
    {
      label: "Projects",
      icon: "i-heroicons-code-bracket",
      defaultExpanded: currentGroupId === "projects",
      children: [
        {
          label: "Graphics Projects",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "Web GPU Game Engine", to: "/web-gpu" },
            { label: "Shader Land", to: "/shader-land" },
          ],
        },
        {
          label: "Game Dev Projects",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "Pets", to: "/pets" },
            { label: "Fight Night", to: "/fight-night" },
          ],
        },
      ],
    },
    {
      label: "Books",
      icon: "i-heroicons-book-open",
      defaultExpanded: currentGroupId === "book-recommendations",
      children: [
        {
          label: "Wuxia Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "God of fishing", to: "/god-of-fishing" },
            { label: "Martial World", to: "/martial-world" },
          ],
        },
        {
          label: "Western Books",
          icon: "i-heroicons-folder",
          defaultExpanded: true,
          children: [
            { label: "Discworld Series", to: "/discworld" },
            { label: "Imajica", to: "/imajica" },
          ],
        },
      ],
    },
  ];

  return groups;
});
</script>
