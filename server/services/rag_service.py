import hashlib
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class RAGService:
    def __init__(self, collection_name: str = "skincare_kb"):
        self.collection_name = f"{settings.QDRANT_COLLECTION_PREFIX}{collection_name}"
        self.vector_dim = 1024
        self._init_client()
        self._ensure_collection()

    def _init_client(self):
        self.client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            timeout=10,
            trust_env=False,
        )

    def _ensure_collection(self):
        try:
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]

            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_dim,
                        distance=Distance.COSINE
                    )
                )
                logger.info("collection_created", collection=self.collection_name)
        except Exception as e:
            logger.error("collection_init_error", error=str(e))

    def _get_embedding(self, text: str) -> list[float]:
        # TODO: replace with real embedding model (e.g. OpenAI text-embedding-3-small or BGE)
        # Current implementation uses MD5 hash which produces meaningless vectors
        hash_bytes = hashlib.md5(text.encode()).digest()
        return [float(b) / 255.0 for b in hash_bytes[:self.vector_dim]]

    def add_documents(
        self,
        documents: list[dict[str, Any]],
        ids: list[str] | None = None
    ) -> bool:
        try:
            points = []
            for i, doc in enumerate(documents):
                doc_id = ids[i] if ids else doc.get("id", f"doc_{hashlib.md5(doc['content'].encode()).hexdigest()[:12]}")
                vector = self._get_embedding(doc["content"])

                points.append(PointStruct(
                    id=doc_id,
                    vector=vector,
                    payload={
                        "content": doc["content"],
                        "metadata": doc.get("metadata", {})
                    }
                ))

            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.info("documents_added", count=len(documents), collection=self.collection_name)
            return True
        except Exception as e:
            logger.error("add_documents_error", error=str(e))
            return False

    def search(
        self,
        query: str,
        limit: int = 5,
        filter_conditions: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        try:
            query_vector = self._get_embedding(query)

            search_filter = None
            if filter_conditions:
                must_conditions = []
                for key, value in filter_conditions.items():
                    must_conditions.append(
                        FieldCondition(
                            key=f"metadata.{key}",
                            match=MatchValue(value=value)
                        )
                    )
                search_filter = Filter(must=must_conditions)

            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit,
                query_filter=search_filter
            )
            results = response.points

            return [
                {
                    "id": r.id,
                    "content": (r.payload or {}).get("content", ""),
                    "metadata": (r.payload or {}).get("metadata", {}),
                    "score": r.score
                }
                for r in results
            ]
        except Exception as e:
            logger.error("search_error", error=str(e))
            return []

    def delete_collection(self) -> bool:
        try:
            self.client.delete_collection(self.collection_name)
            logger.info("collection_deleted", collection=self.collection_name)
            return True
        except Exception as e:
            logger.error("delete_collection_error", error=str(e))
            return False

    def get_stats(self) -> dict[str, Any]:
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "collection": self.collection_name,
                "vectors_count": info.points_count,
                "points_count": info.points_count,
                "status": info.status
            }
        except Exception as e:
            logger.error("get_stats_error", error=str(e))
            return {"error": str(e)}


rag_service = RAGService()
