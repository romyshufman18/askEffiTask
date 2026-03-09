# OneDrive Auth – Bugs & Fixes Log

**Feature:** OneDrive OAuth integration
**Date:** 2026-03-09

---

## Bug 1 – `unauthorized_client` error on login

**Symptom:**
Microsoft redirected to `login.live.com` and returned:
`unauthorized_client: The client does not exist or is not enabled for consumers`

**Root cause:**
The Azure App Registration "Supported account types" was set to **"My organization only" (single tenant)**, but the user tried to log in with a personal Microsoft account (Outlook/Hotmail), which uses `login.live.com`.

**Fix:**
In Azure Portal → App Registration → Authentication → change "Supported account types" to:
**"Any Entra ID Tenant + Personal Microsoft accounts"**

---

## Bug 2 – `api.requestedAccessTokenVersion is invalid` when saving account type change

**Symptom:**
Saving the account type change in Azure failed with:
`Property api.requestedAccessTokenVersion is invalid`

**Root cause:**
The app was configured to use v1 access tokens, which is incompatible with personal Microsoft accounts. The manifest field `accessTokenAcceptedVersion` was `null` (defaults to v1).

**Fix:**
In Azure Portal → App Registration → Manifest, change:
```json
"accessTokenAcceptedVersion": null
```
to:
```json
"accessTokenAcceptedVersion": 2
```
Save the manifest, then retry changing the account type.

---

## Bug 3 – OneDrive status showed "not connected" after successful login

**Symptom:**
User completed Microsoft login and was redirected back, but the status bar still showed "not connected".

**Root cause:**
`express-session` does not guarantee the session is persisted to the store before a `res.redirect()` completes. The token was set in `req.session` but the redirect fired before it was saved.

**Fix:**
In `auth.js`, call `req.session.save()` before redirecting:
```js
// Before fix
req.session.onedrive_token = data.access_token;
res.redirect('/');

// After fix
req.session.onedrive_token = data.access_token;
req.session.save(() => res.redirect('/'));
```

---

## Bug 4 – `invalid_client: AADSTS7000215` — Invalid client secret

**Symptom:**
Server logged:
`AADSTS7000215: Invalid client secret provided`

**Root cause:**
The `.env` file had the **Secret ID** (a UUID) instead of the **Secret Value** (the actual credential string). Azure shows both in the Certificates & secrets page and they look similar.

**Fix:**
In Azure Portal → Certificates & secrets → copy the **Value** column (e.g. `kM2~xxxxx`), not the **ID** column.
Update `.env`:
```
MICROSOFT_CLIENT_SECRET=<the value, not the ID>
```

> Note: Azure only shows the secret value once at creation time. If it's hidden (`***`), delete it and create a new secret.

---

## Lesson: Also add `Files.Read` permission

The default app registration only includes `User.Read`. For OneDrive file metadata access, `Files.Read` must be added:
Azure Portal → API permissions → Add a permission → Microsoft Graph → Delegated → `Files.Read`
