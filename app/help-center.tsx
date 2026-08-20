import HelpCenter from '@/screens/HelpCenter';
import { useRouter } from 'expo-router';

export default function HelpCenterPage() {
  const router = useRouter();
  return <HelpCenter onBack={() => router.back()} />;
}
