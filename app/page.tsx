import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { SystemApp } from '@/components/system-app';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string | string[] }>;
}) {
  const user = await requireChatGPTUser('/');
  const params = await searchParams;
  const initialViewSlug = typeof params.aba === 'string' ? params.aba : '';

  return (
    <SystemApp
      user={{ name: user.displayName, email: user.email }}
      signOutPath={chatGPTSignOutPath('/login')}
      initialViewSlug={initialViewSlug}
    />
  );
}
