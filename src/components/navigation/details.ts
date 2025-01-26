import { Detail } from "./SideBar.vue";

export const AboutMeDetails: Detail[] = [
    {
        title: 'Who am I',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['Overview', 'Timeline', 'CV']
    }
]

export const BlogDetails: Detail[] = [
    {
        title: 'Tech Blog',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['Who is tech', 'Move fast...']
    },
    {
        title: 'Thinking Blog',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['I think...', 'We move or do we...']
    }
]

export const ProjectDetails: Detail[] = [
    {
        title: 'Graphics Projects',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['Web GPU Game Engine', 'Shader Land']
    },
    {
        title: 'Game Dev Projects',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['Pets', 'Fight Night'],
    }
]

export const BooksDetails: Detail[] = [
    {
        title: 'Wuxia Books',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['God of fishing', 'Martial World'],
    },
    {
        title: 'Western Books',
        iconOn: ['fas', 'door-open'],
        iconOff: ['fas', 'door-closed'],
        children: ['Discworld Series', 'Imajica']
    }
]