/** Serverdan kelgan javob himoyasi: eski server yoki migratsiya qo'llanmagan bazada maydon yo'q bo'lishi mumkin — oyna yiqilmasin. Sof hisob. */
export const listOf = <T>(value: unknown): readonly T[] => (Array.isArray(value) ? (value as T[]) : []);
