from datetime import datetime
from pydantic import BaseModel, ConfigDict

from typing import Optional

class ScanCreate(BaseModel):
    user_name: str
    raw_text: str
    photo_data: Optional[str] = None

class ScanResponse(BaseModel):
    id: int
    user_name: str
    raw_text: str
    photo_data: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
