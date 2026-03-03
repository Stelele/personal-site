<template>
    <div class="flex w-full min-h-[calc(100vh-48px)] gap-1">
        <!-- Desktop sidebar: fixed width, always visible on lg+ -->
        <div
            class="hidden lg:block lg:w-64 lg:sticky lg:top-10 lg:h-screen shrink-0 overflow-auto"
        >
            <UTree :items="treeItems" class="p-2 fixed w-64" />
        </div>

        <!-- Main content: takes remaining width -->
        <div class="grow">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { TreeItem } from "@nuxt/ui";
import { useArticlesStore } from "../../stores/aritcles-store";
import type { Detail } from "./details";

const route = useRoute();
const articlesStore = useArticlesStore();

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
        if (medium.children.length >= 10 && hashnode.children.length >= 10)
            break;

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
