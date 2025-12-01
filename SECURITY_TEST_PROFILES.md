# Profiles Tábla - Security Testing Plan

## Teszt Környezet Setup
- 3 user: super_admin, admin (company A), normal (company A), normal (company B)
- 2 company: Company A, Company B

## 1. SELECT Policy Tesztek

### 1.1 Saját profil olvasás
- [ ] Normal user látja-e saját profilját? → **KELL: IGEN**
- [ ] Admin látja-e saját profilját? → **KELL: IGEN**
- [ ] Super admin látja-e saját profilját? → **KELL: IGEN**

### 1.2 Más user profiljának olvasása
- [ ] Normal user (Company A) látja-e normal user (Company A) profilját? → **JELENLEG: NEM**
- [ ] Normal user (Company A) látja-e normal user (Company B) profilját? → **KELL: NEM**
- [ ] Admin (Company A) látja-e normal user (Company A) profilját (2FA után)? → **KELL: IGEN**
- [ ] Admin (Company A) látja-e normal user (Company B) profilját? → **KELL: NEM**

### 1.3 Super admin hozzáférés
- [ ] Super admin látja-e minden user profilját? → **KELL: IGEN**

### 1.4 2FA követelmény
- [ ] Admin 2FA nélkül látja-e company user-ek profilját? → **KELL: NEM**
- [ ] Admin 2FA után látja-e company user-ek profilját? → **KELL: IGEN**

## 2. UPDATE Policy Tesztek

### 2.1 Saját profil módosítása
- [ ] Normal user tudja-e módosítani saját full_name-jét? → **KELL: IGEN**
- [ ] Normal user tudja-e módosítani saját role-ját? → **KELL: NEM (trigger blokkolja)**
- [ ] Normal user tudja-e módosítani saját can_delete-jét? → **KELL: NEM (trigger blokkolja)**

### 2.2 Company admin módosítások
- [ ] Admin tudja-e módosítani company user full_name-jét (2FA után)? → **KELL: IGEN**
- [ ] Admin tudja-e módosítani company user role-ját? → **KELL: NEM (trigger blokkolja)**
- [ ] Admin tudja-e módosítani super_admin profilt? → **KELL: NEM**

### 2.3 Super admin módosítások
- [ ] Super admin tudja-e módosítani bárki full_name-jét? → **KELL: IGEN**
- [ ] Super admin tudja-e módosítani bárki role-ját? → **KELL: IGEN**
- [ ] Super admin tudja-e módosítani bárki can_delete-jét? → **KELL: IGEN**

## 3. Privilege Escalation Tesztek

### 3.1 Self-escalation próbálkozások
- [ ] Normal user próbálja role-t 'admin'-ra változtatni → **KELL: HIBA**
- [ ] Normal user próbálja can_delete-t true-ra változtatni → **KELL: HIBA**
- [ ] Admin próbálja role-t 'super_admin'-ra változtatni → **KELL: HIBA**

### 3.2 Cross-company escalation
- [ ] Admin (Company A) próbálja Company B user role-ját változtatni → **KELL: HIBA (policy nem engedi)**

## 4. Trigger Tesztek

### 4.1 prevent_profile_privilege_escalation trigger
- [ ] User UPDATE saját role → trigger dobjon exception-t
- [ ] User UPDATE saját can_delete → trigger dobjon exception-t
- [ ] Admin UPDATE user role → trigger dobjon exception-t
- [ ] Super admin UPDATE user role → trigger ENGEDJE

### 4.2 log_sensitive_profile_changes trigger
- [ ] Role változás logolva van-e? → **KELL: IGEN**
- [ ] Permission változás logolva van-e? → **KELL: IGEN**
- [ ] 2FA enable/disable logolva van-e? → **KELL: IGEN**

## 5. 2FA Secret Védelem

### 5.1 get_user_2fa_secret() function
- [ ] User hozzáfér-e saját secret-hez? → **KELL: IGEN**
- [ ] User hozzáfér-e más user secret-hez? → **KELL: NEM (exception)**
- [ ] Super admin hozzáfér-e bárki secret-hez? → **KELL: IGEN**

## Kritikus Kérdés a Felhasználónak

**BUSINESS REQUIREMENT**: Kell-e, hogy a normal userek lássák egymást company-n belül?

**Például:**
- Task assignment: "Ki legyen a felelős?" → user picker kell
- Document sharing: "Kivel ossza meg?" → user lista kell
- Team view: "Kik vannak a cégnél?" → user lista kell

**Ha IGEN**: RLS policy-t bővíteni kell egy újabb OR ággal:
```sql
OR (
  -- Normal users can see other users in their companies
  EXISTS (
    SELECT 1
    FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
      AND uc2.user_id = profiles.id
      AND is_2fa_verified(auth.uid())
  )
)
```

**Ha NEM**: Jelenlegi RLS policy megfelelő, de UI-ban explicit fetch kell admin által.

## Következő Lépések

1. ✅ Migráció lefutott
2. ⏳ **MOST**: Business requirement tisztázása (company-wide visibility?)
3. ⏳ Manual tesztelés végrehajtása
4. ⏳ Esetleges RLS finomhangolás
5. ⏳ Következő security issue javítása (login_attempts, locked_accounts)
