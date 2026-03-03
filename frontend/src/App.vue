<template>
    <UApp>
        <UHeader>
            <UPageHeader
                :ui="{
                    title: 'text-xl sm:text-2xl',
                }"
                title="Gift's Personal Site"
            />
        </UHeader>
        <div class="flex flex-col min-h-screen">
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
