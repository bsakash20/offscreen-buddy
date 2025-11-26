export const errorStorageService = {
    saveError: (error: any) => console.log('[ErrorStorage] Saved:', error),
    getErrors: () => [],
    clearErrors: () => console.log('[ErrorStorage] Cleared'),
};
