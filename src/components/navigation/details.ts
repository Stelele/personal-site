import { Detail } from "./SideBar.vue";

export const AboutMeDetails: Detail[] = [
    {
        title: 'Who am I',
        iconOn: 'fc-opened-folder',
        iconOff: 'fc-folder',
        children: [
            { name: 'Overview', path: "/" },
            { name: 'CV', path: "/cv" },
            { name: 'My Journey', path: 'my-journey' },
        ]
    }
]

export const BlogDetails: Detail[] = [
    {
        title: 'Tech Blog',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Who is tech', path: "/" },
            { name: 'Move fat...', path: "/" },
        ]
    },
    {
        title: 'Thinking Blog',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'I think...', path: "/" },
            { name: 'We move or do we...', path: "/" },
        ]
    }
]

export const ProjectDetails: Detail[] = [
    {
        title: 'Graphics Projects',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Web GPU Game Engine', path: "/" },
            { name: 'Shader Land', path: "/" },
        ]
    },
    {
        title: 'Game Dev Projects',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Pets', path: "/" },
            { name: 'Fight Night', path: "/" },
        ],
    }
]

export const BooksDetails: Detail[] = [
    {
        title: 'Wuxia Books',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'God of fishing', path: "/" },
            { name: 'Martial World', path: "/" },
        ],
    },
    {
        title: 'Western Books',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: [
            { name: 'Discworld Series', path: "/" },
            { name: 'Imajica', path: "/" },
        ]
    }
]