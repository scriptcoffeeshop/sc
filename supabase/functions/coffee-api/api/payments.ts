import { supabase } from '../utils/supabase.ts'
import { requireAuth, requireAdmin } from '../utils/auth.ts'
import { requestLinePayAPI } from '../utils/linepay.ts'

export async function linePayConfirm(data: Record<string, unknown>) {
    const transactionId = String(data.transactionId)
    const orderId = String(data.orderId)
    const amount = parseInt(String(data.amount))

    if (!transactionId || !orderId || !amount) {
        return { success: false, error: '缺少必要參數' }
    }

    try {
        const confirmRes = await requestLinePayAPI('POST', `/v3/payments/${transactionId}/confirm`, {
            amount,
            currency: 'TWD',
        })

        if (confirmRes.returnCode === '0000') {
            await supabase.from('coffee_orders').update({ payment_status: 'paid' }).eq('id', orderId)
            return { success: true, message: '付款已確認', orderId }
        } else {
            return { success: false, error: `付款確認失敗: ${confirmRes.returnMessage || confirmRes.returnCode}`, orderId }
        }
    } catch (e) {
        return { success: false, error: 'LINE Pay 確認 API 調用失敗: ' + String(e), orderId }
    }
}

export async function linePayCancel(data: Record<string, unknown>, req: Request) {
    const user = await requireAuth(req)
    const orderId = String(data.orderId || '')
    if (!orderId) return { success: false, error: '缺少訂單編號' }

    const { data: order } = await supabase.from('coffee_orders').select('payment_status, line_user_id').eq('id', orderId).maybeSingle()
    if (order && order.payment_status === 'pending') {
        if (order.line_user_id !== user.userId && !user.isAdmin) {
            return { success: false, error: '無權限取消此訂單' }
        }
        await supabase.from('coffee_orders').update({ payment_status: 'cancelled' }).eq('id', orderId)
    }
    return { success: true, message: '付款已取消', orderId }
}

export async function linePayRefund(data: Record<string, unknown>, req: Request) {
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

export async function updateTransferInfo(data: Record<string, unknown>, req: Request) {
    const auth = await requireAuth(req)
    const orderId = String(data.orderId || '')
    const last5 = String(data.last5 || '').trim()
    if (!orderId) return { success: false, error: '缺少訂單編號' }
    if (!last5 || last5.length !== 5 || !/^\d{5}$/.test(last5)) return { success: false, error: '請輸入正確的5位數字帳號末碼' }

    const { data: order } = await supabase.from('coffee_orders').select('line_user_id, payment_method').eq('id', orderId).maybeSingle()
    if (!order) return { success: false, error: '找不到訂單' }
    if (order.line_user_id !== auth.userId) return { success: false, error: '無權操作此訂單' }
    if (order.payment_method !== 'transfer') return { success: false, error: '此訂單非線上轉帳付款' }

    const { error } = await supabase.from('coffee_orders').update({ transfer_account_last5: last5 }).eq('id', orderId)
    if (error) return { success: false, error: error.message }
    return { success: true, message: '匯款資訊已更新' }
}
