<template>
    <div class="w-fit h-fit">
        <div ref="giphy"></div>
    </div>
</template>

<script lang="ts" setup>
import { renderGif } from '@giphy/js-components'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { onMounted, ref } from 'vue';

export interface Prop {
    name?: string
    width?: number
}

const props = withDefaults(defineProps<Prop>(), {
    name: "",
    width: undefined,
})

onMounted(() => {
    setGif()
})

const giphy = ref<HTMLDivElement>()

async function setGif() {
    const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY)

    const results = await gf.search(props.name, {
        rating: "pg",
        limit: 25,
        offset: Math.floor(Math.random() * 100),
    })
    const gif = results.data[Math.floor(Math.random() * 25)]

    renderGif({ gif, width: props.width as any }, giphy.value as HTMLDivElement)
}


</script>