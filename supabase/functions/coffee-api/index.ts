// 咖啡豆訂購系統 — Supabase Edge Function
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

// @ts-ignore
declare const Deno: any;

// ============ 環境變數 ============
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || ''
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_LOGIN_CHANNEL_SECRET') || ''
const LINE_ADMIN_USER_ID = Deno.env.get('LINE_ADMIN_USER_ID') || ''

// SMTP 設定
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''

// 綠界 ECPay 物流設定
// 測試環境預設使用 B2C 物流測試帳號，正式環境請設定 Secrets
const ECPAY_MERCHANT_ID = '3339283'
const ECPAY_HASH_KEY = 'Dbxpzi6EQdrOM46j'
const ECPAY_HASH_IV = 'OqMti7T9ZMs1OvLD'
const ECPAY_IS_STAGE = false

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
            // GET
            case 'getProducts': result = await getProducts(); break
            case 'getCategories': result = await getCategories(); break
            case 'getSettings': result = await getSettings(); break
            case 'getInitData': result = await getInitData(); break
            case 'getLineLoginUrl': result = getLineLoginUrl(data.redirectUri as string); break
            case 'customerLineLogin': result = await customerLineLogin(data.code as string, data.redirectUri as string); break
            case 'lineLogin': result = await handleAdminLogin(data.code as string, data.redirectUri as string); break
            case 'getMyOrders': result = await getMyOrders(data.lineUserId as string); break
            case 'getOrders': result = await getOrders(data.userId as string); break
            case 'verifyAdmin': result = await verifyAdmin(data.userId as string); break
            case 'getStoreList': result = await getStoreList(data.cvsType as string); break
            case 'createStoreMapSession': result = await createStoreMapSession(data.deliveryMethod as string, url); break
            case 'getStoreSelection': result = await getStoreSelection(data.token as string); break
            // POST
            case 'submitOrder': result = await submitOrder(data); break
            case 'addProduct': result = await addProduct(data); break
            case 'updateProduct': result = await updateProduct(data); break
            case 'deleteProduct': result = await deleteProduct(data); break
            case 'addCategory': result = await addCategory(data); break
            case 'updateCategory': result = await updateCategory(data); break
            case 'deleteCategory': result = await deleteCategory(data); break
            case 'reorderCategory': result = await reorderCategory(data); break
            case 'updateSettings': result = await updateSettingsAction(data); break
            case 'updateOrderStatus': result = await updateOrderStatus(data); break
            case 'deleteOrder': result = await deleteOrder(data); break
            case 'storeMapCallback': result = await handleStoreMapCallback(data); break
            default: result = { success: false, error: '未知的操作' }
        }
    } catch (error) {
        result = { success: false, error: String(error) }
    }

    if (result instanceof Response) return result
    return jsonResponse(result)
})

