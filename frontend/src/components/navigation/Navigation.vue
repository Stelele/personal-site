<template>
    <div class="flex w-full min-h-[calc(100vh-48px)] gap-1">
        <div
            class="hidden lg:block lg:w-64 lg:sticky lg:top-10 lg:h-screen shrink-0 overflow-auto"
        >
            <UTree :items="sideBarStore.links" class="p-2 fixed w-64" />
        </div>
        <div class="grow">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSideBarStore } from "../../stores/sidebar-store";

const sideBarStore = useSideBarStore();
</script>
