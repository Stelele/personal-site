import { Blog } from "@/helpers/type";
import { getHashNodeFeed } from "@/helpers/blogs/hashnode";
import moment from "moment";
import { getMediumFeed } from "./blogs/medium";
import { getCmsBlogList } from "./blogs/cms";

export async function getBlogFeeds(): Promise<Blog[]> {
  const [mediumFeed, hashNodeFeed, cmsBlogs] = await Promise.all([
    getMediumFeed(),
    getHashNodeFeed(),
    getCmsBlogList()
  ]);

  const allBlogs: Blog[] = [mediumFeed, hashNodeFeed, ...cmsBlogs];

  for (const blog of allBlogs) {
    blog.posts.sort(
      (a, b) => (moment(a.publishDate).isBefore(moment(b.publishDate)) ? 1 : -1)
    );
  }

  return allBlogs;
}



