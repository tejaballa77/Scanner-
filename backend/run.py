import sys
import os
import uvicorn

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("Starting QR Scan & Live Feed Backend Server on 0.0.0.0:8000...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
