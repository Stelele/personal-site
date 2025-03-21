export interface RssFeed {
    title: string
    description: string
    link: string
    "atom:link": RssAtomLinks[]
    generator: string
    lastBuildDate: string
    items: RssFeedItem[]
}

export interface RssFeedItem {
    title: string
    description?: string
    link: string
    guid: string
    categories: string[]
    "dc:creator": string
    pubDate: string
    "atom:updated": string
    "content:encoded": string
}

export interface RssAtomLinks {
    url: string
    rel: "self" | "hub" | "next" | "previous"
}

export interface HashnodeFeed {
    data: {
        publication: {
            id: string
            isTeam: boolean
            title: string
            posts: HashnodePost
        }
    }
}

export interface HashnodePost {
    edges: {
        node: {
            id: string
            title: string
            publishedAt: string
            updatedAt: string
            brief: string
            url: string
            tags: {
                name: string
            }[]
            content: {
                html: string
            }
        }
    }[]
}

export interface Post {
    id: string
    title: string
    brief: string
    link: string
    publishDate: string
    updateDate: string
    blogSite: "medium" | "hashnode"
    tags: string[]
    content: string
}