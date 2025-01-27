import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { importIcons } from './helpers/icons'

importIcons()
createApp(App)
    .mount('#app')
