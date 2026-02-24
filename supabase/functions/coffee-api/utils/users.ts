import { supabase } from './supabase.ts'

export async function registerOrUpdateUser(data: Record<string, string>) {
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
        return {
            ...mapToCamel(existing),
            displayName: data.displayName,
            pictureUrl: data.pictureUrl || existing.picture_url,
            phone: data.phone || existing.phone,
            email: data.email || existing.email,
            defaultDeliveryMethod: data.deliveryMethod || existing.default_delivery_method,
            defaultCity: data.city || existing.default_city,
            defaultDistrict: data.district || existing.default_district,
            defaultAddress: data.address || existing.default_address,
            defaultStoreId: data.storeId || existing.default_store_id,
            defaultStoreName: data.storeName || existing.default_store_name,
            defaultStoreAddress: data.storeAddress || existing.default_store_address,
        }
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
