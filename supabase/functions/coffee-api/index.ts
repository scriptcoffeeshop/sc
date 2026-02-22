// 咖啡豆訂購系統 — Supabase Edge Function
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore
import nodemailer from 'npm:nodemailer'

// @ts-ignore
declare const Deno: any;

// ============ 環境變數 ============
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || ''
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_LOGIN_CHANNEL_SECRET') || ''
const LINE_ADMIN_USER_ID = Deno.env.get('LINE_ADMIN_USER_ID') || ''
const JWT_SECRET = Deno.env.get('JWT_SECRET')
if (!JWT_SECRET || JWT_SECRET === 'CHANGE_ME_IN_PRODUCTION') {
    throw new Error('嚴重錯誤: 尚未設定安全的 JWT_SECRET 環境變數！啟動已被中止。')
}

// SMTP 設定
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''

// 綠界 ECPay 物流設定（從 Secrets 讀取）
const ECPAY_MERCHANT_ID = Deno.env.get('ECPAY_MERCHANT_ID') || ''
const ECPAY_HASH_KEY = Deno.env.get('ECPAY_HASH_KEY') || ''
const ECPAY_HASH_IV = Deno.env.get('ECPAY_HASH_IV') || ''
const ECPAY_IS_STAGE = Deno.env.get('ECPAY_IS_STAGE') === 'true'

// LINE Pay 設定（從 Secrets 讀取）
const LINEPAY_CHANNEL_ID = Deno.env.get('LINEPAY_CHANNEL_ID') || ''
const LINEPAY_CHANNEL_SECRET = Deno.env.get('LINEPAY_CHANNEL_SECRET') || ''

const ALLOWED_REDIRECT_ORIGINS = [
    'https://scriptcoffeeshop.github.io',
    Deno.env.get('ALLOWED_REDIRECT_ORIGINS') || Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean)

// 訂單狀態白名單
const VALID_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled']

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============ JWT 工具 ============
function base64UrlEncode(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
    const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

async function hmacSign(data: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
    return base64UrlEncode(new Uint8Array(sig))
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
    const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
    const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 })))
    const signature = await hmacSign(`${header}.${body}`)
    return `${header}.${body}.${signature}`
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const expectedSig = await hmacSign(`${parts[0]}.${parts[1]}`)
        if (expectedSig !== parts[2]) return null
        const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])))
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
        return payload
    } catch { return null }
}

interface AuthResult { userId: string; role: string; isAdmin: boolean }

