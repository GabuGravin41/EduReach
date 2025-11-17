#!/usr/bin/env python
"""
Script to change admin password securely.
Run this with: python manage.py shell < change_admin_password.py
Or: python change_admin_password.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edureach_project.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def change_admin_credentials():
    """Change admin username and password."""
    print("=" * 50)
    print("EduReach Admin Credentials Update")
    print("=" * 50)
    
    # Get current admin
    try:
        admin = User.objects.get(username='admin')
        print(f"\n✓ Found admin user: {admin.username}")
    except User.DoesNotExist:
        print("\n✗ No admin user found with username 'admin'")
        return
    
    # Get new credentials
    new_username = input("\nEnter new admin username (press Enter to keep 'admin'): ").strip()
    if new_username:
        admin.username = new_username
        print(f"✓ Username will be changed to: {new_username}")
    else:
        new_username = 'admin'
        print("✓ Keeping username as 'admin'")
    
    new_password = input("\nEnter new admin password (minimum 8 characters): ").strip()
    if len(new_password) < 8:
        print("✗ Password must be at least 8 characters long!")
        return
    
    confirm_password = input("Confirm new password: ").strip()
    if new_password != confirm_password:
        print("✗ Passwords do not match!")
        return
    
    # Update credentials
    admin.set_password(new_password)
    admin.save()
    
    print("\n" + "=" * 50)
    print("✓ Admin credentials updated successfully!")
    print("=" * 50)
    print(f"\nNew username: {new_username}")
    print("New password: [hidden]")
    print("\nYou can now log in to Django admin at: /admin/")
    print("=" * 50)

if __name__ == '__main__':
    change_admin_credentials()
