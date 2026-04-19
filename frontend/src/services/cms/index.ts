import createClient from "openapi-fetch";
import type { paths } from './schema'

export class CmsService {
    private static client?: ReturnType<typeof createClient<paths>>;

    public static async getClient() {
        if (CmsService.client) return CmsService.client;

        CmsService.client = createClient<paths>({
            baseUrl: `${import.meta.env.VITE_PRIV_API_URL}/cms`,
        })

        return CmsService.client;
    }
}