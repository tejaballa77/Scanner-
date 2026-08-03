from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ScanCreate(BaseModel):
    user_name: str
    raw_text: str

class ScanResponse(BaseModel):
    id: int
    user_name: str
    raw_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
