from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import exc as sa_exc
from sqlalchemy.ext.asyncio import AsyncSession
import json
from decimal import Decimal
from datetime import date, datetime
from typing import Any

from app.core.database import get_app_db, get_target_db_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.query_history import QueryHistory
from app.schemas.user import QueryRequest, QueryResponse, SchemaRequest
from app.services.schema_service import schema_service
from app.services.statistics_service import statistics_service
from app.services.llm_service import llm_service
from app.services.query_service import query_service

router = APIRouter(prefix="/api/query", tags=["Query"])


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal, date, and datetime types"""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        return super().default(obj)


@router.post("/schema", response_model=dict)
async def get_schema(
    request: SchemaRequest,
    current_user: User = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db)
):
    """Get database schema for the current user's selected DB"""
    try:
        db_session, engine = await get_target_db_session(request.connection_string)
        db_name = engine.url.database or "sql_agent_db"
        schema = await schema_service.get_database_schema(db_session, db_name)
        await db_session.close()
        await engine.dispose()
        return schema
    except sa_exc.OperationalError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to database: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to database: {str(e)}")


@router.post("/ask", response_model=QueryResponse)
async def ask_question(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db)
):
    """
    Ask a natural language question and get SQL query with results.
    """
    try:
        db_session, engine = await get_target_db_session(request.connection_string)
    except sa_exc.OperationalError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to database: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to database: {str(e)}")
        
    try:
        # Step 1: Get the database schema
        db_name = engine.url.database or "sql_agent_db"
        schema = await schema_service.get_database_schema(db_session, db_name)
        
        # Step 2: Generate SQL using LLM
        try:
            llm_result = await llm_service.generate_sql(request.question, schema)
        except TimeoutError as e:
            raise HTTPException(status_code=504, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM service error: {str(e)}")

        if not isinstance(llm_result, dict):
            raise HTTPException(status_code=502, detail="Invalid LLM response format")

        generated_sql = llm_result.get("sql", "")
        explanation = llm_result.get("explanation", "")

        if not isinstance(generated_sql, str) or not generated_sql.strip():
            history = QueryHistory(
                user_id=current_user.id,
                natural_question=request.question,
                generated_sql="",
                error_message=llm_result.get("error", "Failed to generate SQL"),
                explanation=explanation
            )
            app_db.add(history)
            await app_db.commit()
            return QueryResponse(
                sql="",
                explanation="",
                error=llm_result.get("error", "Failed to generate SQL")
            )
        
        # Step 3: Validate the SQL
        is_valid, error_msg = query_service.validate_sql(generated_sql)
        
        if not is_valid:
            history = QueryHistory(
                user_id=current_user.id,
                natural_question=request.question,
                generated_sql=generated_sql,
                error_message=error_msg,
                explanation=explanation
            )
            app_db.add(history)
            await app_db.commit()
            return QueryResponse(
                sql=generated_sql,
                explanation=explanation,
                error=error_msg
            )
        
        # Step 4: Execute the query
        try:
            exec_result = await query_service.execute_query(db_session, generated_sql)
        except Exception as e:
            history = QueryHistory(
                user_id=current_user.id,
                natural_question=request.question,
                generated_sql=generated_sql,
                execution_result=json.dumps([], cls=CustomJSONEncoder),
                error_message=str(e)
            )
            app_db.add(history)
            await app_db.commit()
            raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

        if not exec_result.get("success"):
            history = QueryHistory(
                user_id=current_user.id,
                natural_question=request.question,
                generated_sql=generated_sql,
                execution_result=json.dumps([], cls=CustomJSONEncoder),
                error_message=exec_result.get("error")
            )
            app_db.add(history)
            await app_db.commit()
            raise HTTPException(status_code=400, detail=exec_result.get("error", "Query execution failed"))
        
        # Step 5: Convert Decimal and other non-serializable types to standard Python types
        def convert_row(row: dict) -> dict:
            return {k: (float(v) if isinstance(v, Decimal) else 
                       (v.isoformat() if isinstance(v, (date, datetime)) else
                       (v.decode('utf-8', errors='replace') if isinstance(v, bytes) else v)))
                    for k, v in row.items()}
        
        result_rows = [convert_row(row) for row in exec_result.get("rows", [])]
        
        # Step 6: Save to history
        history = QueryHistory(
            user_id=current_user.id,
            natural_question=request.question,
            generated_sql=generated_sql,
            execution_result=json.dumps(result_rows, cls=CustomJSONEncoder),
            explanation=explanation,
            error_message=None
        )
        app_db.add(history)
        await app_db.commit()
        
        return QueryResponse(
            sql=generated_sql,
            explanation=explanation,
            result=result_rows,
            columns=exec_result.get("columns", []),
            error=None
        )
    finally:
        await db_session.close()
        await engine.dispose()


@router.post("/statistics", response_model=dict)
async def get_schema_statistics(
    request: SchemaRequest,
    current_user: User = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    force_refresh: bool = Query(False, description="Force refresh cache")
):
    """
    Get cached schema statistics for chart visualization.
    Statistics are cached with a 24-hour TTL.
    """
    try:
        db_session, engine = await get_target_db_session(request.connection_string)
        db_name = engine.url.database or "sql_agent_db"
        
        # Get schema first
        schema = await schema_service.get_database_schema(db_session, db_name)
        
        # Get or compute statistics
        statistics = await statistics_service.get_or_compute_statistics(
            app_db=app_db,
            target_db=db_session,
            connection_string=request.connection_string,
            database_name=db_name,
            schema=schema,
            ttl_hours=24,
            force_refresh=force_refresh
        )
        
        await db_session.close()
        await engine.dispose()
        
        return statistics
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get statistics: {str(e)}")


@router.post("/statistics/invalidate", response_model=dict)
async def invalidate_statistics_cache(
    request: SchemaRequest,
    current_user: User = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db)
):
    """Manually invalidate the statistics cache for a connection"""
    try:
        success = await statistics_service.invalidate_cache(
            app_db, request.connection_string
        )
        return {"success": success, "message": "Cache invalidated" if success else "Cache entry not found"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to invalidate cache: {str(e)}")
