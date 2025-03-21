import moment from "moment"
import { HashnodeFeed, Post, RssFeed, RssFeedItem } from "./type"

async function getRssFeed(feedUrl: string) {
    const url = new URL(`${import.meta.env.VITE_PRIV_API_URL}/feed`)
    url.searchParams.append("url", feedUrl)

    const response = await fetch(url).then(x => x.text())

    const parser = new DOMParser()
    // @ts-ignore
    const text = response.replaceAll(/(<\/?[a-z]+):([a-z]+)/g, "$1_$2")

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
        }

        item.querySelectorAll("category").forEach(category => {
            rsItem.categories.push(category.textContent ?? "")
        })

        feed.items.push(rsItem)
    })

    return feed
}

async function getHashnodePosts() {
    const query = `
query Publication {
    publication(host: "giftmugweni.hashnode.dev") {
        id
        isTeam
        title
        posts(first: 50) {
            edges {
                node {
                    id
                    title
                    brief
                    publishedAt
                  	updatedAt
                    url
                    tags {
                      name
                    }
                  	content {
                      html
                    }
                }
            }
        }
    }
}`

    const response = await fetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
    })
        .then(response => response.json())

    return response as HashnodeFeed
}

export async function getBlogFeeds() {
    const [mediumFeed, hashnodeFeed] = await Promise.all([
        getRssFeed("https://medium.com/feed/@giftmugweni"),
        getHashnodePosts()
    ])


    const posts: Post[] = []

    for (const item of mediumFeed.items) {
        posts.push({
            id: item.guid.split('/').pop() ?? '',
            title: item.title,
            brief: item["content:encoded"].slice(0, 100),
            link: item.link,
            publishDate: moment(item.pubDate).format(),
            updateDate: moment(item["atom:updated"]).format(),
            tags: item.categories,
            blogSite: "medium",
            content: item["content:encoded"]
        })
    }

    for (const edge of hashnodeFeed.data.publication.posts.edges) {
        posts.push({
            id: edge.node.id,
            title: edge.node.title,
            brief: edge.node.brief,
            link: edge.node.url,
            publishDate: moment(edge.node.publishedAt).format(),
            updateDate: moment(edge.node.updatedAt).format(),
            tags: edge.node.tags.map(x => x.name),
            blogSite: "hashnode",
            content: edge.node.content.html,
        })
    }

    return posts
}