// ============ 初始化資料 ============
async function getInitData() {
    const [p, c, s] = await Promise.all([getProducts(), getCategories(), getSettings()])
    return {
        success: true,
        products: p.success ? p.products : [],
        categories: c.success ? c.categories : [],
        settings: s.success ? s.settings : {},
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
        return { success: true, user: updated || userData }
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
        const auth = await verifyAdmin(profile.userId)
        if (!auth.isAdmin) return { success: false, error: '您沒有管理員權限' }
        return { success: true, isAdmin: true, role: auth.role, user: userData }
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

    if (existing) {
        const updates: Record<string, unknown> = {
            display_name: data.displayName,
            last_login: new Date().toISOString(),
        }
        if (data.pictureUrl) updates.picture_url = data.pictureUrl
        if (data.phone) updates.phone = data.phone
        await supabase.from('coffee_users').update(updates).eq('line_user_id', data.userId)
        return { ...existing, ...updates, userId: data.userId, displayName: data.displayName, pictureUrl: data.pictureUrl || existing.picture_url, phone: existing.phone }
    } else {
        await supabase.from('coffee_users').insert({
            line_user_id: data.userId,
            display_name: data.displayName,
            picture_url: data.pictureUrl || '',
            phone: data.phone || '',
        })
        return data
    }
}

async function verifyAdmin(userId: string): Promise<{ success: boolean; isAdmin: boolean; role?: string; message: string }> {
    if (userId === LINE_ADMIN_USER_ID) {
        return { success: true, isAdmin: true, role: 'SUPER_ADMIN', message: 'OK' }
    }
    try {
        const { data } = await supabase.from('coffee_users').select('role').eq('line_user_id', userId).single()
        if (data?.role === 'ADMIN') return { success: true, isAdmin: true, role: 'ADMIN', message: 'OK' }
    } catch { /* ignore */ }
    return { success: false, isAdmin: false, message: '非管理員' }
}

// ============ 商品 ============
async function getProducts() {
    const { data, error } = await supabase.from('coffee_products').select('*').order('sort_order', { ascending: true })
    if (error) return { success: false, error: error.message }
    const products = (data || []).map((r: Record<string, unknown>) => ({
        id: r.id, category: r.category, name: r.name, description: r.description || '',
        price: r.price, weight: r.weight || '', origin: r.origin || '',
        roastLevel: r.roast_level || '', imageUrl: r.image_url || '',
        enabled: r.enabled !== false, sortOrder: r.sort_order || 0,
    }))
    return { success: true, products }
}

async function addProduct(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const { data: ins, error } = await supabase.from('coffee_products').insert({
        category: data.category, name: data.name, description: data.description || '',
        price: parseInt(String(data.price)), weight: data.weight || '', origin: data.origin || '',
        roast_level: data.roastLevel || '', image_url: data.imageUrl || '',
        enabled: data.enabled === false || data.enabled === 'false' ? false : true,
    }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已新增', id: ins.id }
}

async function updateProduct(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const { error } = await supabase.from('coffee_products').update({
        category: data.category, name: data.name, description: data.description || '',
        price: parseInt(String(data.price)), weight: data.weight || '', origin: data.origin || '',
        roast_level: data.roastLevel || '', image_url: data.imageUrl || '',
        enabled: data.enabled === true || data.enabled === 'true',
    }).eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已更新' }
}

async function deleteProduct(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const { error } = await supabase.from('coffee_products').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已刪除' }
}

// ============ 分類 ============
async function getCategories() {
    const { data, error } = await supabase.from('coffee_categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, categories: (data || []).map((r: Record<string, unknown>) => ({ id: r.id, name: r.name })) }
}

async function addCategory(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const { data: ins, error } = await supabase.from('coffee_categories').insert({ name: data.name }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已新增', id: ins.id }
}

async function updateCategory(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const { data: old } = await supabase.from('coffee_categories').select('name').eq('id', data.id).single()
    const { error } = await supabase.from('coffee_categories').update({ name: data.name }).eq('id', data.id)
    if (error) return { success: false, error: error.message }
    if (old?.name && old.name !== data.name) {
        await supabase.from('coffee_products').update({ category: data.name as string }).eq('category', old.name)
    }
    return { success: true, message: '分類已更新' }
}

async function deleteCategory(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const { error } = await supabase.from('coffee_categories').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已刪除' }
}

async function reorderCategory(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
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
        const client = new SmtpClient()
        await client.connectTLS({
            hostname: 'smtp.gmail.com',
            port: 465,
            username: SMTP_USER,
            password: SMTP_PASS,
        })
        await client.send({
            from: `"☕ 咖啡豆訂購系統" <${SMTP_USER}>`,
            to,
            subject,
            content: 'Please view this email in an HTML-capable client.',
            html: htmlContent,
        })
        await client.close()
        return { success: true }
    } catch (e: any) {
        console.error('Failed to send email:', e)
        return { success: false, error: e.message }
    }
}

async function submitOrder(data: Record<string, unknown>) {
    if (!data.lineName || !data.phone || !data.orders) {
        return { success: false, error: '缺少必要資訊' }
    }

    const deliveryMethod = String(data.deliveryMethod || 'delivery')
    const validMethods = ['delivery', 'seven_eleven', 'family_mart']
    if (!validMethods.includes(deliveryMethod)) {
        return { success: false, error: '無效的配送方式' }
    }

    // 配送地址驗證
    if (deliveryMethod === 'delivery') {
        const city = String(data.city || '')
        if (!['竹北市', '新竹市'].includes(city)) {
            return { success: false, error: '配送範圍僅限竹北市及新竹市' }
        }
        if (!data.address) {
            return { success: false, error: '請填寫配送地址' }
        }
    }

    // 超商取貨驗證
    if (deliveryMethod === 'seven_eleven' || deliveryMethod === 'family_mart') {
        if (!data.storeName) {
            return { success: false, error: '請選擇取貨門市' }
        }
    }

    // 電話驗證（允許含 - 分隔）
    const phone = String(data.phone).replace(/[\s-]/g, '')
    if (!/^(09\d{8}|0[2-8]\d{7,8})$/.test(phone)) {
        return { success: false, error: '電話格式不正確' }
    }

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const orderId = `C${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 100))}`

    const { error } = await supabase.from('coffee_orders').insert({
        id: orderId,
        created_at: now.toISOString(),
        line_user_id: data.lineUserId || '',
        line_name: String(data.lineName).trim(),
        phone,
        email: String(data.email || '').trim(),
        items: String(data.orders).trim(),
        total: parseInt(String(data.total)) || 0,
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
    })

    if (error) return { success: false, error: error.message }

    // 更新用戶電話與 Email
    if (data.lineUserId) {
        try {
            await registerOrUpdateUser({
                userId: String(data.lineUserId),
                displayName: String(data.lineName),
                pictureUrl: '',
                phone,
                email: String(data.email || '').trim()
            })
        } catch { /* ignore */ }
    }

    // 寄出訂單成立確認信
    if (data.email) {
        const methodMap: Record<string, string> = { delivery: '宅配到府', seven_eleven: '7-11 取貨付款', family_mart: '全家取貨付款' }
        const deliveryText = deliveryMethod === 'delivery'
            ? `${data.city}${data.district} ${data.address}`
            : `${data.storeName} (${data.storeAddress})`

        const content = `
        <h2>親愛的 ${sanitize(data.lineName)}，您的訂單已成立！</h2>
        <p>感謝您的訂購，我們已收到您的訂單資訊。</p>
        <p><b>訂單編號：</b> ${orderId}</p>
        <p><b>配送方式：</b> ${methodMap[deliveryMethod]} - ${sanitize(deliveryText)}</p>
        <hr/>
        <h3>訂單內容：</h3>
        <pre style="font-family: inherit;">${sanitize(data.orders)}</pre>
        <h3>總金額：$${data.total}</h3>
        <p>備註：${sanitize(data.note) || '無'}</p>
        <br/><p>收到訂單後我們將盡速為您安排出貨！</p>
        `
        // 不 await 等待寄送信件，讓 API 先回傳避免超時
        sendEmail(String(data.email), `[咖啡訂購] 訂單編號 ${orderId} 成立確認信`, content)
    }

    return { success: true, message: '訂單已送出', orderId }
}

async function getOrders(userId: string) {
    if (!(await verifyAdmin(userId)).isAdmin) return { success: false, error: '權限不足' }
    const { data, error } = await supabase.from('coffee_orders').select('*').order('created_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    const orders = (data || []).map((r: Record<string, unknown>) => ({
        orderId: r.id, timestamp: r.created_at, lineName: r.line_name, phone: r.phone, email: r.email,
        items: r.items, total: r.total, deliveryMethod: r.delivery_method,
        city: r.city, district: r.district, address: r.address,
        storeType: r.store_type, storeId: r.store_id, storeName: r.store_name,
        storeAddress: r.store_address, status: r.status, note: r.note,
        lineUserId: r.line_user_id,
    }))
    return { success: true, orders }
}

async function getMyOrders(lineUserId: string) {
    if (!lineUserId) return { success: false, error: '缺少用戶 ID' }
    const { data } = await supabase.from('coffee_orders').select('*').eq('line_user_id', lineUserId).order('created_at', { ascending: false })
    const orders = (data || []).map((r: Record<string, unknown>) => ({
        orderId: r.id, timestamp: r.created_at, items: r.items, total: r.total,
        deliveryMethod: r.delivery_method, status: r.status,
        storeName: r.store_name, storeAddress: r.store_address,
        city: r.city, address: r.address,
    }))
    return { success: true, orders }
}

async function updateOrderStatus(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }

    // 取出訂單資訊以取得 email
    const { data: orderData } = await supabase.from('coffee_orders').select('email, line_name, delivery_method').eq('id', data.orderId).single()

    const { error } = await supabase.from('coffee_orders').update({ status: data.status }).eq('id', data.orderId)
    if (error) return { success: false, error: error.message }

    // 若狀態切換為已出貨，且該訂單有信箱，寄出出貨通知
    if (data.status === 'shipped' && orderData?.email) {
        const methodMap: Record<string, string> = { delivery: '宅配', seven_eleven: '7-11', family_mart: '全家' }
        const content = `
        <h2>親愛的 ${sanitize(orderData.line_name)}，您的訂單已出貨！</h2>
        <p>您訂購的商品已經安排出貨！</p>
        <p><b>訂單編號：</b> ${data.orderId}</p>
        <p><b>配送方式：</b> ${methodMap[orderData.delivery_method] || '一般配送'}</p>
        <br/><p>依據配送方式不同，商品預計於 1-3 個工作天內抵達（若是超商取貨，屆時將有手機簡訊通知取件）。</p>
        `
        sendEmail(orderData.email, `[咖啡訂購] 訂單編號 ${data.orderId} 已出貨通知`, content)
    }

    return { success: true, message: '訂單狀態已更新' }
}

