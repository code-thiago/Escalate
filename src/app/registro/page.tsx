"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, useSession } from "@/src/lib/auth-client";
import EscalateLogo from "@/src/components/brand/EscalateLogo";

export default function RegistroPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionPending && session?.user) {
      router.replace("/investimentos");
    }
  }, [session, isSessionPending, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !email || !password) {
      setErrorMessage("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("A senha deve conter pelo menos 8 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res?.error) {
        setErrorMessage(
          res.error.message || "Erro ao criar conta. Verifique os dados informados."
        );
        setIsLoading(false);
        return;
      }

      router.push("/investimentos");
      router.refresh();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(
        error?.message || "Ocorreu um erro ao tentar criar a conta. Tente novamente."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ds-bg-primary)] text-[var(--ds-text-primary)] flex flex-col items-center pb-12">
      <header className="w-full max-w-md mx-auto pt-8 px-4 flex items-center justify-between">
        <EscalateLogo size="md" href="/" />
        <Link
          href="/"
          className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
        >
          &larr; Voltar ao terminal
        </Link>
      </header>

      <div className="w-full max-w-md mx-auto px-4 mt-8">
        <div className="bg-[var(--ds-surface-card)] p-6 sm:p-8 rounded-2xl border border-[var(--ds-border-subtle)] space-y-6">
          {/* Cabecalho */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Criar sua conta
            </h1>
            <p className="text-sm text-[var(--ds-text-secondary)]">
              Cadastre-se para salvar e comparar suas simulacoes
            </p>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[var(--ds-market-negative)]/10 border border-[var(--ds-market-negative)]/30 text-[var(--ds-market-negative)] text-xs font-medium leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-xs font-semibold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                Nome Completo
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] px-3.5 py-2.5 text-base font-medium text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                E-mail
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] px-3.5 py-2.5 text-base font-medium text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] uppercase tracking-wider block"
              >
                Senha
              </label>
              <div className="relative rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden focus-within:border-[var(--ds-accent-quant)] transition-colors">
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Minimo de 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--ds-bg-primary)] px-3.5 py-2.5 text-base font-medium text-[var(--ds-text-primary)] focus:outline-none placeholder:text-[var(--ds-text-secondary)]/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSessionPending}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[var(--ds-accent-quant)] hover:opacity-90 text-[var(--ds-bg-primary)] text-sm font-semibold tracking-wide transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Cadastrando...</span>
                </>
              ) : (
                "Criar Conta"
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[var(--ds-border-subtle)]">
            <p className="text-xs text-[var(--ds-text-secondary)]">
              Ja tem uma conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--ds-accent-quant)] hover:underline"
              >
                Entre
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
