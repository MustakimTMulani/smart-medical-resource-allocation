"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import initialize_database
from app.routes.benchmarks import router as benchmarks_router
from app.routes.algorithms import router as algorithms_router
from app.routes.inventory import router as inventory_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Prepare the persistent inventory database before accepting requests."""
    initialize_database()
    yield


app = FastAPI(title="Smart Medical Resource Allocation API", lifespan=lifespan)

# Allow local Vite dev URLs (including an alternate port if 5173 is occupied).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(inventory_router)
app.include_router(algorithms_router)
app.include_router(benchmarks_router)


@app.get("/", tags=["Health"])
def read_root() -> dict[str, str]:
    return {"message": "Smart Medical Resource Allocation API is running."}


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Simple liveness endpoint for the frontend connection check."""
    return {"status": "ok", "service": "smart-medical-resource-allocation-api"}


