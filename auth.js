const express = require('express');
const router = express.Router();

const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = 'Files.Read offline_access';

const { MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI } = process.env;

router.get('/onedrive', (req, res) => {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MICROSOFT_REDIRECT_URI,
    scope: SCOPES,
    response_mode: 'query',
  });
  res.redirect(`${AUTH_URL}?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?error=auth_failed');

  try {
    const body = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await response.json();
    if (data.access_token) {
      req.session.onedrive_token = data.access_token;
      req.session.save(() => res.redirect('/'));
    } else {
      res.redirect('/?error=auth_failed');
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/?error=auth_failed');
  }
});

module.exports = router;