async function extractAuth(req: Request): Promise<AuthResult | null> {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return null
    const payload = await verifyJwt(token)
    if (!payload || !payload.userId) return null
    const userId = String(payload.userId)
    // 即時查詢角色（不信任 token 中的 role 快取）
    if (userId === LINE_ADMIN_USER_ID) return { userId, role: 'SUPER_ADMIN', isAdmin: true }
    try {
        const { data } = await supabase.from('coffee_users').select('role, status').eq('line_user_id', userId).single()
        if (data?.status === 'BLACKLISTED') return null // 黑名單用戶視為未認證
        const role = data?.role || 'USER'
        return { userId, role, isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN' }
    } catch { return { userId, role: 'USER', isAdmin: false } }
}

async function requireAuth(req: Request): Promise<AuthResult> {
    const auth = await extractAuth(req)
    if (!auth) throw new Error('請先登入')
    return auth
}

async function requireAdmin(req: Request): Promise<AuthResult> {
    const auth = await requireAuth(req)
    if (!auth.isAdmin) throw new Error('權限不足')
    return auth
}

async function requireSuperAdmin(req: Request): Promise<AuthResult> {
    const auth = await requireAuth(req)
    if (auth.role !== 'SUPER_ADMIN') throw new Error('僅 SUPER_ADMIN 具備權限')
    return auth
}

// ============ CORS ============
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

function htmlResponse(html: string, status = 200) {
    return new Response(html, {
        status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}

async function parseRequestData(req: Request, url: URL): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {}
    url.searchParams.forEach((v, k) => { data[k] = v })

    if (req.method !== 'POST') return data

    const contentType = req.headers.get('content-type') || ''
    try {
        if (contentType.includes('application/json')) {
            const body = await req.json()
            if (body && typeof body === 'object' && !Array.isArray(body)) {
                Object.assign(data, body as Record<string, unknown>)
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
                Object.assign(data, body as Record<string, unknown>)
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

// ============ LINE Pay API 工具 ============
async function linePaySign(channelSecret: string, apiPath: string, body: string, nonce: string): Promise<string> {
    const message = channelSecret + apiPath + body + nonce
    const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(channelSecret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
    return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function requestLinePayAPI(method: string, apiPath: string, data: unknown = null): Promise<any> {
    // 判斷 sandbox 模式
    const { data: sandboxSetting } = await supabase.from('coffee_settings').select('value').eq('key', 'linepay_sandbox').maybeSingle()
    const isSandbox = !sandboxSetting || String(sandboxSetting.value) !== 'false'
    const baseUrl = isSandbox ? 'https://sandbox-api-pay.line.me' : 'https://api-pay.line.me'

    const nonce = crypto.randomUUID()
    const bodyStr = data ? JSON.stringify(data) : ''
    const signature = await linePaySign(LINEPAY_CHANNEL_SECRET, apiPath, bodyStr, nonce)

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
    }

    const url = `${baseUrl}${apiPath}`
    const res = await fetch(url, {
        method,
        headers,
        body: bodyStr || null,
    })

    const text = await res.text()
    // LINE Pay transactionId 可能超過 JS Number 精度，以字串處理
    const processed = text.replace(/("transactionId"\s*:\s*)(\d+)/g, '$1"$2"')
    return JSON.parse(processed)
}

// ============ 主路由 ============
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'getProducts'
    const data = await parseRequestData(req, url)

    let result: unknown
    try {
        switch (action) {
            // 公開 API（不需登入）
            case 'getProducts': result = await getProducts(); break
            case 'getCategories': result = await getCategories(); break
            case 'getSettings': result = await getSettings(); break
            case 'getInitData': result = await getInitData(); break
            case 'getFormFields': result = await getFormFields(false); break
            case 'getLineLoginUrl': result = getLineLoginUrl(data.redirectUri as string); break
            case 'customerLineLogin': result = await customerLineLogin(data.code as string, data.redirectUri as string); break
            case 'lineLogin': result = await handleAdminLogin(data.code as string, data.redirectUri as string); break
            case 'getStoreList': result = await getStoreList(data.cvsType as string); break
            case 'createStoreMapSession':
                result = await createStoreMapSession(
                    data.deliveryMethod as string || url.searchParams.get('deliveryMethod') || '',
                    url,
                    data.clientUrl as string || url.searchParams.get('clientUrl') || ''
                );
                break
            case 'getStoreSelection': result = await getStoreSelection(data.token as string); break
            case 'storeMapCallback': result = await handleStoreMapCallback(data); break
            case 'getBankAccounts': result = await getBankAccounts(); break
            case 'linePayConfirm': result = await linePayConfirm(data); break
            case 'linePayCancel': result = await linePayCancel(data); break

            // 需登入（JWT）
            case 'submitOrder': result = await submitOrder(data, req); break
            case 'getMyOrders': result = await getMyOrders(req); break
            case 'updateTransferInfo': result = await updateTransferInfo(data, req); break
            case 'verifyAdmin': { const a = await extractAuth(req); result = a ? { success: true, isAdmin: a.isAdmin, role: a.role, message: 'OK' } : { success: false, isAdmin: false, message: '請先登入' }; break }

            // 需管理員（JWT + admin）
            case 'getFormFieldsAdmin': result = await getFormFieldsAdmin(req); break
            case 'getOrders': result = await getOrders(req); break
            case 'addProduct': result = await addProduct(data, req); break
            case 'updateProduct': result = await updateProduct(data, req); break
            case 'deleteProduct': result = await deleteProduct(data, req); break
            case 'reorderProduct': result = await reorderProduct(data, req); break
            case 'reorderProductsBulk': result = await reorderProductsBulk(data, req); break
            case 'addCategory': result = await addCategory(data, req); break
            case 'updateCategory': result = await updateCategory(data, req); break
            case 'deleteCategory': result = await deleteCategory(data, req); break
            case 'reorderCategory': result = await reorderCategory(data, req); break
            case 'updateSettings': result = await updateSettingsAction(data, req); break
            case 'updateOrderStatus': result = await updateOrderStatus(data, req); break
            case 'deleteOrder': result = await deleteOrder(data, req); break
            case 'getUsers': result = await getUsers(data, req); break
            case 'updateUserRole': result = await updateUserRole(data, req); break
            case 'getBlacklist': result = await getBlacklist(req); break
            case 'addToBlacklist': result = await addToBlacklist(data, req); break
            case 'removeFromBlacklist': result = await removeFromBlacklist(data, req); break
            case 'testEmail': result = await testEmail(data, req); break
            case 'addFormField': result = await addFormField(data, req); break
            case 'updateFormField': result = await updateFormField(data, req); break
            case 'deleteFormField': result = await deleteFormField(data, req); break
            case 'reorderFormFields': result = await reorderFormFields(data, req); break
            case 'uploadSiteIcon': result = await uploadSiteIcon(data, req); break
            case 'linePayRefund': result = await linePayRefund(data, req); break
            case 'addBankAccount': result = await addBankAccount(data, req); break
            case 'updateBankAccount': result = await updateBankAccount(data, req); break
            case 'deleteBankAccount': result = await deleteBankAccount(data, req); break

            default: result = { success: false, error: '未知的操作' }
        }
    } catch (error) {
        const msg = String(error).replace(/^Error:\s*/, '')
        if (msg.includes('登入') || msg.includes('權限') || msg.includes('Token') || msg.includes('無效')) {
            return jsonResponse({ success: false, error: msg }, 401)
        }
        result = { success: false, error: msg }
    }

    if (result instanceof Response) return result
    return jsonResponse(result)
})

// ============ 初始化資料 ============
async function getInitData() {
    const [p, c, s, f, b] = await Promise.all([getProducts(), getCategories(), getSettings(), getFormFields(false), getBankAccounts()])
    const settings = s.success ? s.settings : {}
    return {
        success: true,
        products: p.success ? p.products : [],
        categories: c.success ? c.categories : [],
        settings,
        formFields: f.success ? f.fields : [],
        bankAccounts: b.success ? b.accounts : [],
    }
}

// ============ LINE Login ============
function getLineLoginUrl(redirectUri: string) {
    if (!redirectUri) return { success: false, error: '缺少 redirectUri' }
    const state = crypto.randomUUID()
    const authUrl = 'https://access.line.me/oauth2/v2.1/authorize?' +
        'response_type=code&' +
        'client_id=' + LINE_LOGIN_CHANNEL_ID + '&' +
        'redirect_uri=' + encodeURIComponent(redirectUri) + '&' +
        'state=' + state + '&' +
        'scope=profile%20openid'
    return { success: true, authUrl, state }
}

async function exchangeLineToken(code: string, redirectUri: string) {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: LINE_LOGIN_CHANNEL_ID,
            client_secret: LINE_LOGIN_CHANNEL_SECRET,
        }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error)

    const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { 'Authorization': 'Bearer ' + tokenData.access_token },
    })
    const profile = await profileRes.json()
    if (profile.error) throw new Error(profile.error)
    return profile
}

async function customerLineLogin(code: string, redirectUri: string) {
    if (!code) return { success: false, error: '缺少授權碼' }
    try {
        const profile = await exchangeLineToken(code, redirectUri)
        const userData = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || '',
        }
        const updated = await registerOrUpdateUser(userData)
        const token = await signJwt({ userId: profile.userId, displayName: profile.displayName })
        return { success: true, user: updated || userData, token }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

async function handleAdminLogin(code: string, redirectUri: string) {
    if (!code) return { success: false, error: '缺少授權碼' }
    try {
        const profile = await exchangeLineToken(code, redirectUri)
        const userData = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || '',
        }
        await registerOrUpdateUser(userData)
        // 檢查管理員權限
        let isAdmin = false, role = 'USER'
        if (profile.userId === LINE_ADMIN_USER_ID) {
            isAdmin = true; role = 'SUPER_ADMIN'
        } else {
            const { data } = await supabase.from('coffee_users').select('role').eq('line_user_id', profile.userId).single()
            if (data?.role === 'ADMIN') { isAdmin = true; role = 'ADMIN' }
        }
        if (!isAdmin) return { success: false, error: '您沒有管理員權限' }
        const token = await signJwt({ userId: profile.userId, displayName: profile.displayName })
        return { success: true, isAdmin: true, role, user: userData, token }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}


async function registerOrUpdateUser(data: Record<string, string>) {
    const { data: existing } = await supabase
        .from('coffee_users')
        .select('*')
        .eq('line_user_id', data.userId)
        .single()

    const mapToCamel = (u: any) => ({
        userId: u.line_user_id,
        displayName: u.display_name,
        pictureUrl: u.picture_url,
        phone: u.phone,
        email: u.email,
        defaultDeliveryMethod: u.default_delivery_method,
        defaultCity: u.default_city,
        defaultDistrict: u.default_district,
        defaultAddress: u.default_address,
        defaultStoreId: u.default_store_id,
        defaultStoreName: u.default_store_name,
        defaultStoreAddress: u.default_store_address,
    })

    if (existing) {
        const updates: Record<string, unknown> = {
            display_name: data.displayName,
            last_login: new Date().toISOString(),
        }
        if (data.pictureUrl) updates.picture_url = data.pictureUrl
        if (data.phone) updates.phone = data.phone
        if (data.email) updates.email = data.email
        if (data.deliveryMethod) updates.default_delivery_method = data.deliveryMethod
        if (data.city) updates.default_city = data.city
        if (data.district) updates.default_district = data.district
        if (data.address) updates.default_address = data.address
        if (data.storeId) updates.default_store_id = data.storeId
        if (data.storeName) updates.default_store_name = data.storeName
        if (data.storeAddress) updates.default_store_address = data.storeAddress

        await supabase.from('coffee_users').update(updates).eq('line_user_id', data.userId)
        return mapToCamel({ ...existing, ...updates })
    } else {
        const newUser = {
            line_user_id: data.userId,
            display_name: data.displayName,
            picture_url: data.pictureUrl || '',
            phone: data.phone || '',
            email: data.email || '',
            default_delivery_method: data.deliveryMethod || '',
            default_city: data.city || '',
            default_district: data.district || '',
            default_address: data.address || '',
            default_store_id: data.storeId || '',
            default_store_name: data.storeName || '',
            default_store_address: data.storeAddress || '',
        }
        await supabase.from('coffee_users').insert(newUser)
        return mapToCamel(newUser)
    }
}


// ============ 商品 ============
async function getProducts() {
    const { data, error } = await supabase.from('coffee_products').select('*').order('sort_order', { ascending: true })
    if (error) return { success: false, error: error.message }
    const products = (data || []).map((r: Record<string, unknown>) => ({
        id: r.id, category: r.category, name: r.name, description: r.description || '',
        price: r.price, weight: r.weight || '', origin: r.origin || '',
        roastLevel: r.roast_level || '', specs: r.specs || '',
        imageUrl: r.image_url || '',
        enabled: r.enabled !== false, sortOrder: r.sort_order || 0,
    }))
    return { success: true, products }
}

async function addProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: ins, error } = await supabase.from('coffee_products').insert({
        category: data.category, name: data.name, description: data.description || '',
        price: parseInt(String(data.price)) || 0, weight: data.weight || '', origin: data.origin || '',
        roast_level: data.roastLevel || '', specs: data.specs || '',
        image_url: data.imageUrl || '',
        enabled: data.enabled === false || data.enabled === 'false' ? false : true,
    }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已新增', id: ins.id }
}

async function updateProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_products').update({
        category: data.category, name: data.name, description: data.description || '',
        price: parseInt(String(data.price)) || 0, weight: data.weight || '', origin: data.origin || '',
        roast_level: data.roastLevel || '', specs: data.specs || '',
        image_url: data.imageUrl || '',
        enabled: data.enabled === true || data.enabled === 'true',
    }).eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已更新' }
}

