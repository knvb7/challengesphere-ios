import PrivacySecurity from '@/screens/PrivacySecurity';
import { useRouter } from 'expo-router';

export default function PrivacySecurityPage() {
  const router = useRouter();
  return <PrivacySecurity onBack={() => router.back()} />;
}
