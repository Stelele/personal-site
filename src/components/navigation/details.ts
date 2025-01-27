import { Detail } from "./SideBar.vue";

export const AboutMeDetails: Detail[] = [
    {
        title: 'Who am I',
        iconOn: 'fc-opened-folder',
        iconOff: 'fc-folder',
        children: ['Overview', 'CV', 'My Journey']
    }
]

export const BlogDetails: Detail[] = [
    {
        title: 'Tech Blog',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: ['Who is tech', 'Move fat...']
    },
    {
        title: 'Thinking Blog',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: ['I think...', 'We move or do we...']
    }
]

export const ProjectDetails: Detail[] = [
    {
        title: 'Graphics Projects',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: ['Web GPU Game Engine', 'Shader Land']
    },
    {
        title: 'Game Dev Projects',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: ['Pets', 'Fight Night'],
    }
]

export const BooksDetails: Detail[] = [
    {
        title: 'Wuxia Books',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: ['God of fishing', 'Martial World'],
    },
    {
        title: 'Western Books',
        iconOn: 'fa-door-open',
        iconOff: 'fa-door-closed',
        children: ['Discworld Series', 'Imajica']
    }
]