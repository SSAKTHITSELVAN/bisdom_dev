# Admin Password Helper

## Current System Time
```bash
# Run this command to see current admin password:
date +"%H%M"
```

## Quick Password Generator

### Linux/Mac Terminal
```bash
# Show current password
echo "Current admin password: $(date +%H%M)"

# Example output:
# Current admin password: 1430
```

### Python
```python
from datetime import datetime
print(f"Current admin password: {datetime.now().strftime('%H%M')}")
```

### JavaScript/Node
```javascript
const now = new Date();
const password = now.toTimeString().slice(0,5).replace(':', '');
console.log(`Current admin password: ${password}`);
```

## Password Examples

| Time Display | Password |
|--------------|----------|
| 12:00 AM     | 0000     |
| 01:30 AM     | 0130     |
| 08:45 AM     | 0845     |
| 12:00 PM     | 1200     |
| 02:30 PM     | 1430     |
| 06:15 PM     | 1815     |
| 11:59 PM     | 2359     |

## Remember
- Use 24-hour format
- Always 4 digits
- Include leading zeros
- No colon or spaces
- Password changes every minute

## Quick Access
1. Check time: `date +"%H%M"`
2. Go to: http://localhost:5173/admin/login
3. Enter the 4-digit code
4. Done!
