import { Post } from "./type"
import { getHashNodeFeed } from "./blogs/hashnode";
import { getMediumFeed } from "./blogs/medium";

export async function getBlogFeeds() {
    const [mediumFeed, hashNodeFeed] = await Promise.all([
        getMediumFeed(),
        getHashNodeFeed(),
    ])

    const posts: Post[] = [...mediumFeed, ...hashNodeFeed]

    return posts
}
