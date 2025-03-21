import { defineStore } from "pinia"
import { Post } from "../helpers/type"
import { Ref, ref } from "vue"
import { getBlogFeeds } from "../helpers/downloader"

export const useArticlesStore = defineStore('ArticlesStore', () => {
    const posts = ref<Post[]>([])

    function update() {
        updatePosts(posts)
    }

    return {
        posts,
        update,
    }
})

async function updatePosts(posts: Ref<Post[]>) {
    posts.value = await getBlogFeeds()
}