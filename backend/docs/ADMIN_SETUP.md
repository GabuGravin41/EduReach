# Admin setup (Django + EduReach app)

## What you get

- **App Admin Panel** (`/admin` in the frontend): Overview + link to Django Admin. Only visible when `user.tier === 'admin'`.
- **Django Admin** (backend `/admin/`): Full user and data management (users, courses, assessments, etc.). Requires staff/superuser.

## Best way to set it up

### Option 1: Create a new admin user (recommended for first time)

From the project root (where `manage.py` is):

```bash
python manage.py create_default_users
```

This creates a user:

- **Username:** `admin`
- **Password:** `admin123`
- **Tier:** Admin (sees Admin Panel in the app)
- **Staff + superuser:** Can log into Django Admin

Then:

1. Log into the **frontend** with `admin` / `admin123` → you’ll see “Admin Panel” in the sidebar and can open “Django Admin” from there.
2. To use **Django Admin** directly, go to `http://<your-backend-host>/admin/` (e.g. `http://localhost:8000/admin/`) and log in with the same credentials.

**Important:** Change the default password in Django Admin (Users → admin → change password) before going to production.

---

### Option 2: Promote an existing user to admin

If you already have a user and want to make them admin:

```bash
python manage.py make_user_admin <username>
```

Example:

```bash
python manage.py make_user_admin john
```

That user’s tier is set to Admin and they are set as staff and superuser, so they can use both the app Admin Panel and Django Admin.

---

### Option 3: Manual setup via Django Admin

1. Create a superuser if you don’t have one:
   ```bash
   python manage.py createsuperuser
   ```
2. Log into Django Admin at `http://<backend>/admin/`.
3. Open **Users** → select the user (or the superuser you just created).
4. Set:
   - **Tier:** Admin  
   - **Staff status:** ✓  
   - **Superuser status:** ✓ (optional but recommended for full backend access)
5. Save.

That user can then log into the app and see the Admin Panel, and log into Django Admin for user/data management.

---

## Summary

| Goal                         | Command / action                          |
|-----------------------------|-------------------------------------------|
| First-time admin user       | `python manage.py create_default_users`   |
| Make existing user admin   | `python manage.py make_user_admin <name>` |
| Change password / edit user | Django Admin → Users → select user        |
