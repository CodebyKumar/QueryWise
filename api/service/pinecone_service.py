from typing import List, Dict, Any
from lib.config import settings
import logging
import numpy as np
import faiss  # FAISS for local vector search

logger = logging.getLogger(__name__)

class PineconeService:
    """
    A local vector store service using FAISS to simulate Pinecone.
    This service is designed for local development and is compatible with the
    Modular RAG architecture, including the 'Small-to-Big' strategy.
    """
    def __init__(self):
        self.index = None
        self.dimension = settings.embedding_dim  # e.g., 768 for Google's model
        
        # Persistence paths
        self.index_path = "data/faiss_index.bin"
        self.metadata_path = "data/metadata_store.json"
        self.parent_chunks_path = "data/parent_chunks.json"
        
        # In-memory stores
        # Maps FAISS index position to our custom vector ID (e.g., 'child_uuid')
        self.index_to_id_map: List[str] = []
        # Stores metadata for each child chunk vector
        self.metadata_store: Dict[str, Dict[str, Any]] = {}
        # Stores the larger parent chunks for context retrieval
        self.parent_chunk_store: Dict[str, Dict[str, Any]] = {}

    async def initialize_pinecone(self):
        """Initializes the FAISS index and in-memory stores."""
        try:
            # Using IndexFlatL2 for simple Euclidean distance search
            self.index = faiss.IndexFlatL2(self.dimension)
            # Add a mapping index to FAISS for easy ID retrieval
            self.index = faiss.IndexIDMap(self.index)
            
            # Initialize empty lists
            self.index_to_id_map = []
            self.metadata_store = {}
            self.parent_chunk_store = {}
            
            # Try to load existing data
            await self._load_persisted_data()
            
            logger.info(f"Local FAISS index initialized with dimension {self.dimension}. Loaded {self.index.ntotal} vectors.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize FAISS index: {e}")
            return False

    async def _load_persisted_data(self):
        """Load persisted FAISS index and metadata from disk."""
        import os
        import json
        
        try:
            # Create data directory if it doesn't exist
            os.makedirs("data", exist_ok=True)
            
            # Load FAISS index
            if os.path.exists(self.index_path):
                self.index = faiss.read_index(self.index_path)
                logger.info(f"Loaded FAISS index from {self.index_path}")
            
            # Load metadata
            if os.path.exists(self.metadata_path):
                with open(self.metadata_path, 'r') as f:
                    data = json.load(f)
                    self.index_to_id_map = data.get('index_to_id_map', [])
                    self.metadata_store = data.get('metadata_store', {})
                logger.info(f"Loaded metadata from {self.metadata_path}")
            
            # Load parent chunks
            if os.path.exists(self.parent_chunks_path):
                with open(self.parent_chunks_path, 'r') as f:
                    self.parent_chunk_store = json.load(f)
                logger.info(f"Loaded parent chunks from {self.parent_chunks_path}")
                
        except Exception as e:
            logger.warning(f"Could not load persisted data: {e}")

    async def _save_persisted_data(self):
        """Save FAISS index and metadata to disk."""
        import os
        import json
        
        try:
            # Create data directory if it doesn't exist
            os.makedirs("data", exist_ok=True)
            
            # Save FAISS index
            faiss.write_index(self.index, self.index_path)
            
            # Save metadata
            metadata_data = {
                'index_to_id_map': self.index_to_id_map,
                'metadata_store': self.metadata_store
            }
            with open(self.metadata_path, 'w') as f:
                json.dump(metadata_data, f, indent=2)
            
            # Save parent chunks
            with open(self.parent_chunks_path, 'w') as f:
                json.dump(self.parent_chunk_store, f, indent=2)
                
            logger.info("Persisted FAISS index and metadata to disk")
            
        except Exception as e:
            logger.error(f"Failed to save persisted data: {e}")

    async def upsert_vectors(self, vectors: List[Dict[str, Any]]) -> bool:
        """
        Adds vector embeddings and their metadata to the local stores.
        This is for the 'child' chunks used in retrieval.
        """
        if not self.index:
            logger.error("FAISS index is not initialized. Call initialize_pinecone first.")
            return False
            
        try:
            embeddings_to_add = []
            ids_to_add = []
            
            for i, vector_data in enumerate(vectors):
                vector_id = vector_data['id']
                embedding = vector_data['values']
                
                embeddings_to_add.append(embedding)
                ids_to_add.append(i + len(self.index_to_id_map)) # Use a simple integer index for FAISS
                
                # Store the mapping and metadata
                self.index_to_id_map.append(vector_id)
                self.metadata_store[vector_id] = vector_data['metadata']

            if embeddings_to_add:
                # NOTE: FAISS/NumPy are synchronous. In a high-concurrency production app,
                # you would run this in a thread pool executor to avoid blocking the event loop.
                embeddings_np = np.array(embeddings_to_add, dtype='float32')
                ids_np = np.array(ids_to_add, dtype='int64')
                
                self.index.add_with_ids(embeddings_np, ids_np)
                logger.info(f"Upserted {len(vectors)} vectors into local FAISS index.")
                
                # Persist the updated index and metadata
                await self._save_persisted_data()
            
            return True
        except Exception as e:
            logger.error(f"Failed to upsert vectors to FAISS: {e}")
            return False

    async def query_vectors(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Performs a similarity search in the local FAISS index.
        """
        if not self.index or self.index.ntotal == 0:
            logger.warning("Querying an empty or uninitialized index.")
            return []
            
        try:
            query_np = np.array([query_vector], dtype='float32')
            
            # Ensure top_k doesn't exceed available documents
            actual_top_k = min(top_k, self.index.ntotal)
            if actual_top_k == 0:
                logger.warning("No documents available for search.")
                return []
            
            # Search the index
            distances, indices = self.index.search(query_np, actual_top_k)
            
            # Check if we got valid results
            if len(indices) == 0 or len(indices[0]) == 0:
                logger.warning("No search results found.")
                return []
            
            results = []
            for i, idx in enumerate(indices[0]):
                if idx == -1:  # FAISS returns -1 for no result
                    continue
                
                # Check if index is valid before accessing index_to_id_map
                if idx >= len(self.index_to_id_map):
                    logger.warning(f"Invalid index {idx} returned by FAISS. Max index: {len(self.index_to_id_map) - 1}")
                    continue
                
                vector_id = self.index_to_id_map[idx]
                metadata = self.metadata_store.get(vector_id, {})
                
                # Convert L2 distance to a similarity score (0 to 1). Closer to 1 is more similar.
                score = 1.0 / (1.0 + distances[0][i])
                
                results.append({
                    'id': vector_id,
                    'score': score,
                    'metadata': metadata
                })
                
            return results
        except Exception as e:
            logger.error(f"Failed to query FAISS index: {e}")
            return []

    async def store_parent_chunks(self, parent_chunks: List[Dict[str, Any]]) -> bool:
        """Stores the large parent chunks in an in-memory dictionary."""
        try:
            for chunk in parent_chunks:
                self.parent_chunk_store[chunk['id']] = chunk
            logger.info(f"Stored {len(parent_chunks)} parent chunks in-memory.")
            
            # Persist the updated parent chunks
            await self._save_persisted_data()
            return True
        except Exception as e:
            logger.error(f"Failed to store parent chunks: {e}")
            return False

    async def fetch_parent_chunks(self, parent_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Retrieves parent chunks by their IDs from the in-memory store."""
        try:
            fetched_chunks = {
                pid: self.parent_chunk_store[pid] 
                for pid in parent_ids 
                if pid in self.parent_chunk_store
            }
            return fetched_chunks
        except Exception as e:
            logger.error(f"Failed to fetch parent chunks: {e}")
            return {}

# Singleton instance
pinecone_service = PineconeService()