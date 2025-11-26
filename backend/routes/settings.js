const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
// Security Middleware Imports
const { securityHeaders, inputSanitization } = require('../middleware/security');
const { ipLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use(ipLimiter);
router.use(authenticate);

// Get user settings
router.get('/', async (req, res) => {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Get settings error:', settingsError);
      return res.status(500).json({
        error: 'Failed to get settings',
        message: 'An unexpected error occurred'
      });
    }

    if (!settings) {
      // Create default settings if none exist
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert({
          user_id: req.user.id,
          timer_lock_enabled: false,
          smart_notifications_enabled: false,
          notification_frequency: 30,
          funny_mode: true,
          theme: 'dark'
        })
        .select()
        .single();

      if (createError) {
        console.error('Create default settings error:', createError);
        return res.status(500).json({
          error: 'Failed to create default settings',
          message: 'An unexpected error occurred'
        });
      }

      return res.json(newSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to get settings',
      message: 'An unexpected error occurred'
    });
  }
});

// Update user settings
router.put('/', [
  body('timerLockEnabled').optional().isBoolean(),
  body('smartNotificationsEnabled').optional().isBoolean(),
  body('notificationFrequency').optional().isInt({ min: 5, max: 300 }),
  body('funnyMode').optional().isBoolean(),
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('emergencyOverridePin').optional().isString().isLength({ min: 4, max: 10 }),
  body('customPresets').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      timerLockEnabled,
      smartNotificationsEnabled,
      notificationFrequency,
      funnyMode,
      theme,
      emergencyOverridePin,
      customPresets
    } = req.body;

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (timerLockEnabled !== undefined) updateData.timer_lock_enabled = timerLockEnabled;
    if (smartNotificationsEnabled !== undefined) updateData.smart_notifications_enabled = smartNotificationsEnabled;
    if (notificationFrequency !== undefined) updateData.notification_frequency = notificationFrequency;
    if (funnyMode !== undefined) updateData.funny_mode = funnyMode;
    if (theme !== undefined) updateData.theme = theme;
    if (emergencyOverridePin !== undefined) updateData.emergency_override_pin = emergencyOverridePin;
    if (customPresets !== undefined) updateData.custom_presets = JSON.stringify(customPresets);

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return res.status(400).json({
        error: 'No fields to update',
        message: 'Provide at least one field to update'
      });
    }

    const { data: updatedSettings, error: updateError } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update settings error:', updateError);
      return res.status(404).json({
        error: 'Settings not found',
        message: 'User settings do not exist'
      });
    }

    res.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: 'An unexpected error occurred'
    });
  }
});

// Reset settings to defaults
router.post('/reset', async (req, res) => {
  try {
    const resetData = {
      timer_lock_enabled: false,
      smart_notifications_enabled: false,
      notification_frequency: 30,
      funny_mode: true,
      theme: 'dark',
      emergency_override_pin: null,
      custom_presets: '[]',
      updated_at: new Date().toISOString()
    };

    const { data: resetSettings, error: resetError } = await supabase
      .from('user_settings')
      .update(resetData)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (resetError) {
      console.error('Reset settings error:', resetError);
      return res.status(404).json({
        error: 'Settings not found',
        message: 'User settings do not exist'
      });
    }

    res.json({
      message: 'Settings reset to defaults successfully',
      settings: resetSettings
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      error: 'Failed to reset settings',
      message: 'An unexpected error occurred'
    });
  }
});

module.exports = router;
