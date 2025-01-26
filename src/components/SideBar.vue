<template>
    <div class="drawer mt-[2px]" :class="{
        'drawer-open': show
    }">
        <input ref="toggleBar" type="checkbox" class="drawer-toggle" />
        <div class="drawer-side">
            <div class="menu bg-base-100 min-h-full w-80 grid grid-cols-6">
                <div class="bg-base-200 min-h-full p-4 gap-6 flex flex-col">
                    <div class="hover:cursor-pointer selected">
                        <FontAwesomeIcon :icon="['fas', 'user']" :size="'2x'" />
                    </div>
                    <div class="hover:cursor-pointer">
                        <FontAwesomeIcon :icon="['fas', 'blog']" :size="'2x'" />
                    </div>
                    <div class="hover:cursor-pointer">
                        <FontAwesomeIcon :icon="['fas', 'person-digging']" :size="'2x'" />
                    </div>
                    <div class="hover:cursor-pointer">
                        <FontAwesomeIcon :icon="['fas', 'book-open']" :size="'2x'" />
                    </div>
                </div>
                <div class="bg-base-200 ml-[2px] col-span-5 p-4">
                    hello
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { ref } from 'vue';

const show = ref(true)
defineExpose({ setVisibility })

function setVisibility(visibility: boolean) {
    console.log(visibility)
    show.value = visibility
}

</script>

<style>
.selected {
    color: oklch(var(--p) / 1);
}
</style>