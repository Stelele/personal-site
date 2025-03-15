<template>
    <div class="flex w-full gap-0" :class="prop.baseStyles">
        <div class="flex w-fit bg-base-100 border-t-primary border-t gap-1 py-1 px-2 items-center justify-center">
            <div>
                <OhVueIcon :name="prop.iconLeft" />
            </div>
            <div class="prose">
                <h5>{{ prop.label }}</h5>
            </div>
            <div>
                <OhVueIcon :name="prop.iconRight" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { OhVueIcon } from 'oh-vue-icons';

export interface Prop {
    iconLeft?: string
    label?: string
    iconRight?: string
    baseStyles?: string
}

const prop = withDefaults(defineProps<Prop>(), {
    iconLeft: "",
    label: "",
    iconRight: "",
    baseStyles: "bg-base-200",
})

</script>