import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { SystemApp } from '@/components/system-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireChatGPTUser('/');

  return (
    <SystemApp
      user={{ name: user.displayName, email: user.email }}
      signOutPath={chatGPTSignOutPath('/login')}
    />
  );
}
