import PrivacyPolicy from '@/screens/PrivacyPolicy';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  return <PrivacyPolicy onBack={() => router.back()} />;
}
