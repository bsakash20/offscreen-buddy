const express = require('express');
const UserService = require('../services/UserService');

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

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userProfile = await UserService.getUserProfile(req.user.id);
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found', message: 'User profile does not exist' });
    }
    res.json(userProfile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', message: 'An unexpected error occurred' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const updatedProfile = await UserService.updateUserProfile(req.user.id, req.body);
    if (updatedProfile === null) {
      // Logic for "no fields to update" could be handled here or inside service, 
      // but service returning null for no-op is a reasonable contract or we catch specific error.
      // In the original code, it returned 400. 
      // Let's assume if service throws 'No updates' we catch it, or if it returns null we handle it.
      // For now, if req.body is empty, we can check here to save a call.
    }
    res.json(updatedProfile);
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.message === 'Invalid country code') {
      return res.status(400).json({ error: 'Invalid country code', message: 'Please select a valid country from the list' });
    }
    res.status(500).json({ error: 'Failed to update profile', message: 'An unexpected error occurred' });
  }
});

// Get user's onboarding events
router.get('/onboarding-events', async (req, res) => {
  try {
    const events = await UserService.getUserOnboardingEvents(req.user.id);
    res.json({ events });
  } catch (error) {
    console.error('Get onboarding events error:', error);
    res.status(500).json({ error: 'Failed to get onboarding events' });
  }
});

// Verify phone number
router.post('/verify-phone', async (req, res) => {
  try {
    const result = await UserService.verifyUserPhone(req.user.id, req.body.verificationCode);
    res.json({
      message: 'Phone verified successfully',
      phoneVerified: true,
      onboarding: result.onboarding
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    if (error.message === 'Verification code required' || error.message === 'No phone number to verify') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Phone verification failed', message: 'An unexpected error occurred' });
  }
});

module.exports = router;