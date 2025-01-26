<template>
    <div class="drawer" :class="{
        'drawer-open': show
    }">
        <input ref="toggleBar" type="checkbox" class="drawer-toggle" />
        <div class="drawer-side">
            <div class="menu bg-base-100 min-h-full min-w-60 grid grid-cols-6 gap-[2px]">
                <div
                    class="bg-base-200 min-h-full p-4 gap-6 flex flex-col items-center w-10 transition-all duration-100 ease-out">
                    <div v-for="group, idx in groups" :key="idx">
                        <div class="hover:cursor-pointer swap" @click="selectGroup(idx, group)">
                            <input type="checkbox" :checked="idx === selectedGroup" />
                            <FontAwesomeIcon class="swap-on selected" :icon="group.icon" :size="'2x'" />
                            <FontAwesomeIcon class="swap-off" :icon="group.icon" :size="'2x'" />
                        </div>
                    </div>
                </div>
                <div class="bg-base-200 col-span-5 flex-grow p-4 min-h-full">
                    <details open v-for="detail, idx in props.details">
                        <summary class="group hover:cursor-pointer items-center" @click="toggleChecked(`swap-${idx}`)">
                            <div class="swap mt-3 h-fit">
                                <input :id="`swap-${idx}`" type="checkbox" checked />
                                <FontAwesomeIcon class="swap-on" :icon="detail.iconOn" :size="'sm'" />
                                <FontAwesomeIcon class="swap-off" :icon="detail.iconOff" :size="'sm'" />
                            </div>
                            <span class="pl-1">{{ detail.title }}</span>
                        </summary>
                        <ul>
                            <li v-for="child in detail.children">
                                <ul>
                                    <li><a class="group"><span>{{ child }}</span></a></li>
                                </ul>
                            </li>
                        </ul>
                    </details>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { ref } from 'vue';

const show = ref(true)
defineExpose({ setVisibility })
const emit = defineEmits(['onOgroupSelected'])

interface Prop {
    details?: Array<{
        iconOn: string[]
        iconOff: string[]
        title: string
        children: Array<string>
    }>
}

const props = withDefaults(defineProps<Prop>(), {
    details: () => [
        {
            iconOn: ['fas', 'door-open'],
            iconOff: ['fas', 'door-closed'],
            title: "Who Am I",
            children: ["CV", "Images"]
        }
    ],
})

interface Group {
    icon: string[],
    id: string,
}
const groups = ref<Group[]>([
    { icon: ['fas', 'user'], id: "home" },
    { icon: ['fas', 'blog'], id: "blog" },
    { icon: ['fas', 'person-digging'], id: "projects" },
    { icon: ['fas', 'book-open'], id: "book-recommendations" },
])
const selectedGroup = ref(0)

function setVisibility(visibility: boolean) {
    console.log(visibility)
    show.value = visibility
}

function selectGroup(groupIdx: number, group: Group) {
    selectedGroup.value = groupIdx
    emit('onOgroupSelected', group.id)
}

function toggleChecked(id: string) {
    const element = document.getElementById(id) as HTMLInputElement
    element.checked = !element.checked
}

</script>

<style>
.selected {
    color: oklch(var(--p) / 1);
}
</style>