// ============================================
// form-renderer.js — 動態表單欄位渲染與收集
// ============================================

import { escapeHtml } from './utils.js';

/**
 * 根據後端回傳的欄位設定，動態渲染表單欄位
 * @param {Array} fields - coffee_form_fields 記錄
 * @param {HTMLElement} container - 要渲染到的容器
 */
export function renderDynamicFields(fields, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!fields || fields.length === 0) return;

    const grid = document.createElement('div');
    grid.className = 'mb-6 grid grid-cols-1 md:grid-cols-2 gap-4';

    fields.forEach(f => {
        const wrapper = document.createElement('div');
        const fieldId = `field-${f.field_key}`;
        const requiredMark = f.required ? ' <span class="text-red-500">*</span>' : '';

        if (f.field_type === 'section_title') {
            // 區塊標題：獨自佔一整列
            wrapper.className = 'md:col-span-2';
            wrapper.innerHTML = `<h2 class="text-lg font-bold mb-2" style="color:var(--primary)">${escapeHtml(f.label)}</h2>`;
            grid.appendChild(wrapper);
            return;
        }

        if (f.field_type === 'textarea') {
            wrapper.className = 'md:col-span-2';
            wrapper.innerHTML = `
                <label class="block font-medium mb-2" style="color:var(--primary)">${escapeHtml(f.label)}${requiredMark}</label>
                <textarea id="${fieldId}" class="input-field resize-none" rows="2" placeholder="${escapeHtml(f.placeholder || '')}" ${f.required ? 'required' : ''}></textarea>
            `;
            grid.appendChild(wrapper);
            return;
        }

        if (f.field_type === 'select') {
            let options = [];
            try { options = JSON.parse(f.options || '[]'); } catch { }
            const optionsHtml = options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
            wrapper.innerHTML = `
                <label class="block font-medium mb-2" style="color:var(--primary)">${escapeHtml(f.label)}${requiredMark}</label>
                <select id="${fieldId}" class="input-field" ${f.required ? 'required' : ''}>
                    <option value="">請選擇</option>
                    ${optionsHtml}
                </select>
            `;
            grid.appendChild(wrapper);
            return;
        }

        if (f.field_type === 'checkbox') {
            wrapper.innerHTML = `
                <label class="flex items-center gap-2 cursor-pointer font-medium" style="color:var(--primary)">
                    <input type="checkbox" id="${fieldId}" class="w-4 h-4">
                    ${escapeHtml(f.label)}
                </label>
            `;
            grid.appendChild(wrapper);
            return;
        }

        // text, email, tel, number 等
        wrapper.innerHTML = `
            <label class="block font-medium mb-2" style="color:var(--primary)">${escapeHtml(f.label)}${requiredMark}</label>
            <input type="${f.field_type || 'text'}" id="${fieldId}" class="input-field" placeholder="${escapeHtml(f.placeholder || '')}" ${f.required ? 'required' : ''}>
        `;
        grid.appendChild(wrapper);
    });

    container.appendChild(grid);
}

/**
 * 收集所有動態欄位的值，同時驗證必填
 * @param {Array} fields - coffee_form_fields 記錄
 * @returns {{ valid: boolean, data: Object, error: string }}
 */
export function collectDynamicFields(fields) {
    const data = {};

    for (const f of (fields || [])) {
        if (f.field_type === 'section_title') continue;

        const fieldId = `field-${f.field_key}`;
        const el = document.getElementById(fieldId);
        if (!el) continue;

        let value;
        if (f.field_type === 'checkbox') {
            value = el.checked ? '是' : '否';
        } else {
            value = el.value.trim();
        }

        // 驗證必填
        if (f.required && !value) {
            return { valid: false, data: {}, error: `請填寫「${f.label.replace(/[📱✉️📝🫘🚚]/g, '').trim()}」` };
        }

        // email 格式驗證
        if (f.field_type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return { valid: false, data: {}, error: `「${f.label.replace(/[📱✉️📝🫘🚚]/g, '').trim()}」格式不正確` };
        }

        data[f.field_key] = value;
    }

    return { valid: true, data, error: '' };
}

/**
 * 套用品牌設定
 * @param {Object} settings
 */
export function applyBranding(settings) {
    // 標題
    const titleEl = document.getElementById('site-title');
    if (titleEl && settings.site_title) titleEl.textContent = settings.site_title;

    // 副標題
    const subtitleEl = document.getElementById('site-subtitle');
    if (subtitleEl && settings.site_subtitle) subtitleEl.textContent = settings.site_subtitle;

    // Header icon
    const iconEl = document.getElementById('site-icon');
    if (iconEl) {
        if (settings.site_icon_url) {
            iconEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = settings.site_icon_url;
            img.alt = 'icon';
            img.className = 'w-10 h-10 rounded-lg object-cover';
            iconEl.appendChild(img);
        } else if (settings.site_icon_emoji) {
            iconEl.textContent = settings.site_icon_emoji;
        }
    }

    // Favicon
    let favicon = document.getElementById('dynamic-favicon');
    if (settings.site_icon_url) {
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.id = 'dynamic-favicon';
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = settings.site_icon_url;
    }

    // Page title
    if (settings.site_title) {
        document.title = settings.site_title;
    }

    // 商品區塊標題
    const productsTitleEl = document.getElementById('products-section-title');
    if (productsTitleEl) {
        if (settings.products_section_title) productsTitleEl.textContent = settings.products_section_title;
        if (settings.products_section_color) productsTitleEl.style.color = settings.products_section_color;
        if (settings.products_section_size) {
            productsTitleEl.classList.remove('text-base', 'text-lg', 'text-xl', 'text-2xl');
            productsTitleEl.classList.add(settings.products_section_size);
        }
        if (settings.products_section_bold) {
            productsTitleEl.classList.toggle('font-bold', String(settings.products_section_bold) !== 'false');
        }
    }

    // 配送區塊標題
    const deliveryTitleEl = document.getElementById('delivery-section-title');
    if (deliveryTitleEl) {
        if (settings.delivery_section_title) deliveryTitleEl.textContent = settings.delivery_section_title;
        if (settings.delivery_section_color) deliveryTitleEl.style.color = settings.delivery_section_color;
        if (settings.delivery_section_size) {
            deliveryTitleEl.classList.remove('text-base', 'text-lg', 'text-xl', 'text-2xl');
            deliveryTitleEl.classList.add(settings.delivery_section_size);
        }
        if (settings.delivery_section_bold) {
            deliveryTitleEl.classList.toggle('font-bold', String(settings.delivery_section_bold) !== 'false');
        }
    }

    // 備註區塊標題
    const notesTitleEl = document.getElementById('notes-section-title');
    if (notesTitleEl) {
        if (settings.notes_section_title) notesTitleEl.textContent = settings.notes_section_title;
        if (settings.notes_section_color) notesTitleEl.style.color = settings.notes_section_color;
        if (settings.notes_section_size) {
            notesTitleEl.classList.remove('text-base', 'text-lg', 'text-xl', 'text-2xl');
            notesTitleEl.classList.add(settings.notes_section_size);
        }
        if (settings.notes_section_bold) {
            notesTitleEl.classList.toggle('font-bold', String(settings.notes_section_bold) !== 'false');
        }
    }
}
