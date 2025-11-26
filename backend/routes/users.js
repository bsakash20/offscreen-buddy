const express = require('express');
const { supabase } = require('../config/supabase');
// Security Middleware Imports
const { applySecurity, securityHeaders, inputValidation, inputSanitization, csrfProtection } = require('../middleware/security');
const { validateUserRegistration, validateUserLogin, validateIdParam } = require('../middleware/validation');
const { authLimiter, paymentLimiter, sensitiveLimiter, ipLimiter } = require('../middleware/rateLimiter');
const { authenticate, logout } = require('../middleware/auth');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use(ipLimiter);
router.use(authenticate);

// Helper function to calculate onboarding progress
const calculateOnboardingProgress = (user) => {
  let progress = 0;
  if (user.phone_verified) progress += 33;
  if (user.country_code) progress += 33;
  if (user.password_hash || true) progress += 34; // Password handled by Supabase
  return Math.min(progress, 100);
};

// Helper function to determine next onboarding step
const getNextOnboardingStep = (user) => {
  if (!user.phone_verified) return 'verifyPhone';
  if (!user.country_code) return 'selectCountry';
  return null; // Onboarding complete
};

// Get user profile with enhanced onboarding info
router.get('/profile', async (req, res) => {
  try {
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
      .eq('id', req.user.id)
      .single();

    if (profileError) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist'
      });
    }

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
        passwordSet: true // Always true since using Supabase Auth
      },
      progress: calculateOnboardingProgress(userProfile),
      nextStep: getNextOnboardingStep(userProfile),
      country: userProfile.country_code ? {
        code: userProfile.country_code,
        name: userProfile.country_name
      } : null
    };

    res.json({
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
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An unexpected error occurred'
    });
  }
});

// Update user profile with enhanced onboarding fields
router.put('/profile', async (req, res) => {
  try {
    const { deviceId, appVersion, name, phone, countryCode } = req.body;

    const updateFields = {};

    if (deviceId !== undefined) {
      updateFields.device_id = deviceId;
    }

    if (appVersion !== undefined) {
      updateFields.app_version = appVersion;
    }

    if (name !== undefined) {
      updateFields.name = name;
    }

    if (phone !== undefined) {
      // Format phone number
      const formattedPhone = phone.replace(/[^\d+]/g, '');
      updateFields.phone = formattedPhone;
      updateFields.phone_verified = false; // Reset verification when phone changes
    }

    if (countryCode !== undefined) {
      if (countryCode) {
        // Validate country code
        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('country_code, country_name')
          .eq('country_code', countryCode.toUpperCase())
          .single();

        if (countryError || !countryData) {
          return res.status(400).json({
            error: 'Invalid country code',
            message: 'Please select a valid country from the list'
          });
        }

        updateFields.country_code = countryData.country_code;
        updateFields.country_name = countryData.country_name;
      } else {
        updateFields.country_code = null;
        updateFields.country_name = null;
      }
    }

    updateFields.updated_at = new Date().toISOString();

    if (Object.keys(updateFields).length === 1 && updateFields.updated_at) {
      return res.status(400).json({
        error: 'No fields to update',
        message: 'Provide at least one field to update'
      });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist'
      });
    }

    // Log onboarding event if relevant fields were updated
    if (phone || countryCode) {
      await supabase
        .from('user_onboarding_events')
        .insert({
          user_id: req.user.id,
          event_type: 'profile_updated',
          event_data: {
            updatedFields: Object.keys(updateFields).filter(key =>
              ['phone', 'country_code', 'name'].includes(key)
            ),
            timestamp: new Date().toISOString()
          }
        });
    }

    // Check if onboarding completion status should be updated
    const onboardingComplete = updatedUser.phone_verified &&
      updatedUser.country_code &&
      (updatedUser.password_hash || true);

    if (onboardingComplete !== updatedUser.onboarding_completed) {
      await supabase
        .from('users')
        .update({ onboarding_completed: onboardingComplete })
        .eq('id', req.user.id);
    }

    // Get updated profile with subscription info
    const { data: profileWithSubscription } = await supabase
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
      .eq('id', req.user.id)
      .single();

    const activeSubscription = profileWithSubscription?.user_subscriptions?.find(sub => sub.status === 'active');
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

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      countryCode: updatedUser.country_code,
      countryName: updatedUser.country_name,
      phoneVerified: updatedUser.phone_verified,
      onboardingCompleted: onboardingComplete,
      createdAt: updatedUser.created_at,
      lastActive: updatedUser.last_active,
      deviceId: updatedUser.device_id,
      platform: updatedUser.platform,
      appVersion: updatedUser.app_version,
      subscription,
      onboarding: {
        completed: onboardingComplete,
        steps: {
          phoneVerified: updatedUser.phone_verified,
          countrySelected: !!updatedUser.country_code,
          passwordSet: true
        },
        progress: calculateOnboardingProgress(updatedUser),
        nextStep: getNextOnboardingStep(updatedUser),
        country: updatedUser.country_code ? {
          code: updatedUser.country_code,
          name: updatedUser.country_name
        } : null
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'An unexpected error occurred'
    });
  }
});

// Get user's onboarding events (for debugging/analytics)
router.get('/onboarding-events', async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('user_onboarding_events')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Onboarding events fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch onboarding events'
      });
    }

    res.json({
      events: events || []
    });
  } catch (error) {
    console.error('Get onboarding events error:', error);
    res.status(500).json({
      error: 'Failed to get onboarding events'
    });
  }
});

// Verify phone number (placeholder for SMS verification)
router.post('/verify-phone', async (req, res) => {
  try {
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({
        error: 'Verification code required'
      });
    }

    // In a real implementation, you would verify the SMS code here
    // For now, we'll just mark the phone as verified if they have a phone number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('phone')
      .eq('id', req.user.id)
      .single();

    if (userError || !user.phone) {
      return res.status(400).json({
        error: 'No phone number to verify'
      });
    }

    // Mark phone as verified
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        phone_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Phone verification error:', updateError);
      return res.status(500).json({
        error: 'Phone verification failed'
      });
    }

    // Log verification event
    await supabase
      .from('user_onboarding_events')
      .insert({
        user_id: req.user.id,
        event_type: 'phone_verified',
        event_data: {
          verificationMethod: 'sms',
          verifiedAt: new Date().toISOString()
        }
      });

    // Check if onboarding is now complete
    const onboardingComplete = updatedUser.phone_verified &&
      updatedUser.country_code &&
      (updatedUser.password_hash || true);

    if (onboardingComplete && !updatedUser.onboarding_completed) {
      await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', req.user.id);

      // Log completion event
      await supabase
        .from('user_onboarding_events')
        .insert({
          user_id: req.user.id,
          event_type: 'onboarding_completed',
          event_data: { completedAt: new Date().toISOString() }
        });
    }

    res.json({
      message: 'Phone verified successfully',
      phoneVerified: true,
      onboarding: {
        completed: onboardingComplete,
        steps: {
          phoneVerified: true,
          countrySelected: !!updatedUser.country_code,
          passwordSet: true
        },
        progress: calculateOnboardingProgress(updatedUser),
        nextStep: getNextOnboardingStep(updatedUser)
      }
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      error: 'Phone verification failed',
      message: 'An unexpected error occurred'
    });
  }
});

module.exports = router;