async function deleteOrder(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
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

async function updateSettingsAction(data: Record<string, unknown>) {
    if (!(await verifyAdmin(data.userId as string)).isAdmin) return { success: false, error: '權限不足' }
    const settings = data.settings as Record<string, string>
    for (const [key, value] of Object.entries(settings)) {
        await supabase.from('coffee_settings').upsert({ key, value: String(value) })
    }
    return { success: true, message: '設定已更新' }
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

async function createStoreMapSession(deliveryMethod: string, reqUrl: URL) {
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
        extra_data: '',
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
    const token = getDataValue(data, ['ExtraData', 'extraData', 'token'])
    const storeId = getDataValue(data, ['CVSStoreID', 'CvsStoreID', 'StoreID', 'StoreId'])
    const storeName = getDataValue(data, ['CVSStoreName', 'CvsStoreName', 'StoreName'])
    const storeAddress = getDataValue(data, ['CVSAddress', 'CvsAddress', 'StoreAddress'])
    const logisticsSubType = getDataValue(data, ['LogisticsSubType', 'logisticsSubType'])

    if (!token) {
        return htmlResponse(`<!doctype html><html><head><meta charset="utf-8"><title>門市回傳失敗</title></head><body><h3>門市回傳失敗</h3><p>缺少會話識別碼（ExtraData）。</p></body></html>`, 400)
    }

    const { error } = await supabase.from('coffee_store_selections').upsert({
        token,
        cvs_store_id: storeId,
        cvs_store_name: storeName,
        cvs_address: storeAddress,
        logistics_sub_type: logisticsSubType,
        extra_data: JSON.stringify(data),
        created_at: new Date().toISOString(),
    })

    if (error) {
        return htmlResponse(`<!doctype html><html><head><meta charset="utf-8"><title>門市回傳失敗</title></head><body><h3>門市回傳失敗</h3><p>${escapeHtml(error.message)}</p></body></html>`, 500)
    }

    const safeName = escapeHtml(storeName || '（未提供門市名稱）')
    const safeAddr = escapeHtml(storeAddress || '（未提供門市地址）')

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
    <p class="hint">此視窗會自動關閉，請回到訂購頁面。</p>
  </div>
  <script>
    setTimeout(function () {
      if (window.opener) window.close();
    }, 400);
  </script>
</body>
</html>`)
}
