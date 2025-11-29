# Account Lockout System - Test Scenarios

## Implementation Summary

### What Was Fixed:

1. **Database Layer**:
   - ✅ Added system settings with defaults (`account_lock_attempts=5`, `account_lock_auto_unlock_minutes=30`)
   - ✅ Added unique constraint on `locked_accounts.user_id` to prevent duplicate lock records
   - ✅ Improved `unlock_account_by_user_id` to also clear recent failed login attempts
   - ✅ Added auto-cleanup trigger to clear failed attempts on successful login
   - ✅ Added indexes for better performance

2. **Login Flow (Auth.tsx)**:
   - ✅ Checks if account is locked BEFORE attempting sign-in
   - ✅ Loads configurable max attempts and auto-unlock time from system settings
   - ✅ Logs all login attempts (success and failure)
   - ✅ Counts recent failed attempts (last 15 minutes)
   - ✅ Locks account after reaching threshold (default 5 attempts)
   - ✅ Shows appropriate error messages with remaining attempts
   - ✅ Calls notification edge function on account lock

3. **User List UI (UserList.tsx)**:
   - ✅ Shows locked badge with red styling for locked users
   - ✅ Badge includes detailed tooltip with:
     - Lock reason
     - Locked at timestamp
     - Locked until timestamp (if time-based)
     - IP address of failed attempts
     - System lock indicator
   - ✅ Unlock button visible only for Super Admins
   - ✅ Unlock button appears only for locked users
   - ✅ Manual unlock refreshes UI automatically

4. **Edge Function**:
   - ✅ `notify-account-lock` deployed and functional
   - ✅ Notifies all Super Admins when account is locked
   - ✅ Includes lock details and user information

5. **Localization**:
   - ✅ All messages translated in both HU and EN
   - ✅ User-friendly error messages

---

## Test Scenarios

### Scenario A: 5× Wrong Password (Account Lock)

**Setup**: Have a test user with correct credentials

**Steps**:
1. Go to login page
2. Enter correct email but wrong password
3. Click "Sign In"
4. Repeat 5 times total

**Expected Results**:
- Attempts 1-4: Show "Invalid credentials" with remaining attempts count
  - Attempt 1: "Invalid email or password (4 attempts remaining)"
  - Attempt 2: "Invalid email or password (3 attempts remaining)"
  - Attempt 3: "Invalid email or password (2 attempts remaining)"
  - Attempt 4: "Invalid email or password (1 attempts remaining)"
- Attempt 5: Account gets locked, shows "Account Locked" error
  - Error: "This user account is locked. Please contact a Super Admin (SA) to unlock it."
- Further attempts show same "Account Locked" message (not "Invalid credentials")

**Database Verification**:
```sql
-- Check locked_accounts table
SELECT * FROM locked_accounts WHERE user_id = '<test-user-id>';
-- Should show: locked_at, locked_until (30 min from now), reason, unlocked_at=NULL

-- Check login_attempts table
SELECT * FROM login_attempts WHERE email = '<test-email>' ORDER BY attempt_time DESC LIMIT 10;
-- Should show 5+ failed attempts
```

**UI Verification**:
- As Super Admin, go to Settings → Users
- Test user should have RED "Locked" badge in Status column
- Hover over badge → tooltip shows lock details
- Unlock icon (green unlock symbol) should be visible in Actions column

---

### Scenario B: Manual Unlock by Super Admin

**Setup**: User account is locked (from Scenario A)

**Steps**:
1. Login as Super Admin
2. Go to Settings → Users
3. Find the locked user (has red "Locked" badge)
4. Click the green Unlock icon in Actions column
5. Wait for success toast

**Expected Results**:
- Success toast appears: "Felhasználó sikeresen feloldva" (HU) or "User unlocked successfully" (EN)
- "Locked" badge disappears immediately
- Unlock icon disappears
- User can now login with correct password

**Database Verification**:
```sql
-- Check locked_accounts table
SELECT * FROM locked_accounts WHERE user_id = '<test-user-id>';
-- Should show: unlocked_at=<current_timestamp>, unlocked_by=<sa-user-id>

-- Check login_attempts table
SELECT * FROM login_attempts 
WHERE user_id = '<test-user-id>' AND success = false 
ORDER BY attempt_time DESC;
-- Should be empty or very old (cleared by unlock function)
```

**Immediate Login Test**:
- Go to login page
- Enter correct credentials
- Login should succeed immediately
- No "Account Locked" error

---

### Scenario C: Auto-Unlock After Time Expires

**Setup**: User account is locked with auto-unlock time

**Steps**:
1. Lock account with 5 failed attempts
2. Wait for the configured unlock time to pass (default 30 minutes)
   - OR manually update database: `UPDATE locked_accounts SET locked_until = now() - interval '1 minute' WHERE user_id = '<test-user-id>';`
3. Try to login with correct credentials

**Expected Results**:
- Login succeeds automatically
- No "Account Locked" error
- User is logged in successfully
- Success toast: "Logged in successfully!"

**Database Verification After Login**:
```sql
-- Check locked_accounts table
SELECT * FROM locked_accounts WHERE user_id = '<test-user-id>';
-- unlocked_at should still be NULL (auto-unlock doesn't update this)
-- BUT locked_until should be in the past

-- Check if user still appears locked
SELECT * FROM locked_accounts la
WHERE la.user_id = '<test-user-id>'
  AND la.unlocked_at IS NULL
  AND (la.locked_until IS NULL OR la.locked_until > now());
-- Should return NO rows (user is not locked)
```

