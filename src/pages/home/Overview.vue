<template>
    <PageBase icon="fc-opened-folder" label="Overview">
        <div class="flex flex-col flex-grow items-center">
            <Giphy class=" mt-3" :width="300" name="Hello there" />
            <div class="prose">
                <h1>Hello World</h1>
            </div>
            <div class="grid sm:grid-cols-1 lg:grid-cols-2 w-full h-full gap-2">
                <CodeBlock class="mt-2" v-for="code in languages" :label="code.label" :language="code.language"
                    :icon="code.icon" :code="code.code" />
            </div>
        </div>
    </PageBase>
</template>

<script lang="ts" setup>
import PageBase from '../../components/PageBase.vue'
import CodeBlock from '../../components/CodeBlock.vue'
import { getHelloWorlds } from '../../helpers/hello-worlds'
import Giphy from '../../components/Giphy.vue'
import { ref } from 'vue';

const languages = ref(getHelloWorlds())
</script>

<style>
.darker {
    color: oklch(var(--b2));
}
</style>