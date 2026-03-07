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
import { RouterView, useRoute } from "vue-router";
import { useSideBarStore } from "@/stores/sidebar-store";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useShortcutsStore } from "./stores/shortcuts-store";

const route = useRoute();
const shortcutStore = useShortcutsStore();
const articlesStore = useArticlesStore();
const sideBarStore = useSideBarStore();

onBeforeMount(() => {
  sideBarStore.update(route.fullPath);
  articlesStore.update();
});

useSeoMeta({
  titleTemplate: "%s | Gift Mugweni",
});

const items = computed<NavigationMenuItem[]>(() => sideBarStore.links as NavigationMenuItem[]);

defineShortcuts(shortcutStore.shortcuts);
</script>
