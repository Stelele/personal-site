<template>
    <div class="flex w-full h-full items-center justify-center">
        <div class="flex flex-col items-center w-1/2">
            <div class="h-28 w-full">
                <img
                    src="/assets/welcome.png"
                    class="w-full h-full object-contain"
                    alt="Logo"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSeoMeta } from "@unhead/vue";

useSeoMeta({
    title: "Home",
    description:
        "Hello there. I'm Gift. Welcome to my little corner of the internet",
});
</script>

<style>
.darker {
    color: oklch(var(--b2));
}
</style>
