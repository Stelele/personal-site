import { CmsService } from "@/services/cms";
import { Blog, Post } from "../type";

export async function getCmsBlogList(): Promise<Blog[]> {
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
            name: blog.name ?? 'Untitled',
            slug: blog.slug ?? blog.id,
            description: blog.description ?? '',
            icon: "i-heroicons-book-open",
            posts: posts,
        });
    }

    return cmsBlogList;
}
