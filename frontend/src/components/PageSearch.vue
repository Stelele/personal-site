<template>
  <UModal v-model:open="shortcutStore.commandPaletteOpen" title="">
    <template #content>
      <div class="h-[60vh] flex flex-col overflow-hidden">
        <UCommandPalette
          v-model="value"
          :groups="routes"
          class="flex-1 z-40"
          :ui="{ wrapper: 'h-full flex flex-col' }"
          @update:model-value="onSelect"
        />
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { useSideBarStore } from "@/stores/sidebar-store";
import type { CommandPaletteGroup, CommandPaletteItem, TreeItem } from "@nuxt/ui";
import { useShortcutsStore } from "@/stores/shortcuts-store";
import { useRouter } from "vue-router";

const value = ref({});
const router = useRouter();
const sideBarStore = useSideBarStore();
const shortcutStore = useShortcutsStore();

const routes = computed<CommandPaletteGroup[]>(() => {
  const baseLinks = sideBarStore.links
    .filter((link) => link.label !== "Blog")
    .map((link) => ({
      id: generateUID(),
      label: link.label,
      icon: link.icon,
      items: getFlattenedlinks(link, link.icon),
    }));
  const blogLinks = sideBarStore.blogNavs
    .map(
      (blog) =>
        ({
          label: blog.title,
          icon: blog.icon,
          children: blog.children.map((child) => ({
            label: child.name,
            path: child.path,
          })),
        }) as TreeItem
    )
    .map((link) => ({
      id: generateUID(),
      label: link.label,
      icon: link.icon,
      items: getFlattenedlinks(link, link.icon),
    }));

  const links = [...baseLinks, ...blogLinks].sort((a, b) =>
    (a.label ?? "").localeCompare(b.label ?? "")
  );
  return links;
});

function onSelect(value: CommandPaletteItem) {
  router.push(value.path);
  shortcutStore.commandPaletteOpen = false;
}

function getFlattenedlinks(
  links: TreeItem,
  parentIcon?: string
): { id: string; label: string; icon?: string; path?: string }[] {
  const effectiveIcon = links.icon ?? parentIcon;

  if (!links.children?.length) {
    return links.path
      ? [
          {
            id: generateUID(),
            label: `/${links.label ?? ""}`,
            icon: effectiveIcon,
            path: links.path,
          },
        ]
      : [];
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
</script>
