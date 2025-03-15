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
    "atom:updated"?: string
    "content:encoded": string
    "hashnode:content"?: string
    "hashnode:coverImage"?: string
}

export interface RssAtomLinks {
    url: string
    rel: "self" | "hub" | "next" | "previous"
}