async function deleteProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_products').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已刪除' }
}

async function reorderProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: allProds, error } = await supabase.from('coffee_products').select('*').order('sort_order').order('id')
    if (error || !allProds) return { success: false, error: '讀取失敗' }

    // 取出相同分類的商品進行排序
    const targetProd = allProds.find((p: Record<string, unknown>) => String(p.id) === String(data.id))
    if (!targetProd) return { success: false, error: '找不到商品' }

    const curCategory = targetProd.category
    const catProds = allProds.filter((p: Record<string, unknown>) => p.category === curCategory)

    const idx = catProds.findIndex((p: Record<string, unknown>) => String(p.id) === String(data.id))
    if (idx === -1) return { success: false, error: '找不到商品' }

    const dir = data.direction as string
    const items = [...catProds]
    const [moved] = items.splice(idx, 1)

    if (dir === 'top') items.unshift(moved)
    else if (dir === 'bottom') items.push(moved)
    else if (dir === 'up' && idx > 0) items.splice(idx - 1, 0, moved)
    else if (dir === 'down' && idx < catProds.length - 1) items.splice(idx + 1, 0, moved)
    else items.splice(idx, 0, moved)

    for (let i = 0; i < items.length; i++) {
        await supabase.from('coffee_products').update({ sort_order: i * 10 }).eq('id', items[i].id)
    }
    return { success: true, message: '排序已更新' }
}

async function reorderProductsBulk(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const ids = data.ids as number[]
    if (!Array.isArray(ids)) return { success: false, error: '資料格式錯誤' }

    // Batch update sort order
    for (let i = 0; i < ids.length; i++) {
        await supabase.from('coffee_products').update({ sort_order: i * 10 }).eq('id', ids[i])
    }
    return { success: true, message: '批量排序已更新' }
}

// ============ 分類 ============
async function getCategories() {
    const { data, error } = await supabase.from('coffee_categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, categories: (data || []).map((r: Record<string, unknown>) => ({ id: r.id, name: r.name })) }
}

async function addCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: ins, error } = await supabase.from('coffee_categories').insert({ name: data.name }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已新增', id: ins.id }
}

async function updateCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: old } = await supabase.from('coffee_categories').select('name').eq('id', data.id).single()
    const { error } = await supabase.from('coffee_categories').update({ name: data.name }).eq('id', data.id)
    if (error) return { success: false, error: error.message }
    if (old?.name && old.name !== data.name) {
        await supabase.from('coffee_products').update({ category: data.name as string }).eq('category', old.name)
    }
    return { success: true, message: '分類已更新' }
}

async function deleteCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_categories').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已刪除' }
}

async function reorderCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: allCats, error } = await supabase.from('coffee_categories').select('*').order('sort_order').order('id')
    if (error || !allCats) return { success: false, error: '讀取失敗' }
    const idx = allCats.findIndex((c: Record<string, unknown>) => String(c.id) === String(data.id))
    if (idx === -1) return { success: false, error: '找不到分類' }
    const dir = data.direction as string
    const items = [...allCats]
    const [moved] = items.splice(idx, 1)
    if (dir === 'top') items.unshift(moved)
    else if (dir === 'bottom') items.push(moved)
    else if (dir === 'up' && idx > 0) items.splice(idx - 1, 0, moved)
    else if (dir === 'down' && idx < allCats.length - 1) items.splice(idx + 1, 0, moved)
    else items.splice(idx, 0, moved)
    for (let i = 0; i < items.length; i++) {
        await supabase.from('coffee_categories').update({ sort_order: i * 10 }).eq('id', items[i].id)
    }
    return { success: true, message: '排序已更新' }
}

// ============ 訂單 ============
function sanitize(str: unknown): string {
    if (!str) return ''
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim()
}

// ============ Email 通知 ============
async function sendEmail(to: string, subject: string, htmlContent: string) {
    if (!SMTP_USER || !SMTP_PASS || !to) return { success: false, error: 'SMTP or recipient config missing' }
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        })
        await transporter.sendMail({
            from: `"☕ 咖啡豆訂購系統" <${SMTP_USER}>`,
            to,
            subject,
            html: htmlContent,
        })
        return { success: true }
    } catch (e: any) {
        console.error('Failed to send email:', e)
        return { success: false, error: e.message || String(e) }
    }
}

async function testEmail(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const to = String(data.to || SMTP_USER);
    if (!to || to === 'undefined') return { success: false, error: 'No recipient provided or SMTP_USER is not set' };
    const res = await sendEmail(to, '測試信件 Test Email', '<h1>Hello</h1><p>這是來自 Supabase Edge Function 的測試信件</p>');
    return res;
}

