const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'offscreen_buddy-dev-secret-key';
    }

    generateToken(userId) {
        return jwt.sign(
            { userId },
            this.jwtSecret,
            { expiresIn: '7d' }
        );
    }

    calculateOnboardingProgress(user) {
        let progress = 0;
        if (user.phone_verified) progress += 33;
        if (user.country_code) progress += 33;
        if (user.password_hash || true) progress += 34; // Password handled by Supabase
        return Math.min(progress, 100);
    }

    getNextOnboardingStep(user) {
        if (!user.phone_verified) return 'verifyPhone';
        if (!user.country_code) return 'selectCountry';
        return null; // Onboarding complete
    }

    async getCountries() {
        const { data: countries, error } = await supabase
            .from('countries')
            .select('country_code, country_name, phone_code, currency_code, currency_symbol')
            .eq('is_active', true)
            .order('country_name');

        if (error) {
            // Fallback for missing table in dev
            if (error.code === 'PGRST205') return null; // Signal controller to use mock
            throw error;
        }
        return countries;
    }

    async registerUser({ email, password, name, phone, countryCode, deviceId, userAgent, ip }, options = {}) {
        const isLocalDevelopment = (process.env.NODE_ENV || 'local') === 'local';

        // Country and Phone validation logic (simplified for service, assumed pre-validated/sanitized)
        let countryInfo = null;
        if (countryCode) {
            const { data: countryData } = await supabase
                .from('countries')
                .select('country_code, country_name, phone_code')
                .eq('country_code', countryCode)
                .eq('is_active', true)
                .single();
            countryInfo = countryData;
        }

        const { data: authUser, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailConfirm: !isLocalDevelopment,
                data: {
                    name,
                    phone,
                    country_code: countryCode,
                    country_name: countryInfo?.country_name,
                    platform: userAgent || 'unknown',
                    app_version: '1.0.0'
                }
            }
        });

        if (isLocalDevelopment && authUser && authUser.user && !authUser.user.email_confirmed_at) {
            // Auto-confirm for local dev
            await supabase.auth.admin.updateUserById(authUser.user.id, {
                email_confirm: true,
                user_metadata: { ...authUser.user.user_metadata, email_manually_confirmed: true, local_development: true }
            });
            // Refresh user
            const { data: updated } = await supabase.auth.admin.getUserById(authUser.user.id);
            if (updated?.user) authUser.user = { ...authUser.user, ...updated.user };
        }

        if (authError) throw authError;
        if (!authUser.user) throw new Error('Registration failed: No user returned');

        const userId = authUser.user.id;

        // Create Profile
        const userProfile = {
            id: userId,
            email,
            name,
            phone,
            country_code: countryCode,
            country_name: countryInfo?.country_name,
            phone_verified: false,
            onboarding_completed: false,
            device_id: deviceId || null,
            platform: userAgent || 'unknown',
            app_version: '1.0.0',
            created_at: new Date().toISOString()
        };

        const { error: userError } = await supabase.from('users').insert(userProfile);
        if (userError) throw new Error(`Profile creation failed: ${userError.message}`);

        // Create Subscription (Free)
        const { data: freePlans } = await supabase.from('subscription_plans').select('*').eq('tier', 'free').limit(1);
        if (freePlans?.length > 0) {
            await supabase.from('user_subscriptions').insert({
                user_id: userId,
                plan_id: freePlans[0].id,
                status: 'active',
                starts_at: new Date().toISOString(),
                payment_provider: 'none'
            });
        }

        // Default Settings & Analytics
        await supabase.from('user_settings').insert({ user_id: userId });
        await supabase.from('user_analytics').insert({ user_id: userId });

        // Log Onboarding Event
        await supabase.from('user_onboarding_events').insert({
            user_id: userId,
            event_type: 'user_registered',
            event_data: {
                countryCode,
                countryName: countryInfo?.country_name,
                hasPhone: !!phone,
                registrationMethod: 'enhanced_api',
                ip
            }
        });

        return {
            user: {
                id: userId,
                email,
                name,
                phone,
                countryCode,
                countryName: countryInfo?.country_name,
                phoneVerified: false,
                onboardingCompleted: false,
                createdAt: new Date().toISOString(),
                deviceId
            },
            token: authUser.session?.access_token,
            session: authUser.session,
            onboarding: {
                progress: countryInfo ? 66 : 33, // Simple logic
                nextStep: !countryInfo ? 'selectCountry' : 'verifyPhone'
            }
        };
    }

    async loginUser(identifier, password, mfaCode = null) {
        // Check if user exists first (for better error messages)
        const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id, email, is_active')
            .eq('email', identifier)
            .single();

        if (!existingUser) {
            const error = new Error('User not found');
            error.code = 'user_not_found';
            throw error;
        }
        if (existingUser.is_active === false) {
            const error = new Error('Account disabled');
            error.code = 'account_disabled';
            throw error;
        }

        // Supabase Auth Login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: identifier,
            password: password
        });

        if (authError || !authData.user) {
            throw authError || new Error('Authentication failed');
        }

        const userId = authData.user.id;

        // MFA Check
        const MfaService = require('./MfaService');
        const mfaStatus = await MfaService.validateLoginMfa(userId, mfaCode);

        if (mfaStatus.required) {
            if (!mfaStatus.valid) {
                if (mfaCode) {
                    const error = new Error('Invalid MFA code');
                    error.code = 'invalid_mfa';
                    throw error;
                } else {
                    // MFA is required but no code provided
                    // Return restricted response indicating MFA requirement
                    return {
                        mfaRequired: true,
                        user: {
                            id: userId,
                            email: existingUser.email
                        }
                        // No token/session returned
                    };
                }
            }
        }

        // Fetch Full Profile
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select(`
        *,
        user_subscriptions (
          *,
          subscription_plans (tier, features, price_monthly, price_yearly)
        )
      `)
            .eq('id', userId)
            .single();

        if (profileError) throw new Error(`Profile fetch failed: ${profileError.message}`);

        // Update activity
        await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', userId);

        // Process Subscription
        const activeSubscription = userProfile.user_subscriptions?.find(sub => sub.status === 'active');
        const subscription = activeSubscription ? {
            tier: activeSubscription.subscription_plans?.tier || 'free',
            status: activeSubscription.status,
            features: activeSubscription.subscription_plans?.features || [],
            expiresAt: activeSubscription.expires_at,
            autoRenew: activeSubscription.auto_renew
        } : { tier: 'free', status: 'active', features: [] };

        return {
            mfaRequired: false,
            user: {
                id: userId,
                email: userProfile.email,
                name: userProfile.name,
                phone: userProfile.phone,
                countryCode: userProfile.country_code,
                countryName: userProfile.country_name,
                phoneVerified: userProfile.phone_verified,
                onboardingCompleted: userProfile.onboarding_completed,
                lastActive: new Date().toISOString(),
                createdAt: userProfile.created_at
            },
            token: authData.session.access_token,
            session: authData.session,
            subscription,
            onboarding: {
                completed: userProfile.onboarding_completed,
                steps: {
                    phoneVerified: userProfile.phone_verified,
                    countrySelected: !!userProfile.country_code,
                    passwordSet: true
                },
                progress: this.calculateOnboardingProgress(userProfile),
                nextStep: this.getNextOnboardingStep(userProfile)
            }
        };
    }

    async logout(token) {
        if (!token) return;
        // Stateless logout mainly invalidates session on client, but we can try admin signOut
        return true;
    }

    async getUserProfile(userId) {
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select(`
        *,
        user_subscriptions (
          *,
          subscription_plans (tier, features, price_monthly, price_yearly)
        )
      `)
            .eq('id', userId)
            .single();

        if (profileError || !userProfile) {
            throw new Error('User profile not found');
        }

        const activeSubscription = userProfile.user_subscriptions?.find(sub => sub.status === 'active');
        const subscription = activeSubscription ? {
            tier: activeSubscription.subscription_plans?.tier || 'free',
            status: activeSubscription.status,
            features: activeSubscription.subscription_plans?.features || [],
            expiresAt: activeSubscription.expires_at,
            autoRenew: activeSubscription.auto_renew
        } : { tier: 'free', status: 'active', features: [] };

        return {
            user: {
                id: userId,
                email: userProfile.email,
                name: userProfile.name,
                phone: userProfile.phone,
                countryCode: userProfile.country_code,
                countryName: userProfile.country_name,
                phoneVerified: userProfile.phone_verified,
                onboardingCompleted: userProfile.onboarding_completed,
                lastActive: userProfile.last_active,
                createdAt: userProfile.created_at
            },
            subscription,
            onboarding: {
                completed: userProfile.onboarding_completed,
                steps: {
                    phoneVerified: userProfile.phone_verified,
                    countrySelected: !!userProfile.country_code,
                    passwordSet: true
                },
                progress: this.calculateOnboardingProgress(userProfile),
                nextStep: this.getNextOnboardingStep(userProfile)
            }
        };
    }

    async completeOnboardingStep(userId, step, data) {
        let updateFields = {};
        let eventType = '';

        switch (step) {
            case 'country':
                if (!data.countryCode) throw new Error('Country code required');
                const { data: countryData } = await supabase
                    .from('countries')
                    .select('country_code, country_name')
                    .eq('country_code', data.countryCode.toUpperCase())
                    .single();
                if (!countryData) throw new Error('Invalid country code');

                updateFields = { country_code: countryData.country_code, country_name: countryData.country_name };
                eventType = 'country_selected';
                break;

            case 'phone':
                if (!data.phone) throw new Error('Phone number required');
                updateFields = { phone: data.phone.replace(/[^\d+]/g, ''), phone_verified: true };
                eventType = 'phone_verified';
                break;

            case 'password':
                // Supabase handles password
                updateFields = { updated_at: new Date().toISOString() };
                eventType = 'password_set';
                break;

            default:
                throw new Error('Invalid step');
        }

        updateFields.updated_at = new Date().toISOString();

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateFields)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        await supabase.from('user_onboarding_events').insert({
            user_id: userId,
            event_type: eventType,
            event_data: data || {}
        });

        // Check completion
        const isComplete = updatedUser.phone_verified && updatedUser.country_code;
        if (isComplete && !updatedUser.onboarding_completed) {
            await supabase.from('users').update({ onboarding_completed: true }).eq('id', userId);
            await supabase.from('user_onboarding_events').insert({
                user_id: userId,
                event_type: 'onboarding_completed',
                event_data: { completedAt: new Date().toISOString() }
            });
            updatedUser.onboarding_completed = true;
        }

        return {
            step,
            onboarding: {
                completed: updatedUser.onboarding_completed,
                steps: {
                    phoneVerified: updatedUser.phone_verified,
                    countrySelected: !!updatedUser.country_code,
                    passwordSet: true
                },
                progress: this.calculateOnboardingProgress(updatedUser),
                nextStep: this.getNextOnboardingStep(updatedUser)
            }
        };
    }
}

module.exports = new AuthService();
