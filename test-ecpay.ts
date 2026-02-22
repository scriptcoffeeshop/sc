import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"

const ECPAY_HASH_KEY = '5294y06JbISpM5x9'
const ECPAY_HASH_IV = 'v77hoKGq4kWxNNIS'
const ECPAY_MERCHANT_ID = '2000132'

async function generateCheckMacValue(params: Record<string, string>): Promise<string> {
    const sorted = Object.keys(params)
        .filter(k => k !== 'CheckMacValue')
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    const paramStr = sorted.map(k => `${k}=${params[k]}`).join('&')
    const raw = `HashKey=${ECPAY_HASH_KEY}&${paramStr}&HashIV=${ECPAY_HASH_IV}`
    let encoded = encodeURIComponent(raw)
    encoded = encoded.replace(/%20/g, '+').replace(/%2d/gi, '-').replace(/%5f/gi, '_').replace(/%2e/gi, '.').replace(/%21/g, '!').replace(/%2a/g, '*').replace(/%28/g, '(').replace(/%29/g, ')')
    encoded = encoded.toLowerCase()
    
    // Use Web Crypto API from Deno
    const msgBuffer = new TextEncoder().encode(encoded)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex.toUpperCase()
}

async function testApi() {
    const params: Record<string, string> = {
        MerchantID: ECPAY_MERCHANT_ID,
        CvsType: 'UNIMART',
    }
    params.CheckMacValue = await generateCheckMacValue(params)

    console.log("Params:", params)

    const res = await fetch('https://logistics-stage.ecpay.com.tw/Helper/GetStoreList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
    })
    console.log(res.status)
    const text = await res.text()
    console.log(text)
}
testApi()
