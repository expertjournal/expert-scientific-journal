"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import "./login.css";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) newErrors.email = "Email обязателен";
    if (!formData.password) newErrors.password = "Пароль обязателен";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSuccess = (email: string) => {
    const norm = email.toLowerCase();
    if (norm.includes("editor") || norm.includes("admin")) {
      router.push("/editor");
    } else {
      router.push("/author");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      await login(formData.email, formData.password);
      handleLoginSuccess(formData.email);
    } catch (error: any) {
      console.error("Login authentication error:", error);
      setErrors({ form: error?.message || "Неверный email или пароль. Пожалуйста, проверьте данные." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setFormData({ email, password: pass, rememberMe: true });
    setErrors({});
    setIsLoading(true);
    try {
      await login(email, pass);
      handleLoginSuccess(email);
    } catch (err: any) {
      console.error("Quick login authentication error:", err);
      setErrors({ form: err?.message || "Ошибка авторизации демо-аккаунта." });
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
    <div className="login-container">
      <div className="login-background">
        <div className="ring ring-one" />
        <div className="ring ring-two" />
      </div>

      <div className="login-card">
        <div className="login-header">
          <a href="/home" className="login-logo">
            <span className="mark">E</span>
            <span><b>Expert</b><small>scientific journal</small></span>
          </a>
          <h1>Вход в систему</h1>
          <p>Добро пожаловать обратно</p>
        </div>

        {errors.form && <div className="form-error">{errors.form}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@university.ru"
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
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

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <span>Запомнить меня</span>
            </label>
            <a href="/forgot-password" className="forgot-link">Забыли пароль?</a>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="login-divider">
          <span>Быстрый демо-вход</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1.2rem" }}>
          <button
            type="button"
            onClick={() => handleQuickLogin("author@journal-expert.ru", "Author123!")}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", cursor: "pointer" }}
          >
            🎓 Автор
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("editor@journal-expert.ru", "Editor123!")}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", cursor: "pointer" }}
          >
            ✍️ Редактор
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("admin@journal-expert.ru", "Admin123!")}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", cursor: "pointer" }}
          >
            🛡️ Админ
          </button>
        </div>

        <div className="login-footer">
          <p>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>
          <a href="/home" className="back-link">← Вернуться на главную</a>
        </div>
      </div>
    </div>
  );
}