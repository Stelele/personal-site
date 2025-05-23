import { Detail } from "./SideBar.vue";

export const AboutMeDetails: Detail[] = [
    {
        title: 'Who am I',
        iconOn: 'fc-opened-folder',
        iconOff: 'fc-folder',
        children: [
            { name: 'Overview', path: "/" },
            { name: 'CV', path: "/cv" },
            { name: 'My Journey', path: '/my-journey' },
        ]
    }
]

export const ProjectDetails: Detail[] = [
    {
        title: 'Graphics Projects',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Web GPU Game Engine', path: "/web-gpu" },
            { name: 'Shader Land', path: "/shader-land" },
        ]
    },
    {
        title: 'Game Dev Projects',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Pets', path: "/pets" },
            { name: 'Fight Night', path: "/fight-night" },
        ],
    }
]

export const BooksDetails: Detail[] = [
    {
        title: 'Wuxia Books',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'God of fishing', path: "/god-of-fishing" },
            { name: 'Martial World', path: "/martial-world" },
        ],
    },
    {
        title: 'Western Books',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Discworld Series', path: "/discworld" },
            { name: 'Imajica', path: "/imajica" },
        ]
    }
]