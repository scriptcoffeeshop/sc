export function escapeHtml(text: string) {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }
    return String(text).replace(/[&<>"']/g, function (m) { return map[m] })
}

export function sanitize(str: unknown): string {
    if (!str) return ''
    return escapeHtml(String(str)).trim()
}