async function submitOrder(data: Record<string, unknown>, req: Request) {
    // 從 JWT 取得用戶身分（可選，未登入也可下單）
    const auth = await extractAuth(req)
    const lineUserId = auth?.userId || ''

    // 黑名單檢查
    if (lineUserId) {
        const { data: userRow } = await supabase.from('coffee_users').select('status').eq('line_user_id', lineUserId).maybeSingle()
        if (userRow?.status === 'BLACKLISTED') {
            return { success: false, error: '您的帳號已被停權，無法下單' }
        }
    }

    if (!data.lineName || !data.phone) {
        return { success: false, error: '缺少必要資訊' }
    }

    // 後端金額重算
    const cartItems = data.items as Array<{ productId: number, specKey: string, qty: number }>
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return { success: false, error: '購物車是空的' }
    }

    const productIds = [...new Set(cartItems.map(c => c.productId))]
    const { data: products, error: pErr } = await supabase.from('coffee_products').select('id, name, price, specs, enabled').in('id', productIds)
    if (pErr || !products) return { success: false, error: '無法讀取商品資料' }

    const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]))
    let total = 0
    const orderLines: string[] = []

    for (const item of cartItems) {
        const product = productMap.get(item.productId)
        if (!product) return { success: false, error: `商品 ID ${item.productId} 不存在` }
        if (product.enabled === false) return { success: false, error: `商品「${product.name}」已下架` }

        let unitPrice = product.price
        let specLabel = ''
        if (product.specs) {
            if (!item.specKey) return { success: false, error: `商品「${product.name}」必須選擇規格` }
            try {
                const specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs
                const specList = Array.isArray(specs) ? specs : []
                const spec = specList.find((s: any) => s.key === item.specKey || s.label === item.specKey)
                if (!spec) return { success: false, error: `商品「${product.name}」的規格「${item.specKey}」不存在` }
                if (!spec.enabled) return { success: false, error: `商品「${product.name}」的規格「${item.specKey}」已停止供應` }
                unitPrice = spec.price ?? product.price
                specLabel = spec.label || item.specKey
            } catch { return { success: false, error: `商品「${product.name}」規格解析失敗` } }
        } else {
            if (item.specKey) return { success: false, error: `商品「${product.name}」無可選規格，請重新整理商品列表` }
        }

        const qty = Math.max(1, Math.floor(Number(item.qty) || 1))
        const lineTotal = qty * unitPrice
        total += lineTotal
        orderLines.push(`${product.name}${specLabel ? ` (${specLabel})` : ''} x ${qty} (${lineTotal}元)`)
    }

    const ordersText = orderLines.join('\n')

    const deliveryMethod = String(data.deliveryMethod || 'delivery')
    const validMethods = ['delivery', 'seven_eleven', 'family_mart', 'in_store']
    if (!validMethods.includes(deliveryMethod)) {
        return { success: false, error: '無效的配送方式' }
    }

    const paymentMethod = String(data.paymentMethod || 'cod')
    const validPayments = ['cod', 'linepay', 'transfer']
    if (!validPayments.includes(paymentMethod)) {
        return { success: false, error: '無效的付款方式' }
    }

    if (deliveryMethod === 'delivery') {
        const city = String(data.city || '')
        if (!['竹北市', '新竹市'].includes(city)) {
            return { success: false, error: '配送範圍僅限竹北市及新竹市' }
        }
        if (!data.address) {
            return { success: false, error: '請填寫配送地址' }
        }
    }

    if (deliveryMethod === 'seven_eleven' || deliveryMethod === 'family_mart') {
        if (!data.storeName) {
            return { success: false, error: '請選擇取貨門市' }
        }
    }

    const phone = String(data.phone).replace(/[\s-]/g, '')
    if (!/^(09\d{8}|0[2-8]\d{7,8})$/.test(phone)) {
        return { success: false, error: '電話格式不正確' }
    }

    const now = new Date()

    // 檢查一分鐘內是否重複送單
    if (lineUserId || phone) {
        const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString()
        let query = supabase.from('coffee_orders').select('id').gte('created_at', oneMinuteAgo)
        if (lineUserId) {
            query = query.eq('line_user_id', lineUserId)
        } else {
            query = query.eq('phone', phone)
        }
        const { data: recentOrders } = await query.limit(1)
        if (recentOrders && recentOrders.length > 0) {
            return { success: false, error: '送出訂單過於頻繁，請於一分鐘後再試' }
        }
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const orderId = `C${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 100))}`

    const { error } = await supabase.from('coffee_orders').insert({
        id: orderId,
        created_at: now.toISOString(),
        line_user_id: lineUserId,
        line_name: String(data.lineName).trim(),
        phone,
        email: String(data.email || '').trim(),
        items: ordersText,
        total,
        delivery_method: deliveryMethod,
        city: data.city || '',
        district: data.district || '',
        address: data.address || '',
        store_type: deliveryMethod === 'seven_eleven' ? '7-11' : deliveryMethod === 'family_mart' ? '全家' : '',
        store_id: data.storeId || '',
        store_name: data.storeName || '',
        store_address: data.storeAddress || '',
        status: 'pending',
        note: data.note || '',
        custom_fields: data.customFields || '',
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? '' : 'pending',
        transfer_account_last5: paymentMethod === 'transfer' ? String(data.transferAccountLast5 || '') : '',
    })

    if (error) return { success: false, error: error.message }

    if (lineUserId) {
        try {
            await registerOrUpdateUser({
                userId: lineUserId,
                displayName: String(data.lineName),
                pictureUrl: '',
                phone,
                email: String(data.email || '').trim(),
                deliveryMethod,
                city: String(data.city || ''),
                district: String(data.district || ''),
                address: String(data.address || ''),
                storeId: String(data.storeId || ''),
                storeName: String(data.storeName || ''),
                storeAddress: String(data.storeAddress || ''),
            })
        } catch { /* ignore */ }
    }

    if (data.email) {
        const methodMap: Record<string, string> = { delivery: '宅配到府', seven_eleven: '7-11 取貨付款', family_mart: '全家取貨付款', in_store: '來店自取' }
        const deliveryText = deliveryMethod === 'delivery' ? `${data.city}${data.district} ${data.address}` : `${data.storeName} (${data.storeAddress})`
        const content = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">☕ 咖啡訂購確認</h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${sanitize(data.lineName)}，您的訂單已成立！</h2>
    <p>感謝您的訂購，我們已收到您的訂單資訊，將盡速為您安排出貨。</p>
    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${orderId}</p>
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${methodMap[deliveryMethod] || deliveryMethod}<br><span style="color: #666; font-size: 14px;">${sanitize(deliveryText)}</span></p>
      <p style="margin: 0;"><strong>訂單備註：</strong> ${sanitize(data.note) || '無'}</p>
    </div>
    <h3 style="color: #6F4E37; border-bottom: 2px solid #e5ddd5; padding-bottom: 8px; margin-top: 30px;">訂單明細</h3>
    <pre style="font-family: inherit; background-color: #faf9f7; padding: 15px; border: 1px solid #e5ddd5; border-radius: 5px; white-space: pre-wrap; font-size: 14px; color: #444; margin-top: 10px;">${sanitize(ordersText)}</pre>
    <div style="text-align: right; margin-top: 20px;">
      <h3 style="color: #e63946; font-size: 22px; margin: 0;">總金額：$${total}</h3>
    </div>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>`
        await sendEmail(String(data.email), `[咖啡訂購] 訂單編號 ${orderId} 成立確認信`, content)
        if (SMTP_USER) { await sendEmail(SMTP_USER, `[新訂單通知] 訂單編號 ${orderId} 成立`, content) }
    }

    // LINE Pay: 建立付款請求
    if (paymentMethod === 'linepay') {
        try {
            const confirmUrl = `https://scriptcoffeeshop.github.io/sc/main.html?lpAction=confirm&orderId=${orderId}`
            const cancelUrl = `https://scriptcoffeeshop.github.io/sc/main.html?lpAction=cancel&orderId=${orderId}`

            const reqBody = {
                amount: total,
                currency: 'TWD',
                orderId: orderId,
                packages: [{
                    id: '1',
                    amount: total,
                    products: [{ name: `咖啡訂單 ${orderId}`, quantity: 1, price: total }],
                }],
                redirectUrls: { confirmUrl, cancelUrl },
            }

            const lpRes = await requestLinePayAPI('POST', '/v3/payments/request', reqBody)

            if (lpRes.returnCode === '0000' && lpRes.info) {
                const transactionId = String(lpRes.info.transactionId)
                await supabase.from('coffee_orders').update({ payment_id: transactionId }).eq('id', orderId)
                return {
                    success: true, orderId, total,
                    paymentUrl: lpRes.info.paymentUrl?.web || lpRes.info.paymentUrl?.app || '',
                    transactionId,
                }
            } else {
                // LINE Pay 請求失敗，但訂單已建立
                await supabase.from('coffee_orders').update({ payment_status: 'failed' }).eq('id', orderId)
                return { success: false, error: `LINE Pay 請求失敗: ${lpRes.returnMessage || lpRes.returnCode}`, orderId }
            }
        } catch (e) {
            await supabase.from('coffee_orders').update({ payment_status: 'failed' }).eq('id', orderId)
            return { success: false, error: 'LINE Pay 付款請求失敗: ' + String(e), orderId }
        }
    }

    return { success: true, message: '訂單已送出', orderId, total }
}



