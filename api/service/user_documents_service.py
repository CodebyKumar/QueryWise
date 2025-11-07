import json
import os
from typing import Dict, List, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class UserDocumentsService:
    """Service for managing user-specific documents."""
    
    def __init__(self):
        self.user_docs_path = "data/user_documents.json"
        self.user_documents: Dict[str, List[Dict[str, Any]]] = {}
        self._load_user_documents()
    
    def _load_user_documents(self):
        """Load user documents mapping from disk."""
        try:
            os.makedirs("data", exist_ok=True)
            if os.path.exists(self.user_docs_path):
                with open(self.user_docs_path, 'r') as f:
                    self.user_documents = json.load(f)
                logger.info(f"Loaded user documents for {len(self.user_documents)} users")
        except Exception as e:
            logger.error(f"Error loading user documents: {e}")
            self.user_documents = {}
    
    def _save_user_documents(self):
        """Save user documents mapping to disk."""
        try:
            os.makedirs("data", exist_ok=True)
            with open(self.user_docs_path, 'w') as f:
                json.dump(self.user_documents, f, indent=2, default=str)
            logger.info("Saved user documents to disk")
        except Exception as e:
            logger.error(f"Error saving user documents: {e}")
    
    def add_document(self, username: str, title: str, filename: str, chunk_ids: List[str]) -> Dict[str, Any]:
        """Add a document for a specific user."""
        if username not in self.user_documents:
            self.user_documents[username] = []
        
        document = {
            "title": title,
            "filename": filename,
            "chunk_ids": chunk_ids,
            "chunks": len(chunk_ids),
            "uploaded_at": datetime.now().isoformat(),
            "indexed": True
        }
        
        self.user_documents[username].append(document)
        self._save_user_documents()
        logger.info(f"Added document '{title}' for user {username}")
        return document
    
    def get_user_documents(self, username: str) -> List[Dict[str, Any]]:
        """Get all documents for a specific user."""
        documents = self.user_documents.get(username, [])
        # Sort by uploaded_at descending (most recent first)
        documents.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
        return documents
    
    def get_all_user_chunk_ids(self, username: str) -> List[str]:
        """Get all chunk IDs for a user's documents."""
        documents = self.user_documents.get(username, [])
        all_chunk_ids = []
        for doc in documents:
            all_chunk_ids.extend(doc.get("chunk_ids", []))
        return all_chunk_ids

# Singleton instance
user_documents_service = UserDocumentsService()
