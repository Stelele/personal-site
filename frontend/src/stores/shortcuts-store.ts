import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface ShortcutItem {
  label: string;
  icon: string;
  kbds: string[];
  handler: () => void;
}
export const useShortcutsStore = defineStore("ShortcutsStore", () => {
  const commandPaletteOpen = ref(false);

  const items = ref<ShortcutItem[]>([
    {
      label: "Search Site",
      icon: "i-heroicons-magnifying-glass",
      kbds: ["meta", "F"],
      handler: () => {
        console.log("Search Site");
        commandPaletteOpen.value = true;
      },
    },
    {
      label: "Create New Task",
      icon: "i-heroicons-plus",
      kbds: ["meta", "N"],
      handler: () => {
        console.log("Create New Task");
      },
    },
    {
      label: "Settings",
      icon: "i-heroicons-cog-6-tooth",
      kbds: ["meta", ","],
      handler: () => {
        console.log("Settings");
      },
    },
    {
      label: "Help & Documentation",
      icon: "i-heroicons-question-mark-circle",
      kbds: ["meta", "?"],
      handler: () => {
        console.log("Help & Documentation");
      },
    },
  ]);

  const hiddenItems = ref<ShortcutItem[]>([
    {
      label: "Close Command Palette",
      icon: "i-heroicons-x",
      kbds: ["esc"],
      handler: () => {
        commandPaletteOpen.value = false;
      },
    },
  ]);

  const shortcuts = computed(() =>
    Object.fromEntries(
      [...items.value, ...hiddenItems.value].map((item) => [
        item.kbds.join("_"),
        {
          usingInput: true,
          handler: item.handler,
        },
      ]),
    ),
  );

  return { commandPaletteOpen, items, shortcuts };
});
