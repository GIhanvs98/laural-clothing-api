import os
import re

directories = ['.']
# 'Laural' -> 'Seramaaduwen'
# 'laural' -> 'seramaaduwen'
# 'laural.com' -> 'seramaaduwen.lk'
# 'laural.lk' -> 'seramaaduwen.lk'
# 'Laural Clothing' -> 'SERAMAADUWEN.LK'

def replace_in_file(path):
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content.replace('Laural Clothing', 'SERAMAADUWEN.LK')
    new_content = new_content.replace('Laural', 'Seramaaduwen')
    
    # regex for laural.com and laural.lk
    new_content = re.sub(r'laural\.com', 'seramaaduwen.lk', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'laural\.lk', 'seramaaduwen.lk', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'admin@laural', 'admin@seramaaduwen', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'customer@laural', 'customer@seramaaduwen', new_content, flags=re.IGNORECASE)
    
    # feed controller
    new_content = new_content.replace('laural-clothing.com', 'seramaaduwen.lk')
    new_content = new_content.replace('laural-clothing-frontend-production.up.railway.app', 'seramaaduwen.lk')
    new_content = new_content.replace('api.seramaaduwen.lk', 'api.seramaaduwen.lk') # ignore

    if new_content != content:
        with open(path, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {path}")

files_to_update = [
    'seed_users.ts',
    'src/scripts/seed-users.ts',
    'src/services/gateways/onepay.service.ts',
    'src/services/notification.service.ts',
    'src/services/otp.service.ts',
    'src/controllers/feed.controller.ts'
]

for f in files_to_update:
    if os.path.exists(f):
        replace_in_file(f)
