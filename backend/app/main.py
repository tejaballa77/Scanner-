from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, delete

from app.database import engine, Base, get_db
from app.models import Scan
from app.schemas import ScanCreate, ScanResponse
from app.websocket import manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Clean up existing duplicate records from database
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(Scan).order_by(Scan.created_at))
            all_scans = result.scalars().all()
            seen_texts = set()
            duplicates_to_delete = []
            for scan in all_scans:
                if scan.raw_text in seen_texts:
                    duplicates_to_delete.append(scan.id)
                else:
                    seen_texts.add(scan.raw_text)
            if duplicates_to_delete:
                await session.execute(delete(Scan).where(Scan.id.in_(duplicates_to_delete)))
                await session.commit()
        except Exception as e:
            pass

    yield

app = FastAPI(
    title="QR Scan & Live Shared Feed API",
    description="Real-time multi-user raw QR code scan sharing backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local network and PWA access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "QR Scanner API is running"}

@app.get("/api/scans", response_model=List[ScanResponse])
async def get_scans(limit: int = 500, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Scan).order_by(desc(Scan.created_at)).limit(limit)
    )
    scans = result.scalars().all()
    return scans

@app.post("/api/scans", response_model=ScanResponse, status_code=201)
async def create_scan(scan_in: ScanCreate, db: AsyncSession = Depends(get_db)):
    raw_text_clean = scan_in.raw_text.strip()
    if not raw_text_clean:
        raise HTTPException(status_code=400, detail="Raw text cannot be empty")

    # Check for duplicate scan text across database
    existing = await db.execute(select(Scan).where(Scan.raw_text == scan_in.raw_text))
    existing_scan = existing.scalars().first()
    if existing_scan:
        raise HTTPException(status_code=409, detail="Already included")

    new_scan = Scan(
        user_name=scan_in.user_name.strip() or "Anonymous",
        raw_text=scan_in.raw_text  # Store exact raw text without modifying
    )
    db.add(new_scan)
    await db.commit()
    await db.refresh(new_scan)

    scan_data = ScanResponse.model_validate(new_scan).model_dump(mode="json")
    scan_data["created_at"] = new_scan.created_at.isoformat()

    # Broadcast new scan to all connected WebSocket clients instantly
    await manager.broadcast({
        "type": "NEW_SCAN",
        "data": scan_data
    })

    return new_scan

@app.delete("/api/scans/{scan_id}")
async def delete_scan(scan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    await db.delete(scan)
    await db.commit()

    await manager.broadcast({
        "type": "DELETE_SCAN",
        "data": {"id": scan_id}
    })

    return {"status": "success", "message": f"Scan {scan_id} deleted"}

@app.delete("/api/scans")
async def clear_all_scans(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Scan))
    await db.commit()

    await manager.broadcast({
        "type": "CLEAR_ALL_SCANS",
        "data": {}
    })

    return {"status": "success", "message": "All scans cleared"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and receive client ping/messages if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# Serve Frontend SPA Static Files directly through FastAPI
import os
from fastapi.staticfiles import StaticFiles

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if os.path.exists(os.path.join(root_dir, "index.html")):
    app.mount("/", StaticFiles(directory=root_dir, html=True), name="static")

