import createClient from "openapi-fetch";
import type { paths } from './schema'

export class CmsService {
    private static client?: ReturnType<typeof createClient<paths>>;

    public static async getClient() {
        if (CmsService.client) return CmsService.client;

        const token = await CmsService.getAuthToken();
        CmsService.client = createClient<paths>({
            baseUrl: import.meta.env.VITE_CMS_URL,
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })

        return CmsService.client;
    }

    private static async getAuthToken() {
        const response = await fetch(`https://${import.meta.env.VITE_CMS_AUTH0_DOMAIN}/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: import.meta.env.VITE_CMS_AUTH0_CLIENT_ID,
                client_secret: import.meta.env.VITE_CMS_AUTH0_CLIENT_SECRET,
                audience: import.meta.env.VITE_CMS_AUTH0_AUDIENCE,
            }),
        });

        const data = await response.json();
        return data.access_token;
    }
}