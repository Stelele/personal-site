<template>
    <div class="flex flex-col gap-0 w-full h-full">
        <Tab :label="props.label" base-styles="bg-transparent" :icon-left="props.icon" />
        <div>
            <highlightjs class="bg-transparent m-0 p-0 text-left w-full h-full" :language="props.language"
                :code="props.code" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import Tab from './Tab.vue'

export interface Prop {
    label?: string
    language?: string
    icon?: string
    code?: string
}

const props = withDefaults(defineProps<Prop>(), {
    label: "",
    language: "",
    icon: "",
    code: "",
})
</script>