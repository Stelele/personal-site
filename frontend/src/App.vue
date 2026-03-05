<template>
    <UApp>
        <UHeader :mode="'drawer'" title="">
            <template #body>
                <UNavigationMenu
                    :items="items"
                    orientation="vertical"
                    class="-mx-2.5"
                />
            </template>
        </UHeader>
        <UMain>
            <PageBase>
                <RouterView />
            </PageBase>
        </UMain>
    </UApp>
</template>

<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
import { computed, onBeforeMount } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useSeoMeta } from "@unhead/vue";
import { NavigationMenuItem } from "@nuxt/ui";
import { useSideBarStore } from "@/stores/sidebar-store";

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
