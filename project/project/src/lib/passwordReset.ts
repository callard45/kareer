/**
 * Service de réinitialisation de mot de passe
 * Gère les appels aux Edge Functions Supabase pour le flow de reset avec code à 6 chiffres
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface RequestResetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface VerifyResetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Demande l'envoi d'un code de réinitialisation par email
 * @param email - L'adresse email de l'utilisateur
 */
export async function requestPasswordReset(email: string): Promise<RequestResetResponse> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Une erreur est survenue',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return {
      success: false,
      error: 'Impossible de contacter le serveur. Veuillez réessayer.',
    };
  }
}

/**
 * Vérifie le code et réinitialise le mot de passe
 * @param email - L'adresse email de l'utilisateur
 * @param code - Le code à 6 chiffres reçu par email
 * @param newPassword - Le nouveau mot de passe
 */
export async function verifyResetCode(
  email: string,
  code: string,
  newPassword: string
): Promise<VerifyResetResponse> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Une erreur est survenue',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('Error verifying reset code:', error);
    return {
      success: false,
      error: 'Impossible de contacter le serveur. Veuillez réessayer.',
    };
  }
}