async function getOrders(req: Request) {
    await requireAdmin(req)
    const { data, error } = await supabase.from('coffee_orders').select('*').order('created_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    const orders = (data || []).map((r: Record<string, unknown>) => ({
        orderId: r.id, timestamp: r.created_at, lineName: r.line_name, phone: r.phone, email: r.email,
        items: r.items, total: r.total, deliveryMethod: r.delivery_method,
        city: r.city, district: r.district, address: r.address,
        storeType: r.store_type, storeId: r.store_id, storeName: r.store_name,
        storeAddress: r.store_address, status: r.status, note: r.note,
        lineUserId: r.line_user_id,
        paymentMethod: r.payment_method || 'cod',
        paymentStatus: r.payment_status || '',
        paymentId: r.payment_id || '',
        transferAccountLast5: r.transfer_account_last5 || '',
    }))
    return { success: true, orders }
}

async function getMyOrders(req: Request) {
    const auth = await requireAuth(req)
    const { data } = await supabase.from('coffee_orders').select('*').eq('line_user_id', auth.userId).order('created_at', { ascending: false })
    const orders = (data || []).map((r: Record<string, unknown>) => ({
        orderId: r.id, timestamp: r.created_at, items: r.items, total: r.total,
        deliveryMethod: r.delivery_method, status: r.status,
        storeName: r.store_name, storeAddress: r.store_address,
        city: r.city, address: r.address,
        paymentMethod: r.payment_method || 'cod',
        paymentStatus: r.payment_status || '',
    }))
    return { success: true, orders }
}

