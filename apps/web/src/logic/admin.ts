/** Egasi-admin (server `owner` deb qaytaradi: rol + ADMIN_TELEGRAM_ID): hamma narsa doim ochiq, tanga yechilmaydi. Tekshiruv serverda. */
interface OwnerLike { readonly owner?: boolean }
export const isOwnerAdmin = (p: OwnerLike | null | undefined): boolean => p?.owner === true;
