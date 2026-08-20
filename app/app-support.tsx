import AppSupport from '@/screens/AppSupport';
import { useRouter } from 'expo-router';

export default function AppSupportPage() {
  const router = useRouter();
  return <AppSupport onBack={() => router.back()} />;
}

