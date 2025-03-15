<template>

</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { getRssFeed } from '../../helpers/rss/downloader';


onMounted(() => {
    fetchFeeds()
})


async function fetchFeeds() {
    const feeds: { site: string; url: string }[] = await (await fetch('/feeds.json')).json()

    getRssFeed(feeds[0].url)
    // const parser = new Parser()
    // const feed = await parser.parseURL(feeds[0].url)
    // console.log(feed)

}

</script>