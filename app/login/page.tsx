import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getChatGPTUser();
  const primaryHref = user ? '/' : chatGPTSignInPath('/');
  const primaryLabel = user ? 'Continuar para o sistema' : 'Entrar como administrador';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--brand-blue)] px-5 py-8 text-white sm:px-8 lg:grid lg:place-items-center">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-[#ff6b35]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 size-[30rem] rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/20 bg-black/10 shadow-2xl shadow-black/20 lg:grid-cols-[1.05fr_.95fr]">
        <section className="flex min-h-[360px] flex-col justify-between p-7 sm:p-10 lg:min-h-[660px] lg:p-14">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-[#ff6b35] shadow-[0_10px_28px_rgba(255,107,53,.3)]">
              <Boxes className="size-6" />
            </div>
            <div>
              <p className="text-xl font-bold">Forma<span className="text-[#ff8c61]">3D</span></p>
              <p className="text-[10px] uppercase tracking-[.18em] text-white">Gestão de impressão</p>
            </div>
          </div>

          <div className="my-12 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff8358]/25 bg-[#ff6b35]/10 px-3 py-1.5 text-xs font-semibold text-[#ff9b77]">
              <ShieldCheck className="size-4" /> Área administrativa
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-[-.04em] sm:text-5xl">
              Sua operação 3D, organizada em um só lugar.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white sm:text-base">
              Acesse orçamentos, pedidos, produção, estoque, clientes e financeiro com total controle dos donos da empresa.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white sm:grid-cols-2">
            <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> Dados protegidos</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> Acesso somente autorizado</p>
          </div>
        </section>

        <section className="flex items-center bg-[#f4f7fb] p-5 text-[#172033] sm:p-9 lg:p-12">
          <div className="w-full rounded-2xl bg-white p-6 shadow-xl shadow-slate-950/5 ring-1 ring-[#e4e9f1] sm:p-9">
            <div className="grid size-12 place-items-center rounded-xl bg-[#fff0ea] text-[#e85c2b]">
              <LockKeyhole className="size-6" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight">Acesso dos administradores</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Entre com uma conta autorizada dos donos da Forma3D. Todos os usuários deste sistema possuem acesso administrativo completo.
            </p>

            {user && (
              <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Conta conectada</p>
                <p className="mt-1 truncate text-sm font-medium text-emerald-950">{user.displayName}</p>
                <p className="truncate text-xs text-emerald-700">{user.email}</p>
              </div>
            )}

            <a
              href={primaryHref}
              target="_top"
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b35] px-5 text-sm font-semibold text-white shadow-lg shadow-[#ff6b35]/20 transition hover:bg-[#e85c2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6b35]"
            >
              {primaryLabel} <ArrowRight className="size-4" />
            </a>

            {user && (
              <a
                href={chatGPTSignOutPath('/login')}
                target="_top"
                className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Entrar com outra conta
              </a>
            )}

            <div className="mt-7 border-t pt-5 text-center text-[11px] leading-5 text-slate-400">
              Ambiente interno e privado. O acesso depende de autorização prévia.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
