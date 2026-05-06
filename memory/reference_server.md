---
name: Contabo server details
description: EduReach production server SSH access and specs
type: reference
---

**Contabo Cloud VPS 10 SSD**
- IP: 37.60.227.186
- IPv6: 2a02:c207:2327:3976::1
- VNC: 75.119.131.32:63068
- Host: vmi3273976
- OS: Ubuntu 24.04
- Location: Hub Europe
- Renewal: 1st June 2026 @ $5.40/month

**SSH:**
```bash
ssh root@37.60.227.186
```

**Backend lives at:** /opt/edureach
**Restart backend:** sudo systemctl restart gunicorn
