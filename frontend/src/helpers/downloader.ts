import { Blog, Post } from "@/helpers/type";
import { getHashNodeFeed } from "@/helpers/blogs/hashnode";
import moment from "moment";
import { getMediumFeed } from "./blogs/medium";
import { CmsService } from "@/services/cms";

export async function getBlogFeeds(): Promise<Blog[]> {
  const [mediumFeed, hashNodeFeed] = await Promise.all([getMediumFeed(), getHashNodeFeed()]);

  const cmsClient = await CmsService.getClient();
  const cmsBlogs = await cmsClient.GET('/blogs', {
    params: {
      query: {
        slugs: ["progamming", "walking", "random"]
      }
    }
  })

  const cmsBlogList: Blog[] = [];
  for (const blog of cmsBlogs.data ?? []) {
    if (!blog.id) continue;
    const blogPosts = await cmsClient.GET('/blogs/{blogId}/posts', {
      params: {
        path: {
          blogId: blog.id
        },
      },
    });
    
    const posts: Post[] = [];
    for (const post of blogPosts.data ?? []) {
      posts.push({
        id: post.id ?? '',
        title: post.title ?? '',
        brief: post.description ?? '',
        link: post.slug ?? '',
        coverImage: post.coverImageUrl ?? '',
        publishDate: post.publishedOn ?? '',
        updateDate: post.updatedOn ?? '',
        tags: [post.tag ?? ''],
        content: post.content ?? '',
      });
    }

    cmsBlogList.push({
      id: blog.id,
      name: blog.title ?? 'Untitled',
      slug: blog.slug ?? blog.id,
      icon: "i-heroicons-book-open",
      posts: posts,
    });
  }

  const allBlogs: Blog[] = [mediumFeed, hashNodeFeed, ...cmsBlogList];

  for (const blog of allBlogs) {
    blog.posts.sort((a, b) => (moment(a.publishDate).isBefore(moment(b.publishDate)) ? 1 : -1));
  }

  return allBlogs;
}



