from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Confidence = Literal["exact", "approximate", "rough"]
Sensitivity = Literal["public", "interview-only", "confidential-general-only"]
AchievementStatus = Literal["active", "retired"]


class Metric(BaseModel):
    value: float
    unit: str
    label: str
    confidence: Confidence


class RoleBase(BaseModel):
    company: str
    title: str
    start_date: date
    end_date: date | None = None
    location: str | None = None
    one_line_summary: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = None
    one_line_summary: str | None = None


class RoleOut(RoleBase):
    id: UUID
    user_id: UUID
    created_at: datetime


class SkillBase(BaseModel):
    name: str
    category: str | None = None
    first_used: date | None = None
    last_used: date | None = None


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    first_used: date | None = None
    last_used: date | None = None


class SkillOut(SkillBase):
    id: UUID
    user_id: UUID
    created_at: datetime


class AchievementBase(BaseModel):
    role_id: UUID
    title: str
    description: str
    metrics: list[Metric] = Field(default_factory=list)
    scope_tags: list[str] = Field(default_factory=list)
    verification_note: str | None = None
    sensitivity: Sensitivity = "public"
    status: AchievementStatus = "active"
    last_reviewed: date | None = None


class AchievementCreate(AchievementBase):
    skill_ids: list[UUID] = Field(default_factory=list)


class AchievementUpdate(BaseModel):
    role_id: UUID | None = None
    title: str | None = None
    description: str | None = None
    metrics: list[Metric] | None = None
    scope_tags: list[str] | None = None
    verification_note: str | None = None
    sensitivity: Sensitivity | None = None
    status: AchievementStatus | None = None
    last_reviewed: date | None = None
    skill_ids: list[UUID] | None = None


class AchievementOut(AchievementBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    skill_ids: list[UUID] = Field(default_factory=list)


class EducationBase(BaseModel):
    institution: str
    credential: str
    completed: bool = False
    notes: str | None = None


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    institution: str | None = None
    credential: str | None = None
    completed: bool | None = None
    notes: str | None = None


class EducationOut(EducationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
