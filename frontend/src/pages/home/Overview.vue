<template>
    <div class="flex w-full h-full items-center justify-center">
        <div class="flex flex-col items-center w-1/2 gap-7">
            <div class="h-28 w-full">
                <img
                    src="/assets/welcome.png"
                    class="w-full h-full object-contain"
                    alt="Logo"
                />
            </div>
            <div class="w-full max-w-lg overflow-hidden">
                <div class="p-2 space-y-1">
                    <button
                        v-for="item in shortcutsStore.items"
                        :key="item.label"
                        @click="item.handler"
                        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-800 group"
                    >
                        <div class="flex items-center gap-3">
                            <UIcon :name="item.icon" class="w-5 h-5" />
                            <span>{{ item.label }}</span>
                        </div>

                        <div class="items-center gap-1 hidden lg:flex">
                            <UKbd :value="item.kbds[0]" />
                            <UKbd :value="item.kbds[1]" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useShortcutsStore } from "@/stores/shortcuts-store";
import { useSeoMeta } from "@unhead/vue";

const shortcutsStore = useShortcutsStore();

useSeoMeta({
    title: "Home",
    description:
        "Hello there. I'm Gift. Welcome to my little corner of the internet",
});
</script>
