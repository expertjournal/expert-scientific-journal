"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import "./register.css";

export default function RegisterPage() {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [otpCode, setOtpCode] = useState("");
  const [sampleCodeHint, setSampleCodeHint] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { register, verifyEmail, resendVerification } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "Имя обязательно";
    if (!formData.lastName.trim()) newErrors.lastName = "Фамилия обязательна";
    if (!formData.email.trim()) newErrors.email = "Email обязателен";
    if (!formData.password) newErrors.password = "Пароль обязателен";
    if (formData.password.length < 6) newErrors.password = "Минимум 6 символов";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Пароли не совпадают";
    if (!formData.agreeTerms) newErrors.agreeTerms = "Необходимо согласие";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const res = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        institution: "",
        password: formData.password,
        role: "author",
      });

      if (res.requiresVerification) {
        setStep("verify");
        setInfoMessage(res.message || "Введите 6-значный код, отправленный на ваш email.");
        if (res.sampleCode) {
          setSampleCodeHint(res.sampleCode);
        }
      } else {
        window.location.href = "/author";
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrors({ form: error?.message || "Ошибка регистрации. Попробуйте снова." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrors({ otp: "Введите 6-значный код подтверждения" });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      await verifyEmail(formData.email, otpCode.trim(), formData.firstName, formData.lastName);
      window.location.href = "/author";
    } catch (error: any) {
      console.error("Verification error:", error);
      setErrors({ otp: error?.message || "Неверный код подтверждения" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const res = await resendVerification(formData.email);
      setInfoMessage(res.message || "Новый код подтверждения отправлен.");
      if (res.sampleCode) {
        setSampleCodeHint(res.sampleCode);
      }
    } catch (error: any) {
      setErrors({ otp: error?.message || "Не удалось отправить код повторно" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="register-container">
      <div className="register-background">
        <div className="ring ring-one" />
        <div className="ring ring-two" />
      </div>

      <div className="register-card">
        <div className="register-header">
          <a href="/home" className="register-logo">
            <span className="mark">E</span>
            <span><b>Expert</b><small>scientific journal</small></span>
          </a>
          <h1>{step === "form" ? "Регистрация" : "Подтверждение Email"}</h1>
          <p>
            {step === "form"
              ? "Создайте аккаунт для доступа к порталу"
              : `Мы отправили код подтверждения на ${formData.email}`}
          </p>
        </div>

        {errors.form && <div className="form-error">{errors.form}</div>}

        {step === "form" ? (
          <form className="register-form" onSubmit={handleSubmitForm}>
            <div className="form-row">
              <div className="form-group">
                <label>Имя *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Иван"
                  className={errors.firstName ? "error" : ""}
                />
                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label>Фамилия *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Иванов"
                  className={errors.lastName ? "error" : ""}
                />
                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ivan.ivanov@university.ru"
                className={errors.email ? "error" : ""}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Пароль *</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Минимум 8 символов"
                    className={errors.password ? "error" : ""}
                    style={{ paddingRight: "2.5rem", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      color: "#64748b",
                      padding: "0.25rem",
                    }}
                  >
                    {showPassword ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label>Подтвердите пароль *</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Повторите пароль"
                    className={errors.confirmPassword ? "error" : ""}
                    style={{ paddingRight: "2.5rem", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      color: "#64748b",
                      padding: "0.25rem",
                    }}
                  >
                    {showConfirmPassword ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>
                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className={errors.agreeTerms ? "error" : ""}
                />
                <span>
                  Я согласен с <a href="/terms">условиями использования</a> и <a href="/privacy">политикой конфиденциальности</a>
                </span>
              </label>
              {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>
        ) : (
          <form className="register-form" onSubmit={handleVerifyOtp}>
            {infoMessage && <div className="info-banner" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{infoMessage}</div>}

            {errors.otp && <div className="form-error">{errors.otp}</div>}

            <div className="form-group">
              <label>Код подтверждения (6 цифр) *</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value);
                  if (errors.otp) setErrors({});
                }}
                placeholder="123456"
                style={{ textAlign: "center", fontSize: "1.4rem", letterSpacing: "0.3rem", fontWeight: "bold" }}
                className={errors.otp ? "error" : ""}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || otpCode.length < 6}
            >
              {isLoading ? "Проверка кода..." : "Подтвердить и войти"}
            </button>

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                style={{ background: "none", border: "none", color: "#c82a38", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Отправить код повторно
              </button>
            </div>

            <div style={{ marginTop: "0.5rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setStep("form")}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: "0.8rem", cursor: "pointer" }}
              >
                ← Изменить email или данные
              </button>
            </div>
          </form>
        )}

        <div className="register-footer">
          <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
          <a href="/home" className="back-link">← Вернуться на главную</a>
        </div>
      </div>
    </div>
  );
}