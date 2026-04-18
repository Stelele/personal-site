import { Post } from "@/helpers/type";
import { getHashNodeFeed } from "@/helpers/blogs/hashnode";
import moment from "moment";
import { getMediumFeed } from "./blogs/medium";
import { CmsService } from "@/services/cms";
import { components } from "@/services/cms/schema";

export async function getBlogFeeds() {
  const [mediumFeed, hashNodeFeed] = await Promise.all([getMediumFeed(), getHashNodeFeed()]);
  const posts: Post[] = [...mediumFeed, ...hashNodeFeed];

  const cmsClient = await CmsService.getClient();
  const cmsBlogs = await cmsClient.GET('/blogs', {
    params: {
      query: {
        slugs: []
      }
    }
  })
  const cmsBlogPosts: components['schemas']['PostResponse'][] = [];
  for (const blog of cmsBlogs.data ?? []) {
    if (!blog.id) continue;
    const blogPosts = await cmsClient.GET('/blogs/{blogId}/posts', {
      params: {
        path: {
          blogId: blog.id
        },
      }
    });
    cmsBlogPosts.push(...blogPosts.data ?? []);
  }
  for (const post of cmsBlogPosts) {
    posts.push({
      id: post.id ?? '',
      title: post.title ?? '',
      brief: post.description ?? '',
      link: post.slug ?? '',
      coverImage: post.coverImageUrl ?? '',
      publishDate: post.publishedOn ?? '',
      updateDate: post.updatedOn ?? '',
      blogSite: "hashnode",
      tags: [post.tag ?? ''],
      content: post.content ?? '',
    });
  }

  posts.sort((a, b) => (moment(a.publishDate).isBefore(moment(b.publishDate)) ? 1 : -1));

  return posts;
}



