/**
 * Signature Guard - Project Authentication System
 * Author: kk
 * DO NOT REMOVE - Critical for project operation
 */

class SignatureGuard {
  constructor() {
    this.verified = false;
    this.signature = {
      developer: 'kk',
      project: 'MINI_AI_DATABASE_ASSISTANT_FRONTEND',
      buildSignature: 'KK_2026_MINI_AUTH_PROTECTED_UI',
      licenseKey: 'ui_7d8a9c4b_frontend_kk_2026_protected'
    };
  }

  /**
   * Verify project signature - DO NOT REMOVE
   */
  verify() {
    if (this.verified) {
      return true;
    }

    try {
      // Check signature integrity
      const isValid = this._verifyIntegrity();
      
      if (!isValid) {
        this._handleVerificationFailure('Signature verification failed');
        return false;
      }

      this.verified = true;
      return true;
    } catch (error) {
      this._handleVerificationFailure('Signature check error');
      return false;
    }
  }

  /**
   * Verify signature integrity
   */
  _verifyIntegrity() {
    // Check all required components
    if (!this.signature.developer || !this.signature.project || 
        !this.signature.buildSignature || !this.signature.licenseKey) {
      return false;
    }

    // Verify specific patterns
    if (!this.signature.developer.includes('kk')) {
      return false;
    }

    if (!this.signature.project.includes('MINI')) {
      return false;
    }

    if (!this.signature.buildSignature.includes('KK')) {
      return false;
    }

    return true;
  }

  /**
   * Handle verification failure
   */
  _handleVerificationFailure(reason) {
    const errorMsg = `
╔══════════════════════════════════════════════════════════════╗
║           PROJECT SIGNATURE VERIFICATION FAILED              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  This project is protected and authenticated.               ║
║  The signature has been removed or tampered with.           ║
║                                                              ║
║  Original Developer: kk                                     ║
║  Project: MINI AI Database Assistant                        ║
║                                                              ║
║  Reason: ${reason.padEnd(50)} ║
║                                                              ║
║  Please contact the original developer for a valid license. ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `;
    
    console.error(errorMsg);
    
    // Display error to user
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f0f0f; color: #fff; font-family: monospace;">
        <div style="background: #1a1a1a; border: 2px solid #ff4444; border-radius: 8px; padding: 40px; max-width: 600px; text-align: center;">
          <h1 style="color: #ff4444; margin-bottom: 20px;">⚠️ Signature Verification Failed</h1>
          <p style="margin-bottom: 20px; line-height: 1.6;">
            This project is protected and authenticated.<br/>
            The signature has been removed or tampered with.
          </p>
          <div style="background: #0f0f0f; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Original Developer:</strong> kk</p>
            <p style="margin: 5px 0;"><strong>Project:</strong> MINI AI Database Assistant</p>
            <p style="margin: 5px 0;"><strong>Build:</strong> KK_2026_MINI_AUTH_PROTECTED</p>
          </div>
          <p style="color: #ff4444;">Reason: ${reason}</p>
          <p style="margin-top: 20px; font-size: 12px; color: #888;">
            Please contact the original developer for a valid license.
          </p>
        </div>
      </div>
    `;
    
    throw new Error('Signature verification failed');
  }

  /**
   * Get developer information
   */
  getDeveloperInfo() {
    if (!this.verified) {
      this.verify();
    }
    return {
      developer: this.signature.developer,
      project: this.signature.project,
      signature: this.signature.buildSignature
    };
  }
}

// Create global instance
const signatureGuard = new SignatureGuard();

// Auto-verify on load - DO NOT REMOVE
if (!signatureGuard.verify()) {
  throw new Error('Signature verification failed');
}

export default signatureGuard;
export const verifySignature = () => signatureGuard.verify();
export const getDeveloperInfo = () => signatureGuard.getDeveloperInfo();