async function updateOrderStatus(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)

    const newStatus = String(data.status)
    if (!VALID_ORDER_STATUSES.includes(newStatus)) {
        return { success: false, error: '無效的訂單狀態，允許值：' + VALID_ORDER_STATUSES.join(', ') }
    }

    const updates: Record<string, unknown> = { status: newStatus }
    if (data.paymentStatus) {
        updates.payment_status = String(data.paymentStatus)
    }

    // 取出訂單資訊以取得 email
    const { data: orderData } = await supabase.from('coffee_orders').select('email, line_name, delivery_method').eq('id', data.orderId).single()

    const { error } = await supabase.from('coffee_orders').update(updates).eq('id', data.orderId)
    if (error) return { success: false, error: error.message }

    // 若狀態切換為已出貨，且該訂單有信箱，寄出出貨通知
    if (data.status === 'shipped' && orderData?.email) {
        const methodMap: Record<string, string> = {
            delivery: '宅配',
            seven_eleven: '7-11',
            family_mart: '全家',
            in_store: '來店自取'
        }
        const content = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">📦 訂單出貨通知</h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${sanitize(orderData.line_name)}，您的訂單已出貨！</h2>
    <p>這封信是要通知您，您所訂購的商品已經安排出貨！</p>
    
    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${data.orderId}</p>
      <p style="margin: 0;"><strong>配送方式：</strong> ${methodMap[orderData.delivery_method] || '一般配送'}</p>
    </div>
    
    <p style="margin-top: 30px; color: #555;">依據配送方式不同，商品預計於 1-3 個工作天內抵達。<br>若是超商取貨，屆時將有手機簡訊通知取件，請留意您的手機訊息。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `
        await sendEmail(orderData.email, `[咖啡訂購] 訂單編號 ${data.orderId} 已出貨通知`, content)
    }

    return { success: true, message: '訂單狀態已更新' }
}

async function deleteOrder(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_orders').delete().eq('id', data.orderId)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '訂單已刪除' }
}

// ============ 設定 ============
async function getSettings() {
    const { data, error } = await supabase.from('coffee_settings').select('*')
    if (error) return { success: false, error: error.message }
    const settings: Record<string, string> = {}
    for (const row of (data || [])) { settings[row.key] = row.value }
    return { success: true, settings }
}

async function updateSettingsAction(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const settings = data.settings as Record<string, string>
    for (const [key, value] of Object.entries(settings)) {
        await supabase.from('coffee_settings').upsert({ key, value: String(value) })
    }
    return { success: true, message: '設定已更新' }
}

// ============ 表單欄位管理 ============
async function getFormFields(includeDisabled: boolean) {
    let query = supabase.from('coffee_form_fields').select('*').order('sort_order', { ascending: true })
    if (!includeDisabled) {
        query = query.eq('enabled', true)
    }
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, fields: data || [] }
}

async function getFormFieldsAdmin(req: Request) {
    await requireAdmin(req)
    let query = supabase.from('coffee_form_fields').select('*').order('sort_order', { ascending: true }).order('id')
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, fields: data || [] }
}

async function addFormField(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)

    const fieldKey = String(data.fieldKey || '').trim()
    if (!fieldKey) return { success: false, error: '欄位識別碼不能為空' }

    // 取得目前最大排序
    const { data: maxRow } = await supabase.from('coffee_form_fields').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    const nextOrder = (maxRow && maxRow[0]) ? maxRow[0].sort_order + 1 : 1

    const { data: inserted, error } = await supabase.from('coffee_form_fields').insert({
        section: String(data.section || 'contact'),
        field_key: fieldKey,
        label: String(data.label || ''),
        field_type: String(data.fieldType || 'text'),
        placeholder: String(data.placeholder || ''),
        options: String(data.options || ''),
        required: Boolean(data.required),
        enabled: data.enabled !== false,
        sort_order: nextOrder,
    }).select().single()

    if (error) return { success: false, error: error.message }
    return { success: true, field: inserted }
}

async function updateFormField(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)

    const id = parseInt(String(data.id))
    if (!id) return { success: false, error: '缺少欄位 ID' }

    const updates: Record<string, unknown> = {}
    if (data.label !== undefined) updates.label = String(data.label)
    if (data.fieldType !== undefined) updates.field_type = String(data.fieldType)
    if (data.placeholder !== undefined) updates.placeholder = String(data.placeholder)
    if (data.options !== undefined) updates.options = String(data.options)
    if (data.required !== undefined) updates.required = Boolean(data.required)
    if (data.enabled !== undefined) updates.enabled = Boolean(data.enabled)
    if (data.section !== undefined) updates.section = String(data.section)

    const { error } = await supabase.from('coffee_form_fields').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '欄位已更新' }
}

async function deleteFormField(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)

    const id = parseInt(String(data.id))
    if (!id) return { success: false, error: '缺少欄位 ID' }

    // 保護預設欄位
    const { data: field } = await supabase.from('coffee_form_fields').select('field_key').eq('id', id).single()
    const protectedKeys = ['phone', 'email']
    if (field && protectedKeys.includes(field.field_key)) {
        return { success: false, error: '此為系統預設欄位，無法刪除（可停用）' }
    }

    const { error } = await supabase.from('coffee_form_fields').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '欄位已刪除' }
}

async function reorderFormFields(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)

    const ids = data.ids as number[]
    if (!Array.isArray(ids)) return { success: false, error: '缺少排序資料' }

    for (let i = 0; i < ids.length; i++) {
        await supabase.from('coffee_form_fields').update({ sort_order: i + 1 }).eq('id', ids[i])
    }
    return { success: true, message: '排序已更新' }
}

async function uploadSiteIcon(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)

    const base64Data = String(data.fileData || '')
    const fileName = String(data.fileName || 'icon.png')
    const contentType = String(data.contentType || 'image/png')

    if (!base64Data) return { success: false, error: '沒有檔案資料' }

    // Base64 解碼為 Uint8Array
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
    }

    const storagePath = `icons/${Date.now()}-${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(storagePath, bytes, { contentType, upsert: true })

    if (uploadError) return { success: false, error: '上傳失敗: ' + uploadError.message }

    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(storagePath)
    const publicUrl = urlData?.publicUrl || ''

    // 儲存到 settings
    await supabase.from('coffee_settings').upsert({ key: 'site_icon_url', value: publicUrl })

    return { success: true, url: publicUrl, message: '圖示已上傳' }
}

// ============ 綠界門市清單 API ============

// 超商類型對照
const CVS_TYPE_MAP: Record<string, string> = {
    seven_eleven: 'UNIMART',
    family_mart: 'FAMI',
}

// 電子地圖用物流子類型（C2C）
const MAP_SUBTYPE_MAP: Record<string, string> = {
    seven_eleven: 'UNIMARTC2C',
    family_mart: 'FAMIC2C',
    UNIMART: 'UNIMARTC2C',
    FAMI: 'FAMIC2C',
    UNIMARTC2C: 'UNIMARTC2C',
    FAMIC2C: 'FAMIC2C',
}

// 產生 CheckMacValue（SHA256）
async function generateCheckMacValue(params: Record<string, string>): Promise<string> {
    // 1. 排除 CheckMacValue，按 key 排序
    const sorted = Object.keys(params)
        .filter(k => k !== 'CheckMacValue')
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

    // 2. 串接為 key=value&key=value
    const paramStr = sorted.map(k => `${k}=${params[k]}`).join('&')

    // 3. 前後加入 HashKey 和 HashIV
    const raw = `HashKey=${ECPAY_HASH_KEY}&${paramStr}&HashIV=${ECPAY_HASH_IV}`

    // 4. URL encode（.NET 相容）
    let encoded = encodeURIComponent(raw)
    // .NET 相容替換
    encoded = encoded.replace(/%20/g, '+')
        .replace(/%2d/gi, '-')
        .replace(/%5f/gi, '_')
        .replace(/%2e/gi, '.')
        .replace(/%21/g, '!')
        .replace(/%2a/g, '*')
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')

    // 5. 轉小寫
    encoded = encoded.toLowerCase()

    // 6. SHA256 雜湊
    const msgBuffer = new TextEncoder().encode(encoded)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 7. 轉大寫
    return hashHex.toUpperCase()
}

// 門市清單快取（每小時更新一次）
const storeCache: Record<string, { data: unknown; timestamp: number }> = {}
const CACHE_TTL = 60 * 60 * 1000 // 1 小時

function genStoreMapToken() {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
}

function getDataValue(data: Record<string, unknown>, keys: string[]) {
    for (const k of keys) {
        const v = data[k]
        if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
}

function escapeHtml(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

async function cleanupOldStoreSelections() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('coffee_store_selections').delete().lt('created_at', cutoff)
}

async function getStoreList(cvsType: string) {
    const mappedType = CVS_TYPE_MAP[cvsType] || cvsType || 'UNIMART'
    const validTypes = ['UNIMART', 'FAMI', 'HILIFE', 'OKMART', 'All']
    if (!validTypes.includes(mappedType)) {
        return { success: false, error: '不支援的超商類型' }
    }

    // 檢查快取
    const cacheKey = mappedType
    if (storeCache[cacheKey] && (Date.now() - storeCache[cacheKey].timestamp) < CACHE_TTL) {
        return storeCache[cacheKey].data
    }

    const params: Record<string, string> = {
        MerchantID: ECPAY_MERCHANT_ID,
        CvsType: mappedType,
    }
    params.CheckMacValue = await generateCheckMacValue(params)

    const apiUrl = ECPAY_IS_STAGE
        ? 'https://logistics-stage.ecpay.com.tw/Helper/GetStoreList'
        : 'https://logistics.ecpay.com.tw/Helper/GetStoreList'

    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString(),
        })
        const result = await res.json()

        if (result.RtnCode === 1) {
            // 整理門市清單
            const stores: Array<{ id: string; name: string; address: string; phone: string; type: string }> = []
            for (const group of (result.StoreList || [])) {
                for (const s of (group.StoreInfo || [])) {
                    stores.push({
                        id: s.StoreId,
                        name: s.StoreName,
                        address: s.StoreAddr,
                        phone: s.StorePhone || '',
                        type: group.CvsType,
                    })
                }
            }
            const response = { success: true, stores, total: stores.length }
            // 存入快取
            storeCache[cacheKey] = { data: response, timestamp: Date.now() }
            return response
        } else {
            return { success: false, error: result.RtnMsg || '取得門市清單失敗' }
        }
    } catch (e) {
        return { success: false, error: '呼叫綠界 API 失敗: ' + String(e) }
    }
}

