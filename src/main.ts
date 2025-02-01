import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { importIcons } from './helpers/icons'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { addLanguages } from './helpers/code-highlighting'
import hljsVuePlugin from '@highlightjs/vue-plugin'
import 'highlight.js/styles/github-dark-dimmed.min.css'
import { createPinia } from 'pinia'

importIcons()
addLanguages()
const router = createRouter({
    history: createWebHistory(),
    routes,
})
const pinia = createPinia()

createApp(App)
    .use(pinia)
    .use(hljsVuePlugin)
    .use(router)
    .mount('#app')
