<template>
    <SideBar class="w-full" :details="barDetails" @on-group-selected="onGroupSelect">
        <slot></slot>
    </SideBar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SideBar, { Detail } from './SideBar.vue';
import * as details from './details'
import { useArticlesStore } from '../../stores/aritcles-store';

const articlesStore = useArticlesStore()

const barDetails = ref<Detail[]>(details.AboutMeDetails)


const blogNavs = computed<Detail[]>(() => {
    const medium: Detail = {
        title: "Medium Blog",
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: []
    }

    const hashnode: Detail = {
        title: "Hashnode Blog",
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: []
    }

    for (const post of articlesStore.posts) {
        const section = post.blogSite === "medium" ? medium : hashnode

        const title = post.title.length < 16 ?
            post.title :
            `${post.title.slice(0, 13)}...`

        section.children.push({
            name: title,
            path: `/blog/${post.blogSite}/${post.id}`
        })
    }

    return [medium, hashnode]
})


function onGroupSelect(groupId: string) {
    switch (groupId) {
        case "home": {
            barDetails.value = details.AboutMeDetails
            break
        }
        case "blog": {
            barDetails.value = blogNavs.value
            break
        }
        case "projects": {
            barDetails.value = details.ProjectDetails
            break
        }
        case "book-recommendations": {
            barDetails.value = details.BooksDetails
            break
        }
    }
}

</script>