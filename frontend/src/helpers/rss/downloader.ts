import { RssFeed, RssFeedItem } from "./type"

export async function getRssFeed(feedUrl: string) {
    const url = new URL(`${import.meta.env.VITE_PRIV_API_URL}/feed`)
    url.searchParams.append("url", feedUrl)

    const response = await fetch(url)

    const parser = new DOMParser()
    // @ts-ignore
    const text = (await response.text()).replaceAll(/(\/?[a-z]+):([a-z]+)/g, "$1_$2")

    const xml = parser.parseFromString(text, "text/xml")
    const channel = xml.querySelector("channel")

    const feed: RssFeed = {
        title: channel?.querySelector("title")?.textContent ?? "",
        description: channel?.querySelector("description")?.textContent ?? "",
        link: channel?.querySelector("link")?.textContent ?? "",
        "atom:link": [],
        generator: channel?.querySelector("generator")?.textContent ?? "",
        lastBuildDate: channel?.querySelector("lastBuildDate")?.textContent ?? "",
        items: []
    }

    channel?.querySelectorAll("atom_link").forEach(atomLink => {
        feed["atom:link"].push({
            url: atomLink.getAttribute("href") ?? "",
            rel: (atomLink.getAttribute("rel") as any) ?? "self",
        })
    })

    channel?.querySelectorAll("item").forEach(item => {
        const rsItem: RssFeedItem = {
            title: item.querySelector("title")?.textContent ?? "",
            description: item.querySelector("description")?.textContent ?? "",
            link: item.querySelector("link")?.textContent ?? "",
            guid: item.querySelector("guid")?.textContent ?? "",
            categories: [],
            "dc:creator": item.querySelector("dc_creator")?.textContent ?? "",
            pubDate: item.querySelector("pubDate")?.textContent ?? "",
            "atom:updated": item.querySelector("atom_updated")?.textContent ?? "",
            "content:encoded": item.querySelector("content_encoded")?.textContent ?? "",
            "hashnode:content": item.querySelector("hashnode_content")?.textContent ?? "",
            "hashnode:coverImage": item.querySelector("hashnode_coverImage")?.textContent ?? "",
        }

        item.querySelectorAll("category").forEach(category => {
            rsItem.categories.push(category.textContent ?? "")
        })

        feed.items.push(rsItem)
    })

    return feed
}
