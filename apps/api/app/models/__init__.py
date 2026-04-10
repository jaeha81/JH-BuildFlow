# 모든 모델을 여기서 임포트해야 Alembic autogenerate가 감지한다
from app.models.audit import AuditLog, NotificationQueue, VendorScoreSnapshot
from app.models.base import Base
from app.models.bid import BidPackage, BidRequest
from app.models.company import Company
from app.models.message import Message, MessageThread
from app.models.project import ProcessPackage, Project, ProjectDocument
from app.models.quote import Quote, QuoteLineNormalized
from app.models.settlement import Settlement
from app.models.user import User
from app.models.vendor import Vendor

__all__ = [
    "Base",
    "Company",
    "User",
    "Project",
    "ProcessPackage",
    "ProjectDocument",
    "Vendor",
    "BidRequest",
    "BidPackage",
    "Quote",
    "QuoteLineNormalized",
    "MessageThread",
    "Message",
    "Settlement",
    "VendorScoreSnapshot",
    "AuditLog",
    "NotificationQueue",
]
