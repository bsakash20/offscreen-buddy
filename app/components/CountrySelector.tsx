import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../assets/constants/colors';

interface Country {
    country_code: string;
    country_name: string;
    phone_code: string;
    currency_code: string;
    currency_symbol: string;
}

interface CountrySelectorProps {
    selectedCountry: Country | null;
    onCountrySelect: (country: Country) => void;
    isVisible: boolean;
    onClose: () => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function CountrySelector({
    selectedCountry,
    onCountrySelect,
    isVisible,
    onClose,
    placeholder = "Select Country",
    disabled = false,
}: CountrySelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch countries from backend
    const fetchCountries = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Get API base URL from environment or config
            // In development, use local IP for tunnel mode, localhost for local development
            const API_BASE_URL = Platform.OS === 'android'
                ? 'http://10.0.2.2:3001/api'
                : 'http://localhost:3001/api';

            const response = await fetch(`${API_BASE_URL}/auth/countries`);

            if (!response.ok) {
                throw new Error('Failed to fetch countries');
            }

            const data = await response.json();
            setCountries(data.countries || []);
        } catch (error: any) {
            console.error('Failed to fetch countries:', error);
            setError('Failed to load countries. Please try again.');

            // Fallback to static data if backend fails
            setCountries(getStaticCountries());
        } finally {
            setIsLoading(false);
        }
    };

    // Static fallback data
    const getStaticCountries = (): Country[] => [
        { country_code: 'US', country_name: 'United States', phone_code: '+1', currency_code: 'USD', currency_symbol: '$' },
        { country_code: 'GB', country_name: 'United Kingdom', phone_code: '+44', currency_code: 'GBP', currency_symbol: '£' },
        { country_code: 'CA', country_name: 'Canada', phone_code: '+1', currency_code: 'CAD', currency_symbol: 'C$' },
        { country_code: 'IN', country_name: 'India', phone_code: '+91', currency_code: 'INR', currency_symbol: '₹' },
        { country_code: 'DE', country_name: 'Germany', phone_code: '+49', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'FR', country_name: 'France', phone_code: '+33', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'IT', country_name: 'Italy', phone_code: '+39', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'ES', country_name: 'Spain', phone_code: '+34', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'AU', country_name: 'Australia', phone_code: '+61', currency_code: 'AUD', currency_symbol: 'A$' },
        { country_code: 'JP', country_name: 'Japan', phone_code: '+81', currency_code: 'JPY', currency_symbol: '¥' },
        { country_code: 'CN', country_name: 'China', phone_code: '+86', currency_code: 'CNY', currency_symbol: '¥' },
        { country_code: 'BR', country_name: 'Brazil', phone_code: '+55', currency_code: 'BRL', currency_symbol: 'R$' },
        { country_code: 'RU', country_name: 'Russia', phone_code: '+7', currency_code: 'RUB', currency_symbol: '₽' },
        { country_code: 'MX', country_name: 'Mexico', phone_code: '+52', currency_code: 'MXN', currency_symbol: '$' },
        { country_code: 'ZA', country_name: 'South Africa', phone_code: '+27', currency_code: 'ZAR', currency_symbol: 'R' },
        { country_code: 'KR', country_name: 'South Korea', phone_code: '+82', currency_code: 'KRW', currency_symbol: '₩' },
        { country_code: 'SG', country_name: 'Singapore', phone_code: '+65', currency_code: 'SGD', currency_symbol: 'S$' },
        { country_code: 'AE', country_name: 'United Arab Emirates', phone_code: '+971', currency_code: 'AED', currency_symbol: 'د.إ' },
        { country_code: 'SE', country_name: 'Sweden', phone_code: '+46', currency_code: 'SEK', currency_symbol: 'kr' },
        { country_code: 'NO', country_name: 'Norway', phone_code: '+47', currency_code: 'NOK', currency_symbol: 'kr' },
        { country_code: 'DK', country_name: 'Denmark', phone_code: '+45', currency_code: 'DKK', currency_symbol: 'kr' },
        { country_code: 'FI', country_name: 'Finland', phone_code: '+358', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'NL', country_name: 'Netherlands', phone_code: '+31', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'CH', country_name: 'Switzerland', phone_code: '+41', currency_code: 'CHF', currency_symbol: 'CHF' },
        { country_code: 'BE', country_name: 'Belgium', phone_code: '+32', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'AT', country_name: 'Austria', phone_code: '+43', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'IE', country_name: 'Ireland', phone_code: '+353', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'PT', country_name: 'Portugal', phone_code: '+351', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'PL', country_name: 'Poland', phone_code: '+48', currency_code: 'PLN', currency_symbol: 'zł' },
        { country_code: 'TR', country_name: 'Turkey', phone_code: '+90', currency_code: 'TRY', currency_symbol: '₺' },
    ];

    // Load countries when modal opens
    useEffect(() => {
        if (isVisible && countries.length === 0) {
            fetchCountries();
        }
    }, [isVisible]);

    // Filter countries based on search term
    const filteredCountries = useMemo(() => {
        if (!searchTerm.trim()) {
            return countries;
        }

        const term = searchTerm.toLowerCase().trim();
        return countries.filter(country =>
            country.country_name.toLowerCase().includes(term) ||
            country.country_code.toLowerCase().includes(term) ||
            country.phone_code.includes(term)
        );
    }, [searchTerm, countries]);

    // Handle country selection
    const handleCountrySelect = (country: Country) => {
        onCountrySelect(country);
        onClose();
        setSearchTerm('');
    };

    // Render country item
    const renderCountryItem = ({ item }: { item: Country }) => (
        <TouchableOpacity
            style={[
                styles.countryItem,
                selectedCountry?.country_code === item.country_code && styles.selectedCountryItem
            ]}
            onPress={() => handleCountrySelect(item)}
        >
            <View style={styles.countryFlag}>
                <Text style={styles.flagEmoji}>
                    {getCountryFlag(item.country_code)}
                </Text>
            </View>
            <View style={styles.countryInfo}>
                <Text style={styles.countryName}>{item.country_name}</Text>
                <Text style={styles.countryCode}>{item.phone_code}</Text>
            </View>
            {selectedCountry?.country_code === item.country_code && (
                <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.dark.success}
                    style={styles.checkIcon}
                />
            )}
        </TouchableOpacity>
    );

    // Get country flag emoji
    const getCountryFlag = (countryCode: string): string => {
        const flags: { [key: string]: string } = {
            'US': '🇺🇸',
            'GB': '🇬🇧',
            'CA': '🇨🇦',
            'IN': '🇮🇳',
            'DE': '🇩🇪',
            'FR': '🇫🇷',
            'IT': '🇮🇹',
            'ES': '🇪🇸',
            'AU': '🇦🇺',
            'JP': '🇯🇵',
            'CN': '🇨🇳',
            'BR': '🇧🇷',
            'RU': '🇷🇺',
            'MX': '🇲🇽',
            'ZA': '🇿🇦',
            'KR': '🇰🇷',
            'SG': '🇸🇬',
            'AE': '🇦🇪',
            'SE': '🇸🇪',
            'NO': '🇳🇴',
            'DK': '🇩🇰',
            'FI': '🇫🇮',
            'NL': '🇳🇱',
            'CH': '🇨🇭',
            'BE': '🇧🇪',
            'AT': '🇦🇹',
            'IE': '🇮🇪',
            'PT': '🇵🇹',
            'PL': '🇵🇱',
            'TR': '🇹🇷',
        };
        return flags[countryCode] || '🏳️';
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={Colors.dark.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Select Country</Text>
                    <View style={styles.placeholderView} />
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={Colors.dark.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search countries..."
                        placeholderTextColor={Colors.dark.textSecondary}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Selected Country Display */}
                {selectedCountry && (
                    <View style={styles.selectedContainer}>
                        <Text style={styles.selectedLabel}>Selected:</Text>
                        <View style={styles.selectedCountry}>
                            <Text style={styles.flagEmoji}>
                                {getCountryFlag(selectedCountry.country_code)}
                            </Text>
                            <Text style={styles.selectedCountryName}>
                                {selectedCountry.country_name}
                            </Text>
                            <Text style={styles.selectedCountryCode}>
                                {selectedCountry.phone_code}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Countries List */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.dark.primary} />
                        <Text style={styles.loadingText}>Loading countries...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={48} color={Colors.dark.error} />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={fetchCountries}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredCountries}
                        renderItem={renderCountryItem}
                        keyExtractor={(item) => item.country_code}
                        style={styles.countryList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search" size={48} color={Colors.dark.textSecondary} />
                                <Text style={styles.emptyText}>
                                    {searchTerm ? 'No countries found' : 'No countries available'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
    },
    closeButton: {
        padding: 8,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.dark.text,
        textAlign: 'center',
    },
    placeholderView: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.surface,
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: Colors.dark.text,
    },
    selectedContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    selectedLabel: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        marginBottom: 8,
    },
    selectedCountry: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    selectedCountryName: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    selectedCountryCode: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    countryList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
    },
    selectedCountryItem: {
        backgroundColor: Colors.dark.surface,
        marginHorizontal: -16,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    countryFlag: {
        width: 32,
        alignItems: 'center',
    },
    flagEmoji: {
        fontSize: 20,
    },
    countryInfo: {
        flex: 1,
        marginLeft: 12,
    },
    countryName: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.dark.text,
    },
    countryCode: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        marginTop: 2,
    },
    checkIcon: {
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: Colors.dark.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: Colors.dark.error,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Colors.dark.primary,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
    },
});