import api from '../api/api';

export const updateUserLanguage = async (language: string) => {
    try {
        const response = await api.patch('/users/me/language', { language });
        console.log('Language updated successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Failed to update user language on backend', error);
        throw error;
    }
};

export const translateContent = async (sourceType: string, sourceId: string, targetLanguage: string) => {
    try {
        const response = await api.post('/translate', { sourceType, sourceId, targetLanguage });
        return response.data;
    } catch (error) {
        console.error('Translation failed', error);
        return null;
    }
};
