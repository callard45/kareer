import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LoaderIcon, LockIcon, CheckCircleIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { verifyResetCode } from "../../lib/passwordReset";

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [step, setStep] = useState<"code" | "password" | "success">("code");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate("/login");
    }
  }, [email, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Veuillez entrer le code complet à 6 chiffres");
      return;
    }
    setError(null);
    setStep("password");
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await verifyResetCode(email, code.join(""), newPassword);
      if (result.success) {
        setStep("success");
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1D2A41] via-[#2a3f5f] to-[#62C2FF] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1D2A41] to-[#2a3f5f] p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
            <LockIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Réinitialisation</h1>
          <p className="text-white/70 text-sm mt-1">{email}</p>
        </div>

        <CardContent className="p-6">
          {step === "code" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Entrez le code à 6 chiffres envoyé à votre adresse email
                </p>
              </div>

              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 focus:border-[#62C2FF] focus:ring-[#62C2FF]"
                  />
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <Button
                onClick={handleVerifyCode}
                className="w-full bg-gradient-to-r from-[#62C2FF] to-[#1D8FFF] hover:from-[#4AB5FF] hover:to-[#1A7FE8] text-white h-12"
                disabled={code.some((d) => !d)}
              >
                Vérifier le code
              </Button>

              <Link to="/login" className="flex items-center justify-center gap-2 text-gray-500 hover:text-[#1D2A41] text-sm">
                <ArrowLeftIcon className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          )}

          {step === "password" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Créez votre nouveau mot de passe</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[#1D2A41] font-medium">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="pr-10 border-gray-300 focus:border-[#62C2FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[#1D2A41] font-medium">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className="border-gray-300 focus:border-[#62C2FF]"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <Button
                onClick={handleResetPassword}
                className="w-full bg-gradient-to-r from-[#62C2FF] to-[#1D8FFF] hover:from-[#4AB5FF] hover:to-[#1A7FE8] text-white h-12"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  "Réinitialiser le mot de passe"
                )}
              </Button>

              <button
                onClick={() => setStep("code")}
                className="flex items-center justify-center gap-2 text-gray-500 hover:text-[#1D2A41] text-sm w-full"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Modifier le code
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1D2A41] mb-2">Mot de passe modifié !</h3>
                <p className="text-gray-500 text-sm">
                  Votre mot de passe a été réinitialisé avec succès.
                  Vous pouvez maintenant vous connecter.
                </p>
              </div>
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-gradient-to-r from-[#62C2FF] to-[#1D8FFF] hover:from-[#4AB5FF] hover:to-[#1A7FE8] text-white h-12"
              >
                Se connecter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

