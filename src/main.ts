import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUser, faBlog, faPersonDigging, faBookOpen } from '@fortawesome/free-solid-svg-icons'

library.add(faUser, faBlog, faPersonDigging, faBookOpen)

createApp(App)
    .mount('#app')
