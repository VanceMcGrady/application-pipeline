from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import achievements, education, health, me, roles, skills

app = FastAPI(title="Application Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(me.router)
app.include_router(roles.router)
app.include_router(achievements.router)
app.include_router(skills.router)
app.include_router(education.router)
