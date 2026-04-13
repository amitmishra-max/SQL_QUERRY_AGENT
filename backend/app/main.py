from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, query, history
from app.core.database import app_engine

app = FastAPI(
    title="SQL Query Builder Agent",
    description="AI-powered SQL query builder using natural language",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(query.router)
app.include_router(history.router)


@app.on_event("startup")
async def startup_event():
    pass


@app.on_event("shutdown")
async def shutdown_event():
    await app_engine.dispose()


@app.get("/")
async def root():
    return {
        "message": "SQL Query Builder Agent API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": exc.detail},
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
