import { library } from '@fortawesome/fontawesome-svg-core'
import {
    faUser,
    faBlog,
    faPersonDigging,
    faBookOpen,
    faDoorClosed,
    faDoorOpen
} from '@fortawesome/free-solid-svg-icons'

export function addIcons() {
    library.add(
        faUser,
        faBlog,
        faPersonDigging,
        faBookOpen,
        faDoorClosed,
        faDoorOpen
    )

}