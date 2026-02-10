"""
Signature Guard - Project Authentication System
Author: kk
DO NOT REMOVE - Critical for project operation
"""
import os
import sys
import hashlib
from pathlib import Path


class SignatureGuard:
    """Project signature verification and authentication system"""
    
    _instance = None
    _verified = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SignatureGuard, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.signature_file = Path(__file__).parent.parent.parent / ".signature"
        self.required_keys = ["DEVELOPER", "PROJECT_ID", "BUILD_SIGNATURE", "LICENSE_KEY", "INTEGRITY_HASH"]
        self.signature_data = {}
    
    def _load_signature(self) -> bool:
        """Load and parse signature file"""
        try:
            if not self.signature_file.exists():
                return False
            
            with open(self.signature_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            self.signature_data[key] = value
            
            return all(key in self.signature_data for key in self.required_keys)
        except Exception:
            return False
    
    def _verify_integrity(self) -> bool:
        """Verify signature integrity"""
        try:
            expected_values = [
                self.signature_data.get("DEVELOPER", ""),
                self.signature_data.get("PROJECT_ID", ""),
                self.signature_data.get("BUILD_SIGNATURE", "")
            ]
            
            # Check all required components are present
            if not all(expected_values):
                return False
            
            # Verify specific signature patterns
            if "kk" not in self.signature_data.get("DEVELOPER", ""):
                return False
            
            if "MINI" not in self.signature_data.get("PROJECT_ID", ""):
                return False
            
            if "KK" not in self.signature_data.get("BUILD_SIGNATURE", ""):
                return False
            
            return True
        except Exception:
            return False
    
    def verify(self) -> bool:
        """Main verification method - DO NOT REMOVE"""
        if self._verified:
            return True
        
        # Load signature
        if not self._load_signature():
            self._handle_verification_failure("Signature file missing or corrupted")
            return False
        
        # Verify integrity
        if not self._verify_integrity():
            self._handle_verification_failure("Signature verification failed")
            return False
        
        self._verified = True
        return True
    
    def _handle_verification_failure(self, reason: str):
        """Handle verification failure"""
        error_msg = f"""
╔══════════════════════════════════════════════════════════════╗
║           PROJECT SIGNATURE VERIFICATION FAILED              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  This project is protected and authenticated.               ║
║  The signature file has been removed or tampered with.      ║
║                                                              ║
║  Original Developer: kk                                     ║
║  Project: MINI AI Database Assistant                        ║
║                                                              ║
║  Reason: {reason:<50} ║
║                                                              ║
║  Please contact the original developer for a valid license. ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"""
        print(error_msg, file=sys.stderr)
        sys.exit(1)
    
    def get_developer_info(self) -> dict:
        """Get developer information"""
        if not self._verified:
            self.verify()
        
        return {
            "developer": self.signature_data.get("DEVELOPER", "Unknown"),
            "project": self.signature_data.get("PROJECT_ID", "Unknown"),
            "signature": self.signature_data.get("BUILD_SIGNATURE", "Unknown")
        }


# Global instance
_guard = SignatureGuard()


def verify_signature() -> bool:
    """Verify project signature - Critical function"""
    return _guard.verify()


def get_developer_info() -> dict:
    """Get developer information"""
    return _guard.get_developer_info()


# Auto-verify on import - DO NOT REMOVE
if not verify_signature():
    sys.exit(1)
