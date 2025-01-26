<template>
    <SideBar :details="barDetails" @on-group-selected="onGroupSelect" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SideBar, { Detail } from './SideBar.vue';
import * as details from './details'

const barDetails = ref<Detail[]>(details.AboutMeDetails)

function onGroupSelect(groupId: string) {
    switch (groupId) {
        case "home": {
            barDetails.value = details.AboutMeDetails
            break
        }
        case "blog": {
            barDetails.value = details.BlogDetails
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