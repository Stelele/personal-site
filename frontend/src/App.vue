<template>
    <UApp>
        <UHeader :mode="'drawer'">
            <UPageHeader
                :ui="{
                    title: 'text-xl sm:text-2xl',
                }"
                title="Gift's Personal Site"
            />
            <template #body>
                <UNavigationMenu
                    :items="items"
                    orientation="vertical"
                    class="-mx-2.5"
                />
            </template>
        </UHeader>
        <UMain>
            <Navigation>
                <RouterView />
            </Navigation>
        </UMain>
    </UApp>
</template>

<script setup lang="ts">
import Navigation from "./components/navigation/Navigation.vue";
import { RouterView, useRoute } from "vue-router";
import { computed, onBeforeMount } from "vue";
import { useArticlesStore } from "./stores/aritcles-store";
import { useSeoMeta } from "@unhead/vue";
import { NavigationMenuItem } from "@nuxt/ui";
import { useSideBarStore } from "./stores/sidebar-store";

const route = useRoute();

const articlesStore = useArticlesStore();
const sideBarStore = useSideBarStore();

onBeforeMount(() => {
    sideBarStore.update(route.fullPath);
    articlesStore.update();
});

useSeoMeta({
    titleTemplate: "%s | Gift Mugweni",
});

const items = computed<NavigationMenuItem[]>(
    () => sideBarStore.links as NavigationMenuItem[],
);
</script>
