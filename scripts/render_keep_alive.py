import urllib.request
import ssl
import time
import datetime

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://transaction-autopilot.onrender.com/api/health"

print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Render Keep-Alive Watchdog Started.", flush=True)

while True:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RenderKeepAlive/1.0"})
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
            dt = time.time() - t0
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{now}] Ping OK (HTTP {r.status}, {dt:.2f}s latency)", flush=True)
    except Exception as e:
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now}] Ping Warning: {e}", flush=True)
    
    # Render sleeps after 15 minutes of inactivity.
    # Pinging every 8 minutes (480 seconds) ensures it stays 100% awake.
    time.sleep(480)
