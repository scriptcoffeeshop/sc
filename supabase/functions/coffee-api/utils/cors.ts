import { ALLOWED_REDIRECT_ORIGINS } from './config.ts'

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function applyCorsHeaders(res: Response, req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigin = ALLOWED_REDIRECT_ORIGINS.includes(origin) ? origin : (ALLOWED_REDIRECT_ORIGINS[0] || '*')
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    return res
}

export function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

export function htmlResponse(html: string, status = 200) {
    return new Response(html, {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
}
