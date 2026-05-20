from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.logging import get_logger
from ..services.rag_service import rag_service

logger = get_logger(__name__)
router_rag = APIRouter(prefix="/api/rag", tags=["rag"])


class Document(BaseModel):
    content: str
    metadata: dict[str, Any] | None = None


class AddDocumentsRequest(BaseModel):
    documents: list[Document]
    ids: list[str] | None = None


class SearchRequest(BaseModel):
    query: str
    limit: int = 5
    filter_conditions: dict[str, Any] | None = None


class SearchResponse(BaseModel):
    results: list[dict[str, Any]]
    query: str


@router_rag.post("/documents", response_model=dict)
async def add_documents(request: AddDocumentsRequest):
    docs = [{"content": d.content, "metadata": d.metadata or {}} for d in request.documents]
    success = rag_service.add_documents(docs, request.ids)

    if success:
        return {"success": True, "count": len(docs)}
    raise HTTPException(status_code=500, detail="文档添加失败")


@router_rag.post("/search", response_model=SearchResponse)
async def search_knowledge(request: SearchRequest):
    results = rag_service.search(
        query=request.query,
        limit=request.limit,
        filter_conditions=request.filter_conditions
    )
    return SearchResponse(results=results, query=request.query)


@router_rag.get("/stats")
async def get_stats():
    return rag_service.get_stats()


@router_rag.delete("/collection")
async def delete_collection():
    success = rag_service.delete_collection()
    if success:
        return {"success": True, "message": "知识库已清空"}
    raise HTTPException(status_code=500, detail="删除失败")

# Export router with standard name for main.py import
router = router_rag
