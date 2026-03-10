<template>
  <UApp>
    <UHeader :mode="'drawer'" title="">
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>
    <UMain>
      <PageBase>
        <RouterView />
      </PageBase>
      <PageSearch />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
import { useSeoMeta } from "@unhead/vue";
import { NavigationMenuItem } from "@nuxt/ui";
import { computed, onBeforeMount } from "vue";
import { RouterView } from "vue-router";
import { useSideBarStore } from "@/stores/sidebar-store";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useShortcutsStore } from "./stores/shortcuts-store";

const shortcutStore = useShortcutsStore();
const articlesStore = useArticlesStore();
const sideBarStore = useSideBarStore();

onBeforeMount(() => {
  sideBarStore.init(window.location.pathname);
  articlesStore.update();
});

useSeoMeta({
  titleTemplate: "%s | Gift Mugweni",
  ogImage: "/assets/logo.png",
  twitterCard: "summary_large_image",
  twitterImage: "/assets/logo.png",
  ogSiteName: "Gift Mugweni",
});

const items = computed<NavigationMenuItem[]>(() => sideBarStore.links as NavigationMenuItem[]);

defineShortcuts(shortcutStore.shortcuts);
</script>
