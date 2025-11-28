# Account Lock Feature - Test Flow

## Overview
After 5 failed login attempts for any email within 15 minutes, the account is locked.
Only Super Admin (SA) users can unlock locked accounts.

## Test Steps

### 1. Create a Test User
1. Log in as SA
2. Go to Settings → Users
3. Create a normal user (e.g., `test@example.com`, password: `Test1234!`)
4. Note the user's email

### 2. Test Failed Login Locking
1. **Log out** completely
2. Go to the login page
3. Enter the test user's email: `test@example.com`
4. Enter a **wrong password** 5 times in a row
   - After attempt 1: Should show "4 attempts remaining"
   - After attempt 2: Should show "3 attempts remaining"
   - After attempt 3: Should show "2 attempts remaining"
   - After attempt 4: Should show "1 attempts remaining"
   - After attempt 5: Should show "Account Locked" message

5. Try to login a 6th time with the **wrong password**:
   - Should immediately show "Account Locked" message
   - Should NOT attempt authentication

6. Try to login with the **correct password**:
   - Should immediately show "Account Locked" message
   - Should NOT allow login

### 3. Verify Database State
Open your database (Lovable Cloud backend) and check:

**Table: `login_attempts`**
- Should have 5 rows with:
  - `email` = `test@example.com`
  - `success` = false
  - `attempt_time` = recent timestamps

**Table: `locked_accounts`**
- Should have 1 row with:
  - `user_id` = (the test user's ID)
  - `locked_by_system` = true
  - `locked_at` = recent timestamp
  - `locked_until` = timestamp 30 minutes in the future
  - `reason` = "Too many failed login attempts"
  - `unlocked_at` = NULL
  - `unlocked_by` = NULL

### 4. Verify UI Display (SA Only)
1. Log in as SA
2. Go to Settings → Users
3. Find the test user in the list
4. **Expected UI**:
   - User row shows a **red "Locked" badge** with a lock icon in the Status column
   - User row shows a **green unlock button** (unlock icon) in the Actions column
   - The SA rows should be separated from regular users with a thicker border

### 5. Test Unlock (SA Only)
1. While logged in as SA in Settings → Users
2. Click the **unlock icon** for the locked test user
3. **Expected**:
   - Toast notification: "Felhasználó sikeresen feloldva"
   - The "Locked" badge disappears
   - The unlock icon disappears

4. Check database again:
   - `locked_accounts` table should now show:
     - `unlocked_at` = recent timestamp
     - `unlocked_by` = (SA user's ID)

### 6. Test Login After Unlock
1. Log out as SA
2. Try to log in as the test user with the **correct password**
3. **Expected**:
   - Login should succeed
   - Should redirect to dashboard

### 7. Test Non-SA Cannot Unlock
1. Create another normal user (not SA)
2. Log in as that normal user
3. Go to Settings → Users
4. Find the locked test user
5. **Expected**:
   - Should NOT see the unlock icon (or it should be disabled)
   - Only SA should see the unlock button

## Edge Cases to Test

### A. Non-existent User
1. Try to log in with a non-existent email (e.g., `fake@example.com`)
2. Enter wrong password 5 times
3. **Expected**: 
   - Should show "4 attempts remaining", etc.
   - Should log failed attempts in `login_attempts` table
   - Should NOT create a row in `locked_accounts` (because user doesn't exist)

### B. Auto-unlock After Time
1. Lock a test user (5 failed attempts)
2. Manually update the database:
   - Set `locked_until` to a time in the past
3. Try to log in with correct password
4. **Expected**: Login should succeed (auto-unlocked)

### C. Self-protection
1. As SA, try to deactivate yourself
2. **Expected**: Should not be allowed

## Backend Functions Used

1. `is_account_locked_by_email(_email)` - Check if email is locked BEFORE attempting sign-in
2. `count_recent_failed_attempts(_email, _minutes)` - Count failed attempts in last 15 minutes
3. `lock_account_for_email(_email, _minutes, _reason)` - Lock account by email
4. `get_locked_user_ids()` - Get list of locked user IDs for UI display
5. `unlock_account_by_user_id(_user_id, _unlocked_by)` - Unlock account (SA only)

## Troubleshooting

If locking is not working:
1. Check browser console for errors
2. Check `login_attempts` table - are rows being inserted?
3. Check `locked_accounts` table - is a row being created after 5 attempts?
4. Verify the `system_settings` table has `account_lock_attempts` = `5`
5. Check that RLS policies allow inserting into `login_attempts` (should be public)

If UI is not showing locked badge:
1. Check `useLockedAccounts` hook is fetching data correctly
2. Verify `get_locked_user_ids()` function returns the locked user
3. Check `isUserLocked(userId)` function in the component
