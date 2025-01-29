<template>
    <div class="drawer w-64 overflow-clip" :class="{
        'drawer-open': show
    }">
        <input ref="toggleBar" type="checkbox" class="drawer-toggle" />
        <div class="drawer-side">
            <div class="menu m-0 p-0 bg-base-100 w-full overflow-x-hidden grid grid-cols-6 gap-[2px]">
                <div class="bg-base-200 p-4 gap-6 flex flex-col items-center w-10 transition-all duration-100 ease-out">
                    <div v-for="group, idx in groups" :key="idx">
                        <div class="hover:cursor-pointer swap" @click="selectGroup(idx, group)">
                            <input type="checkbox" :checked="idx === selectedGroup" />
                            <OhVueIcon class="swap-on selected" :name="group.icon" :scale="1.5" />
                            <OhVueIcon class="swap-off" :name="group.icon" :scale="1.5" />
                        </div>
                    </div>
                </div>
                <div class="bg-base-200 col-span-5 flex-grow p-4">
                    <details :open="idx === 0" v-for="detail, idx in props.details">
                        <summary class="group hover:cursor-pointer items-center" @click="toggleChecked(`swap-${idx}`)">
                            <div class="swap h-fit">
                                <input :id="`swap-${idx}`" type="checkbox" :checked="idx === 0" />
                                <OhVueIcon class="swap-on" :name="detail.iconOn" />
                                <OhVueIcon class="swap-off" :name="detail.iconOff" />
                            </div>
                            <span class="pl-1">{{ detail.title }}</span>
                        </summary>
                        <ul>
                            <li v-for="child in detail.children">
                                <ul>
                                    <li>
                                        <RouterLink :to="child.path" class="group">
                                            <span>{{ child.name }}</span>
                                        </RouterLink>
                                    </li>
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
import { OhVueIcon } from 'oh-vue-icons';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

const show = ref(true)
defineExpose({ setVisibility })
const emit = defineEmits(['onGroupSelected'])

export interface Detail {
    iconOn: string
    iconOff: string
    title: string
    children: Array<{
        name: string
        path: string
    }>
}
export interface Props {
    details?: Array<Detail>
}

const props = withDefaults(defineProps<Props>(), {
    details: () => [],
})

export interface Group {
    icon: string,
    id: string,
}
const groups = ref<Group[]>([
    { icon: 'fa-user', id: "home" },
    { icon: 'fa-blog', id: "blog" },
    { icon: 'bi-person-workspace', id: "projects" },
    { icon: 'fa-book-open', id: "book-recommendations" },
])
const selectedGroup = ref(0)

function setVisibility(visibility: boolean) {
    console.log(visibility)
    show.value = visibility
}

function selectGroup(groupIdx: number, group: Group) {
    selectedGroup.value = groupIdx
    emit('onGroupSelected', group.id)
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