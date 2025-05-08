import moment from "moment";
import { Post } from "../type";

interface IParagraphDetail {
    __typename: string,
    id: string,
    name: string,
    type: string,
    href: string | null,
    layout: string | null,
    metadata: any,
    text: string,
    hasDropCap: boolean | null,
    dropCapImage: any,
    markups: Array<{
        __typename: string,
        type: string,
        start: number,
        end: number,
        href: string | null,
        anchorType: string | null,
        userId: string | null,
        linkMetadata: string | null
    }>,
    codeBlockMetadata: any,
    iframe: any,
    mixtapeMetadata: any
}

async function getMediumPosts(nextPage?: string, _allPosts?: any[]) {
    const response = await fetch(`${import.meta.env.VITE_PRIV_API_URL}/medium-posts?page=${nextPage ? nextPage : ''}`).then(r => r.json())

    // NOTE: strip non-post items and strip description fields
    let next = null
    let posts = (response.data.user.profileStreamConnection.stream as any[])
        .map(stream => {
            return stream.itemType.post
        })
        .filter(x => x !== undefined)
        .map(post => {
            return {
                "id": post.id,
                "title": post.title,
                "link": post.mediumUrl,
                "pubDate": post.firstPublishedAt,
                "tags": post?.tags.map((t: any) => t.id) ?? [],
                "thumbnail": "https://miro.medium.com/focal/875/263/11/60/" + post.previewImage.id,
                "categories": (post.tags as any[]).map(tag_obj => tag_obj.id)
            }
        }
        );

    if (posts.length === 10) {
        next = response.data.user.profileStreamConnection.pagingInfo?.next?.to;
        const otherPosts = await getMediumPosts(next, posts)
        posts = [...posts, ...otherPosts]
    }

    return posts
}

export async function getMediumFeed() {
    const feedPosts: Post[] = []
    const posts = await getMediumPosts()

    for (const post of posts) {
        feedPosts.push({
            id: post.id,
            title: post.title,
            brief: "",
            link: post.link,
            publishDate: moment(post.pubDate).format(),
            updateDate: moment(post.pubDate).format(),
            blogSite: "medium",
            tags: post.tags,
            content: "",
        })
    }

    return feedPosts
}

export async function getMediumPostText(link: string) {
    const response = await fetch(`${import.meta.env.VITE_PRIV_API_URL}/feed?url=${link}`).then(r => r.text())
    const dom = new DOMParser().parseFromString(response, "text/html")

    let stringDetails = '{}'
    const searchString = "window.__APOLLO_STATE__ ="
    dom.querySelectorAll("script").forEach(s => {
        if (s.innerHTML.includes(searchString)) {
            stringDetails = s.innerHTML.slice(s.innerHTML.indexOf(searchString) + searchString.length)
        }
    })

    const postDetails = JSON.parse(stringDetails)

    const postKey = Object.keys(postDetails)
        .filter(p => p.startsWith("Post:"))
        .filter(p => postDetails[p]["mediumUrl"] === link)[0]
    const contentKey = Object.keys(postDetails[postKey]).filter(p => p.startsWith("content({"))[0]

    const paragraphs: any[] = postDetails[postKey][contentKey]?.bodyModel?.paragraphs ?? []
    let text = ""

    const paragraphDetails: any[] = []
    console.log(postDetails)
    for (const paragraph of paragraphs) {
        const details = postDetails[paragraph["__ref"]] as IParagraphDetail
        paragraphDetails.push(details)

        if (details["type"] === "IMG") {
            const figure = document.createElement('figure')

            const image = document.createElement('img')
            const imageMetaData = postDetails[details["metadata"]["__ref"]]
            image.alt = imageMetaData["alt"]
            image.src = `https://cdn-images-1.medium.com/max/1024/${imageMetaData["id"]}`
            figure.appendChild(image)

            const figCaption = document.createElement('figcaption')
            figCaption.textContent = details.text
            figure.appendChild(figCaption)

            text += new XMLSerializer().serializeToString(figure)
            continue
        }

        const pEl = getElementType(details.type)
        let paragraphText = details.text
        for (const markup of details.markups) {
            const textSlice = details.text.slice(markup.start, markup.end)
            const el = getElementType(markup.type)

            let attr = ""
            if (el === "a") {
                attr += ` href="${markup.href}"`
            }

            if (textSlice === details.text) {
                paragraphText = `<${el}${attr}>${paragraphText}</${el}>`
            } else {
                paragraphText = paragraphText.replace(textSlice, `<${el}${attr}>${textSlice}</${el}>`)
            }
        }


        if (pEl === "uli") {
            text += `<ul><li>${paragraphText}</li></ul>`
        } else {
            text += `<${pEl}>${paragraphText}</${pEl}>`
        }
    }

    text = text.replaceAll("</ul><ul>", "")

    return text
}

function getElementType(type: string) {
    const t = type.toLowerCase()
    switch (t) {
        case "pq": return "q"
        case "bq": return "blockquote"
        default: return t
    }
}