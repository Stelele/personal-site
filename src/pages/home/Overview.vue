<template>
    <PageBase>
        <div class="flex flex-col flex-grow items-center mt-[9%]">
            <article class="prose text-center">
                <div>
                    <OhVueIcon name="md-wavinghand" class="" :scale="10" />
                </div>
                <div>
                    <h1>Hello World</h1>
                </div>
                <div>
                    <highlightjs class="bg-transparent" autodetect code="var x = 23;" />
                </div>
            </article>
        </div>
    </PageBase>
</template>

<script lang="ts" setup>
import PageBase from '../../components/PageBase.vue';
import { OhVueIcon } from 'oh-vue-icons';
</script>

<style>
.darker {
    color: oklch(var(--b2));
}
</style>