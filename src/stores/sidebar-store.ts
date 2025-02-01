import { defineStore } from "pinia";
import { ref } from "vue";

export const useSideBarStore = defineStore('SideBarStore', () => {
    const show = ref(false)

    return {
        show
    }
})