from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SchemaService:
    """Service for introspecting database schema"""
    
    @staticmethod
    async def get_database_schema(db: AsyncSession, database_name: str = "sql_agent_db") -> Dict[str, Any]:
        """
        Get complete database schema including tables, columns, and relationships
        """
        dialect_name = getattr(getattr(db.bind, "dialect", None), "name", "").lower()
        schema = {"tables": []}

        if dialect_name == "sqlite":
            tables_query = text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
            result = await db.execute(tables_query)
            tables = [row[0] for row in result.fetchall()]
        else:
            tables_query = text(
                """
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = :db_name
                AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
                """
            )
            result = await db.execute(tables_query, {"db_name": database_name})
            tables = [row[0] for row in result.fetchall()]

        for table_name in tables:
            table_schema = await SchemaService._get_table_schema(db, dialect_name, database_name, table_name)
            schema["tables"].append(table_schema)

        return schema
    
    @staticmethod
    async def _get_table_schema(
        db: AsyncSession, 
        dialect_name: str,
        database_name: str, 
        table_name: str
    ) -> Dict[str, Any]:
        """Get schema for a single table"""
        columns = []
        primary_key = None

        if dialect_name == "sqlite":
            columns_query = text(f"PRAGMA table_info('{table_name}')")
            result = await db.execute(columns_query)

            for row in result.fetchall():
                col_name = row[1]
                data_type = row[2]
                is_nullable = "YES" if row[3] == 0 else "NO"
                is_primary = row[5] == 1

                columns.append({
                    "column_name": col_name,
                    "data_type": data_type,
                    "is_nullable": is_nullable,
                    "is_primary_key": is_primary,
                    "is_auto_increment": False,
                })

                if is_primary:
                    primary_key = col_name

            fk_query = text(f"PRAGMA foreign_key_list('{table_name}')")
            result = await db.execute(fk_query)
            foreign_keys = [
                {
                    "column": row[3],
                    "references_table": row[2],
                    "references_column": row[4],
                }
                for row in result.fetchall()
            ]
        else:
            columns_query = text(
                """
                SELECT
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_KEY,
                    EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = :db_name
                AND TABLE_NAME = :table_name
                ORDER BY ORDINAL_POSITION
                """
            )
            result = await db.execute(
                columns_query,
                {"db_name": database_name, "table_name": table_name}
            )

            for row in result.fetchall():
                col_name, data_type, is_nullable, column_key, extra = row
                is_primary_key = column_key == "PRI"

                columns.append({
                    "column_name": col_name,
                    "data_type": data_type,
                    "is_nullable": is_nullable,
                    "is_primary_key": is_primary_key,
                    "is_auto_increment": "auto_increment" in (extra or "").lower(),
                })

                if is_primary_key:
                    primary_key = col_name

            fk_query = text(
                """
                SELECT
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = :db_name
                AND TABLE_NAME = :table_name
                AND REFERENCED_TABLE_NAME IS NOT NULL
                """
            )
            result = await db.execute(
                fk_query,
                {"db_name": database_name, "table_name": table_name}
            )
            foreign_keys = [
                {
                    "column": row[0],
                    "references_table": row[1],
                    "references_column": row[2],
                }
                for row in result.fetchall()
            ]

        return {
            "table_name": table_name,
            "columns": columns,
            "primary_key": primary_key,
            "foreign_keys": foreign_keys,
        }

    @staticmethod
    async def compute_schema_statistics(
        db: AsyncSession, 
        database_name: str,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compute schema statistics for chart visualization"""
        
        # 1. Get table sizes (row counts)
        table_sizes = []
        for table in schema["tables"]:
            count_query = text(f"SELECT COUNT(*) FROM `{table['table_name']}`")
            result = await db.execute(count_query)
            row_count = result.scalar() or 0
            table_sizes.append({
                "table_name": table["table_name"],
                "row_count": row_count
            })
        
        # 2. Analyze column types distribution
        column_types = {}
        for table in schema["tables"]:
            for column in table["columns"]:
                col_type = column["data_type"].upper()
                column_types[col_type] = column_types.get(col_type, 0) + 1
        
        # 3. Get nullable statistics
        nullable_stats = []
        for table in schema["tables"]:
            nullable_count = sum(1 for col in table["columns"] if col["is_nullable"] == "YES")
            not_null_count = len(table["columns"]) - nullable_count
            nullable_stats.append({
                "table_name": table["table_name"],
                "nullable_count": nullable_count,
                "not_null_count": not_null_count
            })
        
        # 4. Relationship statistics
        relationship_stats = []
        for table in schema["tables"]:
            for fk in table["foreign_keys"]:
                relationship_stats.append({
                    "from_table": table["table_name"],
                    "from_column": fk["column"],
                    "to_table": fk["references_table"],
                    "to_column": fk["references_column"],
                    "type": "1:N"
                })
        
        # 5. Primary keys info
        primary_keys_info = []
        for table in schema["tables"]:
            pk = table.get("primary_key")
            if pk:
                primary_keys_info.append({
                    "table_name": table["table_name"],
                    "pk_column": pk
                })
        
        return {
            "table_sizes": table_sizes,
            "column_types": column_types,
            "nullable_stats": nullable_stats,
            "relationship_stats": relationship_stats,
            "primary_keys_info": primary_keys_info
        }


schema_service = SchemaService()
