import { SignUp } from "@clerk/nextjs";

export default function InternalSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600 dark:text-blue-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Registro de Equipo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Crea tu cuenta de acceso interno
          </p>
        </div>
        <SignUp
          unsafeMetadata={{
            role: "sales",
          }}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl",
            },
          }}
        />
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Nota:</span> Esta cuenta será registrada con rol de Ventas.
            Para acceso de administrador, contacta al equipo técnico.
          </p>
        </div>
      </div>
    </div>
  );
}

