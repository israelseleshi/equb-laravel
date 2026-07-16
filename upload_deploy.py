import urllib.request, urllib.parse, json, ssl, os, base64, re

ssl._create_default_https_context = ssl._create_unverified_context

# Login
data = urllib.parse.urlencode({'user': 'charisme', 'pass': 'Messiah@7878'}).encode()
req = urllib.request.Request('https://charismahand.com:2083/login/', data=data, method='POST')
req.add_header('User-Agent', 'Mozilla/5.0')
req.add_header('Content-Type', 'application/x-www-form-urlencoded')
resp = urllib.request.urlopen(req)
resp.read()

loc = resp.headers.get('Location', '')
cookie_header = resp.headers.get('Set-Cookie', '')
m = re.search(r'/cpsess(\d+)/', loc)
token = '/cpsess' + m.group(1) if m else ''
cpsession = ''
for part in cookie_header.split(','):
    m2 = re.search(r'cpsession=([^;]+)', part)
    if m2:
        cpsession = 'cpsession=' + m2.group(1)
        break
resp.close()

print(f'Token: {token}')
print(f'Session: {cpsession[:30]}...')

# Read zip and encode as base64
zip_path = r'C:\Users\Hp\Documents\equb\backend-deploy.zip'
with open(zip_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

# Save base64 file to server
params = urllib.parse.urlencode({
    'dir': '/home/charisme',
    'file': 'backend-deploy.b64',
    'content': b64,
    'fallback': '1'
})
url = f'https://charismahand.com:2083{token}/execute/Fileman/save_file_content?{params}'
req2 = urllib.request.Request(url, method='GET', headers={'Cookie': cpsession, 'User-Agent': 'Mozilla/5.0'})
resp2 = urllib.request.urlopen(req2)
result = json.loads(resp2.read().decode())
resp2.close()
print(f'Upload base64: {result.get("status")} - {result.get("data", {}).get("path", "error")}')
