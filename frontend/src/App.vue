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
      <UModal v-model:open="shortcutStore.commandPaletteOpen" title="">
        <template #content>
          <div class="h-[60vh] flex flex-col overflow-hidden">
            <UCommandPalette
              v-model="value"
              :groups="routes"
              class="flex-1 z-40"
              :ui="{ wrapper: 'h-full flex flex-col' }"
            />
          </div>
        </template>
      </UModal>
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
import { useSeoMeta } from "@unhead/vue";
import { NavigationMenuItem } from "@nuxt/ui";
import { computed, onBeforeMount, ref } from "vue";
import type { CommandPaletteGroup } from "@nuxt/ui";
import { RouterView, useRoute } from "vue-router";
import { useSideBarStore } from "@/stores/sidebar-store";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useShortcutsStore } from "./stores/shortcuts-store";
import { TreeItem } from "@nuxt/ui/runtime/components/Tree.vue.js";

const value = ref({});

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

const routes = computed<CommandPaletteGroup[]>(() => {
  return sideBarStore.links.map((link) => ({
    id: generateUID(),
    label: link.label,
    icon: link.icon,
    items: getFlattenedlinks(link, link.icon),
  }));
});

function getFlattenedlinks(
  links: TreeItem,
  parentIcon?: string
): { id: string; label: string; icon?: string }[] {
  const effectiveIcon = links.icon ?? parentIcon;

  if (!links.children?.length) {
    return [
      {
        id: generateUID(),
        label: `/${links.label ?? ""}`,
        icon: effectiveIcon,
      },
    ];
  }

  return links.children
    .flatMap((child) => getFlattenedlinks(child, effectiveIcon))
    .map((item) => ({
      ...item,
      label: `/${links.label ?? ""}${item.label}`,
    }));
}

function generateUID() {
  const firstPart = (Math.random() * 46656) | 0;
  const secondPart = (Math.random() * 46656) | 0;
  const first = ("000" + firstPart.toString(36)).slice(-3);
  const second = ("000" + secondPart.toString(36)).slice(-3);
  return `${first}${second}`;
}
defineShortcuts(shortcutStore.shortcuts);
</script>
