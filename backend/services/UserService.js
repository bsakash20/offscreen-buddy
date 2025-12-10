const { supabase } = require('../config/supabase');

class UserService {

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

    async getUserProfile(userId) {
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select(`
        *,
        user_subscriptions (
          *,
          subscription_plans (
            tier,
            features,
            price_monthly,
            price_yearly
          )
        )
      `)
            .eq('id', userId)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') return null; // Not found
            throw new Error(`Failed to fetch profile: ${profileError.message}`);
        }
        if (!userProfile) return null;

        // Extract subscription info
        const activeSubscription = userProfile.user_subscriptions?.find(sub => sub.status === 'active');
        const subscription = activeSubscription ? {
            tier: activeSubscription.subscription_plans?.tier || 'free',
            status: activeSubscription.status,
            features: activeSubscription.subscription_plans?.features || [],
            priceMonthly: activeSubscription.subscription_plans?.price_monthly,
            priceYearly: activeSubscription.subscription_plans?.price_yearly,
            expiresAt: activeSubscription.expires_at,
            autoRenew: activeSubscription.auto_renew
        } : {
            tier: 'free',
            status: 'active',
            features: []
        };

        const onboardingStatus = {
            completed: userProfile.onboarding_completed,
            steps: {
                phoneVerified: userProfile.phone_verified,
                countrySelected: !!userProfile.country_code,
                passwordSet: true
            },
            progress: this.calculateOnboardingProgress(userProfile),
            nextStep: this.getNextOnboardingStep(userProfile),
            country: userProfile.country_code ? {
                code: userProfile.country_code,
                name: userProfile.country_name
            } : null
        };

        return {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            phone: userProfile.phone,
            countryCode: userProfile.country_code,
            countryName: userProfile.country_name,
            phoneVerified: userProfile.phone_verified,
            onboardingCompleted: userProfile.onboarding_completed,
            createdAt: userProfile.created_at,
            lastActive: userProfile.last_active,
            deviceId: userProfile.device_id,
            platform: userProfile.platform,
            appVersion: userProfile.app_version,
            subscription,
            onboarding: onboardingStatus
        };
    }

    async updateUserProfile(userId, updates) {
        const { deviceId, appVersion, name, phone, countryCode } = updates;
        const updateFields = {};

        if (deviceId !== undefined) updateFields.device_id = deviceId;
        if (appVersion !== undefined) updateFields.app_version = appVersion;
        if (name !== undefined) updateFields.name = name;

        // Logic extraction from routes/users.js
        if (phone !== undefined) {
            const formattedPhone = phone.replace(/[^\d+]/g, '');
            updateFields.phone = formattedPhone;
            updateFields.phone_verified = false;
        }

        if (countryCode !== undefined) {
            if (countryCode) {
                const { data: countryData, error: countryError } = await supabase
                    .from('countries')
                    .select('country_code, country_name')
                    .eq('country_code', countryCode.toUpperCase())
                    .single();

                if (countryError || !countryData) throw new Error('Invalid country code');

                updateFields.country_code = countryData.country_code;
                updateFields.country_name = countryData.country_name;
            } else {
                updateFields.country_code = null;
                updateFields.country_name = null;
            }
        }

        updateFields.updated_at = new Date().toISOString();

        if (Object.keys(updateFields).length === 1 && updateFields.updated_at) {
            return null; // No updates
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateFields)
            .eq('id', userId)
            .select('*')
            .single();

        if (updateError) throw updateError;

        // Log Onboarding Events
        if (phone || countryCode) {
            await supabase.from('user_onboarding_events').insert({
                user_id: userId,
                event_type: 'profile_updated',
                event_data: {
                    updatedFields: Object.keys(updateFields).filter(key => ['phone', 'country_code', 'name'].includes(key)),
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check Onboarding Completion
        const onboardingComplete = updatedUser.phone_verified && updatedUser.country_code;

        if (onboardingComplete !== updatedUser.onboarding_completed) {
            await supabase.from('users').update({ onboarding_completed: onboardingComplete }).eq('id', userId);
            updatedUser.onboarding_completed = onboardingComplete; // Reflect in return
        }

        // Return full profile using getProfile to ensure consistency
        return this.getUserProfile(userId);
    }

    async verifyUserPhone(userId, verificationCode) {
        if (!verificationCode) throw new Error('Verification code required');

        // Placeholder for real SMS verification
        const { data: user, error } = await supabase.from('users').select('phone').eq('id', userId).single();
        if (error || !user.phone) throw new Error('No phone number to verify');

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ phone_verified: true, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select('*')
            .single();

        if (updateError) throw updateError;

        await supabase.from('user_onboarding_events').insert({
            user_id: userId,
            event_type: 'phone_verified',
            event_data: { verificationMethod: 'sms', verifiedAt: new Date().toISOString() }
        });

        // Check Completion
        const onboardingComplete = updatedUser.phone_verified && updatedUser.country_code;
        if (onboardingComplete && !updatedUser.onboarding_completed) {
            await supabase.from('users').update({ onboarding_completed: true }).eq('id', userId);

            await supabase.from('user_onboarding_events').insert({
                user_id: userId,
                event_type: 'onboarding_completed',
                event_data: { completedAt: new Date().toISOString() }
            });
        }

        return this.getUserProfile(userId);
    }

    async getUserOnboardingEvents(userId) {
        const { data: events, error } = await supabase
            .from('user_onboarding_events')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return events || [];
    }
}

module.exports = new UserService();
