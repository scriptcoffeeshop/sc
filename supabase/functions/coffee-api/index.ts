// 咖啡豆訂購系統 — Supabase Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// ============ 環境變數 ============
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || ''
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_LOGIN_CHANNEL_SECRET') || ''
const LINE_ADMIN_USER_ID = Deno.env.get('LINE_ADMIN_USER_ID') || ''

// 綠界 ECPay 物流設定
const ECPAY_MERCHANT_ID = Deno.env.get('ECPAY_MERCHANT_ID') || ''
const ECPAY_HASH_KEY = Deno.env.get('ECPAY_HASH_KEY') || ''
const ECPAY_HASH_IV = Deno.env.get('ECPAY_HASH_IV') || ''

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

// ============ 主路由 ============
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'getProducts'

    let data: Record<string, unknown> = {}
    if (req.method === 'POST') {
        try {
            data = await req.json()
        } catch {
            url.searchParams.forEach((v, k) => { data[k] = v })
        }
    } else {
        url.searchParams.forEach((v, k) => { data[k] = v })
    }

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
            case 'getEcpayMap': result = getEcpayMapUrl(data); break
            default: result = { success: false, error: '未知的操作' }
        }
    } catch (error) {
        result = { success: false, error: String(error) }
    }

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

    // 更新用戶電話
    if (data.lineUserId) {
        try {
            await registerOrUpdateUser({
                userId: String(data.lineUserId),
                displayName: String(data.lineName),
                pictureUrl: '',
                phone,
            })
        } catch { /* ignore */ }
    }

    return { success: true, message: '訂單已送出', orderId }
}

async function getOrders(userId: string) {
    if (!(await verifyAdmin(userId)).isAdmin) return { success: false, error: '權限不足' }
    const { data, error } = await supabase.from('coffee_orders').select('*').order('created_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    const orders = (data || []).map((r: Record<string, unknown>) => ({
        orderId: r.id, timestamp: r.created_at, lineName: r.line_name, phone: r.phone,
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
    const { error } = await supabase.from('coffee_orders').update({ status: data.status }).eq('id', data.orderId)
    if (error) return { success: false, error: error.message }
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

// ============ 綠界門市地圖 ============
function getEcpayMapUrl(data: Record<string, unknown>) {
    const subType = data.subType as string // UNIMARTC2C or FAMIC2C
    const serverReplyURL = data.serverReplyURL as string || ''
    if (!ECPAY_MERCHANT_ID) {
        return { success: false, error: '尚未設定綠界商家 ID' }
    }
    // 綠界門市電子地圖 URL
    const mapUrl = 'https://logistics.ecpay.com.tw/Express/map?' +
        'IsCollection=N&' +
        'LogisticsSubType=' + (subType || 'UNIMARTC2C') + '&' +
        'MerchantID=' + ECPAY_MERCHANT_ID + '&' +
        'ServerReplyURL=' + encodeURIComponent(serverReplyURL)
    return { success: true, mapUrl }
}
