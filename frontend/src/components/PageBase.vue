<template>
    <div class="min-w-full min-h-full flex flex-col bg-base-100 m-0 p-0">
        <div class="flex gap-1">
            <div class="lg:hidden">
                <OhVueIcon @click="toggleSideBarVisibility" class="swap-on selected cursor-pointer"
                    name="gi-hamburger-menu" :scale="1.5" />
            </div>
            <Tab :icon-left="props.icon" :label="props.label" icon-right="io-close" />
        </div>
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
import { useSideBarStore } from '../stores/sidebar-store';
import Tab from './Tab.vue'
import { OhVueIcon } from 'oh-vue-icons'

export interface Props {
    label?: string
    icon?: string,
}

const props = withDefaults(defineProps<Props>(), {
    label: "",
    icon: "",
})

const sideBarStore = useSideBarStore()
function toggleSideBarVisibility() {
    sideBarStore.show = !sideBarStore.show
}

</script>

<style>
.selected {
    color: oklch(var(--p) / 1);
}
</style>