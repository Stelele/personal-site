import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

export interface ShortcutItem {
  label: string;
  icon: string;
  kbds: string[];
  handler: () => void;
}
export const useShortcutsStore = defineStore("ShortcutsStore", () => {
  const router = useRouter();
  const commandPaletteOpen = ref(false);

  const items = ref<ShortcutItem[]>([
    {
      label: "Search Site",
      icon: "i-heroicons-magnifying-glass",
      kbds: ["meta", "F"],
      handler: () => {
        commandPaletteOpen.value = true;
      },
    },
    {
      label: "Jump to Medium Blogs",
      icon: "i-simple-icons:medium",
      kbds: ["meta", "M"],
      handler: () => {
        router.push("/blog/medium");
      },
    },
    {
      label: "Jump to Hashnode Blogs",
      icon: "i-simple-icons:hashnode",
      kbds: ["meta", "H"],
      handler: () => {
        router.push("/blog/hashnode");
      },
    },
    {
      label: "Jump to Projects",
      icon: "i-heroicons-question-mark-circle",
      kbds: ["meta", "P"],
      handler: () => {
        console.log("Jump to Projects");
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
      ])
    )
  );

  return { commandPaletteOpen, items, shortcuts };
});
