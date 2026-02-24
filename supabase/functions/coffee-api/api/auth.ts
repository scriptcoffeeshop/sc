import { supabase } from '../utils/supabase.ts'
import { signJwt } from '../utils/auth.ts'
import { LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET, LINE_ADMIN_USER_ID } from '../utils/config.ts'

export function getLineLoginUrl(redirectUri: string) {
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

import { registerOrUpdateUser } from '../utils/users.ts'

export async function customerLineLogin(code: string, redirectUri: string) {
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

export async function handleAdminLogin(code: string, redirectUri: string) {
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

