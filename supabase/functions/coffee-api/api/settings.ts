import { supabase } from '../utils/supabase.ts'
import { requireAdmin } from '../utils/auth.ts'
import { testEmail as testEmailAction } from './misc.ts' // I'll create this or just keep it in index for now.

// ============ 商品 ============
export async function getProducts() {
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

export async function addProduct(data: Record<string, unknown>, req: Request) {
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

export async function updateProduct(data: Record<string, unknown>, req: Request) {
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

export async function deleteProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_products').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '商品已刪除' }
}

export async function reorderProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: allProds, error } = await supabase.from('coffee_products').select('*').order('sort_order').order('id')
    if (error || !allProds) return { success: false, error: '讀取失敗' }

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

    const itemsToUpdate = items.map((item, index) => ({
        id: item.id,
        sort_order: index * 10
    }))
    const { error: rpcError } = await supabase.rpc('batch_update_sort', {
        table_name: 'coffee_products',
        items: itemsToUpdate
    })
    if (rpcError) return { success: false, error: rpcError.message }
    return { success: true, message: '排序已更新' }
}

export async function reorderProductsBulk(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const ids = data.ids as number[]
    if (!Array.isArray(ids)) return { success: false, error: '資料格式錯誤' }

    const itemsToUpdate = ids.map((id, index) => ({
        id,
        sort_order: index * 10
    }))
    const { error: rpcError } = await supabase.rpc('batch_update_sort', {
        table_name: 'coffee_products',
        items: itemsToUpdate
    })
    if (rpcError) return { success: false, error: rpcError.message }
    return { success: true, message: '批量排序已更新' }
}

// ============ 分類 ============
export async function getCategories() {
    const { data, error } = await supabase.from('coffee_categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, categories: (data || []).map((r: Record<string, unknown>) => ({ id: r.id, name: r.name })) }
}

export async function addCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: ins, error } = await supabase.from('coffee_categories').insert({ name: data.name }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已新增', id: ins.id }
}

export async function updateCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_categories').update({ name: data.name }).eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已更新' }
}

export async function deleteCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_categories').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類已刪除' }
}

export async function reorderCategory(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const ids = data.ids as number[]
    if (!Array.isArray(ids)) return { success: false, error: '缺少排序資料' }
    const itemsToUpdate = ids.map((id, index) => ({
        id: parseInt(String(id)),
        sort_order: index * 10
    }))
    const { error } = await supabase.rpc('batch_update_sort', {
        table_name: 'coffee_categories',
        items: itemsToUpdate
    })
    if (error) return { success: false, error: error.message }
    return { success: true, message: '分類排序已更新' }
}

// ============ 促銷活動 ============
export async function getPromotions() {
    const { data, error } = await supabase.from('coffee_promotions').select('*').order('sort_order', { ascending: true })
    if (error) return { success: false, error: error.message }
    const promotions = (data || []).map((r: any) => ({
        id: r.id, name: r.name, type: r.type,
        targetProductIds: (typeof r.target_product_ids === 'string' ? JSON.parse(r.target_product_ids) : r.target_product_ids) || [],
        targetItems: (typeof r.target_items === 'string' ? JSON.parse(r.target_items) : r.target_items) || [],
        minQuantity: Number(r.min_quantity) || 1,
        discountType: r.discount_type,
        discountValue: Number(r.discount_value) || 0,
        enabled: r.enabled !== false,
        startTime: r.start_time,
        endTime: r.end_time,
        sortOrder: Number(r.sort_order) || 0,
    }))
    return { success: true, promotions }
}

export async function addPromotion(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { data: ins, error } = await supabase.from('coffee_promotions').insert({
        name: data.name, type: data.type || 'bundle',
        target_product_ids: data.targetProductIds || [],
        target_items: data.targetItems || [],
        min_quantity: data.minQuantity || 1,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        enabled: data.enabled !== false,
        start_time: data.startTime || null, end_time: data.endTime || null,
    }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, message: '活動已新增', id: ins.id }
}

export async function updatePromotion(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_promotions').update({
        name: data.name, type: data.type || 'bundle',
        target_product_ids: data.targetProductIds || [],
        target_items: data.targetItems || [],
        min_quantity: data.minQuantity || 1,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        enabled: data.enabled !== false,
        start_time: data.startTime || null, end_time: data.endTime || null,
    }).eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '活動已更新' }
}

export async function deletePromotion(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const { error } = await supabase.from('coffee_promotions').delete().eq('id', data.id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '活動已刪除' }
}

export async function reorderPromotionsBulk(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const ids = data.ids as number[]
    if (!Array.isArray(ids)) return { success: false, error: '資料格式錯誤' }

    const itemsToUpdate = ids.map((id, index) => ({
        id,
        sort_order: index * 10
    }))
    const { error: rpcError } = await supabase.rpc('batch_update_sort', {
        table_name: 'coffee_promotions',
        items: itemsToUpdate
    })
    if (rpcError) return { success: false, error: rpcError.message }
    return { success: true, message: '批量排序已更新' }
}

