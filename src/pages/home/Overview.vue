<template>
    <PageBase icon="fc-opened-folder" label="Overview">
        <div class="flex flex-col flex-grow items-center">
            <Giphy class=" mt-3" :width="300" name="Hello there" />
            <div class="prose text-center">
                <h1 class="p-0 m-2">Hello World</h1>
                <h2 class="p-0 m-2">I'm Gift. Welcome to my site <span>
                        <OhVueIcon class="mb-1" name="fa-grin-beam" />
                    </span></h2>
            </div>
            <div class="grid sm:grid-cols-1 lg:grid-cols-2 w-full h-full gap-2">
                <CodeBlock class="mt-2" v-for="code in languages" :label="code.label" :language="code.language"
                    :icon="code.icon" :code="code.code" />
            </div>
        </div>
    </PageBase>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import PageBase from '../../components/PageBase.vue'
import CodeBlock from '../../components/CodeBlock.vue'
import Giphy from '../../components/Giphy.vue'
import { OhVueIcon } from 'oh-vue-icons'
import { getHelloWorlds } from '../../helpers/hello-worlds'

const languages = ref(getHelloWorlds())
</script>

<style>
.darker {
    color: oklch(var(--b2));
}
</style>