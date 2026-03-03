<template>
    <UApp>
        <UHeader>
            <template #left>
                <router-link to="/">
                    <div class="w-full h-full flex gap-2 items-center p-1">
                        <!-- <img
                            src="/logo.png"
                            class="object-contain h-20"
                            alt="Njeremoto Logo"
                        /> -->
                    </div>
                </router-link>
            </template>
            <UPageHeader
                :ui="{
                    title: 'text-xl sm:text-2xl',
                }"
                title="Gift's Personal Site"
            />
        </UHeader>
        <div class="flex flex-col min-h-screen">
            <!-- <div class="flex sticky top-0 border-b z-10">
                <div class="grow"></div>
                <div
                    class="w-80 text-center rounded-b-lg px-4 py-2 flex items-center justify-center gap-2"
                >
                    <UIcon name="i-heroicons-gift" class="w-5 h-5" />
                    <span>Gift's Personal Site</span>
                </div>
                <div class="grow"></div>
            </div> -->
            <UMain>
                <Navigation>
                    <RouterView />
                </Navigation>
            </UMain>
        </div>
    </UApp>
</template>

<script setup lang="ts">
import Navigation from "./components/navigation/Navigation.vue";
import { RouterView } from "vue-router";
import { onBeforeMount } from "vue";
import { useArticlesStore } from "./stores/aritcles-store";
import { useSeoMeta } from "@unhead/vue";

const articlesStore = useArticlesStore();

onBeforeMount(() => {
    articlesStore.update();
});

useSeoMeta({
    titleTemplate: "%s | Gift Mugweni",
});
</script>