// ============ 設定 ============
export async function getSettings() {
    const { data, error } = await supabase.from('coffee_settings').select('*')
    if (error) return { success: false, error: error.message }
    const settings: Record<string, string> = {}
    for (const row of (data || [])) { settings[row.key] = row.value }
    return { success: true, settings }
}

export async function updateSettingsAction(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const settings = data.settings as Record<string, string>
    const itemsToUpsert = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value)
    }))

    const { error } = await supabase.from('coffee_settings').upsert(itemsToUpsert)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '設定已更新' }
}

// ============ 欄位 ============
export async function getFormFields(includeDisabled: boolean) {
    let query = supabase.from('coffee_form_fields').select('*').order('sort_order', { ascending: true })
    if (!includeDisabled) {
        query = query.eq('enabled', true)
    }
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, fields: data || [] }
}

export async function getFormFieldsAdmin(req: Request) {
    await requireAdmin(req)
    let query = supabase.from('coffee_form_fields').select('*').order('sort_order', { ascending: true }).order('id')
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, fields: data || [] }
}

export async function addFormField(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const fieldKey = String(data.fieldKey || '').trim()
    if (!fieldKey) return { success: false, error: '欄位識別碼不能為空' }
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

export async function updateFormField(data: Record<string, unknown>, req: Request) {
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

export async function deleteFormField(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const id = parseInt(String(data.id))
    if (!id) return { success: false, error: '缺少欄位 ID' }
    const { data: field } = await supabase.from('coffee_form_fields').select('field_key').eq('id', id).single()
    const protectedKeys = ['phone', 'email']
    if (field && protectedKeys.includes(field.field_key)) {
        return { success: false, error: '此為系統預設欄位，無法刪除（可停用）' }
    }
    const { error } = await supabase.from('coffee_form_fields').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '欄位已刪除' }
}

export async function reorderFormFields(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const ids = data.ids as number[]
    if (!Array.isArray(ids)) return { success: false, error: '缺少排序資料' }
    const itemsToUpdate = ids.map((id, index) => ({
        id: parseInt(String(id)),
        sort_order: index + 1
    }))
    const { error } = await supabase.rpc('batch_update_sort', {
        table_name: 'coffee_form_fields',
        items: itemsToUpdate
    })
    if (error) return { success: false, error: error.message }
    return { success: true, message: '排序已更新' }
}

export async function uploadSiteIcon(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const base64Data = String(data.fileData || '')
    const fileName = String(data.fileName || 'icon.png')
    const contentType = String(data.contentType || 'image/png')
    if (!base64Data) return { success: false, error: '沒有檔案資料' }
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const storagePath = `icons/${Date.now()}-${fileName}`
    const { error: uploadError } = await supabase.storage.from('site-assets').upload(storagePath, bytes, { contentType, upsert: true })
    if (uploadError) return { success: false, error: '上傳失敗: ' + uploadError.message }
    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(storagePath)
    const publicUrl = urlData?.publicUrl || ''
    await supabase.from('coffee_settings').upsert({ key: 'site_icon_url', value: publicUrl })
    return { success: true, url: publicUrl, message: '圖示已上傳' }
}

// ============ 銀行帳號 ============
export async function getBankAccounts() {
    const { data, error } = await supabase.from('coffee_bank_accounts').select('*').eq('enabled', true).order('sort_order', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, accounts: (data || []).map((r: any) => ({ id: r.id, bankCode: r.bank_code, bankName: r.bank_name, accountNumber: r.account_number, accountName: r.account_name || '' })) }
}

export async function addBankAccount(data: Record<string, unknown>, req: Request) {
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

export async function updateBankAccount(data: Record<string, unknown>, req: Request) {
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

export async function deleteBankAccount(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req)
    const id = parseInt(String(data.id))
    if (!id) return { success: false, error: '缺少帳號 ID' }
    const { error } = await supabase.from('coffee_bank_accounts').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '帳號已刪除' }
}

// ============ 初始化資料 ============
export async function getInitData() {
    const [p, c, s, f, b, pr] = await Promise.all([getProducts(), getCategories(), getSettings(), getFormFields(false), getBankAccounts(), getPromotions()])
    const settings = s.success ? (s as any).settings : {}
    return {
        success: true,
        products: p.success ? (p as any).products : [],
        categories: c.success ? (c as any).categories : [],
        settings,
        formFields: f.success ? (f as any).fields : [],
        bankAccounts: b.success ? (b as any).accounts : [],
        promotions: pr.success ? (pr as any).promotions : [],
    }
}
