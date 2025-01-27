import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { importIcons } from './helpers/icons'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'

importIcons()
const router = createRouter({
    history: createWebHistory(),
    routes,
})

createApp(App)
    .use(router)
    .mount('#app')
