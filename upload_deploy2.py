import urllib.request, urllib.parse, json, ssl, os, base64, re

ssl._create_default_https_context = ssl._create_unverified_context

server_ip = '91.204.209.46'
host = 'charismahand.com:2083'

# Login via server IP to avoid Cloudflare redirect
data = urllib.parse.urlencode({'user': 'charisme', 'pass': 'Messiah@7878'}).encode()
req = urllib.request.Request(f'https://{server_ip}:2083/login/', data=data, method='POST')
req.add_header('User-Agent', 'Mozilla/5.0')
req.add_header('Content-Type', 'application/x-www-form-urlencoded')
req.add_header('Host', host)

try:
    resp = urllib.request.urlopen(req, timeout=30)
except Exception as e:
    print(f'Login error: {e}')
    # Try with charismahand.com directly but handle redirect
    req2 = urllib.request.Request(f'https://{host}/login/', data=data, method='POST')
    req2.add_header('User-Agent', 'Mozilla/5.0')
    req2.add_header('Content-Type', 'application/x-www-form-urlencoded')
    try:
        resp = urllib.request.urlopen(req2, timeout=30)
    except urllib.error.HTTPError as e2:
        if e2.code == 308:
            print('Got 308 redirect, trying without Cloudflare...')
            exit(1)
        raise

resp.read()
loc = resp.headers.get('Location', '')
cookie_header = resp.headers.get('Set-Cookie', '')
token = ''
cpsession = ''

m = re.search(r'/cpsess(\d+)/', loc)
if m:
    token = '/cpsess' + m.group(1)

for part in cookie_header.split(','):
    m2 = re.search(r'cpsession=([^;]+)', part)
    if m2:
        cpsession = 'cpsession=' + m2.group(1)
        break

resp.close()
print(f'Token: {token}')
print(f'Logged in successfully')
