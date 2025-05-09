import { Post } from "./type"
import { getHashNodeFeed } from "./blogs/hashnode";
import { getMediumFeed } from "./blogs/medium";
import moment from "moment";

export async function getBlogFeeds() {
    const [mediumFeed, hashNodeFeed] = await Promise.all([
        getMediumFeed(),
        getHashNodeFeed(),
    ])

    const posts: Post[] = [...mediumFeed, ...hashNodeFeed]

    posts.sort((a, b) => moment(a.publishDate).isBefore(moment(b.publishDate)) ? 1 : -1)
    return posts
}