**UI Verification**:
- As Super Admin, go to Settings → Users
- User should NOT have "Locked" badge (expired lock not shown)
- No unlock icon should be visible

---

### Scenario D: Permissions Check (Non-SA User)

**Setup**: Have a non-Super Admin user (normal, admin, viewer role)

**Steps**:
1. Login as non-SA user (admin, normal, or viewer)
2. Go to Settings → Users (if they have access)
3. Look for a locked user in the list

**Expected Results**:
- "Locked" badge IS visible (they can see lock status)
- Unlock icon is NOT visible (only SA can unlock)
- If they try to call unlock API directly (e.g., via browser console):
  ```javascript
  // This should FAIL due to RLS policies
  const { error } = await supabase.rpc('unlock_account_by_user_id', {
    _user_id: '<locked-user-id>',
    _unlocked_by: '<current-user-id>'
  });
  // error should be present
  ```

**Security Verification**:
- RLS policies prevent non-SA users from unlocking
- Frontend hides unlock button for non-SA users
- Backend enforces permissions via RLS

---

### Scenario E: Failed Attempts Counter Reset on Success

**Setup**: User has some failed attempts but hasn't reached lock threshold

**Steps**:
1. Make 3 failed login attempts (wrong password)
2. Wait to see "2 attempts remaining" message
3. Login with correct credentials
4. Logout
5. Try 3 more failed attempts

**Expected Results**:
- After successful login (step 3), failed attempts counter resets
- Step 5 shows "2 attempts remaining" again (not immediate lock)
- This proves the trigger clears failed attempts on success

**Database Verification**:
```sql
-- After successful login
SELECT * FROM login_attempts 
WHERE user_id = '<test-user-id>' AND success = false
ORDER BY attempt_time DESC;
-- Should be empty or very old (cleared by trigger)

-- Check successful login was recorded
SELECT * FROM login_attempts 
WHERE user_id = '<test-user-id>' AND success = true
ORDER BY attempt_time DESC LIMIT 1;
-- Should show recent successful login
```

---

## Configuration

### System Settings (in system_settings table):

```sql
-- View current settings
SELECT * FROM system_settings WHERE setting_key IN (
  'account_lock_attempts',
  'account_lock_auto_unlock_minutes'
);
```

**Defaults**:
- `account_lock_attempts`: 5
- `account_lock_auto_unlock_minutes`: 30

**To Change** (Super Admin only):
```sql
UPDATE system_settings 
SET setting_value = '3' 
WHERE setting_key = 'account_lock_attempts';

UPDATE system_settings 
SET setting_value = '60' 
WHERE setting_key = 'account_lock_auto_unlock_minutes';
```

---

## Troubleshooting

### Issue: User shows as locked but can login

**Possible Cause**: `locked_until` has passed
**Solution**: This is expected behavior (auto-unlock). The UI query should filter these out.

**Verify**:
```sql
SELECT 
  la.*,
  la.locked_until < now() as is_expired
FROM locked_accounts la
WHERE la.unlocked_at IS NULL;
```

### Issue: Unlock button doesn't appear

**Check**:
1. User is actually locked: `SELECT * FROM locked_accounts WHERE user_id = '<id>' AND unlocked_at IS NULL AND locked_until > now();`
2. Current user is Super Admin: Check `profiles.role = 'super_admin'`
3. Browser console for React query errors

### Issue: Lock notification not received

**Check**:
1. Edge function deployed: `supabase functions list`
2. Edge function logs: Check Supabase dashboard
3. Super Admin users exist: `SELECT * FROM profiles WHERE role = 'super_admin' AND is_active = true;`

---

## Security Checklist

- ✅ Account locks after 5 consecutive failed attempts
- ✅ Lock duration is configurable (default 30 minutes)
- ✅ Auto-unlock works based on time expiration
- ✅ Manual unlock only available to Super Admins
- ✅ RLS policies prevent unauthorized unlocks
- ✅ Failed attempts are cleared on successful login
- ✅ Failed attempts are cleared on manual unlock
- ✅ IP addresses are logged for security tracking
- ✅ Notifications sent to Super Admins on lock
- ✅ User-friendly error messages (no technical details exposed)
- ✅ All messages localized (HU/EN)

---

## Notes

1. **Failed Attempts Window**: The system counts attempts from the last 15 minutes. This is hardcoded in `Auth.tsx` but could be made configurable.

2. **Lock vs Attempts**: 
   - Lock duration (`locked_until`) is separate from attempts counting window
   - Even if attempts fall outside the 15-min window, the lock persists until `locked_until`

3. **Database Cleanup**: Old login attempts (>30 days) can be cleaned up periodically:
   ```sql
   SELECT cleanup_old_login_attempts();
   ```

4. **Unique Lock Records**: Each user can only have ONE record in `locked_accounts` table (enforced by unique constraint). This prevents duplicate locks and simplifies queries.

5. **Trigger Behavior**: The `trigger_clear_failed_attempts` runs AFTER each login attempt is inserted. If it's a successful login, it deletes recent failed attempts for that user.