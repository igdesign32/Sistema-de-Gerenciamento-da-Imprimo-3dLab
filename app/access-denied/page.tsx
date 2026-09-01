import { LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getAuthenticatedChatGPTUser,
  isAuthorizedAdminEmail,
} from '@/app/chatgpt-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AccessDeniedPage() {
  const user = await getAuthenticatedChatGPTUser();

  if (!user) redirect(chatGPTSignInPath('/'));
  if (isAuthorizedAdminEmail(user.email)) redirect('/');

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-5 py-10 text-[#172033]">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-950/5 ring-1 ring-[#e4e9f1] sm:p-10">
        <Image
          src="/imprimo3dlab-logo-color.png"
          alt="Imprimo3DLab"
          width={260}
          height={110}
          className="mx-auto h-16 w-auto object-contain"
        />
        <div className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-[#fff0ea] text-[#e85c2b]">
          <LockKeyhole className="size-7" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Acesso não autorizado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          A conta <strong className="font-semibold text-slate-700">{user.email}</strong> não está autorizada a acessar este sistema.
        </p>
        <a
          href={chatGPTSignOutPath('/login')}
          target="_top"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#ff6b35] px-5 text-sm font-semibold text-white transition hover:bg-[#e85c2b]"
        >
          Entrar com outra conta
        </a>
      </section>
    </main>
  );
}
