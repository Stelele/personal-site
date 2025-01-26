import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { addIcons } from './helpers/fontAwesome'

addIcons()
createApp(App)
    .mount('#app')