async function createStoreMapSession(deliveryMethod: string, reqUrl: URL, clientUrl: string = '') {
    const subType = MAP_SUBTYPE_MAP[deliveryMethod] || MAP_SUBTYPE_MAP[String(deliveryMethod || '').toUpperCase()]
    if (!subType) return { success: false, error: '請先選擇 7-11 或全家取貨' }

    const token = genStoreMapToken()
    const callbackUrl = `${SUPABASE_URL}/functions/v1/coffee-api?action=storeMapCallback`

    const params: Record<string, string> = {
        MerchantID: ECPAY_MERCHANT_ID,
        LogisticsType: 'CVS',
        LogisticsSubType: subType,
        IsCollection: 'Y',
        ServerReplyURL: callbackUrl,
        ExtraData: token,
        Device: '1',
    }
    params.CheckMacValue = await generateCheckMacValue(params)

    try {
        await cleanupOldStoreSelections()
    } catch {
        // 不阻斷主流程
    }

    const { error } = await supabase.from('coffee_store_selections').upsert({
        token,
        cvs_store_id: '',
        cvs_store_name: '',
        cvs_address: '',
        logistics_sub_type: subType,
        extra_data: clientUrl,
        created_at: new Date().toISOString(),
    })
    if (error) return { success: false, error: '建立門市地圖會話失敗：' + error.message }

    const mapUrl = ECPAY_IS_STAGE
        ? 'https://logistics-stage.ecpay.com.tw/Express/map'
        : 'https://logistics.ecpay.com.tw/Express/map'

    return { success: true, token, mapUrl, params }
}

async function getStoreSelection(token: string) {
    if (!token) return { success: false, error: '缺少 token' }

    const { data, error } = await supabase
        .from('coffee_store_selections')
        .select('token, cvs_store_id, cvs_store_name, cvs_address, logistics_sub_type')
        .eq('token', token)
        .maybeSingle()

    if (error) return { success: false, error: error.message }
    if (!data || !data.cvs_store_id) return { success: true, found: false }

    // 取到資料即刪除，避免重複選取舊資料
    await supabase.from('coffee_store_selections').delete().eq('token', token)

    return {
        success: true,
        found: true,
        storeId: data.cvs_store_id || '',
        storeName: data.cvs_store_name || '',
        storeAddress: data.cvs_address || '',
        logisticsSubType: data.logistics_sub_type || '',
    }
}

