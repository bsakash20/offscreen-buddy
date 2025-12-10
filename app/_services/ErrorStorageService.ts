export const errorStorageService = {
    saveError: (error: any, options?: any) => console.log('[ErrorStorage] Saved:', error, options),
    getErrors: () => [],
    clearErrors: () => console.log('[ErrorStorage] Cleared'),
};
