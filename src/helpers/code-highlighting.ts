import hljs from "highlight.js/lib/core";
import javascript from 'highlight.js/lib/languages/javascript'
import go from 'highlight.js/lib/languages/go'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import php from 'highlight.js/lib/languages/php'
import java from 'highlight.js/lib/languages/java'
import julia from 'highlight.js/lib/languages/julia'
import matlab from 'highlight.js/lib/languages/matlab'
import python from 'highlight.js/lib/languages/python'
import mipsasm from 'highlight.js/lib/languages/mipsasm'

export function addLanguages() {
    hljs.registerLanguage('javascript', javascript)
    hljs.registerLanguage('go', go)
    hljs.registerLanguage('cpp', cpp)
    hljs.registerLanguage('c', c)
    hljs.registerLanguage('php', php)
    hljs.registerLanguage('java', java)
    hljs.registerLanguage('julia', julia)
    hljs.registerLanguage('matlab', matlab)
    hljs.registerLanguage('python', python)
    hljs.registerLanguage('mipsasm', mipsasm)
}

