<template>
    <div class="flex bg-base-200 w-full gap-0">
        <div class="flex w-fit bg-base-100 border-t-primary border-t gap-1 py-1 px-2 items-center justify-center">
            <div>
                <OhVueIcon :name="prop.icon" />
            </div>
            <div class="prose">
                <h5>{{ prop.label }}</h5>
            </div>
            <div>
                <OhVueIcon name="io-close" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { OhVueIcon } from 'oh-vue-icons';

export interface Prop {
    icon?: string
    label?: string
}

const prop = withDefaults(defineProps<Prop>(), {
    icon: "",
    label: "",
})

</script>