async function handleStoreMapCallback(data: Record<string, unknown>) {
    const isSuccess = data.LogisticsSubType === 'UNIMARTC2C' || data.LogisticsSubType === 'FAMIC2C'
        || data.CVSStoreID || data.CVSStoreName

    const token = String(data.ExtraData || '')
    if (!token) return new Response('Miss Token', { status: 400 })

    // 綠界電子地圖 Callback (ServerReplyURL) 不提供可供雙向驗證的 CheckMacValue
    // 我們的安全性依賴於自己隨機產生的 Token (ExtraData) 進行對應，以及限定 clientUrl 跳轉的 ALLOWED_REDIRECT_ORIGINS

    let clientUrl = ''
    const { data: selection } = await supabase.from('coffee_store_selections').select('extra_data').eq('token', token).maybeSingle()
    if (selection && selection.extra_data) {
        clientUrl = selection.extra_data
    }

    // 防護 Open Redirect
    if (clientUrl) {
        try {
            let u = new URL(clientUrl)
            if (!ALLOWED_REDIRECT_ORIGINS.includes(u.origin)) {
                clientUrl = '' // 非允許的來源
            }
        } catch { clientUrl = '' }
    }

    const storeId = getDataValue(data, ['CVSStoreID', 'CvsStoreID', 'StoreID', 'StoreId'])
    const storeName = getDataValue(data, ['CVSStoreName', 'CvsStoreName', 'StoreName'])
    const storeAddress = getDataValue(data, ['CVSAddress', 'CvsAddress', 'StoreAddress'])
    const logisticsSubType = getDataValue(data, ['LogisticsSubType', 'logisticsSubType'])

    // 更新門市資訊
    const { error } = await supabase.from('coffee_store_selections').update({
        cvs_store_id: storeId,
        cvs_store_name: storeName,
        cvs_address: storeAddress,
        logistics_sub_type: logisticsSubType,
    }).eq('token', token)

    if (error) {
        return htmlResponse(`<!doctype html><html><head><meta charset="utf-8"><title>門市回傳失敗</title></head><body><h3>門市回傳失敗</h3><p>${escapeHtml(error.message)}</p></body></html>`, 500)
    }

    const safeName = escapeHtml(storeName || '（未提供門市名稱）')
    const safeAddr = escapeHtml(storeAddress || '（未提供門市地址）')
    const redirectScript = clientUrl
        ? `window.location.replace("${clientUrl}?store_token=${token}");`
        : `alert('選擇完成，請手動返回原網頁');`;

    return htmlResponse(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>門市選擇完成</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f6f9f6; color: #1f2937; }
    .card { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
    h3 { margin: 0 0 12px; color: #0f5132; }
    p { margin: 8px 0; line-height: 1.5; }
    .hint { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h3>門市選擇成功</h3>
    <p><strong>門市：</strong>${safeName}</p>
    <p><strong>地址：</strong>${safeAddr}</p>
    <p class="hint">正在將您導回訂購頁面...</p>
  </div>
  <script>
    if (window.opener && window.opener !== window) {
      window.opener.postMessage('store_selected', '*');
      window.close();
    } else {
      ${redirectScript}
    }
  </script>
</body>
</html>`)
}

// ============ 用戶與黑名單管理 ============
async function getUsers(data: Record<string, unknown>, req: Request) {
    await requireSuperAdmin(req)
    const { data: users, error } = await supabase.from('coffee_users').select('*').order('last_login', { ascending: false })
    if (error) return { success: false, error: error.message }

    const search = String(data.search || '').toLowerCase()
    let filtered = users
    if (search) {
        filtered = users.filter((u: any) =>
            (u.display_name && u.display_name.toLowerCase().includes(search)) ||
            (u.line_user_id && u.line_user_id.toLowerCase().includes(search)) ||
            (u.phone && u.phone.includes(search)) ||
            (u.email && u.email.includes(search))
        )
    }
    const formatted = filtered.map((u: any) => ({
        userId: u.line_user_id,
        displayName: u.display_name,
        pictureUrl: u.picture_url,
        role: u.line_user_id === LINE_ADMIN_USER_ID ? 'SUPER_ADMIN' : u.role || 'USER',
        status: u.status || 'ACTIVE',
        lastLogin: u.last_login,
        phone: u.phone || '',
        email: u.email || '',
        defaultDeliveryMethod: u.default_delivery_method || '',
        defaultCity: u.default_city || '',
        defaultDistrict: u.default_district || '',
        defaultAddress: u.default_address || '',
        defaultStoreId: u.default_store_id || '',
        defaultStoreName: u.default_store_name || '',
        defaultStoreAddress: u.default_store_address || '',
    }))
    return { success: true, users: formatted }
}

async function updateUserRole(data: Record<string, unknown>, req: Request) {
    const auth = await requireSuperAdmin(req)

    const targetUserId = data.targetUserId as string
    const newRole = data.newRole as string
    if (targetUserId === auth.userId) return { success: false, error: '無法更改自己的權限' }

    const { error } = await supabase.from('coffee_users').update({ role: newRole }).eq('line_user_id', targetUserId)
    if (error) return { success: false, error: error.message }
    return { success: true, message: `已將用戶權限設為 ${newRole}` }
}

async function getBlacklist(req: Request) {
    await requireAdmin(req)
    const { data: users, error } = await supabase.from('coffee_users').select('*').eq('status', 'BLACKLISTED').order('blocked_at', { ascending: false })
    if (error) return { success: false, error: error.message }

    const blacklist = users.map((u: any) => ({
        lineUserId: u.line_user_id,
        displayName: u.display_name,
        blockedAt: u.blocked_at || u.last_login,
        reason: u.blacklist_reason || ''
    }))
    return { success: true, blacklist }
}

async function addToBlacklist(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_users').update({
        status: 'BLACKLISTED',
        blacklist_reason: String(data.reason || ''),
        blocked_at: new Date().toISOString()
    }).eq('line_user_id', data.lineUserId)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '已加入黑名單' }
}

async function removeFromBlacklist(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_users').update({
        status: 'ACTIVE',
        blacklist_reason: '',
        blocked_at: null
    }).eq('line_user_id', data.lineUserId)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '已解除黑名單' }
}

// ============ LINE Pay 確認 / 取消 / 退款 ============
async function linePayConfirm(data: Record<string, unknown>) {
    const transactionId = String(data.transactionId || '')
    const orderId = String(data.orderId || '')
    if (!transactionId || !orderId) return { success: false, error: '缺少交易參數' }

    // 驗證訂單
    const { data: order, error: oErr } = await supabase.from('coffee_orders').select('id, total, payment_id, payment_status, payment_method').eq('id', orderId).maybeSingle()
    if (oErr || !order) return { success: false, error: '找不到訂單' }
    if (order.payment_method !== 'linepay') return { success: false, error: '此訂單非 LINE Pay 付款' }
    if (order.payment_status === 'paid') return { success: true, message: '已完成付款', orderId }
    if (String(order.payment_id) !== transactionId) return { success: false, error: '交易 ID 不匹配' }

    try {
        const confirmRes = await requestLinePayAPI('POST', `/v3/payments/${transactionId}/confirm`, {
            amount: order.total,
            currency: 'TWD',
        })

        if (confirmRes.returnCode === '0000') {
            await supabase.from('coffee_orders').update({ payment_status: 'paid' }).eq('id', orderId)
            return { success: true, message: '付款成功', orderId }
        } else {
            await supabase.from('coffee_orders').update({ payment_status: 'failed' }).eq('id', orderId)
            return { success: false, error: `LINE Pay 確認失敗: ${confirmRes.returnMessage || confirmRes.returnCode}`, orderId }
        }
    } catch (e) {
        return { success: false, error: 'LINE Pay 確認失敗: ' + String(e) }
    }
}

async function linePayCancel(data: Record<string, unknown>) {
    const orderId = String(data.orderId || '')
    if (!orderId) return { success: false, error: '缺少訂單編號' }

    const { data: order } = await supabase.from('coffee_orders').select('payment_status').eq('id', orderId).maybeSingle()
    if (order && order.payment_status === 'pending') {
        await supabase.from('coffee_orders').update({ payment_status: 'cancelled' }).eq('id', orderId)
    }
    return { success: true, message: '付款已取消', orderId }
}

async function linePayRefund(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const orderId = String(data.orderId || '')
    const refundAmount = data.refundAmount ? parseInt(String(data.refundAmount)) : 0
    if (!orderId) return { success: false, error: '缺少訂單編號' }

    const { data: order, error: oErr } = await supabase.from('coffee_orders').select('payment_id, total, payment_status, payment_method').eq('id', orderId).maybeSingle()
    if (oErr || !order) return { success: false, error: '找不到訂單' }
    if (order.payment_method !== 'linepay') return { success: false, error: '此訂單非 LINE Pay 付款，無法線上退款' }
    if (order.payment_status !== 'paid') return { success: false, error: '此訂單尚未付款，無法退款' }

    const transactionId = String(order.payment_id)
    if (!transactionId) return { success: false, error: '找不到交易 ID' }

    try {
        const refundBody = refundAmount > 0 ? { refundAmount } : null
        const refundRes = await requestLinePayAPI('POST', `/v3/payments/${transactionId}/refund`, refundBody)

        if (refundRes.returnCode === '0000') {
            await supabase.from('coffee_orders').update({ payment_status: 'refunded' }).eq('id', orderId)
            return { success: true, message: '退款成功', orderId, refundTransactionId: refundRes.info?.refundTransactionId }
        } else {
            return { success: false, error: `退款失敗: ${refundRes.returnMessage || refundRes.returnCode}` }
        }
    } catch (e) {
        return { success: false, error: '退款失敗: ' + String(e) }
    }
}

// ============ 匯款帳號管理 ============
async function getBankAccounts() {
    const { data, error } = await supabase.from('coffee_bank_accounts').select('*').eq('enabled', true).order('sort_order', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, accounts: (data || []).map((r: any) => ({ id: r.id, bankCode: r.bank_code, bankName: r.bank_name, accountNumber: r.account_number, accountName: r.account_name || '' })) }
}

async function addBankAccount(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: maxRow } = await supabase.from('coffee_bank_accounts').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    const nextOrder = (maxRow && maxRow[0]) ? maxRow[0].sort_order + 1 : 1
    const { data: ins, error } = await supabase.from('coffee_bank_accounts').insert({
        bank_code: String(data.bankCode || ''),
        bank_name: String(data.bankName || ''),
        account_number: String(data.accountNumber || ''),
        account_name: String(data.accountName || ''),
        enabled: true,
        sort_order: nextOrder,
    }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '帳號已新增', id: ins.id }
}

async function updateBankAccount(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const id = parseInt(String(data.id))
    if (!id) return { success: false, error: '缺少帳號 ID' }
    const updates: Record<string, unknown> = {}
    if (data.bankCode !== undefined) updates.bank_code = String(data.bankCode)
    if (data.bankName !== undefined) updates.bank_name = String(data.bankName)
    if (data.accountNumber !== undefined) updates.account_number = String(data.accountNumber)
    if (data.accountName !== undefined) updates.account_name = String(data.accountName)
    if (data.enabled !== undefined) updates.enabled = Boolean(data.enabled)
    const { error } = await supabase.from('coffee_bank_accounts').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '帳號已更新' }
}

async function deleteBankAccount(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const id = parseInt(String(data.id))
    if (!id) return { success: false, error: '缺少帳號 ID' }
    const { error } = await supabase.from('coffee_bank_accounts').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '帳號已刪除' }
}

// ============ 線上轉帳：提交匯款帳號末5碼 ============
async function updateTransferInfo(data: Record<string, unknown>, req: Request) {
    const auth = await requireAuth(req)
    const orderId = String(data.orderId || '')
    const last5 = String(data.last5 || '').trim()
    if (!orderId) return { success: false, error: '缺少訂單編號' }
    if (!last5 || last5.length !== 5 || !/^\d{5}$/.test(last5)) return { success: false, error: '請輸入正確的5位數字帳號末碼' }

    // 驗證訂單屬於當前用戶
    const { data: order } = await supabase.from('coffee_orders').select('line_user_id, payment_method').eq('id', orderId).maybeSingle()
    if (!order) return { success: false, error: '找不到訂單' }
    if (order.line_user_id !== auth.userId) return { success: false, error: '無權操作此訂單' }
    if (order.payment_method !== 'transfer') return { success: false, error: '此訂單非線上轉帳付款' }

    const { error } = await supabase.from('coffee_orders').update({ transfer_account_last5: last5 }).eq('id', orderId)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '匯款資訊已更新' }
}
