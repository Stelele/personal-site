import moment from "moment"
import { HashnodeFeed, Post } from "../type"

async function getHashNodePosts() {
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

export async function getHashNodeFeed() {
    const hashnodeFeed = await getHashNodePosts()
    const posts: Post[] = []
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