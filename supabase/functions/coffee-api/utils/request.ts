export async function parseRequestData(req: Request, url: URL): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {}
    url.searchParams.forEach((v, k) => { data[k] = v })

    if (req.method !== 'POST') return data

    const contentType = req.headers.get('content-type') || ''
    try {
        if (contentType.includes('application/json')) {
            const body = await req.json()
            if (body && typeof body === 'object' && !Array.isArray(body)) {
                Object.assign(data, body)
            }
            return data
        }

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const raw = await req.text()
            const form = new URLSearchParams(raw)
            form.forEach((v, k) => { data[k] = v })
            return data
        }

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData()
            for (const [k, v] of formData.entries()) {
                data[k] = typeof v === 'string' ? v : v.name
            }
            return data
        }

        const raw = await req.text()
        if (!raw) return data

        try {
            const body = JSON.parse(raw)
            if (body && typeof body === 'object' && !Array.isArray(body)) {
                Object.assign(data, body)
            }
        } catch {
            const form = new URLSearchParams(raw)
            form.forEach((v, k) => { data[k] = v })
        }
    } catch {
        // 忽略 body 解析錯誤，保留 query 參數
    }

    return data
}
